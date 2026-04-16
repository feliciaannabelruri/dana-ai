import os
import json
import hashlib
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from openai import OpenAI

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

MODEL = "llama-3.3-70b-versatile"

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ.get("GROQ_API_KEY", ""),
)

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

# ── Goals Database: mapping goals → signal konkret untuk LLM ──────────────────
GOALS_SIGNALS: dict[str, dict] = {
    "brand awareness":   {"intent": "jangkauan luas, awareness", "kol_fit": "reach tinggi, engagement luas, konten yang mudah viral", "dana_angle": "perkenalkan DANA ke audiens baru"},
    "awareness":         {"intent": "jangkauan luas, awareness", "kol_fit": "reach tinggi, engagement luas, konten yang mudah viral", "dana_angle": "perkenalkan DANA ke audiens baru"},
    "engagement":        {"intent": "interaksi tinggi, komunitas aktif", "kol_fit": "ER tinggi, komunitas engaged, sering reply/diskusi", "dana_angle": "trigger konversasi tentang cashless"},
    "conversion":        {"intent": "dorong install atau transaksi DANA", "kol_fit": "audiens decision-ready, trust tinggi, sudah pakai e-wallet", "dana_angle": "CTA download + transaksi pertama"},
    "install":           {"intent": "dorong install aplikasi DANA", "kol_fit": "audiens mobile-savvy, sudah familiar e-wallet", "dana_angle": "CTA download DANA"},
    "transaksi":         {"intent": "mendorong transaksi aktif di DANA", "kol_fit": "audiens yang sudah punya kebiasaan bayar digital", "dana_angle": "QRIS, transfer, top-up"},
    "edukasi":           {"intent": "edukasi fitur dan manfaat DANA", "kol_fit": "KOL yang trusted, konten informatif, audiens yang ingin belajar", "dana_angle": "tutorial fitur, tips keuangan digital"},
    "retention":         {"intent": "pertahankan user lama tetap aktif", "kol_fit": "audiens yang sudah kenal DANA, perlu reminder fitur baru", "dana_angle": "fitur baru, promo cashback, loyalty"},
    "product launch":    {"intent": "launch fitur/produk baru DANA", "kol_fit": "early adopter, tech-savvy, opinion leader", "dana_angle": "first look fitur baru, eksklusif"},
    "promo":             {"intent": "promosi cashback atau promo khusus", "kol_fit": "audiens deal-hunter, ibu RT, mahasiswa", "dana_angle": "cashback, diskon, promo merchant"},
    "umkm":              {"intent": "akuisisi merchant UMKM pakai QRIS", "kol_fit": "KOL entrepreneur, bisnis, kuliner", "dana_angle": "QRIS merchant, terima pembayaran digital"},
}

