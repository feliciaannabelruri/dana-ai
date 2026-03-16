"""
recommender.py — Multi-Layer Scoring v3 + Company Profile
==========================================================
FIXED: Hard exact location filter.
- Nasional → semua KOL
- Kota X   → hanya KOL location_norm == kota X (strict, no bleed)
"""
import numpy as np
import pandas as pd
import joblib, os, json
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

try:
    from company_profile import (
        score_kol_fit, get_context_enriched_query, get_profile_summary,
        COMPANY_PROFILE
    )
    _PROFILE_LOADED = True
    print(f"[OK] Company profile loaded: {COMPANY_PROFILE['company_name']}")
except ImportError:
    _PROFILE_LOADED = False
    print("[WARN] company_profile.py tidak ditemukan — brand fit scoring dinonaktifkan")

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

LOCATION_GROUPS = {
    "jakarta":      ["jakarta","jaksel","jakpus","jakbar","jaktim","jakut","jkt",
                     "gading serpong","tangerang","depok","bekasi","bogor","bsd",
                     "serpong","cibubur","cikarang"],
    "bandung":      ["bandung","cimahi"],
    "cirebon":      ["cirebon"],
    "surabaya":     ["surabaya","sidoarjo","pasuruan","kediri","gresik"],
    "malang":       ["malang","batu"],
    "jawa_timur":   ["jawa timur","jatim","banyuwangi","jember","madiun",
                     "lumajang","blitar","mojokerto","probolinggo","lamongan",
                     "tuban","bojonegoro"],
    "yogyakarta":   ["yogyakarta","jogja","sleman","bantul","gunung kidul","kulon progo"],
    "solo":         ["solo","surakarta","karanganyar","wonogiri","klaten","boyolali","sragen"],
    "semarang":     ["semarang","salatiga","kendal","demak","ungaran"],
    "jawa_tengah":  ["jawa tengah","jateng","magelang","purwokerto","cilacap",
                     "banyumas","kebumen","wonosobo","temanggung","kudus",
                     "pati","jepara","rembang","blora","batang","pemalang",
                     "tegal","brebes","pekalongan","purbalingga","banjarnegara","grobogan"],
    "bali":         ["bali","denpasar","badung","gianyar","tabanan","buleleng",
                     "karangasem","klungkung","bangli","jembrana"],
    "sumatra":      ["medan","palembang","pekanbaru","pekan baru","batam","lampung",
                     "padang","aceh","jambi","bengkulu","banda aceh","langsa",
                     "lhokseumawe","binjai","pematangsiantar","lubuklinggau",
                     "prabumulih","dumai","padang sidempuan"],
    "kalimantan":   ["kalimantan","banjarmasin","samarinda","pontianak","balikpapan",
                     "palangkaraya","banjarbaru","tarakan","singkawang","kotabaru"],
    "sulawesi":     ["sulawesi","makassar","manado","gowa","palu","kendari",
                     "gorontalo","mamuju","palopo"],
    "nasional":     ["nasional","national","indonesia"],
}

TIER_NAME_MAP  = {1:'nano', 2:'mikro', 3:'makro', 4:'mega', 5:'mega'}
LOCATION_LIST  = ['jakarta','bandung','cirebon','surabaya','malang','jawa_timur',
                  'yogyakarta','solo','semarang','jawa_tengah',
                  'bali','sumatra','kalimantan','sulawesi','nasional','other','unknown']

WEIGHTS = {
    'semantic':   0.25,
    'rf':         0.17,
    'xgb_er':     0.14,
    'rbm':        0.09,
    'budget':     0.12,
    'location':   0.09,
    'brand_fit':  0.10,
    'pattern':    0.03,
    'tier':       0.01,
}

_cache = {}


# ── Type helpers ─────────────────────────────────────────────────
def to_int(v):
    try:
        if v is None or (isinstance(v, float) and np.isnan(v)): return 0
        return int(v)
    except: return 0

def to_float(v, d=1):
    try:
        if v is None or (isinstance(v, float) and np.isnan(v)): return 0.0
        return round(float(v), d)
    except: return 0.0

