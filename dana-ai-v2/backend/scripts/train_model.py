import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import numpy as np
import pandas as pd
import joblib, os, json, warnings
warnings.filterwarnings('ignore')

from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.neighbors import NearestNeighbors
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.neural_network import BernoulliRBM
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, RandomizedSearchCV, train_test_split

DATA_PATH     = os.path.join(os.path.dirname(__file__), '..', 'data', 'kol_clean.pkl')
PATTERNS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'campaign_patterns.json')
MODELS_DIR    = os.path.join(os.path.dirname(__file__), '..', 'models')

HF_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

LOCATION_LIST = ['jakarta','bandung','surabaya','yogyakarta','bali',
                 'sumatra','kalimantan','sulawesi','nasional','other','unknown']
TIER_NAME_MAP = {1:'nano', 2:'mikro', 3:'makro', 4:'mega', 5:'mega'}


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def load_sentence_transformer():
    print(f"[HF] Loading: {HF_MODEL_NAME}")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(HF_MODEL_NAME)
    print("   [OK] Model loaded!")
    return model


def load_campaign_patterns():
    if not os.path.exists(PATTERNS_PATH):
        print("[WARN] campaign_patterns.json tidak ditemukan.")
        return None
    with open(PATTERNS_PATH) as f:
        patterns = json.load(f)
    print(f"[PATTERNS] {patterns.get('total_with_er', 0)} records | "
          f"best tier: {patterns.get('best_tier', 'N/A')} | "
          f"avg ER: {patterns.get('overall_avg_er', 0):.1f}%")
    return patterns


def build_category_embeddings(df, st_model):
    """Layer 1: HuggingFace semantic embedding per kategori KOL"""
    categories = df['category'].fillna('konten umum').tolist()
    print(f"   Encoding {len(categories)} KOL categories...")
    embs = st_model.encode(categories, show_progress_bar=True, batch_size=32)
    print(f"   Embedding shape: {embs.shape}")
    return embs


# ═══════════════════════════════════════════════════════════════
# TABULAR FEATURE BUILDER (shared by RF, XGB, RBM)
# ═══════════════════════════════════════════════════════════════

def build_tabular_features(df, patterns, scaler=None, fit=True):
    loc_onehot = pd.get_dummies(
        df['location_norm'].apply(lambda x: x if x in LOCATION_LIST else 'other')
    ).reindex(columns=LOCATION_LIST, fill_value=0).values.astype(float)

    numeric = df[['followers_log','tier_score','rate_min','rate_max']].fillna(0)
    if fit or scaler is None:
        scaler = MinMaxScaler()
        num_scaled = scaler.fit_transform(numeric)
    else:
        num_scaled = scaler.transform(numeric)

    overall_avg_er = patterns.get('overall_avg_er', 5.0) if patterns else 5.0
    tier_stats     = patterns.get('tier_stats', {}) if patterns else {}
    optimal_fol    = patterns.get('optimal_followers', {}) if patterns else {}

    er_scores      = []
    pattern_scores = []

    for _, row in df.iterrows():
        tier_name = TIER_NAME_MAP.get(int(row.get('tier_score', 2)), 'mikro')

        if row.get('has_er_data') and not pd.isna(row.get('avg_er_pct', float('nan'))):
            er = float(row['avg_er_pct'])
            er_s = 1.0 if er>=20 else 0.85 if er>=10 else 0.70 if er>=5 else 0.50 if er>=2 else 0.30
        elif tier_name in tier_stats:
            tier_avg = tier_stats[tier_name].get('avg_er', overall_avg_er)
            er_s = 0.75 if tier_avg>=15 else 0.60 if tier_avg>=8 else 0.45 if tier_avg>=4 else 0.30
        else:
            n = row.get('followers_num', 0)
            er_s = 0.65 if n<10_000 else 0.55 if n<50_000 else 0.45 if n<200_000 else 0.35 if n<1_000_000 else 0.25
        er_scores.append(er_s)

        if not patterns or 'tier_stats' not in patterns:
            pattern_scores.append(0.5)
            continue

        ts = tier_stats.get(tier_name, {})
        if ts:
            tier_avg  = ts.get('avg_er', overall_avg_er)
            all_avgs  = [s.get('avg_er', 0) for s in tier_stats.values()]
            max_avg   = max(all_avgs) if all_avgs else overall_avg_er
            tier_s    = (tier_avg / (max_avg + 0.01)) * 0.7 + (ts.get('pct_good', 30) / 100) * 0.3
        else:
            tier_s = 0.5

        fol = row.get('followers_num', 0)
        if optimal_fol and optimal_fol.get('min') and optimal_fol.get('max'):
            o_min, o_max = optimal_fol['min'], optimal_fol['max']
            if o_min <= fol <= o_max:
                fol_s = 1.0 - abs(fol - (o_min+o_max)/2) / max(o_max-o_min, 1) * 0.3
            elif fol < o_min:
                fol_s = max(0.3, fol / o_min * 0.8)
            else:
                fol_s = max(0.3, o_max / fol * 0.8)
        else:
            fol_s = 0.5

        tw = patterns.get('tier_weight_hint', {}).get(tier_name, 1.0)
        ps = tier_s * 0.50 + fol_s * 0.30 + min(tw / 2.0, 1.0) * 0.20
        pattern_scores.append(float(max(0, min(1, ps))))

    features = np.hstack([
        loc_onehot,
        num_scaled,
        np.array(er_scores).reshape(-1, 1),
        np.array(pattern_scores).reshape(-1, 1),
    ])
    return features, scaler


