import numpy as np
import pandas as pd
import joblib, os, json
from sklearn.metrics.pairwise import cosine_similarity

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

LOCATION_GROUPS = {
    "jakarta":    ["jakarta","jaksel","jakpus","gading serpong","tangerang",
                   "depok","bekasi","bogor","bsd","serpong","cibubur","cikarang"],
    "bandung":    ["bandung","cimahi","cirebon"],
    "surabaya":   ["surabaya","sidoarjo","malang","jawa timur","pasuruan","kediri"],
    "yogyakarta": ["yogyakarta","jogja","sleman","solo","semarang","purwokerto","cilacap"],
    "bali":       ["bali","denpasar"],
    "sumatra":    ["medan","palembang","pekanbaru","batam","lampung","padang","aceh","jambi"],
    "kalimantan": ["kalimantan","banjarmasin","samarinda","pontianak","balikpapan"],
    "sulawesi":   ["sulawesi","makassar","manado"],
    "nasional":   ["nasional","national","indonesia"],
}

WEIGHTS = {'semantic':0.40,'budget':0.25,'location':0.18,'er':0.10,'tier':0.07}

_cache = {}

# ── helpers: convert numpy → plain Python ────────────────────
def to_int(v):
    try:
        if v is None: return 0
        if isinstance(v, float) and np.isnan(v): return 0
        return int(v)
    except: return 0

def to_float(v, decimals=1):
    try:
        if v is None: return 0.0
        if isinstance(v, float) and np.isnan(v): return 0.0
        return round(float(v), decimals)
    except: return 0.0

def to_str(v):
    if v is None: return ''
    if isinstance(v, float) and np.isnan(v): return ''
    return str(v)


def build_contact(pic_contact, social_media, username):
    """
    Build contact action:
    - Ada nomor WA  -> wa.me link
    - Tiktok tanpa WA -> tiktok profile
    - Instagram tanpa WA -> ig profile
    """
    contact = str(pic_contact).strip() if pic_contact else ''
    # Bersihkan nomor: hapus +, spasi, strip trailing .0
    contact = contact.replace('+','').replace(' ','').replace('.0','').strip()
    
    if contact and contact.isdigit() and len(contact) >= 8:
        # Pastikan format internasional: 08xxx -> 628xxx
        if contact.startswith('0'):
            contact = '62' + contact[1:]
        elif not contact.startswith('62'):
            contact = '62' + contact
        return {
            'type': 'whatsapp',
            'url': f'https://wa.me/{contact}',
            'label': f'WA {contact}',
        }
    
    # Tidak ada WA -> direct ke profil sosmed
    sm = str(social_media).lower().strip() if social_media else ''
    uname = str(username).strip().lstrip('@') if username else ''
    if 'tiktok' in sm:
        return {
            'type': 'tiktok',
            'url': f'https://tiktok.com/@{uname}',
            'label': f'DM @{uname}',
        }
    if 'instagram' in sm or sm == 'ig':
        return {
            'type': 'instagram',
            'url': f'https://instagram.com/{uname}',
            'label': f'DM @{uname}',
        }
    if uname:
        return {
            'type': 'profile',
            'url': f'https://instagram.com/{uname}',
            'label': f'DM @{uname}',
        }
    return None


def load_models():
    global _cache
    if _cache: return _cache
    print("[*] Loading ML models + HuggingFace embeddings...")
    _cache = {
        'df':             joblib.load(os.path.join(MODELS_DIR,'kol_df.pkl')),
        'X':              joblib.load(os.path.join(MODELS_DIR,'feature_matrix.pkl')),
        'cat_embeddings': joblib.load(os.path.join(MODELS_DIR,'cat_embeddings.pkl')),
        'scaler':         joblib.load(os.path.join(MODELS_DIR,'scaler.pkl')),
        'knn':            joblib.load(os.path.join(MODELS_DIR,'knn.pkl')),
        'st_model':       joblib.load(os.path.join(MODELS_DIR,'st_model.pkl')),
    }
    with open(os.path.join(MODELS_DIR,'meta.json')) as f:
        _cache['meta'] = json.load(f)
    print(f"[OK] {_cache['meta']['total_kol']} KOL loaded | "
          f"{_cache['meta']['kol_with_er']} dengan ER data nyata | "
          f"HF model: {_cache['meta']['hf_model']}")
    return _cache


def normalize_location_query(loc):
    if not loc: return "nasional"
    loc_lower = loc.lower().strip()
    for group, keywords in LOCATION_GROUPS.items():
        if any(kw in loc_lower for kw in keywords): return group
    return "nasional"


def encode_query(topics, goals, description, st_model):
    text = f"{topics} {goals} {description}".strip() or "campaign marketing umum"
    return st_model.encode([text])[0]


def score_semantic(query_emb, kol_emb):
    sim = cosine_similarity(query_emb.reshape(1,-1), kol_emb.reshape(1,-1))[0][0]
    return float(max(0, sim))


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
    if ratio >= 0.5: return 0.3
    return 0.05


def score_location(kol_loc, target_loc):
    if target_loc == 'nasional': return 1.0
    if kol_loc == target_loc: return 1.0
    if kol_loc == 'nasional': return 0.8
    jawa = {'jakarta','bandung','surabaya','yogyakarta'}
    if kol_loc in jawa and target_loc in jawa: return 0.6
    return 0.2


def score_er(has_er_data, avg_er_pct, followers_num):
    try:
        if has_er_data and avg_er_pct is not None and not np.isnan(float(avg_er_pct)):
            er = float(avg_er_pct)
            if er >= 20: return 1.0
            if er >= 10: return 0.85
            if er >= 5:  return 0.7
            if er >= 2:  return 0.5
            return 0.3
    except: pass
    n = to_int(followers_num)
    if n < 10000:    return 0.65
    if n < 50000:    return 0.55
    if n < 200000:   return 0.45
    if n < 1000000:  return 0.35
    return 0.25


