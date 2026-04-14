COMPANY_PROFILE = {

    # ── Identitas brand ───────────────────────────────────────────────────────
    "company_name": "DANA Indonesia",
    "industry":     "fintech",
    "sub_industry": "digital wallet",
    "tagline":      "Dompet Digital Indonesia",
    "description": (
        "DANA adalah aplikasi dompet digital Indonesia yang berkomitmen pada "
        "inklusi keuangan dan transformasi lanskap keuangan di Indonesia. "
        "Dipimpin oleh tim profesional berpengalaman, DANA mempromosikan "
        "cashless society dan kemudahan transaksi digital untuk semua kalangan."
    ),

    # ── Fitur DANA yang paling sering dipromote ───────────────────────────────
    "key_features": [
        "Transfer uang gratis antar bank",
        "Bayar tagihan listrik, BPJS, internet",
        "Top-up e-wallet & pulsa",
        "Scan QRIS di merchant",
        "Cashback & promo belanja online",
        "Cicilan tanpa kartu kredit",
        "Terima gaji & pembayaran bisnis",
    ],

    # ── Target segment DANA ───────────────────────────────────────────────────
    "target_segments": {
        "gen_z":                {"age": "18-25", "need": "cashless, top-up game, transfer ke teman"},
        "millennial_pekerja":   {"age": "25-35", "need": "gajian, bayar tagihan, transfer, belanja"},
        "ibu_rt":               {"age": "28-45", "need": "bayar sekolah, belanja online, listrik, BPJS"},
        "pelajar_mahasiswa":    {"age": "16-23", "need": "terima uang saku, top-up, bayar kos"},
        "umkm_entrepreneur":    {"age": "25-45", "need": "terima pembayaran QRIS, transfer ke supplier"},
        "income_menengah_bawah":{"need": "inklusi keuangan, tidak perlu rekening bank"},
        "income_menengah_atas": {"need": "cashback premium, transaksi besar, investasi"},
    },

    # ── Brand tones ───────────────────────────────────────────────────────────
    "brand_tones": [
        "educational",
        "inspirational",
        "professional",
        "fun_relatable",
        "trendy_viral",
    ],

    # ── Goals → tone mapping ──────────────────────────────────────────────────
    "goals_to_tone": {
        "brand awareness":      ["fun_relatable", "trendy_viral"],
        "edukasi audience":     ["educational", "professional"],
        "product launch":       ["trendy_viral", "fun_relatable"],
        "lead generation":      ["professional", "inspirational"],
        "engagement":           ["fun_relatable", "trendy_viral"],
        "conversion penjualan": ["professional", "educational"],
        "community building":   ["inspirational", "fun_relatable"],
        "viral campaign":       ["trendy_viral", "fun_relatable"],
        "repositioning brand":  ["inspirational", "professional"],
    },

    # ── Scoring weights ───────────────────────────────────────────────────────
    "scoring": {
        "direct_finance_boost":   0.22,   # finance/investasi KOL → langsung tinggi
        "cross_niche_max_boost":  0.18,   # lifestyle/parenting → ada audience DANA
        "neutral_category_score": 0.50,
        "irrelevant_score":       0.35,
    },
}


# ══════════════════════════════════════════════════════════════════════════════
# CROSS-NICHE SCORING MATRIX
# ══════════════════════════════════════════════════════════════════════════════
#
# Format: category_keyword → {
#   "score": float (0-1),
#   "why": "penjelasan singkat kenapa audiensnya overlap sama DANA user",
#   "dana_segments": [list segment DANA yang kemungkinan ada di audiens ini],
#   "best_dana_features": [fitur DANA yang paling relevan untuk dipromote ke audiens ini],
# }
#
# Ini adalah "knowledge base" yang dipakai oleh score_kol_fit()
# LLM di kol_profiler.py akan provide reasoning yang lebih nuanced per-KOL

