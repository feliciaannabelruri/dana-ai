"""
homeless_recommender.py  — Layer 1 + Layer 3
============================================
Layer 1: Rule-based scoring (relevance, budget, location, reach)
Layer 3: Random Forest ensemble dari synthetic data
Final  : 40% Layer1 + 60% Layer3 (jika RF tersedia)
"""
import json, os
import numpy as np
import joblib

DATA_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
HOMELESS_MEDIA_PATH = os.path.join(DATA_DIR, 'homeless_media.json')

_rf_cache = {}

LOCATION_GROUPS = {
    "jakarta":    ["jakarta","jaksel","jakpus","jakbar","jaktim","jakut","jkt",
                   "gading serpong","tangerang","depok","bekasi","bogor","bsd","serpong","cibubur","cikarang"],
    "bandung":    ["bandung","cimahi","cirebon"],
    "surabaya":   ["surabaya","sidoarjo","malang","jawa timur","jatim","pasuruan","kediri",
                   "gresik","banyuwangi","jember"],
    "yogyakarta": ["yogyakarta","jogja","sleman","solo","magelang","semarang","purwokerto","cilacap"],
    "bali":       ["bali","denpasar","badung"],
    "sumatra":    ["medan","palembang","pekanbaru","batam","lampung","padang","aceh","jambi"],
    "kalimantan": ["kalimantan","banjarmasin","samarinda","pontianak","balikpapan"],
    "sulawesi":   ["sulawesi","makassar","manado","gowa"],
    "nasional":   ["nasional","national","indonesia"],
}

TOPIC_TO_CATEGORY = {
    "finance": ["Trending News","Facts News","Akun Gossip"],
    "keuangan": ["Trending News","Facts News","Akun Gossip"],
    "bisnis": ["Trending News","Facts News"],
    "business": ["Trending News","Facts News"],
    "lifestyle": ["Akun Meme/Lucu, Viral","Akun Meme/Lucu","Akun Gossip","Trending News"],
    "entertainment": ["Akun Meme/Lucu, Viral","Akun Gossip","entertainment,News"],
    "hiburan": ["Akun Meme/Lucu, Viral","Akun Gossip"],
    "humor": ["Akun Meme/Lucu, Viral","Akun Meme/Lucu"],
    "meme": ["Akun Meme/Lucu, Viral","Akun Meme/Lucu"],
    "viral": ["Akun Meme/Lucu, Viral","Trending News"],
    "gossip": ["Akun Gossip","Trending News"],
    "gosip": ["Akun Gossip","Trending News"],
    "news": ["Trending News","Facts News","Internasional News"],
    "berita": ["Trending News","Facts News"],
    "edukasi": ["Trending News","Facts News","Mystery,Facts,Fenomena"],
    "awareness": ["Trending News","Facts News","Mystery,Facts,Fenomena"],
    "fakta": ["Mystery,Facts,Fenomena","Facts News"],
    "beauty": ["Girls News","Akun Gossip","Trending News"],
    "fashion": ["Girls News","Akun Gossip","Trending News"],
    "parenting": ["Girls News","Trending News"],
    "perempuan": ["Girls News","Trending News"],
    "misteri": ["Mystery,Facts,Fenomena"],
}

TOPIC_MEDIA_AFFINITY = {
    'finance':      {'Trending News':0.9,'Facts News':0.8,'Akun Gossip':0.5},
    'keuangan':     {'Trending News':0.9,'Facts News':0.8},
    'bisnis':       {'Trending News':0.85,'Facts News':0.75},
    'lifestyle':    {'Akun Meme/Lucu, Viral':0.9,'Akun Gossip':0.8,'Trending News':0.7,'Girls News':0.7},
    'entertainment':{'Akun Meme/Lucu, Viral':1.0,'Akun Gossip':0.9,'entertainment,News':1.0,'Akun Meme/Lucu':0.9},
    'hiburan':      {'Akun Meme/Lucu, Viral':1.0,'Akun Gossip':0.85,'Akun Meme/Lucu':0.95},
    'humor':        {'Akun Meme/Lucu':1.0,'Akun Meme/Lucu, Viral':1.0},
    'viral':        {'Akun Meme/Lucu, Viral':1.0,'Trending News':0.85},
    'gossip':       {'Akun Gossip':1.0,'Trending News':0.75},
    'gosip':        {'Akun Gossip':1.0,'Trending News':0.75},
    'news':         {'Trending News':1.0,'Facts News':0.9,'Internasional News':0.8},
    'berita':       {'Trending News':1.0,'Facts News':0.9},
    'edukasi':      {'Trending News':0.8,'Facts News':0.9,'Mystery,Facts,Fenomena':0.8},
    'awareness':    {'Trending News':0.85,'Facts News':0.8,'Mystery,Facts,Fenomena':0.75},
    'fakta':        {'Facts News':1.0,'Mystery,Facts,Fenomena':1.0,'Trending News':0.7},
    'beauty':       {'Girls News':0.9,'Akun Gossip':0.8,'Trending News':0.7},
    'fashion':      {'Girls News':0.85,'Akun Gossip':0.75,'Trending News':0.7},
    'parenting':    {'Girls News':0.8,'Trending News':0.6,'Facts News':0.5},
    'health':       {'Trending News':0.7,'Facts News':0.75},
    'misteri':      {'Mystery,Facts,Fenomena':1.0,'Facts News':0.7},
    'perempuan':    {'Girls News':1.0,'Akun Gossip':0.8,'Trending News':0.7},
}

