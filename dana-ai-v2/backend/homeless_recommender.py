"""
homeless_recommender.py
Merekomendasikan Homeless Media (akun placement/media) yang relevan
berdasarkan brief campaign, lokasi, dan budget.
"""
import json, os, re
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
HOMELESS_MEDIA_PATH = os.path.join(DATA_DIR, 'homeless_media.json')

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

# Keyword mapping: topik campaign -> kategori homeless media yang relevan
TOPIC_TO_CATEGORY = {
    # Finance/business -> trending news, facts
    "finance":     ["Trending News", "Facts News", "Akun Gossip"],
    "keuangan":    ["Trending News", "Facts News", "Akun Gossip"],
    "bisnis":      ["Trending News", "Facts News"],
    "business":    ["Trending News", "Facts News"],
    "ekonomi":     ["Trending News", "Facts News"],
    "investasi":   ["Trending News", "Facts News"],
    # Lifestyle/entertainment -> meme, viral, gossip
    "lifestyle":   ["Akun Meme/Lucu, Viral", "Akun Meme/Lucu", "Akun Gossip", "Trending News"],
    "entertainment":["Akun Meme/Lucu, Viral", "Akun Gossip", "entertainment,News"],
    "hiburan":     ["Akun Meme/Lucu, Viral", "Akun Gossip"],
    "humor":       ["Akun Meme/Lucu, Viral", "Akun Meme/Lucu"],
    "meme":        ["Akun Meme/Lucu, Viral", "Akun Meme/Lucu"],
    "viral":       ["Akun Meme/Lucu, Viral", "Trending News"],
    # Awareness/social -> all relevant
    "awareness":   ["Trending News", "Facts News", "Mystery,Facts,Fenomena"],
    "edukasi":     ["Trending News", "Facts News", "Mystery,Facts,Fenomena"],
    "education":   ["Trending News", "Facts News", "Mystery,Facts,Fenomena"],
    "sosial":      ["Trending News", "Facts News"],
    # Gossip/news
    "gosip":       ["Akun Gossip", "Trending News"],
    "gossip":      ["Akun Gossip", "Trending News"],
    "news":        ["Trending News", "Facts News", "Internasional News"],
    "berita":      ["Trending News", "Facts News"],
    "informasi":   ["Trending News", "Facts News", "Mystery,Facts,Fenomena"],
    # Women/girls
    "perempuan":   ["Girls News", "Trending News"],
    "women":       ["Girls News", "Trending News"],
    "girls":       ["Girls News", "Trending News"],
    # Mystery/facts
    "misteri":     ["Mystery,Facts,Fenomena"],
    "fakta":       ["Mystery,Facts,Fenomena", "Facts News"],
    "facts":       ["Mystery,Facts,Fenomena", "Facts News"],
}

# Default: semua kategori relevan (untuk campaign umum)
ALL_CATEGORIES = [
    "Trending News", "Akun Meme/Lucu, Viral", "Akun Gossip",
    "Facts News", "Mystery,Facts,Fenomena", "Akun Meme/Lucu",
    "entertainment,News", "Girls News", "Internasional News",
]


def normalize_location_query(loc):
    if not loc: return "nasional"
    loc_lower = loc.lower().strip()
    for group, keywords in LOCATION_GROUPS.items():
        if any(kw in loc_lower for kw in keywords):
            return group
    return "nasional"


def get_relevant_categories(topics, goals, description):
    """Tentukan kategori homeless media yang relevan berdasarkan topik campaign"""
    text = f"{topics} {goals} {description}".lower()
    relevant = set()
    for keyword, cats in TOPIC_TO_CATEGORY.items():
        if keyword in text:
            relevant.update(cats)
    # Kalau tidak ada match, return semua (Trending News paling relevan untuk campaign umum)
    if not relevant:
        return ["Trending News", "Facts News", "Akun Meme/Lucu, Viral"]
    return list(relevant)


