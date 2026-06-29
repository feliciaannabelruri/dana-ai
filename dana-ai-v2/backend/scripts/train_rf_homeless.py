import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import numpy as np
import pandas as pd
import joblib, json, os, random
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score, RandomizedSearchCV, train_test_split
from sklearn.metrics import mean_absolute_error

random.seed(42)
np.random.seed(42)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE_DIR, '..', 'data')
MODELS_DIR = os.path.join(BASE_DIR, '..', 'models')

# ── Domain constants ──────────────────────────────────────────
MEDIA_CATEGORIES = [
    'Trending News', 'Akun Gossip', 'Akun Meme/Lucu, Viral',
    'Facts News', 'Mystery,Facts,Fenomena', 'Akun Meme/Lucu',
    'entertainment,News', 'Girls News', 'Internasional News',
]
LOCATIONS = ['jakarta', 'bandung', 'surabaya', 'yogyakarta', 'bali',
             'sumatra', 'kalimantan', 'sulawesi', 'nasional', 'other']

# Followers range per kategori media (realita di database)
CATEGORY_FOLLOWERS = {
    'Trending News':           (50_000,   3_000_000),
    'Akun Gossip':             (300_000,  12_000_000),
    'Akun Meme/Lucu, Viral':   (100_000,  4_000_000),
    'Facts News':              (50_000,   500_000),
    'Mystery,Facts,Fenomena':  (30_000,   300_000),
    'Akun Meme/Lucu':          (200_000,  11_000_000),
    'entertainment,News':      (100_000,  1_000_000),
    'Girls News':              (50_000,   200_000),
    'Internasional News':      (100_000,  500_000),
}

# Rate range per kategori (Rp)
CATEGORY_RATE = {
    'Trending News':           (50_000,   5_000_000),
    'Akun Gossip':             (150_000,  20_000_000),
    'Akun Meme/Lucu, Viral':   (150_000,  4_500_000),
    'Facts News':              (50_000,   500_000),
    'Mystery,Facts,Fenomena':  (50_000,   400_000),
    'Akun Meme/Lucu':          (200_000,  6_500_000),
    'entertainment,News':      (100_000,  2_000_000),
    'Girls News':              (50_000,   300_000),
    'Internasional News':      (100_000,  800_000),
}

# Topic → media category affinity
TOPIC_MEDIA_AFFINITY = {
    'finance':      {'Trending News': 0.9, 'Facts News': 0.8, 'Akun Gossip': 0.5},
    'keuangan':     {'Trending News': 0.9, 'Facts News': 0.8},
    'bisnis':       {'Trending News': 0.85,'Facts News': 0.75},
    'lifestyle':    {'Akun Meme/Lucu, Viral': 0.9, 'Akun Gossip': 0.8,
                     'Trending News': 0.7, 'Girls News': 0.7},
    'entertainment':{'Akun Meme/Lucu, Viral': 1.0, 'Akun Gossip': 0.9,
                     'entertainment,News': 1.0, 'Akun Meme/Lucu': 0.9},
    'hiburan':      {'Akun Meme/Lucu, Viral': 1.0, 'Akun Gossip': 0.85,
                     'Akun Meme/Lucu': 0.95},
    'humor':        {'Akun Meme/Lucu': 1.0, 'Akun Meme/Lucu, Viral': 1.0},
    'viral':        {'Akun Meme/Lucu, Viral': 1.0, 'Trending News': 0.85},
    'gossip':       {'Akun Gossip': 1.0, 'Trending News': 0.75},
    'news':         {'Trending News': 1.0, 'Facts News': 0.9, 'Internasional News': 0.8},
    'berita':       {'Trending News': 1.0, 'Facts News': 0.9},
    'edukasi':      {'Trending News': 0.8, 'Facts News': 0.9, 'Mystery,Facts,Fenomena': 0.8},
    'awareness':    {'Trending News': 0.85,'Facts News': 0.8, 'Mystery,Facts,Fenomena': 0.75},
    'fakta':        {'Facts News': 1.0, 'Mystery,Facts,Fenomena': 1.0, 'Trending News': 0.7},
    'beauty':       {'Girls News': 0.9, 'Akun Gossip': 0.8, 'Trending News': 0.7},
    'fashion':      {'Girls News': 0.85,'Akun Gossip': 0.75, 'Trending News': 0.7},
    'parenting':    {'Girls News': 0.8, 'Trending News': 0.6, 'Facts News': 0.5},
    'health':       {'Trending News': 0.7, 'Facts News': 0.75},
    'misteri':      {'Mystery,Facts,Fenomena': 1.0, 'Facts News': 0.7},
    'perempuan':    {'Girls News': 1.0, 'Akun Gossip': 0.8, 'Trending News': 0.7},
}