CAT_TIER_MAP = {
    'Akun Gossip':4,'Akun Meme/Lucu':4,'Trending News':3,
    'Akun Meme/Lucu, Viral':3,'entertainment,News':2,
    'Facts News':2,'Girls News':2,'Mystery,Facts,Fenomena':1,'Internasional News':1,
}

LOC_PROXIMITY = {
    ('jakarta','jakarta'):1.0,('jakarta','nasional'):0.95,
    ('bandung','bandung'):1.0,('bandung','nasional'):0.95,('bandung','jakarta'):0.7,
    ('surabaya','surabaya'):1.0,('surabaya','nasional'):0.95,
    ('yogyakarta','yogyakarta'):1.0,('yogyakarta','nasional'):0.95,
    ('bali','bali'):1.0,('bali','nasional'):0.95,
    ('nasional','nasional'):1.0,
}


def load_rf_models():
    global _rf_cache
    if _rf_cache: return _rf_cache
    rf_path = os.path.join(MODELS_DIR,'rf_homeless.pkl')
    gb_path = os.path.join(MODELS_DIR,'gb_homeless.pkl')
    if os.path.exists(rf_path) and os.path.exists(gb_path):
        _rf_cache['rf'] = joblib.load(rf_path)
        _rf_cache['gb'] = joblib.load(gb_path)
        meta_path = os.path.join(MODELS_DIR,'rf_homeless_meta.json')
        if os.path.exists(meta_path):
            with open(meta_path) as f:
                _rf_cache['meta'] = json.load(f)
        print(f"[OK] Layer 3 Homeless Media RF loaded")
    else:
        _rf_cache['rf'] = None
        _rf_cache['gb'] = None
        print("[!] Layer 3 Homeless Media RF not found")
    return _rf_cache


def normalize_location_query(loc):
    if not loc: return "nasional"
    loc_lower = loc.lower().strip()
    for group, keywords in LOCATION_GROUPS.items():
        if any(kw in loc_lower for kw in keywords): return group
    return "nasional"


def get_relevant_categories(topics, goals, description):
    text = f"{topics} {goals} {description}".lower()
    relevant = set()
    for keyword, cats in TOPIC_TO_CATEGORY.items():
        if keyword in text:
            relevant.update(cats)
    if not relevant:
        return ["Trending News","Facts News","Akun Meme/Lucu, Viral"]
    return list(relevant)


def get_topic_media_score(topic_text, media_category):
    text = topic_text.lower()
    best = 0.25
    for keyword, affinities in TOPIC_MEDIA_AFFINITY.items():
        if keyword in text:
            score = affinities.get(media_category, 0.2)
            best  = max(best, score)
    return best


def get_loc_score(campaign_loc, media_loc):
    key = (campaign_loc, media_loc)
    rev = (media_loc, campaign_loc)
    if key in LOC_PROXIMITY: return LOC_PROXIMITY[key]
    if rev in LOC_PROXIMITY: return LOC_PROXIMITY[rev]
    if media_loc == 'nasional': return 0.90
    if campaign_loc == media_loc: return 1.0
    jawa = {'jakarta','bandung','surabaya','yogyakarta'}
    if campaign_loc in jawa and media_loc in jawa: return 0.65
    return 0.25


def get_budget_score(budget_per_media, rate_min, rate_max):
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


def get_reach_score(followers):
    if followers >= 10_000_000: return 1.00
    if followers >= 5_000_000:  return 0.95
    if followers >= 2_000_000:  return 0.88
    if followers >= 1_000_000:  return 0.80
    if followers >= 500_000:    return 0.70
    if followers >= 200_000:    return 0.58
    if followers >= 100_000:    return 0.45
    if followers >= 50_000:     return 0.32
    return 0.18