def score_homeless_media(media, target_loc, budget_per_media, relevant_cats, followers_weight=True):
    """Score satu akun homeless media"""
    scores = {}

    # 1. Location score (0-1)
    loc = media.get('location_norm', 'nasional')
    if target_loc == 'nasional':
        loc_score = 1.0
    elif loc == target_loc:
        loc_score = 1.0
    elif loc == 'nasional':
        loc_score = 0.85  # Nasional juga bagus untuk campaign lokal
    else:
        # Cek proximity (same island / region)
        jawa = {'jakarta', 'bandung', 'surabaya', 'yogyakarta', 'banten', 'jawa_barat', 'jawa_tengah', 'jawa_timur'}
        if loc in jawa and target_loc in jawa:
            loc_score = 0.5
        else:
            loc_score = 0.15
    scores['location'] = loc_score

    # 2. Budget score (0-1)
    rate_min = media.get('rate_min', 0)
    rate_max = media.get('rate_max', 0)
    if rate_min == 0:
        budget_score = 0.4
    elif budget_per_media >= rate_min:
        if rate_max > 0 and budget_per_media >= rate_max:
            budget_score = 1.0
        else:
            ratio = (budget_per_media - rate_min) / max(rate_max - rate_min, 1)
            budget_score = 0.7 + 0.3 * min(ratio, 1.0)
    elif budget_per_media >= rate_min * 0.8:
        budget_score = 0.55
    elif budget_per_media >= rate_min * 0.5:
        budget_score = 0.3
    else:
        budget_score = 0.05
    scores['budget'] = budget_score

    # 3. Category relevance score (0-1)
    cat = media.get('category', '')
    if cat in relevant_cats:
        cat_score = 1.0
    elif 'Trending News' in relevant_cats and 'news' in cat.lower():
        cat_score = 0.7
    elif any(c.lower() in cat.lower() for c in relevant_cats):
        cat_score = 0.6
    else:
        cat_score = 0.3
    scores['relevance'] = cat_score

    # 4. Reach/followers score (0-1) — bigger = better for placement
    if followers_weight:
        n = media.get('followers_num', 0)
        if n >= 5_000_000:    f_score = 1.0
        elif n >= 1_000_000:  f_score = 0.85
        elif n >= 500_000:    f_score = 0.7
        elif n >= 100_000:    f_score = 0.55
        elif n >= 50_000:     f_score = 0.4
        else:                 f_score = 0.2
        scores['reach'] = f_score
    else:
        scores['reach'] = 0.5

    # Weighted final
    weights = {'location': 0.30, 'budget': 0.30, 'relevance': 0.25, 'reach': 0.15}
    final = sum(weights[k] * v for k, v in scores.items())

    return round(final * 100, 1), scores


def recommend_homeless_media(
    topics="", goals="", campaign_description="",
    location="nasional", budget_total=0, num_media=5,
    content_type="semua"
):
    """
    Rekomendasikan Homeless Media berdasarkan parameter campaign.
    Return list of dicts siap display di frontend.
    """
    if not os.path.exists(HOMELESS_MEDIA_PATH):
        return {
            'recommended_media': [],
            'total_media': 0,
            'note': 'Homeless Media belum diload. Upload HomelessMedia.xlsx dulu.'
        }

    with open(HOMELESS_MEDIA_PATH, 'r', encoding='utf-8') as f:
        all_media = json.load(f)

    target_loc      = normalize_location_query(location)
    budget_per_media = float(budget_total) / max(num_media, 1)
    relevant_cats   = get_relevant_categories(topics, goals, campaign_description)

    # Filter by platform if specified
    filtered = all_media
    if content_type.lower() not in ('semua', 'all', ''):
        ct = content_type.lower()
        if ct == 'instagram':
            filtered = [m for m in all_media if 'instagram' in m.get('social_media', '').lower()]
        elif ct == 'tiktok':
            filtered = [m for m in all_media if 'tiktok' in m.get('social_media', '').lower()]

    results = []
    for media in filtered:
        match_score, score_detail = score_homeless_media(
            media, target_loc, budget_per_media, relevant_cats
        )

        # Build reasons
        reasons = []
        if score_detail['relevance'] >= 0.8:
            reasons.append(f"kategori '{media['category']}' relevan dengan campaign")
        if score_detail['budget'] >= 0.7:
            reasons.append("rate sesuai budget")
        elif score_detail['budget'] >= 0.4:
            reasons.append("rate bisa dinegosiasikan")
        if score_detail['location'] == 1.0 and target_loc != 'nasional':
            reasons.append(f"media lokal {media['location_raw']}")
        elif score_detail['location'] >= 0.85 and target_loc != 'nasional':
            reasons.append("coverage nasional cocok untuk target lokal")
        if score_detail['reach'] >= 0.85:
            reasons.append(f"reach sangat besar ({media['followers_raw']} followers)")

        results.append({
            'id':            media['id'],
            'username':      media['username'],
            'social_media':  media['social_media'],
            'followers':     media['followers_raw'],
            'followers_num': media['followers_num'],
            'category':      media['category'],
            'location':      media['location_raw'],
            'location_norm': media['location_norm'],
            'pic_name':      media['pic_name'],
            'rate_card':     media['rate_card'],
            'rate_min':      media['rate_min'],
            'rate_max':      media['rate_max'],
            'contact_action':media['contact_action'],
            'match_score':   match_score,
            'score_detail': {
                'relevance':  round(score_detail['relevance'] * 100, 1),
                'budget':     round(score_detail['budget'] * 100, 1),
                'location':   round(score_detail['location'] * 100, 1),
                'reach':      round(score_detail['reach'] * 100, 1),
            },
            'reasoning': ' & '.join(reasons) if reasons else 'Media placement potensial untuk campaign',
        })

    results.sort(key=lambda x: x['match_score'], reverse=True)
    top = results[:num_media]

    return {
        'recommended_media':         top,
        'total_media':               len(top),
        'relevant_categories':       relevant_cats,
        'estimated_cost_media_min':  sum(r['rate_min'] for r in top),
        'estimated_cost_media_max':  sum(r['rate_max'] for r in top),
    }


if __name__ == '__main__':
    # Quick test
    result = recommend_homeless_media(
        topics="finance keuangan edukasi",
        goals="brand awareness",
        location="jakarta",
        budget_total=50_000_000,
        num_media=5
    )
    print(f"Recommended: {result['total_media']} media")
    for m in result['recommended_media']:
        print(f"  @{m['username']} ({m['category']}) score={m['match_score']}% followers={m['followers']}")