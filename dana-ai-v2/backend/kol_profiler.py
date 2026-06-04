import os
import json
import hashlib
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from groq import Groq

# ── Cache (Upstash REST, fallback ke file cache) ───────────────────────────────
try:
    from upstash_cache import get_profile_cache, set_profile_cache
    _CACHE_ENABLED = True
except ImportError:
    _CACHE_ENABLED = False
    def get_profile_cache(k): return None
    def set_profile_cache(k, v): pass

# ── Config ─────────────────────────────────────────────────────────────────────
CACHE_DIR = Path("data/profile_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL   = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

_groq_client = None

def _get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=GROQ_API_KEY)
    return _groq_client

# ── DANA Context ───────────────────────────────────────────────────────────────
DANA_CONTEXT = """
DANA adalah aplikasi dompet digital #1 Indonesia dengan fitur:
- Transfer uang & pembayaran tagihan
- Top-up e-wallet & pulsa
- QRIS untuk bayar di merchant
- Bayar cicilan & pinjaman
- Cashback & promo belanja
- Target user: Gen Z, Millennial, ibu RT, pelajar, pekerja kantoran, UMKM

DANA sangat relevan untuk KOL yang audiensnya:
- Butuh kemudahan bayar sehari-hari (lifestyle, food, travel)
- Ibu rumah tangga yang manage keuangan keluarga
- Pelajar/mahasiswa yang butuh kirim uang dari orang tua
- Pekerja yang terima gaji/transfer
- UMKM / entrepreneur yang butuh QRIS
- Gen Z yang suka cashback & promo

Cross-niche yang BAGUS untuk DANA:
- Mama blogger / parenting → audience ibu RT → bayar sekolah, belanja online, transfer
- Lifestyle creator → audience urban millennial → cashless everyday
- Food/kuliner → audience semua umur → bayar makanan pakai DANA
- Travel vlogger → audience pekerja produktif → beli tiket, booking hotel
- Fashion/beauty → audience perempuan urban → belanja cashless
- Comedy/entertainment → reach luas → brand awareness
- Finance/investasi → direct match → literasi keuangan digital
"""

# ── Goals Database ─────────────────────────────────────────────────────────────
GOALS_SIGNALS: dict[str, dict] = {
    "brand awareness":   {"intent": "jangkauan luas, awareness", "kol_fit": "reach tinggi, engagement luas, konten yang mudah viral, platform TikTok/IG Reels", "dana_angle": "perkenalkan DANA sebagai e-wallet #1 yang stylish dan praktis untuk semua orang"},
    "awareness":         {"intent": "jangkauan luas, awareness", "kol_fit": "reach tinggi, engagement luas, konten yang mudah viral", "dana_angle": "tingkatkan brand recall DANA di berbagai segmen audiens"},
    "engagement":        {"intent": "interaksi tinggi, komunitas aktif", "kol_fit": "ER tinggi, komunitas engaged, sering reply/diskusi, dipercaya audiens", "dana_angle": "buat percakapan organik tentang gaya hidup cashless pakai DANA"},
    "conversion":        {"intent": "dorong install atau transaksi DANA", "kol_fit": "audiens decision-ready, trust tinggi, sudah pakai e-wallet, konten persuasif", "dana_angle": "CTA download + transaksi pertama dengan promo menarik"},
    "install":           {"intent": "dorong install aplikasi DANA", "kol_fit": "audiens mobile-savvy, tech-enthusiast, mahasiswa/pelajar", "dana_angle": "tunjukkan kemudahan registrasi dan keuntungan pakai DANA"},
    "transaksi":         {"intent": "mendorong transaksi aktif di DANA", "kol_fit": "audiens yang sudah punya kebiasaan belanja online atau offline", "dana_angle": "fokus ke fitur spesifik: QRIS, transfer, atau bayar tagihan"},
    "edukasi":           {"intent": "edukasi fitur dan manfaat DANA", "kol_fit": "KOL yang trusted, konten informatif, tutorial style, audiens yang ingin belajar", "dana_angle": "deep-dive fitur DANA (DANA Goals, DANA Protection, atau Investasi)"},
    "retention":         {"intent": "pertahankan user lama tetap aktif", "kol_fit": "audiens yang sudah kenal DANA, perlu reminder fitur baru", "dana_angle": "tunjukkan update fitur terbaru dan promo eksklusif untuk user setia"},
    "product launch":    {"intent": "launch fitur/produk baru DANA", "kol_fit": "tech-savvy, opinion leader, news/media style", "dana_angle": "first look fitur baru yang revolusioner dari DANA"},
    "promo":             {"intent": "promosi cashback atau promo khusus", "kol_fit": "audiens deal-hunter, ibu RT, mahasiswa, pecinta diskon", "dana_angle": "pesta cashback, diskon merchant favorit, dan hemat pakai DANA"},
    "umkm":              {"intent": "akuisisi merchant UMKM pakai QRIS", "kol_fit": "KOL entrepreneur, bisnis, kuliner, pemberdayaan ekonomi", "dana_angle": "DANA Bisnis untuk bantu UMKM terima pembayaran non-tunai dengan mudah"},
    "literasi keuangan": {"intent": "edukasi keuangan digital yang aman", "kol_fit": "finance expert, trusted person, konten serius tapi menarik", "dana_angle": "keamanan transaksi dengan DANA Protection dan manajemen keuangan cerdas"},
}