def predict_rf(rf, gb, fv):
    x = np.array(fv).reshape(1,-1)
    return float(np.clip(0.6*float(rf.predict(x)[0]) + 0.4*float(gb.predict(x)[0]), 0.0, 1.0))


def recommend_homeless_media(topics="", goals="", campaign_description="",
                              location="nasional", budget_total=0, num_media=5,
                              content_type="semua"):
    if not os.path.exists(HOMELESS_MEDIA_PATH):
        return {'recommended_media':[],'total_media':0,
                'note':'Homeless Media belum diload. Upload HomelessMedia.xlsx dulu.'}

    with open(HOMELESS_MEDIA_PATH,'r',encoding='utf-8') as f:
        all_media = json.load(f)

    rf_models  = load_rf_models()
    has_layer3 = rf_models.get('rf') is not None

    target_loc       = normalize_location_query(location)
    budget_per_media = float(budget_total) / max(num_media, 1)
    relevant_cats    = get_relevant_categories(topics, goals, campaign_description)
    topic_text       = f"{topics} {goals} {campaign_description}"

    filtered = all_media
    if content_type.lower() not in ('semua','all',''):
        ct = content_type.lower()
        filtered = [m for m in all_media if ct in m.get('social_media','').lower()] or all_media

    results = []
    for media in filtered:
        followers  = media.get('followers_num', 0)
        rate_min   = media.get('rate_min', 0)
        rate_max   = media.get('rate_max', 0)
        media_loc  = media.get('location_norm','nasional')
        cat        = media.get('category','')
        cat_tier   = CAT_TIER_MAP.get(cat, 2)
        is_nasional= int(media_loc == 'nasional')
        loc_match  = int(media_loc == target_loc)

        relevance_score = get_topic_media_score(topic_text, cat)
        budget_score    = get_budget_score(budget_per_media, rate_min, rate_max)
        loc_score       = get_loc_score(target_loc, media_loc)
        reach_score     = get_reach_score(followers)

        layer1 = 0.32*relevance_score + 0.28*budget_score + 0.22*loc_score + 0.18*reach_score

        if has_layer3:
            fv = [
                relevance_score, budget_score, loc_score, reach_score,
                float(np.log1p(followers)), float(np.log1p(budget_per_media)),
                float(np.log1p(rate_min)),
                min(budget_per_media / max(rate_min,1), 10.0),
                is_nasional, loc_match, int(cat_tier),
            ]
            layer3 = predict_rf(rf_models['rf'], rf_models['gb'], fv)
            final  = 0.40 * layer1 + 0.60 * layer3
        else:
            layer3 = None
            final  = layer1

        reasons = []
        if relevance_score >= 0.8: reasons.append(f"kategori '{cat}' sangat relevan")
        elif relevance_score >= 0.6: reasons.append(f"kategori '{cat}' relevan")
        if budget_score >= 0.7: reasons.append("rate sesuai budget")
        elif budget_score >= 0.4: reasons.append("rate bisa dinegosiasikan")
        if is_nasional: reasons.append("coverage nasional")
        elif loc_score == 1.0: reasons.append(f"media lokal {media.get('location_raw','')}")
        if reach_score >= 0.88: reasons.append(f"reach besar ({media.get('followers_raw','')} followers)")
        if has_layer3 and layer3: reasons.append(f"RF score {round(layer3*100,1)}%")

        score_detail = {
            'relevance': round(relevance_score*100,1),
            'budget':    round(budget_score*100,1),
            'location':  round(loc_score*100,1),
            'reach':     round(reach_score*100,1),
        }
        if has_layer3 and layer3 is not None:
            score_detail['RF ensemble'] = round(layer3*100, 1)

        results.append({
            'id':            media['id'],
            'username':      media['username'],
            'social_media':  media['social_media'],
            'followers':     media['followers_raw'],
            'followers_num': followers,
            'category':      cat,
            'location':      media['location_raw'],
            'location_norm': media_loc,
            'pic_name':      media.get('pic_name',''),
            'rate_card':     media.get('rate_card',{}),
            'rate_min':      rate_min,
            'rate_max':      rate_max,
            'contact_action':media.get('contact_action'),
            'match_score':   round(float(final)*100, 1),
            'score_detail':  score_detail,
            'layer3_active': has_layer3,
            'reasoning':     ' & '.join(reasons) if reasons else 'Media placement potensial',
        })

    results.sort(key=lambda x: x['match_score'], reverse=True)
    top = results[:num_media]

    return {
        'recommended_media':        top,
        'total_media':              len(top),
        'relevant_categories':      relevant_cats,
        'estimated_cost_media_min': sum(r['rate_min'] for r in top),
        'estimated_cost_media_max': sum(r['rate_max'] for r in top),
        'layer3_active':            has_layer3,
    }