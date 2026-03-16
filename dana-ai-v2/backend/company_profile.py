"""
company_profile.py
==================
Company profile untuk DANA Indonesia — Dompet Digital / Fintech.

DANA adalah aplikasi dompet digital Indonesia yang fokus pada:
- Inklusi keuangan (financial inclusion) untuk semua lapisan masyarakat
- Mempromosikan cashless society di Indonesia
- Dipimpin oleh tim profesional berpengalaman di bidang keuangan digital

Profile ini di-hardcode sebagai konteks permanen sistem.
Ubah file ini jika ada perubahan guideline brand DANA.
"""

COMPANY_PROFILE = {

    # ── Identitas brand ───────────────────────────────────────────
    "company_name":   "DANA Indonesia",
    "industry":       "fintech",
    "sub_industry":   "digital wallet",
    "tagline":        "Dompet Digital Indonesia",
    "description": (
        "DANA adalah aplikasi dompet digital Indonesia yang berkomitmen pada "
        "inklusi keuangan dan transformasi lanskap keuangan di Indonesia. "
        "Dipimpin oleh tim profesional berpengalaman, DANA mempromosikan "
        "cashless society dan kemudahan transaksi digital untuk semua kalangan."
    ),

    # ── Target segment — mass market ─────────────────────────────
    "target_segments": {
        "gen_z":              {"age": "18-25", "desc": "digital native, mobile-first"},
        "millennial":         {"age": "25-35", "desc": "pekerja aktif, produktif"},
        "usia_35_45":         {"age": "35-45", "desc": "mapan, butuh solusi keuangan"},
        "income_menengah_bawah": {"desc": "target inklusi keuangan utama DANA"},
        "income_menengah_atas":  {"desc": "power user, transaksi lebih besar"},
        "pelajar_mahasiswa":  {"desc": "early adopter, cashless lifestyle"},
        "pekerja_karyawan":   {"desc": "payroll, transfer, pembayaran rutin"},
        "ibu_rumah_tangga":   {"desc": "belanja online, tagihan, top-up"},
    },

    # ── Brand tone & persona ──────────────────────────────────────
    "brand_tones": [
        "educational",       # edukasi literasi keuangan digital
        "inspirational",     # empowering masyarakat lewat inklusi keuangan
        "professional",      # trustworthy, terpercaya, aman
        "fun_relatable",     # dekat dengan kehidupan sehari-hari
        "trendy_viral",      # relevan dengan tren digital Indonesia
    ],

    # ── Kategori KOL yang paling relevan untuk DANA ──────────────
    "preferred_kol_categories": [
        # Core — langsung relevan
        "finance", "keuangan", "investasi", "bisnis", "entrepreneur",
        "fintech", "digital", "teknologi",
        # Edukasi & Motivasi — cocok dengan tone educational/inspirational
        "edukasi", "education", "tips", "tutorial", "motivasi", "self improvement",
        # Lifestyle — reach luas, cocok untuk awareness
        "lifestyle", "daily life", "vlog", "produktivitas",
        # Mass reach — untuk viral & brand awareness
        "entertainment", "comedy", "humor", "meme", "viral",
        # Specific segments
        "mahasiswa", "student life",        # pelajar/mahasiswa
        "ibu rumah tangga", "parenting",    # ibu RT
        "karir", "career", "work",          # pekerja karyawan
        "belanja", "shopping",              # e-commerce, cashless
    ],

    # ── Kategori KOL dengan relevansi sedang (netral) ────────────
    "neutral_kol_categories": [
        "beauty", "skincare", "fashion", "food", "kuliner",
        "travel", "wisata", "gaming", "olahraga", "fitness",
        "otomotif", "properti",
    ],

    # ── Mapping: topik campaign → context enrichment ─────────────
    "topic_context": {
        "finance keuangan investasi": (
            "literasi keuangan digital, menabung, investasi, "
            "transaksi cashless, dompet digital"
        ),
        "lifestyle": (
            "gaya hidup cashless, kemudahan pembayaran digital, "
            "transaksi sehari-hari dengan DANA"
        ),
        "edukasi pendidikan": (
            "edukasi keuangan, financial literacy, "
            "manfaat dompet digital untuk pelajar"
        ),
        "entertainment hiburan": (
            "top-up game, beli tiket, voucher digital, "
            "transaksi entertainment pakai DANA"
        ),
        "bisnis entrepreneurship": (
            "QRIS, pembayaran bisnis, transfer usaha, "
            "solusi keuangan untuk UMKM dan entrepreneur"
        ),
        "food kuliner": (
            "bayar makanan online, GoPay/DANA di restoran, "
            "cashback kuliner, promo F&B"
        ),
        "parenting keluarga": (
            "bayar sekolah, transaksi keluarga, "
            "transfer uang saku, tagihan rumah tangga"
        ),
    },

    # ── Mapping: goals → tone yang paling cocok untuk DANA ───────
    "goals_to_tone": {
        "brand awareness":       ["fun_relatable", "trendy_viral"],
        "edukasi audience":      ["educational", "professional"],
        "product launch":        ["trendy_viral", "fun_relatable"],
        "lead generation":       ["professional", "inspirational"],
        "engagement":            ["fun_relatable", "trendy_viral"],
        "conversion penjualan":  ["professional", "educational"],
        "community building":    ["inspirational", "fun_relatable"],
        "viral campaign":        ["trendy_viral", "fun_relatable"],
        "repositioning brand":   ["inspirational", "professional"],
    },

    # ── Scoring weights ───────────────────────────────────────────
    "scoring": {
        "preferred_category_boost":  0.18,  # boost kuat untuk kategori inti fintech
        "neutral_category_score":    0.50,  # netral
        "irrelevant_category_score": 0.35,  # sedikit di bawah netral
    },
}