# ── Topics/Niche Database ──────────────────────────────────────────────────────
TOPICS_SIGNALS: dict[str, dict] = {
    "lifestyle":     {"audience": "urban millennial perempuan & laki-laki 22-35, aktif sosmed, konsumtif digital, suka mencoba hal baru", "dana_overlap": ["cashless-belanja", "bayar-tagihan", "top-up", "promo-hangout"], "content_fit": "everyday content, relatable, aspirational, vlog gaya hidup"},
    "parenting":     {"audience": "ibu & ayah muda 25-40, family-oriented, fokus ke kesejahteraan keluarga dan efisiensi waktu", "dana_overlap": ["bayar-sekolah", "belanja-kebutuhan-RT", "transfer-keluarga", "asuransi-pendidikan"], "content_fit": "tips parenting, edukasi finansial keluarga, sharing pengalaman sehari-hari"},
    "mama":          {"audience": "ibu rumah tangga & working mom 25-45, pengambil keputusan belanja rumah tangga", "dana_overlap": ["belanja-online", "bayar-tagihan-PLN-PDAM", "transfer-bulanan", "tabungan-anak"], "content_fit": "tips hemat, review produk rumah tangga, kegiatan dengan anak"},
    "food":          {"audience": "foodies semua umur, hobi jajan, eksplorasi kuliner, pengguna setia QRIS di merchant", "dana_overlap": ["bayar-makanan-QRIS", "cashback-kuliner", "vaucher-makan"], "content_fit": "review makanan, mukbang, rekomendasi tempat makan baru"},
    "kuliner":       {"audience": "pecinta makanan, sering mencari promo tempat makan, aktif di IG/TikTok kuliner", "dana_overlap": ["bayar-makanan-QRIS", "cashback-kuliner", "DANA-Vibe"], "content_fit": "cinematic food shots, review jujur, tips berburu promo makanan"},
    "travel":        {"audience": "traveler, pekerja produktif 25-35, suka liburan singkat, butuh kepraktisan transaksi saat jalan", "dana_overlap": ["beli-tiket-pesawat/kereta", "booking-hotel", "DANA-internasional", "pembayaran-parkir"], "content_fit": "vlog perjalanan, tips travel hemat, rekomendasi destinasi"},
    "fashion":       {"audience": "perempuan urban 18-35, fashion-forward, rutin belanja di e-commerce, suka diskon brand", "dana_overlap": ["belanja-fashion-online", "cashback-brand-lokal", "bayar-pakai-cicilan"], "content_fit": "OOTD, styling tips, haul belanja, review brand"},
    "beauty":        {"audience": "perempuan 18-40, skincare & makeup enthusiast, aktif mencari review produk, konsumtif di beauty shop", "dana_overlap": ["belanja-skincare-online", "cashback-beauty-merchant", "bayar-tagihan-toko"], "content_fit": "review skincare/makeup, tutorial dandan, skincare routine"},
    "finance":       {"audience": "profesional & mahasiswa 20-45, ingin melek finansial, tertarik pada investasi dan manajemen uang", "dana_overlap": ["investasi-emas/reksadana", "manajemen-uang-DANA-Goals", "keamanan-DANA-Protection"], "content_fit": "edukasi keuangan, tips menabung, analisis fitur finansial digital"},
    "keuangan":      {"audience": "masyarakat yang ingin belajar hemat dan investasi, butuh alat bantu catat/kelola uang", "dana_overlap": ["DANA-Goals", "catat-transaksi", "investasi-emas", "transfer-bebas-biaya"], "content_fit": "tips budgeting, tutorial investasi pemula, perbandingan e-wallet"},
    "investasi":     {"audience": "investor pemula hingga menengah, melek teknologi, mencari instrumen yang aman dan mudah", "dana_overlap": ["e-mas", "reksadana", "DANA-Siaga", "edukasi-saham"], "content_fit": "tips investasi berkala, review fitur investasi e-wallet, update pasar keuangan"},
    "gaming":        {"audience": "Gen Z & Millennial laki-laki dominan, gamer mobile/PC, rutin melakukan top-up game", "dana_overlap": ["top-up-game-DANA", "cashback-gaming", "beli-voucher-GooglePlay"], "content_fit": "gameplay highlights, tutorial game, review skin baru, promo top-up"},
    "edukasi":       {"audience": "pelajar, mahasiswa, guru, dan orang tua yang mementingkan pengembangan diri", "dana_overlap": ["pembayaran-kursus-online", "bayar-SPP", "kirim-uang-saku", "beli-buku"], "content_fit": "tips belajar, tutorial software, edukasi skill baru, info beasiswa"},
    "entertainment": {"audience": "mass audience, pecinta hiburan, menyukai konten ringan, humor, dan update selebriti", "dana_overlap": ["brand-awareness", "cashless-lifestyle", "DANA-Games", "DANA-Surprise"], "content_fit": "konten viral, humor/comedy, update gosip, challenge seru"},
    "comedy":        {"audience": "semua kalangan yang butuh hiburan, Gen Z-Millennial yang suka relatable humor", "dana_overlap": ["brand-awareness", "cashless-everyday", "promo-seru"], "content_fit": "skit komedi, parodi situasi sehari-hari, meme lucu"},
    "bisnis":        {"audience": "pemilik bisnis, freelancer, UMKM, orang yang ingin memulai usaha", "dana_overlap": ["DANA-Bisnis", "terima-pembayaran-QRIS", "transfer-antar-bank-bisnis", "laporan-penjualan"], "content_fit": "tips bisnis pemula, success story, tutorial kelola keuangan usaha"},
    "umkm":          {"audience": "pedagang kecil, pemilik toko online, pengrajin lokal, pengusaha mikro", "dana_overlap": ["QRIS-DANA-Bisnis", "pendataan-transaksi", "pembayaran-supplier"], "content_fit": "tips jualan laris, cara terima pembayaran digital, sharing modal usaha"},
    "otomotif":      {"audience": "laki-laki 20-50, pecinta kendaraan, suka modifikasi, memperhatikan perawatan mesin", "dana_overlap": ["bayar-parkir-digital", "beli-bensin-cashless", "asuransi-kendaraan", "bayar-servis"], "content_fit": "review mobil/motor, tips perawatan, update teknologi otomotif"},
    "olahraga":      {"audience": "individu aktif, pecinta kebugaran, anggota komunitas lari/sepeda/gym", "dana_overlap": ["bayar-member-gym", "beli-perlengkapan-olahraga", "asuransi-kesehatan"], "content_fit": "workout routine, tips diet sehat, review apparel olahraga"},
    "teknologi":     {"audience": "early adopters, gadget lovers, orang yang selalu ingin tahu perkembangan tech terbaru", "dana_overlap": ["beli-gadget-cashless", "bayar-langganan-software", "keamanan-digital"], "content_fit": "unboxing gadget, review fitur tech, berita teknologi terbaru"},
}


