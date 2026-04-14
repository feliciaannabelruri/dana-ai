import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import numpy as np
import pandas as pd
import joblib, json, os, random
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error

random.seed(42)
np.random.seed(42)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE_DIR, '..', 'data')
MODELS_DIR = os.path.join(BASE_DIR, '..', 'models')

# ── Konstanta domain ──────────────────────────────────────────
TIERS      = ['nano', 'mikro', 'makro', 'mega']
LOCATIONS  = ['jakarta', 'bandung', 'surabaya', 'yogyakarta', 'bali',
              'sumatra', 'kalimantan', 'sulawesi', 'nasional']
CATEGORIES = [
    'Finance & Investment', 'Career & Self Development', 'Lifestyle',
    'Beauty & Fashion', 'Food & Culinary', 'Travel', 'Parenting',
    'Health & Fitness', 'Entertainment', 'Education', 'Technology',
    'Business & Entrepreneurship', 'Gaming', 'Comedy & Humor',
]
PLATFORMS  = ['tiktok', 'instagram', 'keduanya']

# ── Business rules (ground truth dari domain expertise) ───────
TOPIC_CATEGORY_AFFINITY = {
    # topic_keyword → {category: affinity_score 0-1}
    'finance':      {'Finance & Investment': 1.0, 'Business & Entrepreneurship': 0.8,
                     'Career & Self Development': 0.6, 'Education': 0.5},
    'keuangan':     {'Finance & Investment': 1.0, 'Business & Entrepreneurship': 0.8,
                     'Career & Self Development': 0.6},
    'lifestyle':    {'Lifestyle': 1.0, 'Beauty & Fashion': 0.8, 'Travel': 0.7,
                     'Food & Culinary': 0.7, 'Health & Fitness': 0.6},
    'beauty':       {'Beauty & Fashion': 1.0, 'Lifestyle': 0.8, 'Health & Fitness': 0.6},
    'fashion':      {'Beauty & Fashion': 1.0, 'Lifestyle': 0.9},
    'food':         {'Food & Culinary': 1.0, 'Lifestyle': 0.7, 'Travel': 0.5},
    'travel':       {'Travel': 1.0, 'Lifestyle': 0.8, 'Food & Culinary': 0.6},
    'parenting':    {'Parenting': 1.0, 'Health & Fitness': 0.6, 'Education': 0.6,
                     'Lifestyle': 0.5},
    'health':       {'Health & Fitness': 1.0, 'Lifestyle': 0.6, 'Education': 0.5},
    'education':    {'Education': 1.0, 'Career & Self Development': 0.8,
                     'Technology': 0.5, 'Finance & Investment': 0.4},
    'edukasi':      {'Education': 1.0, 'Career & Self Development': 0.8},
    'technology':   {'Technology': 1.0, 'Business & Entrepreneurship': 0.6,
                     'Career & Self Development': 0.5, 'Gaming': 0.4},
    'gaming':       {'Gaming': 1.0, 'Technology': 0.7, 'Entertainment': 0.6},
    'entertainment':{'Entertainment': 1.0, 'Comedy & Humor': 0.8, 'Lifestyle': 0.5},
    'comedy':       {'Comedy & Humor': 1.0, 'Entertainment': 0.9},
    'business':     {'Business & Entrepreneurship': 1.0, 'Finance & Investment': 0.8,
                     'Career & Self Development': 0.7},
}

LOCATION_PROXIMITY = {
    # Jawa sesama Jawa → 0.7, beda pulau → 0.3, nasional → 0.9
    ('jakarta','jakarta'): 1.0, ('jakarta','nasional'): 0.9,
    ('bandung','jakarta'): 0.7, ('bandung','bandung'): 1.0, ('bandung','nasional'): 0.9,
    ('surabaya','surabaya'): 1.0, ('surabaya','nasional'): 0.9,
    ('surabaya','jakarta'): 0.6, ('surabaya','yogyakarta'): 0.65,
    ('yogyakarta','yogyakarta'): 1.0, ('yogyakarta','nasional'): 0.9,
    ('yogyakarta','jakarta'): 0.65, ('yogyakarta','bandung'): 0.65,
    ('bali','bali'): 1.0, ('bali','nasional'): 0.9,
    ('nasional','nasional'): 1.0,
}