def to_str(v):
    if v is None or (isinstance(v, float) and np.isnan(v)): return ''
    return str(v)


def build_contact(pic_contact, social_media, username):
    contact = str(pic_contact).strip() if pic_contact else ''
    contact = contact.replace('+','').replace(' ','').replace('.0','').strip()
    if contact and contact.isdigit() and len(contact) >= 8:
        if contact.startswith('0'): contact = '62' + contact[1:]
        elif not contact.startswith('62'): contact = '62' + contact
        return {'type':'whatsapp','url':f'https://wa.me/{contact}','label':f'WA {contact}'}
    sm    = str(social_media).lower().strip() if social_media else ''
    uname = str(username).strip().lstrip('@') if username else ''
    if 'tiktok' in sm:
        return {'type':'tiktok','url':f'https://tiktok.com/@{uname}','label':f'DM @{uname}'}
    if 'instagram' in sm or sm == 'ig':
        return {'type':'instagram','url':f'https://instagram.com/{uname}','label':f'DM @{uname}'}
    if uname:
        return {'type':'profile','url':f'https://instagram.com/{uname}','label':f'DM @{uname}'}
    return None


# ── Model loader ─────────────────────────────────────────────────
def load_models():
    global _cache
    if _cache: return _cache

    print("[*] Loading all models...")
    _cache = {
        'df':             joblib.load(os.path.join(MODELS_DIR, 'kol_df.pkl')),
        'X':              joblib.load(os.path.join(MODELS_DIR, 'feature_matrix.pkl')),
        'cat_embeddings': joblib.load(os.path.join(MODELS_DIR, 'cat_embeddings.pkl')),
        'scaler':         joblib.load(os.path.join(MODELS_DIR, 'scaler.pkl')),
        'knn':            joblib.load(os.path.join(MODELS_DIR, 'knn.pkl')),
        'st_model':       joblib.load(os.path.join(MODELS_DIR, 'st_model.pkl')),
    }

    for key, filename in [
        ('rf_model',      'rf_model.pkl'),
        ('xgb_model',     'xgb_model.pkl'),
        ('rbm_model',     'rbm_model.pkl'),
        ('rbm_scaler',    'rbm_scaler.pkl'),
        ('rbm_latent',    'rbm_latent.pkl'),
        ('tabular',       'tabular_features.pkl'),
    ]:
        path = os.path.join(MODELS_DIR, filename)
        _cache[key] = joblib.load(path) if os.path.exists(path) else None

    with open(os.path.join(MODELS_DIR, 'meta.json')) as f:
        _cache['meta'] = json.load(f)

    patterns_path = os.path.join(MODELS_DIR, 'campaign_patterns.json')
    _cache['patterns'] = json.load(open(patterns_path)) if os.path.exists(patterns_path) else None

    models_active = [k for k in ['rf_model','xgb_model','rbm_model'] if _cache.get(k)]
    print(f"[OK] {_cache['meta']['total_kol']} KOL | "
          f"Models: HF+KNN+{'+'.join(m.replace('_model','').upper() for m in models_active)} | "
          f"Patterns: {'Ya' if _cache['patterns'] else 'Tidak'}")
    return _cache


# ── Location utils ───────────────────────────────────────────────
def normalize_location_query(loc):
    if not loc: return "nasional"
    loc_lower = loc.lower().strip()
    for group, keywords in LOCATION_GROUPS.items():
        if any(kw in loc_lower for kw in keywords):
            return group
    return "nasional"


def filter_by_location(df, target_loc):
    """
    HARD FILTER — strict exact match, zero bleed:
    - target = 'nasional' → return semua KOL tanpa filter
    - target = kota X     → return HANYA KOL dengan location_norm == kota X
                            KOL nasional TIDAK ikut masuk
    Kalau hasil filter < num_kol, frontend akan dapat lebih sedikit — itu wajar,
    lebih baik sedikit tapi relevan daripada banyak tapi ngawur.
    """
    if target_loc == 'nasional':
        return df

    mask = df['location_norm'] == target_loc
    filtered = df[mask]

    print(f"   [FILTER] Strict location '{target_loc}': {len(filtered)} KOL lolos dari {len(df)}")

    # Kalau tidak ada KOL sama sekali untuk kota ini, kembalikan empty df
    # (jangan fallback ke semua KOL — lebih baik kosong daripada ngawur)
    return filtered