# ── Topics/Niche Database: mapping niche → profil audiens konkret ──────────────
TOPICS_SIGNALS: dict[str, dict] = {
    "lifestyle":     {"audience": "urban millennial perempuan 22-35, aktif sosmed, konsumtif digital", "dana_overlap": ["cashless-belanja", "bayar-tagihan", "top-up"], "content_fit": "everyday content, relatable, aspirational"},
    "parenting":     {"audience": "ibu RT 25-40, family-oriented, manage keuangan rumah tangga", "dana_overlap": ["bayar-sekolah", "belanja-online", "transfer-keluarga"], "content_fit": "tips, edukasi, sharing pengalaman"},
    "mama":          {"audience": "ibu RT 25-40, family-oriented, manage keuangan rumah tangga", "dana_overlap": ["bayar-sekolah", "belanja-online", "transfer-keluarga"], "content_fit": "tips, edukasi, sharing pengalaman"},
    "food":          {"audience": "semua umur, kuliner enthusiast, sering jajan/makan luar", "dana_overlap": ["bayar-makanan-QRIS", "cashback-kuliner"], "content_fit": "review, mukbang, resep"},
    "kuliner":       {"audience": "semua umur, kuliner enthusiast, sering jajan/makan luar", "dana_overlap": ["bayar-makanan-QRIS", "cashback-kuliner"], "content_fit": "review, mukbang, resep"},
    "travel":        {"audience": "pekerja produktif 25-35, suka jalan-jalan, mobile lifestyle", "dana_overlap": ["beli-tiket", "booking-hotel", "transfer-aman"], "content_fit": "vlog, tips travel, destinasi"},
    "fashion":       {"audience": "perempuan urban 18-30, fashion-forward, sering belanja online", "dana_overlap": ["belanja-cashless", "cashback-fashion"], "content_fit": "OOTD, styling, haul"},
    "beauty":        {"audience": "perempuan urban 18-35, skincare enthusiast, belanja online rutin", "dana_overlap": ["belanja-cashless", "cashback-beauty", "top-up"], "content_fit": "review produk, tutorial"},
    "skincare":      {"audience": "perempuan muda 18-30, concern dengan kulit, konsumtif beauty", "dana_overlap": ["belanja-cashless", "cashback-beauty"], "content_fit": "review, skincare routine"},
    "finance":       {"audience": "professional 25-40, melek keuangan, investor pemula/menengah", "dana_overlap": ["transfer-aman", "top-up-investasi", "literasi-digital"], "content_fit": "edukasi keuangan, tips investasi"},
    "keuangan":      {"audience": "professional 25-40, melek keuangan, investor pemula/menengah", "dana_overlap": ["transfer-aman", "top-up-investasi", "literasi-digital"], "content_fit": "edukasi keuangan, tips investasi"},
    "investasi":     {"audience": "millennial 25-38, sudah investasi/saham, income stabil", "dana_overlap": ["top-up-investasi", "transfer-cepat", "literasi-finansial"], "content_fit": "analisis pasar, tips investasi"},
    "gaming":        {"audience": "Gen Z laki-laki 15-25, mobile gamer, sering top-up", "dana_overlap": ["top-up-game", "cashback-gaming"], "content_fit": "gameplay, review game, tips"},
    "edukasi":       {"audience": "pelajar/mahasiswa 15-25, orangtua, guru, orientasi belajar", "dana_overlap": ["terima-uang-saku", "bayar-SPP", "top-up"], "content_fit": "tutorial, tips belajar, motivasi"},
    "entertainment": {"audience": "semua umur, Gen Z dominan, reach sangat luas", "dana_overlap": ["brand-awareness", "cashless-everyday"], "content_fit": "konten hiburan, viral, relatable"},
    "comedy":        {"audience": "Gen Z dan millennial, suka konten ringan dan menghibur", "dana_overlap": ["brand-awareness", "cashless-everyday"], "content_fit": "skit, parodi, meme"},
    "bisnis":        {"audience": "entrepreneur, UMKM owner, profesional 28-45", "dana_overlap": ["QRIS-merchant", "terima-pembayaran", "transfer-bisnis"], "content_fit": "tips bisnis, success story"},
    "umkm":          {"audience": "pemilik usaha kecil, warung, toko online", "dana_overlap": ["QRIS-merchant", "terima-pembayaran-digital"], "content_fit": "tips jualan, sharing pengalaman"},
    "otomotif":      {"audience": "laki-laki dewasa 25-45, punya kendaraan, produktif", "dana_overlap": ["bayar-servis", "beli-bensin-cashless"], "content_fit": "review mobil/motor, modifikasi"},
    "olahraga":      {"audience": "aktif, health-conscious, Gen Z dan millennial", "dana_overlap": ["beli-suplemen-cashless", "bayar-gym"], "content_fit": "workout, tips fitness, challenge"},
    "kesehatan":     {"audience": "health-conscious, 25-45, peduli hidup sehat", "dana_overlap": ["bayar-apotik", "beli-suplemen"], "content_fit": "tips kesehatan, review produk"},
}


def enrich_goals_topics(goals: str, topics: str) -> dict:
    """
    Urai goals dan topics menjadi sinyal konkret dari database.
    Support multi-topic (comma-separated).
    """
    goals_lower = (goals or "").lower()
    topics_lower = (topics or "").lower()

    topic_list = [t.strip() for t in re.split(r"[,;/]", topics_lower) if t.strip()]

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
    all_audiences = []
    for t in matched_topics:
        all_dana_overlap.extend(t.get("dana_overlap", []))
        all_audiences.append(t.get("audience", ""))

    return {
        "goals_signal":      matched_goals,
        "topics_signals":    matched_topics,
        "combined_overlap":  list(dict.fromkeys(all_dana_overlap)),
        "combined_audience": " | ".join(all_audiences),
    }