CROSS_NICHE_MATRIX = {

    # ── Direct finance (score tertinggi) ──────────────────────────────────────
    "finance": {
        "score": 0.92,
        "why": "Audiens langsung: orang yang aware soal keuangan digital",
        "dana_segments": ["millennial_pekerja", "umkm_entrepreneur", "income_menengah_atas"],
        "best_dana_features": ["transfer-gratis", "investasi", "literasi-keuangan"],
    },
    "keuangan": {
        "score": 0.92,
        "why": "Sama dengan finance",
        "dana_segments": ["millennial_pekerja", "umkm_entrepreneur"],
        "best_dana_features": ["transfer-gratis", "bayar-tagihan", "cashback"],
    },
    "investasi": {
        "score": 0.88,
        "why": "Audiens melek finansial, sudah digital-savvy",
        "dana_segments": ["millennial_pekerja", "income_menengah_atas"],
        "best_dana_features": ["transfer-gratis", "cashback", "cicilan"],
    },
    "bisnis": {
        "score": 0.82,
        "why": "Entrepreneur & UMKM butuh QRIS dan pembayaran digital",
        "dana_segments": ["umkm_entrepreneur", "millennial_pekerja"],
        "best_dana_features": ["QRIS", "terima-pembayaran", "transfer-bisnis"],
    },
    "entrepreneur": {
        "score": 0.82,
        "why": "UMKM dan pelaku bisnis butuh solusi pembayaran digital",
        "dana_segments": ["umkm_entrepreneur"],
        "best_dana_features": ["QRIS", "terima-pembayaran", "transfer-bisnis"],
    },
    "ekonomi": {
        "score": 0.75,
        "why": "Audiens melek ekonomi, potential untuk literasi keuangan digital",
        "dana_segments": ["millennial_pekerja", "income_menengah_atas"],
        "best_dana_features": ["transfer-gratis", "bayar-tagihan"],
    },

    # ── Parenting (cross-niche tinggi) ────────────────────────────────────────
    "parenting": {
        "score": 0.80,
        "why": "Ibu RT = core DANA user: bayar sekolah, belanja online, tagihan rumah",
        "dana_segments": ["ibu_rt"],
        "best_dana_features": ["bayar-tagihan", "belanja-online", "transfer-uang-saku"],
    },
    "ibu": {
        "score": 0.80,
        "why": "Konten ibu = audiens ibu RT yang manage keuangan keluarga",
        "dana_segments": ["ibu_rt"],
        "best_dana_features": ["bayar-tagihan", "bayar-sekolah", "belanja-online"],
    },
    "keluarga": {
        "score": 0.72,
        "why": "Audiens keluarga = semua decision maker keuangan rumah tangga",
        "dana_segments": ["ibu_rt", "millennial_pekerja"],
        "best_dana_features": ["transfer-uang-saku", "bayar-tagihan", "belanja"],
    },
    "anak": {
        "score": 0.65,
        "why": "Konten tentang anak menarik audience orang tua (ibu RT)",
        "dana_segments": ["ibu_rt"],
        "best_dana_features": ["transfer-uang-saku", "bayar-sekolah"],
    },

    # ── Lifestyle (cross-niche medium-tinggi) ─────────────────────────────────
    "lifestyle": {
        "score": 0.72,
        "why": "Audiens lifestyle = urban millennial yang cashless sehari-hari",
        "dana_segments": ["millennial_pekerja", "gen_z"],
        "best_dana_features": ["cashback-belanja", "bayar-merchant", "transfer"],
    },
    "daily life": {
        "score": 0.68,
        "why": "Konten sehari-hari = organik fit untuk cashless payment",
        "dana_segments": ["millennial_pekerja", "gen_z"],
        "best_dana_features": ["bayar-merchant", "transfer", "cashback"],
    },
    "vlog": {
        "score": 0.62,
        "why": "Vlogger reach luas, bisa showcase DANA dalam aktivitas harian",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["cashback", "bayar-merchant"],
    },
    "produktivitas": {
        "score": 0.65,
        "why": "Audience produktivitas = pekerja yang butuh solusi keuangan efisien",
        "dana_segments": ["millennial_pekerja"],
        "best_dana_features": ["transfer-gratis", "bayar-tagihan-auto"],
    },
    "self improvement": {
        "score": 0.62,
        "why": "Audience self-improvement receptive ke edukasi keuangan digital",
        "dana_segments": ["millennial_pekerja", "gen_z"],
        "best_dana_features": ["literasi-keuangan", "cashback"],
    },

    # ── Food & kuliner ────────────────────────────────────────────────────────
    "food": {
        "score": 0.65,
        "why": "Food creator = audiens yang sering bayar makanan, QRIS di restoran",
        "dana_segments": ["gen_z", "millennial_pekerja", "ibu_rt"],
        "best_dana_features": ["QRIS-merchant", "cashback-kuliner", "bayar-delivery"],
    },
    "kuliner": {
        "score": 0.65,
        "why": "Sama dengan food",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["QRIS-merchant", "cashback-kuliner"],
    },
    "masak": {
        "score": 0.58,
        "why": "Konten masak → audience ibu RT → belanja kebutuhan dapur online",
        "dana_segments": ["ibu_rt"],
        "best_dana_features": ["belanja-online", "cashback"],
    },
    "resep": {
        "score": 0.58,
        "why": "Sama dengan masak",
        "dana_segments": ["ibu_rt"],
        "best_dana_features": ["belanja-online", "cashback"],
    },

    # ── Travel ────────────────────────────────────────────────────────────────
    "travel": {
        "score": 0.65,
        "why": "Traveler = pekerja produktif yang beli tiket, booking hotel",
        "dana_segments": ["millennial_pekerja", "gen_z"],
        "best_dana_features": ["beli-tiket", "booking-hotel", "cashback"],
    },
    "wisata": {
        "score": 0.62,
        "why": "Sama dengan travel",
        "dana_segments": ["millennial_pekerja"],
        "best_dana_features": ["beli-tiket", "cashback"],
    },
    "liburan": {
        "score": 0.60,
        "why": "Konten liburan = planning + pembayaran → DANA fit",
        "dana_segments": ["millennial_pekerja", "gen_z"],
        "best_dana_features": ["beli-tiket", "cashback", "bayar-hotel"],
    },

    # ── Fashion & beauty ──────────────────────────────────────────────────────
    "fashion": {
        "score": 0.65,
        "why": "Fashion creator = perempuan urban yang belanja online aktif",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["cashback-belanja", "belanja-online"],
    },
    "beauty": {
        "score": 0.65,
        "why": "Beauty creator = perempuan urban, purchase intent tinggi",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["cashback-belanja", "belanja-online"],
    },
    "skincare": {
        "score": 0.62,
        "why": "Audiens skincare = perempuan yang belanja online rutin",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["cashback-belanja", "cicilan"],
    },
    "makeup": {
        "score": 0.60,
        "why": "Sama dengan skincare",
        "dana_segments": ["gen_z"],
        "best_dana_features": ["cashback-belanja"],
    },

    # ── Edukasi & career ──────────────────────────────────────────────────────
    "edukasi": {
        "score": 0.70,
        "why": "Edukasikonten = mahasiswa/pelajar yang terima uang saku via transfer",
        "dana_segments": ["pelajar_mahasiswa", "gen_z"],
        "best_dana_features": ["transfer-uang-saku", "top-up", "literasi-keuangan"],
    },
    "education": {
        "score": 0.70,
        "why": "Sama dengan edukasi",
        "dana_segments": ["pelajar_mahasiswa"],
        "best_dana_features": ["transfer-uang-saku", "bayar-biaya-kuliah"],
    },
    "mahasiswa": {
        "score": 0.72,
        "why": "Konten mahasiswa = audiens yang langsung butuh transfer & top-up",
        "dana_segments": ["pelajar_mahasiswa"],
        "best_dana_features": ["transfer-uang-saku", "bayar-kos", "top-up"],
    },
    "karir": {
        "score": 0.65,
        "why": "Konten karir = fresh graduate & pekerja muda → gajian ke DANA",
        "dana_segments": ["millennial_pekerja", "gen_z"],
        "best_dana_features": ["terima-gaji", "transfer", "bayar-tagihan"],
    },
    "work": {
        "score": 0.62,
        "why": "Sama dengan karir",
        "dana_segments": ["millennial_pekerja"],
        "best_dana_features": ["terima-gaji", "transfer-gratis"],
    },
    "motivasi": {
        "score": 0.55,
        "why": "Audience motivasi receptive ke konten improvement termasuk keuangan",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["literasi-keuangan", "cashback"],
    },

    # ── Gaming & entertainment ────────────────────────────────────────────────
    "gaming": {
        "score": 0.62,
        "why": "Gamer = top-up game via DANA, audience Gen Z",
        "dana_segments": ["gen_z"],
        "best_dana_features": ["top-up-game", "transfer-ke-teman"],
    },
    "esports": {
        "score": 0.60,
        "why": "Sama dengan gaming",
        "dana_segments": ["gen_z"],
        "best_dana_features": ["top-up-game"],
    },
    "entertainment": {
        "score": 0.55,
        "why": "Reach luas untuk brand awareness, beli tiket konser/bioskop",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["beli-tiket", "cashback", "brand-awareness"],
    },
    "comedy": {
        "score": 0.52,
        "why": "Reach sangat luas, cocok untuk campaign awareness",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["brand-awareness", "cashback"],
    },
    "humor": {
        "score": 0.52,
        "why": "Sama dengan comedy",
        "dana_segments": ["gen_z"],
        "best_dana_features": ["brand-awareness"],
    },
    "viral": {
        "score": 0.52,
        "why": "Viral creator = reach massif, cocok untuk kampanye awareness",
        "dana_segments": ["gen_z"],
        "best_dana_features": ["brand-awareness"],
    },

    # ── Health & fitness ──────────────────────────────────────────────────────
    "olahraga": {
        "score": 0.52,
        "why": "Audience olahraga = aktif, urban, butuh bayar gym/studio",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["bayar-merchant", "cashback"],
    },
    "fitness": {
        "score": 0.52,
        "why": "Sama dengan olahraga",
        "dana_segments": ["millennial_pekerja"],
        "best_dana_features": ["bayar-gym", "cashback"],
    },
    "health": {
        "score": 0.50,
        "why": "Audience health = bayar apotek, BPJS, konsultasi online",
        "dana_segments": ["ibu_rt", "millennial_pekerja"],
        "best_dana_features": ["bayar-BPJS", "transfer"],
    },

    # ── Shopping ──────────────────────────────────────────────────────────────
    "belanja": {
        "score": 0.72,
        "why": "Konten belanja = direct match ke cashback & belanja online DANA",
        "dana_segments": ["gen_z", "ibu_rt", "millennial_pekerja"],
        "best_dana_features": ["cashback-belanja", "belanja-online", "cicilan"],
    },
    "shopping": {
        "score": 0.72,
        "why": "Sama dengan belanja",
        "dana_segments": ["gen_z", "ibu_rt"],
        "best_dana_features": ["cashback-belanja", "cicilan"],
    },
    "review": {
        "score": 0.55,
        "why": "Review creator = audience purchase intent, cashback DANA relevan",
        "dana_segments": ["gen_z", "millennial_pekerja"],
        "best_dana_features": ["cashback-belanja"],
    },

    # ── Low relevance ─────────────────────────────────────────────────────────
    "otomotif": {
        "score": 0.42,
        "why": "Audience otomotif = laki-laki, beli sparepart → transfer bisa",
        "dana_segments": ["millennial_pekerja"],
        "best_dana_features": ["transfer", "bayar-online"],
    },
    "properti": {
        "score": 0.42,
        "why": "Properti = transaksi besar, DANA lebih ke daily transaction",
        "dana_segments": ["millennial_pekerja"],
        "best_dana_features": ["transfer", "bayar-cicilan"],
    },
    "politik": {
        "score": 0.20,
        "why": "High brand safety risk, hindari",
        "dana_segments": [],
        "best_dana_features": [],
    },
    "berita": {
        "score": 0.38,
        "why": "News creator bisa kontroversial, risk untuk brand DANA",
        "dana_segments": [],
        "best_dana_features": [],
    },
}


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def score_kol_fit(category_text: str, topics: str = "", goals: str = "") -> float:
    """
    Score kesesuaian KOL dengan brand DANA berdasarkan kategori konten.
    Menggunakan CROSS_NICHE_MATRIX untuk scoring yang lebih nuanced.
    
    Returns: float 0.0 – 1.0
    """
    if not category_text:
        return COMPANY_PROFILE["scoring"]["neutral_category_score"]

    cat_lower = str(category_text).lower()

    best_score = COMPANY_PROFILE["scoring"]["irrelevant_score"]

    for keyword, data in CROSS_NICHE_MATRIX.items():
        if keyword.lower() in cat_lower:
            s = data["score"]
            if s > best_score:
                best_score = s

    return float(min(best_score, 1.0))