# ── Helper functions ─────────────────────────────────────────────

def get_context_enriched_query(topics, goals, description, target_audience=""):
    """
    Buat enriched query untuk HuggingFace.
    Menambahkan konteks DANA sebagai fintech dompet digital Indonesia
    sehingga semantic matching lebih akurat.
    """
    p = COMPANY_PROFILE

    # Ambil topic context spesifik kalau ada
    t = str(topics).lower()
    topic_ctx = ""
    for key, ctx in p["topic_context"].items():
        if any(w in t for w in key.split()):
            topic_ctx = ctx
            break

    # Tone berdasarkan goals
    g = str(goals).lower()
    tones = []
    for key, tone_list in p["goals_to_tone"].items():
        if key in g or any(w in g for w in key.split()):
            tones = tone_list
            break
    tone_str = ", ".join(tones) if tones else "educational, trustworthy"

    # Audience context
    audience_str = str(target_audience).strip() if target_audience else \
        "Gen Z, Millennial, pekerja, mahasiswa, ibu rumah tangga Indonesia"

    enriched = (
        f"{p['company_name']} — {p['description']} "
        f"Campaign topik: {topics}. Goals: {goals}. "
        f"Target audience: {audience_str}. "
        f"Tone yang diinginkan: {tone_str}. "
        f"{('Konteks produk: ' + topic_ctx + '.') if topic_ctx else ''} "
        f"Detail campaign: {description}"
    ).strip()

    return enriched


def score_kol_fit(category_text, topics, goals):
    """
    Score kesesuaian KOL dengan brand DANA berdasarkan kategori.
    Return: float 0.0 - 1.0
    """
    if not category_text:
        return COMPANY_PROFILE["scoring"]["neutral_category_score"]

    cat_lower = str(category_text).lower()

    # Check preferred categories
    for pref in COMPANY_PROFILE["preferred_kol_categories"]:
        if pref.lower() in cat_lower:
            return 0.5 + COMPANY_PROFILE["scoring"]["preferred_category_boost"]

    # Check neutral categories
    for neu in COMPANY_PROFILE["neutral_kol_categories"]:
        if neu.lower() in cat_lower:
            return COMPANY_PROFILE["scoring"]["neutral_category_score"]

    # Tidak ada match — sedikit di bawah netral
    return COMPANY_PROFILE["scoring"]["irrelevant_category_score"]


def get_profile_summary():
    p = COMPANY_PROFILE
    return {
        "company":        p["company_name"],
        "industry":       p["industry"],
        "sub_industry":   p["sub_industry"],
        "segments":       len(p["target_segments"]),
        "tones":          len(p["brand_tones"]),
        "preferred_cats": len(p["preferred_kol_categories"]),
    }