TIER_RATE = {
    'nano':  (500_000,   3_000_000),
    'mikro': (2_000_000, 8_000_000),
    'makro': (7_000_000, 25_000_000),
    'mega':  (20_000_000, 100_000_000),
}

TIER_FOLLOWERS = {
    'nano':  (1_000,    10_000),
    'mikro': (10_001,   100_000),
    'makro': (100_001,  1_000_000),
    'mega':  (1_000_001, 10_000_000),
}

ER_BY_TIER = {
    # mean, std ER% per tier (dari data nyata yang ada)
    'nano':  (12.0, 8.0),
    'mikro': (6.5,  4.0),
    'makro': (2.5,  2.0),
    'mega':  (1.2,  0.8),
}


# ── Feature engineering helpers ───────────────────────────────
def get_topic_category_score(topic_text: str, kol_category: str) -> float:
    """Hitung semantic affinity antara topic campaign dan kategori KOL"""
    text = topic_text.lower()
    best = 0.2  # base score untuk kategori yang tidak match
    for keyword, affinities in TOPIC_CATEGORY_AFFINITY.items():
        if keyword in text:
            score = affinities.get(kol_category, 0.15)
            best = max(best, score)
    return best


def get_location_score(campaign_loc: str, kol_loc: str) -> float:
    key = (campaign_loc, kol_loc)
    rev = (kol_loc, campaign_loc)
    if key in LOCATION_PROXIMITY:    return LOCATION_PROXIMITY[key]
    if rev in LOCATION_PROXIMITY:    return LOCATION_PROXIMITY[rev]
    if kol_loc == 'nasional':        return 0.85
    if campaign_loc == 'nasional':   return 0.85
    # Same location
    if campaign_loc == kol_loc:      return 1.0
    # Different islands default
    return 0.3


def get_budget_score(budget_per_kol: float, rate_min: int, rate_max: int) -> float:
    if rate_min == 0:
        return 0.5
    if budget_per_kol >= rate_max:
        return 1.0
    if budget_per_kol >= rate_min:
        ratio = (budget_per_kol - rate_min) / max(rate_max - rate_min, 1)
        return 0.65 + 0.35 * ratio
    ratio = budget_per_kol / rate_min
    if ratio >= 0.85: return 0.55
    if ratio >= 0.6:  return 0.35
    if ratio >= 0.4:  return 0.18
    return 0.05


def get_er_score(er_pct: float, has_real_er: bool) -> float:
    if has_real_er:
        if er_pct >= 20: return 1.0
        if er_pct >= 10: return 0.88
        if er_pct >= 5:  return 0.72
        if er_pct >= 2:  return 0.52
        return 0.30
    # Estimated ER dari tier
    if er_pct >= 15: return 0.75
    if er_pct >= 8:  return 0.60
    if er_pct >= 4:  return 0.48
    return 0.32


def compute_ground_truth_score(
    topic_cat_score, budget_score, loc_score, er_score,
    tier_match_score, platform_match, has_real_er
) -> float:
    """
    Business rule ground truth score — ini yang Random Forest belajar replicate.
    Bobot: relevance 35%, budget 25%, location 20%, er 12%, tier 5%, platform 3%
    Bonus: 5% kalau ada real ER data
    """
    base = (
        0.35 * topic_cat_score +
        0.25 * budget_score +
        0.20 * loc_score +
        0.12 * er_score +
        0.05 * tier_match_score +
        0.03 * platform_match
    )
    # Real ER bonus
    real_er_bonus = 0.05 if has_real_er else 0.0
    # Add noise untuk realisme
    noise = np.random.normal(0, 0.02)
    return float(np.clip(base + real_er_bonus + noise, 0.05, 1.0))