# ── System Prompt ──────────────────────────────────────────────────────────────
SYSTEM_PROMPT = f"""Kamu adalah senior KOL analyst di tim marketing DANA Indonesia (aplikasi dompet digital fintech).
Tugasmu: analisis MENDALAM apakah seorang KOL cocok untuk campaign DANA, dengan mempertimbangkan:
1. Siapa SEBENARNYA audiensnya — bukan hanya label kategorinya
2. Apakah ada overlap antara audiens KOL dengan target user DANA
3. Angle konten yang paling tepat untuk campaign ini (bukan generik)
4. Risiko brand safety

Context tentang DANA:
{DANA_CONTEXT}

PENTING:
- KOL finance pun perlu di-profile spesifik: finance broad (saham, kripto) vs finance yang relevan DANA (transfer, QRIS, dompet digital)
- KOL lifestyle/parenting/food BISA sangat cocok kalau audiensnya = DANA target user
- Selalu balas HANYA dengan JSON valid, tanpa markdown, tanpa penjelasan tambahan
- Isi semua field — jangan kosongkan kecuali yang memang tidak relevan
"""

# ── User Prompt Template ───────────────────────────────────────────────────────
USER_PROMPT_TEMPLATE = """\
Analisis KOL ini untuk campaign DANA:

KOL DATA:
- Username: {username}
- Platform: {social_media}
- Kategori konten: {category}
- Tier: {tier} | Followers: {followers}
- Lokasi: {location}

CAMPAIGN INFO:
- Goals: {goals}
- Topik/niche: {topics}
- Deskripsi: {description}

ENRICHED CONTEXT (dari database):
- Intent campaign: {goals_intent}
- KOL yang ideal untuk campaign ini: {kol_fit_ideal}
- DANA angle untuk campaign ini: {dana_angle}
- Prediksi audiens berdasarkan niche: {predicted_audience}
- DANA features yang relevan untuk niche ini: {predicted_dana_overlap}

TUGASMU:
1. Tentukan siapa SEBENARNYA yang nonton KOL ini (beyond label kategori)
2. Apakah audiens itu punya kebutuhan yang DANA bisa solve?
3. Angle konten DANA apa yang paling natural untuk KOL ini?
4. Apakah KOL ini cocok untuk goals: "{goals}"?
5. Berikan go/no-go yang actionable

Balas dengan JSON PERSIS format ini (no markdown):
{{
  "audience_profile": "Deskripsi konkret siapa audiensnya: umur, gender, pekerjaan, kebiasaan digital (1-2 kalimat)",
  "audience_dana_overlap": ["segment DANA yang ada di audiens ini, misal: ibu-RT-belanja-online, mahasiswa-terima-uang-saku"],
  "content_style": "Gaya konten dalam 3-5 kata",
  "content_angle_for_dana": "Angle konten DANA yang paling natural untuk KOL ini — spesifik, bukan generik. Isi untuk SEMUA KOL termasuk finance.",
  "dana_use_cases": ["fitur DANA yang relevan untuk audiens ini, max 3, misal: transfer-uang, bayar-tagihan, cashback-belanja"],
  "campaign_fit_reason": "Kenapa cocok/tidak untuk goals '{goals}' — spesifik dan konkret (1-2 kalimat)",
  "fit_score": 0.75,
  "risk_flag": "Isi jika ada risiko: kontroversi, brand safety, niche mismatch. Kosongkan jika aman.",
  "summary": "GO/NO-GO dalam 1 kalimat dengan alasan utama, format: GO/NO-GO: [alasan konkret]"
}}

fit_score rules:
- 0.85-1.0: Perfect match, langsung prioritaskan
- 0.70-0.84: Bagus, cocok untuk campaign ini
- 0.50-0.69: Potential ada tapi perlu angle yang tepat
- 0.30-0.49: Kurang relevan tapi masih bisa
- 0.0-0.29: Tidak cocok, skip
"""

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
    # backward compat
    "cross_topics":           [],
    "audience_overlap":       [],
    "cross_niche_angle":      "",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def _cache_key(username: str, goals: str, topics: str, description: str = "") -> str:
    raw = f"v3|{username}|{goals}|{topics}|{description[:100]}"
    return hashlib.md5(raw.encode()).hexdigest()