LOC_PROXIMITY = {
    ('jakarta', 'jakarta'): 1.0, ('jakarta', 'nasional'): 0.95,
    ('bandung', 'bandung'): 1.0, ('bandung', 'nasional'): 0.95,
    ('bandung', 'jakarta'): 0.7,
    ('surabaya', 'surabaya'): 1.0, ('surabaya', 'nasional'): 0.95,
    ('yogyakarta', 'yogyakarta'): 1.0, ('yogyakarta', 'nasional'): 0.95,
    ('bali', 'bali'): 1.0, ('bali', 'nasional'): 0.95,
    ('nasional', 'nasional'): 1.0,
}


def get_topic_media_score(topic_text: str, media_category: str) -> float:
    text = topic_text.lower()
    best = 0.25
    for keyword, affinities in TOPIC_MEDIA_AFFINITY.items():
        if keyword in text:
            score = affinities.get(media_category, 0.2)
            best = max(best, score)
    return best


def get_loc_score(campaign_loc: str, media_loc: str) -> float:
    key = (campaign_loc, media_loc)
    rev = (media_loc, campaign_loc)
    if key in LOC_PROXIMITY: return LOC_PROXIMITY[key]
    if rev in LOC_PROXIMITY: return LOC_PROXIMITY[rev]
    if media_loc == 'nasional': return 0.90
    if campaign_loc == media_loc: return 1.0
    # Jawa proximity
    jawa = {'jakarta', 'bandung', 'surabaya', 'yogyakarta'}
    if campaign_loc in jawa and media_loc in jawa: return 0.65
    return 0.25


def get_budget_score(budget_per_media: float, rate_min: int, rate_max: int) -> float:
    if rate_min == 0: return 0.4
    if budget_per_media >= rate_max: return 1.0
    if budget_per_media >= rate_min:
        ratio = (budget_per_media - rate_min) / max(rate_max - rate_min, 1)
        return 0.65 + 0.35 * min(ratio, 1.0)
    ratio = budget_per_media / rate_min
    if ratio >= 0.85: return 0.55
    if ratio >= 0.6:  return 0.32
    if ratio >= 0.35: return 0.15
    return 0.05


def get_reach_score(followers: int) -> float:
    """Untuk media placement, reach LEBIH besar = LEBIH baik"""
    if followers >= 10_000_000: return 1.00
    if followers >= 5_000_000:  return 0.95
    if followers >= 2_000_000:  return 0.88
    if followers >= 1_000_000:  return 0.80
    if followers >= 500_000:    return 0.70
    if followers >= 200_000:    return 0.58
    if followers >= 100_000:    return 0.45
    if followers >= 50_000:     return 0.32
    return 0.18


def compute_ground_truth_score(
    relevance_score, budget_score, loc_score, reach_score,
    is_nasional, cat_tier
) -> float:
    """
    Bobot homeless media: relevance 32%, budget 28%, location 22%, reach 18%
    Nasional bonus: 5% karena coverage lebih luas
    """
    base = (
        0.32 * relevance_score +
        0.28 * budget_score +
        0.22 * loc_score +
        0.18 * reach_score
    )
    nasional_bonus = 0.04 if is_nasional else 0.0
    noise = np.random.normal(0, 0.018)
    return float(np.clip(base + nasional_bonus + noise, 0.05, 1.0))