def score_tier(tier_score, preferred_tier):
    pref_map = {'semua':None,'nano':1,'mikro':2,'makro':3,'mega':4}
    pref = pref_map.get((preferred_tier or 'semua').lower())
    if pref is None: return 0.7
    return max(0.0, 1.0 - abs(float(tier_score) - pref) * 0.3)


def recommend(topics, goals, campaign_description, location,
              budget_total, num_kol, content_type="semua", preferred_tier="semua"):

    m = load_models()
    df = m['df'].copy()
    df = df[df['username'].str.strip() != ''].copy()

    budget_per_kol = float(budget_total) / max(num_kol, 1)
    target_loc     = normalize_location_query(location)

    print(f"   [NLP] Encoding query: '{topics} {goals}'")
    query_emb = encode_query(topics, goals, campaign_description, m['st_model'])

    if content_type.lower() not in ('semua','all',''):
        mask = df['social_media'].str.lower().str.contains(content_type.lower(), na=False)
        df_f = df[mask] if mask.sum() >= num_kol else df
    else:
        df_f = df.copy()

    cat_embs   = m['cat_embeddings']
    df_indices = df_f.index.tolist()
    results    = []

    for idx in df_indices:
        row     = df_f.loc[idx]
        kol_emb = cat_embs[df.index.get_loc(idx)]

        s_sem  = score_semantic(query_emb, kol_emb)
        s_budg = score_budget(row['rate_min'], row['rate_max'], budget_per_kol)
        s_loc  = score_location(row['location_norm'], target_loc)
        s_er   = score_er(row['has_er_data'], row.get('avg_er_pct'), row['followers_num'])
        s_tier = score_tier(row['tier_score'], preferred_tier)

        final = (WEIGHTS['semantic'] * s_sem +
                 WEIGHTS['budget']   * s_budg +
                 WEIGHTS['location'] * s_loc +
                 WEIGHTS['er']       * s_er +
                 WEIGHTS['tier']     * s_tier)

        rate_card = {}
        if to_int(row['rate_tiktok']) > 0:   rate_card['Tiktok']   = to_int(row['rate_tiktok'])
        if to_int(row['rate_ig']) > 0:        rate_card['IG Reels'] = to_int(row['rate_ig'])
        if to_int(row['rate_bundling']) > 0:  rate_card['Bundling'] = to_int(row['rate_bundling'])

        reasons = []
        if s_sem >= 0.6:    reasons.append(f"konten relevan dengan topik campaign (semantic {round(s_sem*100)}%)")
        if s_budg >= 0.8:   reasons.append("rate card sesuai budget")
        elif s_budg >= 0.5: reasons.append("rate bisa dinegosiasikan")
        if s_loc == 1.0 and target_loc != 'nasional':
            reasons.append(f"berlokasi di {to_str(row['location_raw']) or row['location_norm']}")
        if row['has_er_data']:
            try:
                er_val = row.get('avg_er_pct')
                if er_val is not None and not np.isnan(float(er_val)):
                    reasons.append(f"ER aktual {round(float(er_val),1)}% dari {to_int(row['post_count'])} post nyata")
            except: pass

        er_display = None
        try:
            er_val = row.get('avg_er_pct')
            if row['has_er_data'] and er_val is not None and not np.isnan(float(er_val)):
                er_display = round(float(er_val), 2)
        except: pass

        results.append({
            'id':            to_int(row['id']),
            'username':      to_str(row['username']),
            'type':          to_str(row['type_raw']),
            'tier':          to_int(row['tier_score']) if pd.notna(row['tier_score']) else None,
            'location':      to_str(row['location_raw']) or to_str(row['location_norm']),
            'social_media':  to_str(row['social_media']),
            'followers':     to_str(row['followers_raw']),
            'followers_num': to_int(row['followers_num']),
            'category':      to_str(row['category']),
            'pic_name':      to_str(row['pic_name']),
            'rate_card':     rate_card,
            'rate_min':      to_int(row['rate_min']),
            'rate_max':      to_int(row['rate_max']),
            'has_real_er':   bool(row['has_er_data']),
            'avg_er_pct':    er_display,
            'match_score':   round(float(final) * 100, 1),
            'score_detail': {
                'semantic (HF)': to_float(s_sem * 100),
                'budget':        to_float(s_budg * 100),
                'location':      to_float(s_loc * 100),
                'engagement':    to_float(s_er * 100),
                'tier':          to_float(s_tier * 100),
            },
            'reasoning': ' & '.join(reasons) if reasons else 'Profil sesuai parameter campaign',
            'pic_contact': to_str(row.get('pic_contact', '')),
            'contact_action': build_contact(row.get('pic_contact',''), row['social_media'], row['username']),
        })

    results.sort(key=lambda x: x['match_score'], reverse=True)
    top = results[:num_kol]

    return {
        'recommended_kol':    top,
        'total_kol':          int(len(top)),
        'budget_per_kol':     int(round(budget_per_kol)),
        'estimated_cost_min': int(sum(r['rate_min'] for r in top)),
        'estimated_cost_max': int(sum(r['rate_max'] for r in top)),
        'budget_remaining':   int(max(0, budget_total - sum(r['rate_min'] for r in top))),
        'avg_match_score':    round(sum(r['match_score'] for r in top)/len(top),1) if top else 0.0,
        'target_location':    target_loc,
        'hf_model_used':      str(_cache['meta']['hf_model']),
    }


def get_meta():
    return load_models()['meta']