# ═══════════════════════════════════════════════════════════════
# LAYER 3a: RANDOM FOREST
# ═══════════════════════════════════════════════════════════════

def train_random_forest(df, tabular_features, patterns):
    print("\n[RF] Training Random Forest (ranking model) — dengan hyperparameter tuning...")

    overall_avg_er = patterns.get('overall_avg_er', 5.0) if patterns else 5.0
    tier_stats     = patterns.get('tier_stats', {}) if patterns else {}
    best_tier      = patterns.get('best_tier', 'mikro') if patterns else 'mikro'

    y = []
    for _, row in df.iterrows():
        tier_name = TIER_NAME_MAP.get(int(row.get('tier_score', 2)), 'mikro')

        if row.get('has_er_data') and not pd.isna(row.get('avg_er_pct', float('nan'))):
            er = float(row['avg_er_pct'])
            er_q = min(er / 20.0, 1.0)
        elif tier_name in tier_stats:
            tier_avg = tier_stats[tier_name].get('avg_er', overall_avg_er)
            er_q = min(tier_avg / 20.0, 1.0) * 0.8
        else:
            er_q = 0.3

        tier_order = ['nano','mikro','makro','mega']
        if best_tier in tier_order and tier_name in tier_order:
            dist   = abs(tier_order.index(tier_name) - tier_order.index(best_tier))
            tier_q = max(0, 1.0 - dist * 0.25)
        else:
            tier_q = 0.5

        n     = row.get('followers_num', 1)
        r_min = row.get('rate_min', 0)
        if n > 0 and r_min > 0:
            cpm    = r_min / (n / 1000)
            rate_q = max(0, 1.0 - min(cpm / 50_000, 1.0))
        else:
            rate_q = 0.5

        quality = er_q * 0.50 + tier_q * 0.30 + rate_q * 0.20
        y.append(round(float(quality), 4))

    y = np.array(y)

    # ── Holdout test split ────────────────────────────────────────
    n_total = len(y)
    n_cv    = min(5, max(2, n_total // 5))
    if n_total >= 10:
        X_train, X_test, y_train, y_test = train_test_split(
            tabular_features, y, test_size=0.2, random_state=42
        )
        print(f"   Train: {len(X_train)} | Test: {len(X_test)}")
    else:
        X_train, X_test, y_train, y_test = tabular_features, tabular_features, y, y
        print(f"   Dataset kecil ({n_total}), skip holdout split.")

    # ── Hyperparameter search (RandomizedSearchCV) ────────────────
    param_dist = {
        'n_estimators':    [100, 200, 300, 500],
        'max_depth':       [5, 6, 8, 10, 12, None],
        'min_samples_leaf':[1, 2, 3, 5],
        'max_features':    ['sqrt', 'log2', 0.4, 0.6],
        'min_samples_split': [2, 5, 10],
    }
    n_iter = 20 if len(X_train) >= 20 else 8
    print(f"   RandomizedSearchCV: {n_iter} kombinasi, cv={n_cv}...")
    search = RandomizedSearchCV(
        RandomForestRegressor(random_state=42, n_jobs=-1),
        param_dist,
        n_iter=n_iter,
        cv=n_cv,
        scoring='neg_mean_absolute_error',
        random_state=42,
        n_jobs=-1,
        verbose=0,
    )
    search.fit(X_train, y_train)
    rf = search.best_estimator_
    print(f"   Best params: {search.best_params_}")
    print(f"   CV MAE (search): {-search.best_score_:.4f}")

    # ── Final fit on ALL data with best params ────────────────────
    rf.fit(tabular_features, y)

    # ── Evaluasi holdout test set ─────────────────────────────────
    y_pred_test = rf.predict(X_test)
    test_mae    = float(np.mean(np.abs(y_test - y_pred_test)))
    test_rmse   = float(np.sqrt(np.mean((y_test - y_pred_test)**2)))
    r2_test     = float(1 - np.sum((y_test-y_pred_test)**2) / (np.sum((y_test-y_test.mean())**2)+1e-9))

    # ── CV pada full data ─────────────────────────────────────────
    cv_scores = cross_val_score(rf, tabular_features, y, cv=n_cv,
                                scoring='neg_mean_absolute_error', n_jobs=-1)
    cv_mae = float(-cv_scores.mean())
    cv_std = float(cv_scores.std())

    y_pred_all = rf.predict(tabular_features)
    mae_train  = float(np.mean(np.abs(y - y_pred_all)))
    rmse_train = float(np.sqrt(np.mean((y - y_pred_all)**2)))

    feat_names    = LOCATION_LIST + ['followers_log','tier_score','rate_min','rate_max','er_score','pattern_score']
    importances   = sorted(zip(feat_names, rf.feature_importances_), key=lambda x: -x[1])
    feat_imp_dict = {k: round(float(v), 4) for k, v in importances}

    print(f"   RF final | Train MAE={mae_train:.4f} | Test MAE={test_mae:.4f} | Test RMSE={test_rmse:.4f} | R²={r2_test:.4f}")
    print(f"   CV MAE={cv_mae:.4f} (+/-{cv_std:.4f})")
    print(f"   Top features:")
    for fname, imp in importances[:5]:
        print(f"     {fname:20s}: {imp:.4f} {'|' * int(imp * 40)}")

    rf_metrics = {
        'mae_train':        round(mae_train, 4),
        'rmse_train':       round(rmse_train, 4),
        'mae_test':         round(test_mae, 4),
        'rmse_test':        round(test_rmse, 4),
        'r2_test':          round(r2_test, 4),
        'cv_mae':           round(cv_mae, 4),
        'cv_std':           round(cv_std, 4),
        'best_params':      search.best_params_,
        'feature_importance': feat_imp_dict,
        'n_estimators':     rf.n_estimators,
        'target_mean':      round(float(y.mean()), 4),
        'target_std':       round(float(y.std()), 4),
    }

    return rf, y, rf_metrics


# ═══════════════════════════════════════════════════════════════
# LAYER 3b: XGBOOST — ER Predictor
# ═══════════════════════════════════════════════════════════════

def train_xgboost_er_predictor(df, tabular_features, patterns):
    print("\n[XGB] Training XGBoost ER predictor — dengan hyperparameter tuning...")

    try:
        import xgboost as xgb
    except ImportError:
        print("   [SKIP] xgboost tidak terinstall. Jalankan: pip install xgboost")
        return None, None

    mask_real = df['has_er_data'] & df['avg_er_pct'].notna()
    n_real    = mask_real.sum()
    print(f"   KOL dengan real ER: {n_real}")

    if n_real >= 5:
        X_all = tabular_features[mask_real.values]
        y_all = df.loc[mask_real, 'avg_er_pct'].values.astype(float)
        training_mode = 'supervised'
        print(f"   Mode: supervised ({n_real} KOL dengan real ER)")
    else:
        print(f"   Data real ER kurang ({n_real}), pakai pattern-based synthetic training...")
        X_all  = tabular_features
        overall    = patterns.get('overall_avg_er', 5.0) if patterns else 5.0
        tier_stats = patterns.get('tier_stats', {}) if patterns else {}
        y_list = []
        for _, row in df.iterrows():
            tier_name = TIER_NAME_MAP.get(int(row.get('tier_score', 2)), 'mikro')
            if tier_name in tier_stats:
                base_er = tier_stats[tier_name].get('avg_er', overall)
            else:
                n = row.get('followers_num', 0)
                base_er = 12 if n<10_000 else 8 if n<50_000 else 5 if n<200_000 else 3 if n<1_000_000 else 2
            noise = np.random.normal(0, base_er * 0.1)
            y_list.append(max(0, base_er + noise))
        y_all = np.array(y_list)
        training_mode = 'synthetic'
        print(f"   Synthetic ER: mean={y_all.mean():.1f}% std={y_all.std():.1f}%")

    # ── Train/test split ─────────────────────────────────────────
    if len(y_all) >= 10:
        X_tr, X_te, y_tr, y_te = train_test_split(X_all, y_all, test_size=0.2, random_state=42)
    else:
        X_tr, X_te, y_tr, y_te = X_all, X_all, y_all, y_all

    # ── Hyperparameter search ─────────────────────────────────────
    param_dist = {
        'n_estimators':    [150, 200, 300, 400],
        'max_depth':       [3, 4, 5, 6],
        'learning_rate':   [0.02, 0.05, 0.08, 0.1],
        'subsample':       [0.7, 0.8, 0.9],
        'colsample_bytree':[0.7, 0.8, 0.9],
        'min_child_weight':[1, 3, 5],
        'reg_alpha':       [0, 0.05, 0.1, 0.5],
        'reg_lambda':      [0.5, 1.0, 2.0],
    }
    n_iter = 20 if len(X_tr) >= 20 else 8
    n_cv   = min(5, max(2, len(X_tr) // 5))
    print(f"   RandomizedSearchCV XGB: {n_iter} kombinasi, cv={n_cv}...")
    search = RandomizedSearchCV(
        xgb.XGBRegressor(random_state=42, verbosity=0),
        param_dist,
        n_iter=n_iter,
        cv=n_cv,
        scoring='neg_mean_absolute_error',
        random_state=42,
        n_jobs=-1,
        verbose=0,
    )
    search.fit(X_tr, y_tr)
    xgb_model = search.best_estimator_
    print(f"   Best XGB params: {search.best_params_}")

    # ── Final fit on semua training data ─────────────────────────
    xgb_model.fit(X_all, y_all)

    # ── Evaluasi ─────────────────────────────────────────────────
    y_pred_train = xgb_model.predict(X_all)
    y_pred_test  = xgb_model.predict(X_te)
    mae_train    = float(np.mean(np.abs(y_all - y_pred_train)))
    mae_test     = float(np.mean(np.abs(y_te  - y_pred_test)))
    rmse_test    = float(np.sqrt(np.mean((y_te - y_pred_test)**2)))

    y_pred_all = xgb_model.predict(tabular_features)
    print(f"   XGB | predicted ER range: {y_pred_all.min():.1f}%–{y_pred_all.max():.1f}% "
          f"(avg {y_pred_all.mean():.1f}%) | MAE train={mae_train:.2f}% | MAE test={mae_test:.2f}%")

    xgb_metrics = {
        'mae_train':     round(mae_train, 3),
        'mae_test':      round(mae_test, 3),
        'rmse_test':     round(rmse_test, 3),
        'cv_mae':        round(float(-search.best_score_), 3),
        'er_pred_min':   round(float(y_pred_all.min()), 2),
        'er_pred_max':   round(float(y_pred_all.max()), 2),
        'er_pred_mean':  round(float(y_pred_all.mean()), 2),
        'n_real_er':     int(n_real),
        'training_mode': training_mode,
        'best_params':   search.best_params_,
    }

    return xgb_model, xgb_metrics


# ═══════════════════════════════════════════════════════════════
# LAYER 3c: RBM — Latent Feature Extractor
# ═══════════════════════════════════════════════════════════════

def train_rbm(tabular_features):
    print("\n[RBM] Training Restricted Boltzmann Machine — grid search n_components...")

    scaler_rbm = MinMaxScaler()
    X_binary   = scaler_rbm.fit_transform(tabular_features)

    n_feat = tabular_features.shape[1]
    # Try several n_components and pick the one with lowest reconstruction error
    candidates = sorted(set([
        max(8, n_feat // 2),
        min(32, n_feat),
        min(64, n_feat * 2),
        min(128, n_feat * 4),
    ]))
    print(f"   Mencoba n_components: {candidates}")

    best_recon, best_rbm, best_nc = float('inf'), None, candidates[0]
    for nc in candidates:
        rbm_try = BernoulliRBM(
            n_components=nc,
            learning_rate=0.01,
            batch_size=32,
            n_iter=30,
            random_state=42,
            verbose=0,
        )
        rbm_try.fit(X_binary)
        X_recon   = rbm_try.gibbs(X_binary)
        recon_err = float(np.mean(np.abs(X_binary - X_recon)))
        print(f"   n_components={nc:3d} → recon_error={recon_err:.4f}")
        if recon_err < best_recon:
            best_recon, best_rbm, best_nc = recon_err, rbm_try, nc

    print(f"   Best n_components: {best_nc} (recon_error={best_recon:.4f})")
    rbm = best_rbm

    # Also try a slightly higher learning rate on best nc
    rbm_lr = BernoulliRBM(
        n_components=best_nc,
        learning_rate=0.05,
        batch_size=32,
        n_iter=50,
        random_state=42,
        verbose=0,
    )
    rbm_lr.fit(X_binary)
    X_recon_lr  = rbm_lr.gibbs(X_binary)
    recon_err_lr = float(np.mean(np.abs(X_binary - X_recon_lr)))
    print(f"   n_components={best_nc} lr=0.05 → recon_error={recon_err_lr:.4f}")
    if recon_err_lr < best_recon:
        best_recon, rbm = recon_err_lr, rbm_lr
        print(f"   Higher LR wins → using lr=0.05")

    latent_features = rbm.transform(X_binary)
    pseudo_ll       = float(rbm.score_samples(X_binary).mean())

    print(f"   RBM final | {n_feat} → {best_nc} latent dims")
    print(f"   Reconstruction error: {best_recon:.4f} | Pseudo-likelihood: {pseudo_ll:.2f}")

    rbm_metrics = {
        'n_components':         best_nc,
        'reconstruction_error': round(best_recon, 4),
        'pseudo_likelihood':    round(pseudo_ll, 2),
        'n_iter':               rbm.n_iter,
        'learning_rate':        rbm.learning_rate,
        'latent_range':         [round(float(latent_features.min()), 3),
                                 round(float(latent_features.max()), 3)],
    }

    return rbm, scaler_rbm, latent_features, rbm_metrics


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    print("=" * 55)
    print("  DANA AI — Multi-Layer ML Training")
    print("  HuggingFace + KNN + RF + XGBoost + RBM")
    print("=" * 55)

    print("\n[DATA] Loading KOL data...")
    df = joblib.load(DATA_PATH)
    print(f"   {len(df)} KOL | {df['has_er_data'].sum()} dengan real ER")

    print("\n[PATTERNS] Loading campaign patterns from insight...")
    patterns = load_campaign_patterns()
    if patterns and patterns.get('tier_stats'):
        print("   Tier breakdown dari insight:")
        for tier, stats in patterns['tier_stats'].items():
            print(f"     {tier:8s}: avg ER {stats['avg_er']:.1f}% | "
                  f"n={stats['count']} | excellent={stats['pct_excellent']:.0f}%")

    # ── Layer 1: HuggingFace semantic embeddings ──────────────
    print("\n[LAYER 1] HuggingFace Semantic Embeddings...")
    st_model = load_sentence_transformer()
    cat_embeddings = build_category_embeddings(df, st_model)

    # ── Build tabular features (shared) ──────────────────────
    print("\n[FEATURES] Building tabular features...")
    tabular_features, scaler = build_tabular_features(df, patterns, fit=True)
    print(f"   Tabular shape: {tabular_features.shape}")

    # ── Layer 2: KNN (candidate retrieval) ───────────────────
    print("\n[LAYER 2] KNN Candidate Retrieval...")
    SEMANTIC_WEIGHT = 2.0
    X_full = np.hstack([cat_embeddings * SEMANTIC_WEIGHT, tabular_features])
    print(f"   Full feature matrix: {X_full.shape}")
    k = min(30, len(X_full))
    knn = NearestNeighbors(n_neighbors=k, metric='cosine', algorithm='brute')
    knn.fit(X_full)
    print(f"   KNN fitted (k={k})")

    # ── Layer 3a: Random Forest (ranking) ─────────────────────
    rf_model, rf_scores, rf_metrics = train_random_forest(df, tabular_features, patterns)

    # ── Layer 3b: XGBoost ER predictor ───────────────────────
    xgb_result = train_xgboost_er_predictor(df, tabular_features, patterns)
    if xgb_result is not None:
        xgb_model, xgb_metrics = xgb_result
    else:
        xgb_model, xgb_metrics = None, None

    # ── Layer 3c: RBM latent feature extractor ───────────────
    rbm_model, rbm_scaler, latent_features, rbm_metrics = train_rbm(tabular_features)

    # ── Save all artifacts ────────────────────────────────────
    # FIX: Save HF model name as string instead of pickling the model object.
    # Pickling SentenceTransformer breaks across library version upgrades.
    # The recommender loads it fresh at runtime using the name string.
    print("\n[SAVE] Saving all model artifacts...")
    joblib.dump(df,              os.path.join(MODELS_DIR, 'kol_df.pkl'))
    joblib.dump(X_full,          os.path.join(MODELS_DIR, 'feature_matrix.pkl'))
    joblib.dump(cat_embeddings,  os.path.join(MODELS_DIR, 'cat_embeddings.pkl'))
    joblib.dump(tabular_features, os.path.join(MODELS_DIR, 'tabular_features.pkl'))
    joblib.dump(latent_features,  os.path.join(MODELS_DIR, 'rbm_latent.pkl'))
    joblib.dump(scaler,           os.path.join(MODELS_DIR, 'scaler.pkl'))
    joblib.dump(knn,              os.path.join(MODELS_DIR, 'knn.pkl'))
    joblib.dump(rf_model,         os.path.join(MODELS_DIR, 'rf_model.pkl'))
    joblib.dump(rbm_model,        os.path.join(MODELS_DIR, 'rbm_model.pkl'))
    joblib.dump(rbm_scaler,       os.path.join(MODELS_DIR, 'rbm_scaler.pkl'))

    # Save HF model name as plain text — version-safe
    with open(os.path.join(MODELS_DIR, 'st_model_name.txt'), 'w') as f:
        f.write(HF_MODEL_NAME)
    print(f"   [OK] st_model_name.txt saved (model name: {HF_MODEL_NAME})")

    # Delete old stale pickle if it exists from a previous run
    old_pkl = os.path.join(MODELS_DIR, 'st_model.pkl')
    if os.path.exists(old_pkl):
        os.remove(old_pkl)
        print(f"   [OK] Removed stale st_model.pkl")

    if xgb_model:
        joblib.dump(xgb_model, os.path.join(MODELS_DIR, 'xgb_model.pkl'))

    if patterns:
        with open(os.path.join(MODELS_DIR, 'campaign_patterns.json'), 'w') as f:
            json.dump(patterns, f, indent=2)

    has_patterns = patterns is not None
    meta = {
        'total_kol':             int(len(df)),
        'kol_with_er':           int(df['has_er_data'].sum()),
        'hf_model':              HF_MODEL_NAME,
        'embedding_dim':         int(cat_embeddings.shape[1]),
        'tabular_dim':           int(tabular_features.shape[1]),
        'rbm_latent_dim':        int(latent_features.shape[1]),
        'feature_shape':         list(X_full.shape),
        'semantic_weight':       SEMANTIC_WEIGHT,
        'has_campaign_patterns': has_patterns,
        'campaign_records':      patterns.get('total_with_er', 0) if patterns else 0,
        'best_performing_tier':  patterns.get('best_tier') if patterns else None,
        'overall_avg_er':        patterns.get('overall_avg_er') if patterns else None,
        'tier_stats':            patterns.get('tier_stats', {}) if patterns else {},
        'models': {
            'knn':           True,
            'random_forest': True,
            'xgboost':       xgb_model is not None,
            'rbm':           True,
            'huggingface':   True,
        },
        'metrics': {
            'random_forest': rf_metrics,
            'xgboost':       xgb_metrics,
            'rbm':           rbm_metrics,
        },
        'location_dist':  df['location_norm'].value_counts().to_dict(),
        'type_dist':      df['type_norm'].value_counts().to_dict(),
    }
    with open(os.path.join(MODELS_DIR, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\n{'='*55}")
    print(f"  TRAINING COMPLETE")
    print(f"{'='*55}")
    print(f"  HuggingFace  : {HF_MODEL_NAME} (saved as name string)")
    print(f"  KNN          : fitted (k={k})")
    print(f"  Random Forest: {rf_model.n_estimators} trees, {tabular_features.shape[1]} features")
    print(f"  XGBoost      : {'OK' if xgb_model else 'SKIP (install xgboost)'}")
    print(f"  RBM          : {tabular_features.shape[1]} -> {latent_features.shape[1]} latent dims")
    print(f"  Campaign Patterns: {'Ya (' + str(patterns.get('total_with_er',0)) + ' records)' if has_patterns else 'Tidak'}")
    print(f"  KOL dengan real ER: {df['has_er_data'].sum()}/{len(df)}")
    print(f"{'='*55}")


if __name__ == '__main__':
    main()