def encode_query(topics, goals, description, st_model, target_audience=""):
    if _PROFILE_LOADED:
        text = get_context_enriched_query(topics, goals, description, target_audience)
    else:
        text = f"{topics} {goals} {description}".strip() or "campaign marketing umum"
    return st_model.encode([text])[0]


def score_brand_fit(category, topics, goals):
    if not _PROFILE_LOADED:
        return 0.5
    return score_kol_fit(category, topics, goals)


def build_row_tabular(row, patterns, scaler):
    overall_avg_er = patterns.get('overall_avg_er', 5.0) if patterns else 5.0
    tier_stats     = patterns.get('tier_stats', {}) if patterns else {}
    optimal_fol    = patterns.get('optimal_followers', {}) if patterns else {}

    loc = row.get('location_norm', 'other')
    loc_oh = [1.0 if loc == l else 0.0 for l in LOCATION_LIST]

    num_raw = np.array([[
        float(row.get('followers_log', 0) or 0),
        float(row.get('tier_score', 2) or 2),
        float(row.get('rate_min', 0) or 0),
        float(row.get('rate_max', 0) or 0),
    ]])
    try:
        num_scaled = scaler.transform(num_raw)[0].tolist()
    except:
        num_scaled = [0.0, 0.5, 0.0, 0.0]

    tier_name = TIER_NAME_MAP.get(to_int(row.get('tier_score', 2)), 'mikro')
    if row.get('has_er_data') and not pd.isna(row.get('avg_er_pct', float('nan'))):
        er = float(row['avg_er_pct'])
        er_s = min(er / 20.0, 1.0)
    elif tier_name in tier_stats:
        er_s = min(tier_stats[tier_name].get('avg_er', overall_avg_er) / 20.0, 1.0) * 0.8
    else:
        n = to_int(row.get('followers_num', 0))
        er_s = 0.65 if n<10_000 else 0.55 if n<50_000 else 0.45 if n<200_000 else 0.35 if n<1_000_000 else 0.25

    ts = tier_stats.get(tier_name, {})
    if ts:
        all_avgs = [s.get('avg_er', 0) for s in tier_stats.values()]
        max_avg  = max(all_avgs) if all_avgs else overall_avg_er
        tier_s   = (ts.get('avg_er', overall_avg_er) / (max_avg + 0.01)) * 0.7 + \
                   (ts.get('pct_good', 30) / 100) * 0.3
    else:
        tier_s = 0.5

    fol = to_int(row.get('followers_num', 0))
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

    tw  = patterns.get('tier_weight_hint', {}).get(tier_name, 1.0) if patterns else 1.0
    ps  = tier_s * 0.50 + fol_s * 0.30 + min(tw / 2.0, 1.0) * 0.20

    feat_vec = np.array(loc_oh + num_scaled + [er_s, ps], dtype=float).reshape(1, -1)
    return feat_vec


# ── Individual scorers ───────────────────────────────────────────
def score_semantic(query_emb, kol_emb):
    sim = cosine_similarity(query_emb.reshape(1,-1), kol_emb.reshape(1,-1))[0][0]
    return float(max(0, sim))


def score_rf(row, m):
    rf = m.get('rf_model')
    if rf is None: return 0.5
    try:
        feat = build_row_tabular(row, m.get('patterns'), m['scaler'])
        pred = rf.predict(feat)[0]
        return float(max(0, min(1, pred)))
    except:
        return 0.5