# ── Synthetic data generation ─────────────────────────────────
def generate_synthetic_data(n_samples=5000, real_er_data=None):
    """
    Generate n_samples simulasi campaign × KOL interactions.
    real_er_data: dict {username: {avg_er_pct, avg_reach, post_count}}
    """
    print(f"[*] Generating {n_samples} synthetic campaign×KOL samples...")

    # Topic templates berdasarkan topik yang sering dipakai di campaign Indonesia
    topic_pool = [
        "finance keuangan investasi",
        "lifestyle gaya hidup",
        "beauty kecantikan fashion",
        "food kuliner makanan",
        "travel wisata liburan",
        "parenting ibu anak keluarga",
        "health kesehatan wellness",
        "education edukasi belajar",
        "technology teknologi digital",
        "business bisnis entrepreneur",
        "gaming esports hiburan",
        "comedy humor entertainment",
        "finance edukasi keuangan",
        "lifestyle beauty fashion",
        "travel food kuliner",
        "parenting health ibu",
        "technology business startup",
        "education career development",
        "health lifestyle wellness",
        "finance business investasi",
    ]

    rows = []
    real_usernames = list(real_er_data.keys()) if real_er_data else []

    for i in range(n_samples):
        # ── Simulasi campaign ──────────────────────────────
        topic_text   = random.choice(topic_pool)
        campaign_loc = random.choice(LOCATIONS)
        budget_total = random.choice([
            5_000_000, 10_000_000, 20_000_000, 30_000_000,
            50_000_000, 75_000_000, 100_000_000, 200_000_000
        ])
        num_kol = random.randint(3, 15)
        budget_per_kol = budget_total / num_kol

        # ── Simulasi KOL ───────────────────────────────────
        tier        = random.choice(TIERS)
        kol_category= random.choice(CATEGORIES)
        kol_loc     = random.choice(LOCATIONS)
        platform    = random.choice(PLATFORMS)

        rate_min, rate_max = TIER_RATE[tier]
        # Add variability
        rate_min = int(rate_min * random.uniform(0.7, 1.3))
        rate_max = int(rate_max * random.uniform(0.7, 1.3))

        fol_min, fol_max = TIER_FOLLOWERS[tier]
        followers = random.randint(fol_min, fol_max)

        # ER: kadang pakai real data (jika ada), kadang synthetic
        use_real_er = (
            real_usernames and
            random.random() < 0.15  # 15% pakai pola real ER
        )
        er_mean, er_std = ER_BY_TIER[tier]
        if use_real_er:
            uname = random.choice(real_usernames)
            er_pct = real_er_data[uname].get('avg_er_pct') or er_mean
            has_real_er = True
        else:
            er_pct = max(0.1, np.random.normal(er_mean, er_std))
            has_real_er = False

        # ── Compute sub-scores ─────────────────────────────
        topic_cat_score = get_topic_category_score(topic_text, kol_category)
        budget_score    = get_budget_score(budget_per_kol, rate_min, rate_max)
        loc_score       = get_location_score(campaign_loc, kol_loc)
        er_score        = get_er_score(er_pct, has_real_er)

        # Tier match: apakah tier sesuai budget?
        budget_tier_ideal = (
            'nano'  if budget_per_kol < 3_000_000  else
            'mikro' if budget_per_kol < 8_000_000  else
            'makro' if budget_per_kol < 25_000_000 else
            'mega'
        )
        tier_match_score = 1.0 if tier == budget_tier_ideal else (
            0.7 if abs(TIERS.index(tier) - TIERS.index(budget_tier_ideal)) == 1 else 0.4
        )

        # Platform match
        campaign_platform = random.choice(['tiktok', 'instagram', 'semua'])
        if campaign_platform == 'semua':
            platform_match = 1.0
        elif campaign_platform in platform:
            platform_match = 1.0
        else:
            platform_match = 0.2

        # ── Ground truth score ─────────────────────────────
        gt_score = compute_ground_truth_score(
            topic_cat_score, budget_score, loc_score, er_score,
            tier_match_score, platform_match, has_real_er
        )

        rows.append({
            # Features (input ke RF)
            'topic_cat_score':  topic_cat_score,
            'budget_score':     budget_score,
            'loc_score':        loc_score,
            'er_score':         er_score,
            'er_pct':           er_pct,
            'has_real_er':      int(has_real_er),
            'tier_match_score': tier_match_score,
            'platform_match':   platform_match,
            'followers_log':    np.log1p(followers),
            'budget_per_kol_log': np.log1p(budget_per_kol),
            'rate_min_log':     np.log1p(rate_min),
            'rate_ratio':       min(budget_per_kol / max(rate_min, 1), 5.0),
            'tier_idx':         TIERS.index(tier),
            'loc_is_nasional':  int(kol_loc == 'nasional'),
            'loc_match_exact':  int(kol_loc == campaign_loc),
            # Target
            'match_score':      gt_score,
        })

    df = pd.DataFrame(rows)
    print(f"   Generated {len(df)} rows")
    print(f"   Score distribution: mean={df['match_score'].mean():.3f}, std={df['match_score'].std():.3f}")
    print(f"   Score range: [{df['match_score'].min():.3f}, {df['match_score'].max():.3f}]")
    print(f"   Real ER samples: {df['has_real_er'].sum()} ({df['has_real_er'].mean()*100:.1f}%)")
    return df