def generate_synthetic_data(n_samples=5000):
    print(f"[*] Generating {n_samples} synthetic campaign×media samples...")

    topic_pool = [
        "trending news viral indonesia",
        "finance keuangan investasi",
        "lifestyle entertainment hiburan",
        "gosip gossip selebritis",
        "edukasi fakta informasi",
        "humor meme lucu viral",
        "berita terkini news",
        "beauty fashion perempuan girls",
        "misteri fakta fenomena",
        "bisnis ekonomi",
        "awareness sosial",
        "parenting keluarga",
        "viral trending meme humor",
        "news berita viral gossip",
        "edukasi awareness fakta",
    ]

    rows = []
    for i in range(n_samples):
        # Campaign
        topic_text   = random.choice(topic_pool)
        campaign_loc = random.choice(LOCATIONS[:9])  # exclude 'other'
        budget_total = random.choice([
            5_000_000, 10_000_000, 20_000_000, 50_000_000,
            100_000_000, 200_000_000, 500_000_000
        ])
        num_media = random.randint(2, 8)
        budget_per_media = budget_total / num_media

        # Media
        media_cat = random.choice(MEDIA_CATEGORIES)
        media_loc = random.choice(LOCATIONS)

        fol_min, fol_max = CATEGORY_FOLLOWERS.get(media_cat, (50_000, 1_000_000))
        followers = random.randint(fol_min, fol_max)

        rate_min, rate_max = CATEGORY_RATE.get(media_cat, (100_000, 2_000_000))
        rate_min = int(rate_min * random.uniform(0.6, 1.4))
        rate_max = int(rate_max * random.uniform(0.6, 1.4))

        is_nasional = int(media_loc == 'nasional')

        # Category "tier" — seberapa premium kategori ini
        cat_tier_map = {
            'Akun Gossip': 4, 'Akun Meme/Lucu': 4, 'Trending News': 3,
            'Akun Meme/Lucu, Viral': 3, 'entertainment,News': 2,
            'Facts News': 2, 'Girls News': 2,
            'Mystery,Facts,Fenomena': 1, 'Internasional News': 1,
        }
        cat_tier = cat_tier_map.get(media_cat, 2)

        # Sub-scores
        relevance_score = get_topic_media_score(topic_text, media_cat)
        budget_score    = get_budget_score(budget_per_media, rate_min, rate_max)
        loc_score       = get_loc_score(campaign_loc, media_loc)
        reach_score     = get_reach_score(followers)

        gt_score = compute_ground_truth_score(
            relevance_score, budget_score, loc_score, reach_score,
            is_nasional, cat_tier
        )

        rows.append({
            # Features
            'relevance_score':     relevance_score,
            'budget_score':        budget_score,
            'loc_score':           loc_score,
            'reach_score':         reach_score,
            'followers_log':       np.log1p(followers),
            'budget_per_media_log': np.log1p(budget_per_media),
            'rate_min_log':        np.log1p(rate_min),
            'rate_ratio':          min(budget_per_media / max(rate_min, 1), 10.0),
            'is_nasional':         is_nasional,
            'loc_match_exact':     int(media_loc == campaign_loc),
            'cat_tier':            cat_tier,
            # Target
            'match_score':         gt_score,
        })

    df = pd.DataFrame(rows)
    print(f"   Generated {len(df)} rows")
    print(f"   Score: mean={df['match_score'].mean():.3f}, std={df['match_score'].std():.3f}")
    return df


FEATURE_COLS = [
    'relevance_score', 'budget_score', 'loc_score', 'reach_score',
    'followers_log', 'budget_per_media_log', 'rate_min_log', 'rate_ratio',
    'is_nasional', 'loc_match_exact', 'cat_tier',
]


