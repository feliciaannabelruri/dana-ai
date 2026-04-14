import os, json, re
from difflib import SequenceMatcher

DATA_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
KOL_FREE_PATH = os.path.join(DATA_DIR, 'kol_homeless_free.json')
COMM_PATH     = os.path.join(DATA_DIR, 'community_pool.json')

CATEGORY_KEYWORDS = {
    # KOL free categories
    'media/news':          ['media', 'berita', 'news', 'jurnalis', 'pers'],
    'ngo':                 ['ngo', 'sosial', 'kemanusiaan', 'advocacy', 'lembaga'],
    'media&community':     ['media', 'komunitas', 'community', 'sosial'],
    'community':           ['komunitas', 'community', 'networking'],
    # Community categories
    'finance & fintech':   ['keuangan', 'finansial', 'fintech', 'investasi', 'tabungan',
                            'dompet', 'pembayaran', 'literasi keuangan', 'dana', 'finance'],
    'umkm & entrepreneurship': ['umkm', 'usaha', 'bisnis', 'entrepreneur', 'wirausaha',
                                'pengusaha', 'startup', 'produk', 'jualan'],
    'women & community':   ['perempuan', 'wanita', 'ibu', 'gender', 'kesetaraan'],
    'youth & student':     ['mahasiswa', 'pemuda', 'muda', 'generasi', 'pelajar', 'gen z'],
    'media & information': ['media', 'berita', 'informasi', 'edukasi', 'konten'],
    'community & networking': ['komunitas', 'networking', 'kolaborasi', 'partnership'],
}

CAMPAIGN_TOPIC_MAP = {
    'keuangan':      ['finance & fintech', 'umkm & entrepreneurship'],
    'fintech':       ['finance & fintech', 'media & information'],
    'investasi':     ['finance & fintech'],
    'tabungan':      ['finance & fintech'],
    'umkm':          ['umkm & entrepreneurship'],
    'bisnis':        ['umkm & entrepreneurship'],
    'edukasi':       ['media & information', 'youth & student', 'community & networking'],
    'literasi':      ['media & information', 'finance & fintech'],
    'sosial':        ['women & community', 'community & networking', 'ngo'],
    'media':         ['media/news', 'media & information'],
    'community':     ['community & networking', 'community'],
    'pemberdayaan':  ['umkm & entrepreneurship', 'women & community'],
}


def _text_similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _score_category_match(item_category, topics, goals, campaign_description):
    """
    0–1: seberapa relevan kategori entri dengan campaign.
    Cek keyword dari topics + goals + desc terhadap category keywords.
    """
    combined = f"{topics} {goals} {campaign_description}".lower()
    cat_lower = item_category.lower()

    direct_score = 0.0
    for kw_group, kws in CATEGORY_KEYWORDS.items():
        if kw_group in cat_lower or any(kw in cat_lower for kw in kws):
            if any(kw in combined for kw in kws):
                direct_score = max(direct_score, 0.8)

    topic_score = 0.0
    for topic_kw, preferred_cats in CAMPAIGN_TOPIC_MAP.items():
        if topic_kw in combined:
            for pcat in preferred_cats:
                if pcat in cat_lower or any(
                    _text_similarity(pcat, cat_lower) > 0.6
                    for _ in [1]
                ):
                    topic_score = max(topic_score, 0.9)
                    break

    # Fallback: string similarity
    sim_score = _text_similarity(cat_lower, combined[:80]) * 0.5

    return min(1.0, max(direct_score, topic_score, sim_score))


def _score_followers(followers_num):
    """
    Log-normalized follower score 0–1.
    ~10K → 0.3,  ~100K → 0.6,  ~500K → 0.85,  ~1M+ → 1.0
    """
    import math
    if followers_num <= 0:
        return 0.0
    # log scale: log(10K)≈9.2, log(1M)≈13.8
    raw = math.log1p(followers_num)
    return min(1.0, raw / 14.0)


def _contact_display(item):
    """Return contact info yang paling actionable untuk ditampilkan."""
    c = item.get('contact', '')
    num = item.get('number', '')
    email = item.get('email', '')
    url = item.get('social_url', '')

    if num and num not in ('nan', 'None', ''):
        return {'type': 'whatsapp', 'value': num}
    if email and email not in ('nan', 'None', ''):
        return {'type': 'email', 'value': email}
    if c.lower().startswith('dm') or c == 'dm':
        return {'type': 'dm', 'value': url or item.get('username', '')}
    if url:
        return {'type': 'link', 'value': url}
    return {'type': 'dm', 'value': item.get('username', '')}