def enrich_goals_topics(goals: str, topics: str) -> dict:
    goals_lower  = (goals or "").lower()
    topics_lower = (topics or "").lower()
    topic_list   = [t.strip() for t in re.split(r"[,;/]", topics_lower) if t.strip()]

    matched_goals = {}
    for key, signals in GOALS_SIGNALS.items():
        if key in goals_lower:
            matched_goals = signals
            break
    if not matched_goals:
        matched_goals = {"intent": goals or "campaign marketing", "kol_fit": "reach dan engagement relevan", "dana_angle": "perkenalkan manfaat DANA"}

    matched_topics = []
    for topic in topic_list:
        for key, signals in TOPICS_SIGNALS.items():
            if key in topic:
                matched_topics.append({"topic": key, **signals})
                break

    if not matched_topics:
        matched_topics = [{"topic": topics or "umum", "audience": "masyarakat umum Indonesia", "dana_overlap": ["cashless-everyday"], "content_fit": "konten relevan"}]

    all_dana_overlap = []
    all_audiences    = []
    for t in matched_topics:
        all_dana_overlap.extend(t.get("dana_overlap", []))
        all_audiences.append(t.get("audience", ""))

    return {
        "goals_signal":      matched_goals,
        "topics_signals":    matched_topics,
        "combined_overlap":  list(dict.fromkeys(all_dana_overlap)),
        "combined_audience": " | ".join(all_audiences),
    }