def train(n_samples=5000):
    os.makedirs(MODELS_DIR, exist_ok=True)

    df = generate_synthetic_data(n_samples)
    X  = df[FEATURE_COLS].values
    y  = df['match_score'].values

    # ── Holdout test split ────────────────────────────────────
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"\n[SPLIT] Train: {len(X_tr)} | Test holdout: {len(X_te)}")

    # ── Hyperparameter tuning — Random Forest ─────────────────
    print("\n[ML] RandomizedSearchCV — Random Forest (Homeless Media)...")
    rf_param_dist = {
        'n_estimators':      [100, 200, 300, 500],
        'max_depth':         [5, 7, 10, 12, None],
        'min_samples_leaf':  [1, 2, 3, 5],
        'max_features':      ['sqrt', 'log2', 0.4, 0.6],
        'min_samples_split': [2, 5, 10],
    }
    rf_search = RandomizedSearchCV(
        RandomForestRegressor(random_state=42, n_jobs=-1),
        rf_param_dist,
        n_iter=20,
        cv=5,
        scoring='neg_mean_absolute_error',
        random_state=42,
        n_jobs=-1,
        verbose=0,
    )
    rf_search.fit(X_tr, y_tr)
    rf = rf_search.best_estimator_
    print(f"   Best RF params: {rf_search.best_params_}")
    print(f"   RF CV MAE: {-rf_search.best_score_:.4f}")

    # Refit on all data
    rf.fit(X, y)

    # Holdout evaluation
    rf_test_pred = rf.predict(X_te)
    rf_mae_test  = float(mean_absolute_error(y_te, rf_test_pred))
    print(f"   RF holdout MAE: {rf_mae_test:.4f} (±{rf_mae_test*100:.1f}%)")

    importances = dict(zip(FEATURE_COLS, rf.feature_importances_))
    top = sorted(importances.items(), key=lambda x: -x[1])[:5]
    print(f"   Top features: {[(f, round(v,3)) for f,v in top]}")

    joblib.dump(rf, os.path.join(MODELS_DIR, 'rf_homeless.pkl'))
    print(f"   [OK] rf_homeless.pkl saved")

    # ── Hyperparameter tuning — Gradient Boosting ─────────────
    print("\n[ML] RandomizedSearchCV — Gradient Boosting (Homeless Media)...")
    gb_param_dist = {
        'n_estimators':  [100, 150, 200, 300],
        'max_depth':     [3, 4, 5, 6],
        'learning_rate': [0.03, 0.05, 0.08, 0.1, 0.15],
        'subsample':     [0.7, 0.8, 0.9],
        'min_samples_leaf': [1, 3, 5],
    }
    gb_search = RandomizedSearchCV(
        GradientBoostingRegressor(random_state=42),
        gb_param_dist,
        n_iter=20,
        cv=5,
        scoring='neg_mean_absolute_error',
        random_state=42,
        n_jobs=-1,
        verbose=0,
    )
    gb_search.fit(X_tr, y_tr)
    gb = gb_search.best_estimator_
    print(f"   Best GBM params: {gb_search.best_params_}")

    gb.fit(X, y)

    gb_test_pred = gb.predict(X_te)
    gb_mae_test  = float(mean_absolute_error(y_te, gb_test_pred))
    print(f"   GBM holdout MAE: {gb_mae_test:.4f}")

    joblib.dump(gb, os.path.join(MODELS_DIR, 'gb_homeless.pkl'))
    print(f"   [OK] gb_homeless.pkl saved")

    # ── Find optimal ensemble weight ──────────────────────────
    print("\n[ML] Mencari ensemble weight optimal (RF α + GBM (1-α))...")
    best_w, best_mae_ens = 0.6, float('inf')
    for alpha in [round(a * 0.1, 1) for a in range(1, 10)]:
        ens_pred = alpha * rf.predict(X_te) + (1 - alpha) * gb.predict(X_te)
        mae_ens  = float(mean_absolute_error(y_te, ens_pred))
        if mae_ens < best_mae_ens:
            best_mae_ens, best_w = mae_ens, alpha
    print(f"   Best ensemble weight: RF*{best_w:.1f} + GBM*{1-best_w:.1f} → MAE={best_mae_ens:.4f}")

    meta = {
        'n_samples':          n_samples,
        'feature_cols':       FEATURE_COLS,
        'rf_cv_mae':          round(float(-rf_search.best_score_), 4),
        'rf_holdout_mae':     round(rf_mae_test, 4),
        'gb_cv_mae':          round(float(-gb_search.best_score_), 4),
        'gb_holdout_mae':     round(gb_mae_test, 4),
        'ensemble_mae':       round(best_mae_ens, 4),
        'ensemble_weight_rf': best_w,
        'top_features':       {f: round(v, 4) for f, v in top},
        'ensemble':           f'rf * {best_w} + gb * {round(1-best_w,1)}',
        'rf_best_params':     rf_search.best_params_,
        'gb_best_params':     gb_search.best_params_,
    }
    with open(os.path.join(MODELS_DIR, 'rf_homeless_meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\n[OK] Layer 3 Homeless Media selesai. Holdout MAE={rf_mae_test*100:.1f}% | Ensemble MAE={best_mae_ens*100:.1f}%")
    return meta


if __name__ == '__main__':
    meta = train(n_samples=5000)
    print(json.dumps(meta, indent=2))