FEATURE_COLS = [
    'topic_cat_score', 'budget_score', 'loc_score', 'er_score',
    'er_pct', 'has_real_er', 'tier_match_score', 'platform_match',
    'followers_log', 'budget_per_kol_log', 'rate_min_log', 'rate_ratio',
    'tier_idx', 'loc_is_nasional', 'loc_match_exact',
]


def train(n_samples=5000):
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Load real ER data kalau ada
    real_er_data = {}
    er_path = os.path.join(DATA_DIR, 'er_data.json')
    if os.path.exists(er_path):
        with open(er_path) as f:
            real_er_data = json.load(f)
        print(f"[*] Loaded {len(real_er_data)} real ER records → akan digunakan sebagai anchor")
    else:
        print("[!] er_data.json tidak ada → semua simulasi pakai estimated ER")

    # Generate synthetic data
    df = generate_synthetic_data(n_samples, real_er_data)

    X = df[FEATURE_COLS].values
    y = df['match_score'].values

    # ── Train Random Forest ───────────────────────────────────
    print("\n[ML] Training Random Forest Regressor (KOL)...")
    rf = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        max_features='sqrt',
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X, y)

    # Cross-validation
    cv_scores = cross_val_score(rf, X, y, cv=5, scoring='neg_mean_absolute_error')
    mae = -cv_scores.mean()
    print(f"   CV MAE: {mae:.4f} (±{cv_scores.std():.4f})")
    print(f"   Artinya: prediksi error rata-rata ±{mae*100:.1f}% dari match score aktual")

    # Feature importance
    importances = dict(zip(FEATURE_COLS, rf.feature_importances_))
    top_features = sorted(importances.items(), key=lambda x: -x[1])[:5]
    print(f"   Top features: {[(f, round(v,3)) for f,v in top_features]}")

    # Save
    joblib.dump(rf, os.path.join(MODELS_DIR, 'rf_kol.pkl'))
    print(f"   [OK] rf_kol.pkl saved")

    # ── Train Gradient Boosting sebagai secondary model ───────
    print("\n[ML] Training Gradient Boosting (KOL) — untuk ensemble...")
    gb = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.8,
        random_state=42,
    )
    gb.fit(X, y)
    cv_gb = cross_val_score(gb, X, y, cv=5, scoring='neg_mean_absolute_error')
    print(f"   GBM CV MAE: {-cv_gb.mean():.4f}")
    joblib.dump(gb, os.path.join(MODELS_DIR, 'gb_kol.pkl'))
    print(f"   [OK] gb_kol.pkl saved")

    # Meta
    meta = {
        'n_samples':       n_samples,
        'feature_cols':    FEATURE_COLS,
        'rf_cv_mae':       round(float(mae), 4),
        'gb_cv_mae':       round(float(-cv_gb.mean()), 4),
        'real_er_records': len(real_er_data),
        'top_features':    {f: round(v, 4) for f, v in top_features},
        'ensemble':        'rf * 0.6 + gb * 0.4',
    }
    with open(os.path.join(MODELS_DIR, 'rf_kol_meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\n[OK] Layer 3 KOL selesai. MAE={mae*100:.1f}%")
    return meta


if __name__ == '__main__':
    meta = train(n_samples=5000)
    print(json.dumps(meta, indent=2))