def get_kol_cross_niche_info(category_text: str) -> dict:
    """
    Return full cross-niche info untuk kategori KOL.
    Dipakai untuk enrich reasoning di recommender.
    """
    if not category_text:
        return {"score": 0.5, "why": "", "dana_segments": [], "best_dana_features": []}

    cat_lower = str(category_text).lower()
    best = {"score": 0.35, "why": "", "dana_segments": [], "best_dana_features": []}

    for keyword, data in CROSS_NICHE_MATRIX.items():
        if keyword.lower() in cat_lower and data["score"] > best["score"]:
            best = data.copy()

    return best


def get_context_enriched_query(
    topics: str,
    goals: str,
    description: str,
    target_audience: str = ""
) -> str:
    """
    Buat enriched query untuk HuggingFace embedding.
    Menambahkan konteks DANA + CROSS_NICHE angle.
    """
    p = COMPANY_PROFILE

    # Tone berdasarkan goals
    g = str(goals).lower()
    tones = []
    for key, tone_list in p["goals_to_tone"].items():
        if key in g or any(w in g for w in key.split()):
            tones = tone_list
            break
    tone_str = ", ".join(tones) if tones else "educational, trustworthy"

    # Cross-niche context berdasarkan topics
    t = str(topics).lower()
    cross_niche_hint = ""
    for keyword, data in CROSS_NICHE_MATRIX.items():
        if keyword in t and data["score"] >= 0.60:
            segs = ", ".join(data["dana_segments"][:2])
            feats = ", ".join(data["best_dana_features"][:2])
            cross_niche_hint = f"Cross-niche: audiens {segs}, fitur relevan: {feats}."
            break

    audience_str = str(target_audience).strip() if target_audience else \
        "Gen Z, Millennial, ibu rumah tangga, pelajar, pekerja kantoran Indonesia"

    enriched = (
        f"{p['company_name']} — {p['description']} "
        f"Campaign goals: {goals}. Topik: {topics}. "
        f"Target audience: {audience_str}. "
        f"Tone: {tone_str}. "
        f"{cross_niche_hint} "
        f"Detail: {description}"
    ).strip()

    return enriched


def get_profile_summary() -> dict:
    p = COMPANY_PROFILE
    return {
        "company":          p["company_name"],
        "industry":         p["industry"],
        "sub_industry":     p["sub_industry"],
        "segments":         len(p["target_segments"]),
        "tones":            len(p["brand_tones"]),
        "cross_niche_cats": len(CROSS_NICHE_MATRIX),
    }


def get_dana_features_for_category(category_text: str) -> list[str]:
    """Shortcut untuk dapat fitur DANA yang paling relevan per kategori KOL"""
    info = get_kol_cross_niche_info(category_text)
    return info.get("best_dana_features", [])