def _approachability_label(score):
    if score >= 0.9:
        return 'Sangat Mudah'
    elif score >= 0.7:
        return 'Mudah'
    elif score >= 0.5:
        return 'Sedang'
    return 'Perlu Follow Up'


def recommend_kol_free(topics, goals, campaign_description, num_kol=5):
    """
    Dipanggil saat zero_budget=True.
    Return list KOL free yang paling relevan, diranking.
    """
    if not os.path.exists(KOL_FREE_PATH):
        return []

    with open(KOL_FREE_PATH, encoding='utf-8') as f:
        pool = json.load(f)

    if not pool:
        return []

    scored = []
    for item in pool:
        s_cat    = _score_category_match(
            item.get('category', ''), topics, goals, campaign_description
        )
        s_follow = _score_followers(item.get('followers_num', 0))
        s_appr   = item.get('approachability', 0.5)

        # Weighted score
        final = s_cat * 0.4 + s_follow * 0.4 + s_appr * 0.2

        contact_info = _contact_display(item)

        scored.append({
            'id':              item['id'],
            'username':        item['username'],
            'social_media':    item.get('social_media', 'Instagram'),
            'followers':       item.get('followers_raw', '0'),
            'followers_num':   item.get('followers_num', 0),
            'category':        item.get('category', ''),
            'contact':         item.get('contact', ''),
            'contact_info':    contact_info,
            'approachability': s_appr,
            'approachability_label': _approachability_label(s_appr),
            'match_score':     round(final * 100, 1),
            'score_detail': {
                'category match':    round(s_cat * 100, 1),
                'follower reach':    round(s_follow * 100, 1),
                'approachability':   round(s_appr * 100, 1),
            },
            'pool_type':       'kol_free',
            'rate_min':        0,
            'rate_max':        0,
            'reasoning':       _build_kol_reasoning(s_cat, s_follow, s_appr, item),
        })

    scored.sort(key=lambda x: x['match_score'], reverse=True)
    return scored[:num_kol]


def _build_kol_reasoning(s_cat, s_follow, s_appr, item):
    parts = []
    if s_cat >= 0.6:
        parts.append(f"kategori '{item.get('category','')}' relevan dengan campaign")
    if s_follow >= 0.5:
        parts.append(f"jangkauan {item.get('followers_raw','?')} followers")
    parts.append(f"approachability {_approachability_label(s_appr).lower()} via {item.get('contact','dm')}")
    return ' & '.join(parts) if parts else 'KOL tanpa rate card, cocok untuk zero budget'


def recommend_community(topics, goals, campaign_description, num_community=5):
    """
    Selalu dipanggil (bukan hanya zero budget).
    Return community yang paling relevan sebagai section terpisah.
    """
    if not os.path.exists(COMM_PATH):
        return []

    with open(COMM_PATH, encoding='utf-8') as f:
        pool = json.load(f)

    if not pool:
        return []

    scored = []
    for item in pool:
        s_cat  = _score_category_match(
            item.get('category', ''), topics, goals, campaign_description
        )
        s_appr = item.get('approachability', 0.5)

        final = s_cat * 0.6 + s_appr * 0.4

        contact_info = _contact_display(item)

        scored.append({
            'id':              item['id'],
            'nama_komunitas':  item.get('nama_komunitas', item.get('username', '')),
            'username':        item.get('username', ''),
            'social_url':      item.get('social_url', ''),
            'category':        item.get('category', ''),
            'contact':         item.get('contact', ''),
            'contact_info':    contact_info,
            'approachability': s_appr,
            'approachability_label': _approachability_label(s_appr),
            'match_score':     round(final * 100, 1),
            'score_detail': {
                'relevance':        round(s_cat * 100, 1),
                'approachability':  round(s_appr * 100, 1),
            },
            'pool_type':       'community',
            'rate_min':        0,
            'rate_max':        0,
            'reasoning':       _build_comm_reasoning(s_cat, s_appr, item),
        })

    scored.sort(key=lambda x: x['match_score'], reverse=True)
    return scored[:num_community]


def _build_comm_reasoning(s_cat, s_appr, item):
    parts = []
    if s_cat >= 0.6:
        parts.append(f"kategori '{item.get('category','')}' sesuai tema campaign")
    elif s_cat >= 0.3:
        parts.append(f"relevansi parsial dengan tema campaign")
    parts.append(f"dapat di-approach via {_approachability_label(s_appr).lower()}")
    return ' & '.join(parts) if parts else 'Komunitas potensial untuk kolaborasi'