# ── Default Profile ────────────────────────────────────────────────────────────
DEFAULT_PROFILE: dict = {
    "audience_profile":       "",
    "audience_dana_overlap":  [],
    "content_style":          "",
    "content_angle_for_dana": "",
    "dana_use_cases":         [],
    "campaign_fit_reason":    "",
    "fit_score":              0.5,
    "risk_flag":              "",
    "summary":                "",
    "cross_topics":           [],
    "audience_overlap":       [],
    "cross_niche_angle":      "",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def _cache_key(username: str, goals: str, topics: str, description: str = "") -> str:
    raw = f"v3|{username}|{goals}|{topics}|{description[:100]}"
    return hashlib.md5(raw.encode()).hexdigest()


def _extract_json(text: str) -> dict:
    text  = re.sub(r"```(?:json)?", "", text).strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found in response: {text[:200]}")
    return json.loads(match.group())


def _normalize_profile(raw: dict) -> dict:
    profile = DEFAULT_PROFILE.copy()
    profile.update(raw)
    profile["fit_score"] = float(max(0.0, min(1.0, profile.get("fit_score", 0.5))))

    for field in ["audience_dana_overlap", "dana_use_cases", "cross_topics", "audience_overlap"]:
        val = profile.get(field, [])
        if isinstance(val, str):
            profile[field] = [v.strip() for v in val.split(",") if v.strip()]
        elif not isinstance(val, list):
            profile[field] = []

    if not profile.get("audience_overlap") and profile.get("audience_dana_overlap"):
        profile["audience_overlap"] = profile["audience_dana_overlap"]
    if not profile.get("cross_topics") and profile.get("dana_use_cases"):
        profile["cross_topics"] = profile["dana_use_cases"]
    if not profile.get("cross_niche_angle") and profile.get("content_angle_for_dana"):
        profile["cross_niche_angle"] = profile["content_angle_for_dana"]

    return profile


def _load_file_cache(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _save_file_cache(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _tier_label(kol: dict) -> str:
    tier = kol.get("tier") or kol.get("tier_score") or 2
    try:
        tier = int(float(tier))
    except (TypeError, ValueError):
        tier = 2
    return {1: "Nano (<10K)", 2: "Mikro (10K-100K)", 3: "Makro (100K-1M)", 4: "Mega (>1M)"}.get(tier, "Mikro")


# ── Core: Call Groq ────────────────────────────────────────────────────────────
def _call_groq(inputs: dict) -> str:
    """
    Call Groq API untuk profiling KOL.
    Returns raw JSON string dari model.
    """
    system_prompt = (
        "Kamu adalah AI analyst untuk kampanye marketing brand DANA Indonesia. "
        "Berikan analisis profil KOL dalam format JSON yang valid.\n\n"
        + DANA_CONTEXT
    )

    user_prompt = (
        f"Analisis KOL berikut untuk kampanye DANA:\n\n"
        f"Username: {inputs.get('username', '')}\n"
        f"Platform: {inputs.get('social_media', '')}\n"
        f"Kategori konten: {inputs.get('category', '')}\n"
        f"Tier: {inputs.get('tier', '')}\n"
        f"Followers: {inputs.get('followers', '')}\n"
        f"Lokasi: {inputs.get('location', '')}\n\n"
        f"Detail campaign:\n"
        f"Goals: {inputs.get('goals', '')}\n"
        f"Topik: {inputs.get('topics', '')}\n"
        f"Deskripsi: {inputs.get('description', '')}\n"
        f"Intent: {inputs.get('goals_intent', '')}\n"
        f"Ideal KOL fit: {inputs.get('kol_fit_ideal', '')}\n"
        f"DANA angle: {inputs.get('dana_angle', '')}\n"
        f"Prediksi audiens: {inputs.get('predicted_audience', '')}\n"
        f"Prediksi DANA overlap: {inputs.get('predicted_dana_overlap', '')}\n\n"
        "Berikan analisis HANYA dalam format JSON dengan field berikut:\n"
        "{\n"
        '  "audience_profile": "string",\n'
        '  "audience_dana_overlap": ["string"],\n'
        '  "content_style": "string",\n'
        '  "cross_niche_angle": "string",\n'
        '  "dana_use_cases": ["string"],\n'
        '  "campaign_fit_reason": "string",\n'
        '  "fit_score": 0.0,\n'
        '  "risk_flag": "string atau kosong",\n'
        '  "summary": "GO: / NO-GO: / REVIEW: ...",\n'
        '  "cross_topics": ["string"],\n'
        '  "audience_overlap": ["string"]\n'
        "}\n\n"
        "Respond ONLY with valid JSON. No markdown, no preamble, no explanation."
    )

    client = _get_groq_client()
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        max_tokens=1000,
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content


# ── Core: Profile single KOL ───────────────────────────────────────────────────
def get_kol_profile(kol: dict, campaign: dict) -> dict:
    username    = str(kol.get("username", "")).strip()
    goals       = str(campaign.get("goals", ""))
    topics      = str(campaign.get("topics", ""))
    description = str(campaign.get("campaign_description", ""))

    key = _cache_key(username, goals, topics, description)

    # 1. Cek Upstash cache
    if _CACHE_ENABLED:
        cached = get_profile_cache(key)
        if cached:
            return _normalize_profile(cached)

    # 2. Cek file cache lokal
    cache_path = CACHE_DIR / f"{key}.json"
    if file_cached := _load_file_cache(cache_path):
        if _CACHE_ENABLED:
            set_profile_cache(key, file_cached)
        return _normalize_profile(file_cached)

    # 3. Enrich goals + topics dari database
    enriched           = enrich_goals_topics(goals, topics)
    goals_signal       = enriched["goals_signal"]
    predicted_audience = enriched["combined_audience"]
    predicted_overlap  = ", ".join(enriched["combined_overlap"])

    # 4. Siapkan inputs untuk Groq
    inputs = {
        "username":               username,
        "social_media":           kol.get("social_media", ""),
        "category":               kol.get("category", "konten umum"),
        "tier":                   _tier_label(kol),
        "followers":              str(kol.get("followers_raw", "")),
        "location":               kol.get("location_raw", ""),
        "goals":                  goals,
        "topics":                 topics,
        "description":            description,
        "goals_intent":           goals_signal.get("intent", goals),
        "kol_fit_ideal":          goals_signal.get("kol_fit", ""),
        "dana_angle":             goals_signal.get("dana_angle", ""),
        "predicted_audience":     predicted_audience,
        "predicted_dana_overlap": predicted_overlap,
    }

    try:
        raw_text = _call_groq(inputs)
        profile  = _normalize_profile(_extract_json(raw_text))

        # Simpan ke cache
        _save_file_cache(cache_path, profile)
        if _CACHE_ENABLED:
            set_profile_cache(key, profile)

        return profile

    except Exception as e:
        print(f"[profiler] error @{username}: {e}")
        return DEFAULT_PROFILE.copy()


# ── Batch profiling ────────────────────────────────────────────────────────────
def batch_profile_kols(
    kol_list: list[dict],
    campaign: dict,
    max_workers: int = 4,
) -> dict[str, dict]:
    results: dict[str, dict] = {}

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(get_kol_profile, kol, campaign): kol.get("username", "")
            for kol in kol_list
        }
        for future in as_completed(futures):
            username = futures[future]
            try:
                results[username] = future.result()
            except Exception as e:
                print(f"[profiler] batch failed @{username}: {e}")
                results[username] = DEFAULT_PROFILE.copy()

    return results


# ── Quick fit check (rule-based fallback) ─────────────────────────────────────
CROSS_NICHE_RULES = {
    "lifestyle":     (["urban-millennial", "gen-z"], 0.65),
    "parenting":     (["ibu-RT", "keluarga"], 0.72),
    "mama":          (["ibu-RT", "keluarga"], 0.74),
    "food":          (["semua-umur", "cashless-merchant"], 0.60),
    "kuliner":       (["semua-umur", "cashless-merchant"], 0.60),
    "travel":        (["pekerja-produktif", "urban"], 0.62),
    "fashion":       (["perempuan-urban", "belanja-online"], 0.63),
    "beauty":        (["perempuan-urban", "belanja-online"], 0.63),
    "skincare":      (["perempuan-urban"], 0.60),
    "comedy":        (["gen-z", "brand-awareness"], 0.55),
    "entertainment": (["gen-z", "brand-awareness"], 0.55),
    "finance":       (["investor", "literasi-keuangan"], 0.85),
    "keuangan":      (["investor", "literasi-keuangan"], 0.85),
    "investasi":     (["investor", "literasi-keuangan"], 0.83),
    "bisnis":        (["entrepreneur", "UMKM"], 0.80),
    "entrepreneur":  (["UMKM", "pembayaran-bisnis"], 0.80),
    "edukasi":       (["pelajar", "mahasiswa"], 0.68),
    "mahasiswa":     (["pelajar", "transfer-uang-saku"], 0.70),
    "olahraga":      (["gen-z", "millennial"], 0.50),
    "gaming":        (["gen-z", "top-up-game"], 0.58),
    "otomotif":      (["laki-laki-produktif"], 0.45),
    "ibu":           (["ibu-RT", "belanja-keluarga"], 0.75),
    "rumah":         (["ibu-RT", "tagihan-rumah"], 0.68),
    "umkm":          (["UMKM", "QRIS-merchant"], 0.82),
    "kesehatan":     (["health-conscious", "bayar-apotik"], 0.52),
}


def quick_cross_niche_score(category: str) -> tuple[float, list[str]]:
    cats = [c.strip().lower() for c in re.split(r"[,;/]", category or "") if c.strip()]
    if not cats:
        return 0.35, []

    best_score    = 0.35
    best_segments: list[str] = []

    for cat in cats:
        for keyword, (segments, score) in CROSS_NICHE_RULES.items():
            if keyword in cat:
                if score > best_score:
                    best_score    = score
                    best_segments = segments

    return best_score, best_segments