def _extract_json(text: str) -> dict:
    text = re.sub(r"```(?:json)?", "", text).strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found in response: {text[:200]}")
    return json.loads(match.group())


def _normalize_profile(raw: dict) -> dict:
    """Ensure backward compat + type safety"""
    profile = DEFAULT_PROFILE.copy()
    profile.update(raw)

    profile["fit_score"] = float(max(0.0, min(1.0, profile.get("fit_score", 0.5))))

    for field in ["audience_dana_overlap", "dana_use_cases", "cross_topics", "audience_overlap"]:
        val = profile.get(field, [])
        if isinstance(val, str):
            profile[field] = [v.strip() for v in val.split(",") if v.strip()]
        elif not isinstance(val, list):
            profile[field] = []

    # Backward compat mapping
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


# ── KOL Tier Label ─────────────────────────────────────────────────────────────
def _tier_label(kol: dict) -> str:
    tier = kol.get("tier") or kol.get("tier_score") or 2
    try:
        tier = int(float(tier))
    except (TypeError, ValueError):
        tier = 2
    return {1: "Nano (<10K)", 2: "Mikro (10K-100K)", 3: "Makro (100K-1M)", 4: "Mega (>1M)"}.get(tier, "Mikro")


# ── Core: Profile single KOL ───────────────────────────────────────────────────
def get_kol_profile(kol: dict, campaign: dict) -> dict:
    """
    Profile a single KOL against a campaign.
    Cache priority: Upstash (jika tersedia) → file cache lokal → LLM call.
    """
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

    # 2. Cek file cache lokal (untuk backward compat & offline)
    cache_path = CACHE_DIR / f"{key}.json"
    if file_cached := _load_file_cache(cache_path):
        # Sync ke Upstash jika belum ada di sana
        if _CACHE_ENABLED:
            set_profile_cache(key, file_cached)
        return _normalize_profile(file_cached)

    # 3. Enrich goals + topics dari database
    enriched = enrich_goals_topics(goals, topics)
    goals_signal       = enriched["goals_signal"]
    predicted_audience = enriched["combined_audience"]
    predicted_overlap  = ", ".join(enriched["combined_overlap"])

    prompt = USER_PROMPT_TEMPLATE.format(
        username               = username,
        social_media           = kol.get("social_media", ""),
        category               = kol.get("category", "konten umum"),
        tier                   = _tier_label(kol),
        followers              = kol.get("followers_raw", ""),
        location               = kol.get("location_raw", ""),
        goals                  = goals,
        topics                 = topics,
        description            = description,
        goals_intent           = goals_signal.get("intent", goals),
        kol_fit_ideal          = goals_signal.get("kol_fit", ""),
        dana_angle             = goals_signal.get("dana_angle", ""),
        predicted_audience     = predicted_audience,
        predicted_dana_overlap = predicted_overlap,
    )

    try:
        response = client.chat.completions.create(
            model    = MODEL,
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            max_tokens  = 600,
            temperature = 0.15,
        )
        raw     = response.choices[0].message.content or ""
        profile = _normalize_profile(_extract_json(raw))

        # Simpan ke file cache lokal
        _save_file_cache(cache_path, profile)

        # Simpan ke Upstash
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
    max_workers: int = 5,
) -> dict[str, dict]:
    """
    Profile multiple KOLs concurrently.
    Returns {username: profile}
    Groq free tier: ~30 req/min → max_workers=5 aman untuk burst.
    Cache (Upstash + file) sangat efektif untuk request berulang.
    """
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
    """
    Rule-based fallback kalau LLM gagal.
    Support multi-category (comma-separated).
    Returns (best_score, dana_segments)
    """
    cats = [c.strip().lower() for c in re.split(r"[,;/]", category or "") if c.strip()]
    if not cats:
        return 0.35, []

    best_score = 0.35
    best_segments: list[str] = []

    for cat in cats:
        for keyword, (segments, score) in CROSS_NICHE_RULES.items():
            if keyword in cat:
                if score > best_score:
                    best_score = score
                    best_segments = segments

    return best_score, best_segments