def score_xgb_er(row, m):
    xgb = m.get('xgb_model')
    if xgb is None:
        if row.get('has_er_data') and not pd.isna(row.get('avg_er_pct', float('nan'))):
            er = float(row['avg_er_pct'])
            return min(er / 20.0, 1.0)
        patterns = m.get('patterns')
        tier_name = TIER_NAME_MAP.get(to_int(row.get('tier_score', 2)), 'mikro')
        if patterns and tier_name in patterns.get('tier_stats', {}):
            tier_avg = patterns['tier_stats'][tier_name].get('avg_er', 5.0)
            return min(tier_avg / 20.0, 1.0) * 0.8
        n = to_int(row.get('followers_num', 0))
        return 0.65 if n<10_000 else 0.55 if n<50_000 else 0.45 if n<200_000 else 0.35 if n<1_000_000 else 0.25

    if row.get('has_er_data') and not pd.isna(row.get('avg_er_pct', float('nan'))):
        er = float(row['avg_er_pct'])
        return min(er / 20.0, 1.0)

    try:
        feat  = build_row_tabular(row, m.get('patterns'), m['scaler'])
        er_pred = float(xgb.predict(feat)[0])
        return min(max(er_pred, 0) / 20.0, 1.0)
    except:
        return 0.4


def score_rbm(kol_idx, m):
    rbm_latent = m.get('rbm_latent')
    rf_model   = m.get('rf_model')

    if rbm_latent is None: return 0.5
    try:
        this_vec = rbm_latent[kol_idx].reshape(1, -1)
        if rf_model is not None and m.get('tabular') is not None:
            rf_scores = rf_model.predict(m['tabular'])
            top_idx   = np.argsort(rf_scores)[-20:]
        else:
            top_idx   = np.arange(min(20, len(rbm_latent)))

        top_vecs = rbm_latent[top_idx]
        sims     = cosine_similarity(this_vec, top_vecs)[0]
        return float(np.mean(sims))
    except:
        return 0.5


def score_budget(rate_min, rate_max, budget_per_kol):
    rate_min = to_int(rate_min)
    rate_max = to_int(rate_max)
    if rate_min == 0: return 0.5
    if budget_per_kol >= rate_max: return 1.0
    if budget_per_kol >= rate_min:
        ratio = (budget_per_kol - rate_min) / (rate_max - rate_min + 1)
        return 0.7 + 0.3 * ratio
    ratio = budget_per_kol / rate_min
    if ratio >= 0.8: return 0.55
    if ratio >= 0.5: return 0.30
    return 0.05


def score_location(kol_loc, target_loc):
    """
    Setelah hard filter, fungsi ini hanya dipakai untuk score internal.
    Semua KOL yang tersisa sudah pasti exact match atau nasional (jika target nasional).
    Kembalikan 1.0 untuk semua — filter sudah dilakukan sebelumnya.
    """
    return 1.0


def score_pattern(row, patterns):
    if not patterns or 'tier_stats' not in patterns: return 0.5
    tier_stats = patterns['tier_stats']
    tier_name  = TIER_NAME_MAP.get(to_int(row.get('tier_score', 2)), 'mikro')
    ts = tier_stats.get(tier_name, {})
    if not ts: return 0.5
    all_avgs = [s.get('avg_er', 0) for s in tier_stats.values()]
    max_avg  = max(all_avgs) if all_avgs else 5.0
    s = (ts.get('avg_er', 5.0) / (max_avg + 0.01)) * 0.6 + \
        (ts.get('pct_good', 30) / 100) * 0.4
    return float(max(0, min(1, s)))


def score_tier(tier_score, preferred_tier):
    pref_map = {'semua':None,'nano':1,'mikro':2,'makro':3,'mega':4}
    pref = pref_map.get((preferred_tier or 'semua').lower())
    if pref is None: return 0.7
    return max(0.0, 1.0 - abs(float(tier_score) - pref) * 0.3)


# ── Main recommend function ──────────────────────────────────────
def recommend(topics, goals, campaign_description, location,
              budget_total, num_kol, content_type="semua", preferred_tier="semua"):

    m          = load_models()
    df         = m['df'].copy()
    df         = df[df['username'].str.strip() != ''].copy()
    patterns   = m.get('patterns')

    budget_per_kol = float(budget_total) / max(num_kol, 1)
    target_loc     = normalize_location_query(location)

    print(f"   [LOC] Input: '{location}' → normalized: '{target_loc}'")

    # ── STEP 1: Hard filter lokasi SEBELUM scoring ───────────────
    df = filter_by_location(df, target_loc)

    # Kalau tidak ada KOL yang lolos filter, kembalikan empty result
    if len(df) == 0:
        print(f"   [WARN] Tidak ada KOL untuk lokasi '{target_loc}'")
        return {
            'recommended_kol':    [],
            'total_kol':          0,
            'budget_per_kol':     int(round(budget_per_kol)),
            'estimated_cost_min': 0,
            'estimated_cost_max': 0,
            'budget_remaining':   int(budget_total),
            'avg_match_score':    0.0,
            'target_location':    target_loc,
            'hf_model_used':      str(m['meta']['hf_model']),
            'models_active':      m['meta'].get('models', {}),
            'campaign_patterns':  None,
            'warning':            f"Tidak ada KOL terdaftar untuk lokasi '{location}'. Coba pilih 'Nasional'.",
        }

    print(f"   [NLP] Encoding query: '{topics} {goals}' (with company context)")
    query_emb = encode_query(topics, goals, campaign_description, m['st_model'], target_audience="")

    # ── STEP 2: Filter platform ──────────────────────────────────
    if content_type.lower() not in ('semua','all',''):
        mask = df['social_media'].str.lower().str.contains(content_type.lower(), na=False)
        df_f = df[mask] if mask.sum() >= 1 else df
    else:
        df_f = df.copy()

    cat_embs   = m['cat_embeddings']
    df_full    = m['df']  # df asli (sebelum filter) untuk index cat_embeddings
    results    = []

    for idx in df_f.index.tolist():
        row     = df_f.loc[idx]
        # abs_idx untuk cat_embeddings harus pakai df asli (bukan df yang sudah difilter)
        abs_idx = df_full.index.get_loc(idx)
        kol_emb = cat_embs[abs_idx]

        s_brand   = score_brand_fit(to_str(row.get('category','')), topics, goals)
        s_sem     = score_semantic(query_emb, kol_emb)
        s_rf      = score_rf(row, m)
        s_xgb     = score_xgb_er(row, m)
        s_rbm     = score_rbm(abs_idx, m)
        s_budget  = score_budget(row['rate_min'], row['rate_max'], budget_per_kol)
        s_loc     = score_location(row['location_norm'], target_loc)  # selalu 1.0 post-filter
        s_pattern = score_pattern(row, patterns)
        s_tier    = score_tier(row['tier_score'], preferred_tier)

        final = (
            WEIGHTS['semantic']  * s_sem +
            WEIGHTS['rf']        * s_rf +
            WEIGHTS['xgb_er']    * s_xgb +
            WEIGHTS['rbm']       * s_rbm +
            WEIGHTS['budget']    * s_budget +
            WEIGHTS['location']  * s_loc +
            WEIGHTS['brand_fit'] * s_brand +
            WEIGHTS['pattern']   * s_pattern +
            WEIGHTS['tier']      * s_tier
        )

        rate_card = {}
        if to_int(row['rate_tiktok']) > 0:  rate_card['Tiktok']   = to_int(row['rate_tiktok'])
        if to_int(row['rate_ig']) > 0:       rate_card['IG Reels'] = to_int(row['rate_ig'])
        if to_int(row['rate_bundling']) > 0: rate_card['Bundling'] = to_int(row['rate_bundling'])

        reasons = []
        if s_sem >= 0.6:
            reasons.append(f"konten relevan dengan topik campaign (semantic {round(s_sem*100)}%)")
        if s_rf >= 0.7:
            reasons.append(f"RF quality score tinggi ({round(s_rf*100)}%)")
        if s_budget >= 0.8:
            reasons.append("rate card sesuai budget")
        elif s_budget >= 0.5:
            reasons.append("rate bisa dinegosiasikan")
        if target_loc != 'nasional':
            reasons.append(f"berlokasi di {to_str(row['location_raw']) or row['location_norm']}")
        if row['has_er_data']:
            try:
                er_val = row.get('avg_er_pct')
                if er_val is not None and not np.isnan(float(er_val)):
                    reasons.append(f"ER aktual {round(float(er_val),1)}% dari {to_int(row['post_count'])} post nyata")
            except: pass
        elif s_xgb >= 0.6:
            reasons.append(f"ER diprediksi tinggi oleh XGBoost ({round(s_xgb*20,1)}%)")
        if _PROFILE_LOADED and s_brand >= 0.6:
            reasons.append(f"kategori KOL cocok dengan topik campaign")
        if patterns and s_pattern >= 0.7:
            tier_name = TIER_NAME_MAP.get(to_int(row.get('tier_score',2)), 'mikro')
            ts = patterns.get('tier_stats', {}).get(tier_name, {})
            if ts:
                reasons.append(f"tier {tier_name} avg ER {ts.get('avg_er',0):.1f}% di campaign sebelumnya")

        er_display = None
        xgb_er_pred = None
        try:
            er_val = row.get('avg_er_pct')
            if row['has_er_data'] and er_val is not None and not np.isnan(float(er_val)):
                er_display = round(float(er_val), 2)
        except: pass

        if m.get('xgb_model') and not row['has_er_data']:
            try:
                feat = build_row_tabular(row, patterns, m['scaler'])
                xgb_er_pred = round(float(m['xgb_model'].predict(feat)[0]), 1)
            except: pass

        results.append({
            'id':             to_int(row['id']),
            'username':       to_str(row['username']),
            'type':           to_str(row['type_raw']),
            'tier':           to_int(row['tier_score']) if pd.notna(row['tier_score']) else None,
            'location':       to_str(row['location_raw']) or to_str(row['location_norm']),
            'social_media':   to_str(row['social_media']),
            'followers':      to_str(row['followers_raw']),
            'followers_num':  to_int(row['followers_num']),
            'category':       to_str(row['category']),
            'pic_name':       to_str(row['pic_name']),
            'rate_card':      rate_card,
            'rate_min':       to_int(row['rate_min']),
            'rate_max':       to_int(row['rate_max']),
            'has_real_er':    bool(row['has_er_data']),
            'avg_er_pct':     er_display,
            'xgb_er_pred':    xgb_er_pred,
            'match_score':    round(float(final) * 100, 1),
            'score_detail': {
                'semantic (HF)':     to_float(s_sem * 100),
                'brand fit':         to_float(s_brand * 100),
                'random forest':     to_float(s_rf * 100),
                'xgboost ER':        to_float(s_xgb * 100),
                'rbm latent':        to_float(s_rbm * 100),
                'budget':            to_float(s_budget * 100),
                'location':          to_float(s_loc * 100),
                'campaign pattern':  to_float(s_pattern * 100),
                'tier':              to_float(s_tier * 100),
            },
            'reasoning':      ' & '.join(reasons) if reasons else 'Profil sesuai parameter campaign',
            'pic_contact':    to_str(row.get('pic_contact', '')),
            'contact_action': build_contact(row.get('pic_contact',''), row['social_media'], row['username']),
        })

    results.sort(key=lambda x: x['match_score'], reverse=True)
    top = results[:num_kol]

    pattern_summary = None
    if patterns:
        pattern_summary = {
            'total_campaign_records': patterns.get('total_with_er', 0),
            'overall_avg_er':         patterns.get('overall_avg_er'),
            'best_tier':              patterns.get('best_tier'),
            'tier_stats':             patterns.get('tier_stats', {}),
        }

    meta = m['meta']
    return {
        'recommended_kol':    top,
        'total_kol':          int(len(top)),
        'budget_per_kol':     int(round(budget_per_kol)),
        'estimated_cost_min': int(sum(r['rate_min'] for r in top)),
        'estimated_cost_max': int(sum(r['rate_max'] for r in top)),
        'budget_remaining':   int(max(0, budget_total - sum(r['rate_min'] for r in top))),
        'avg_match_score':    round(sum(r['match_score'] for r in top)/len(top),1) if top else 0.0,
        'target_location':    target_loc,
        'hf_model_used':      str(meta['hf_model']),
        'models_active':      meta.get('models', {}),
        'campaign_patterns':  pattern_summary,
    }


def get_meta():
    return load_models()['meta']