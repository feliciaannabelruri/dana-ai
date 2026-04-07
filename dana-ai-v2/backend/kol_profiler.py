"""
kol_profiler.py — Enhanced v2
==============================
Upgrade dari versi sebelumnya:
1. Cross-niche detection: mama lifestyle → bisa reach ibu RT yang butuh dompet digital
2. Audience profiling lebih dalam: siapa SEBENARNYA yang nonton, bukan hanya kategori KOL
3. DANA-specific fit reasoning: langsung sebut use case DANA yang relevan (transfer, QRIS, dll)
4. Risk flag lebih smart: detect kontroversi, brand safety, niche yang gak match sama sekali
5. Summary actionable: tim bisa langsung decide go/no-go dari summary aja

Uses Groq (llama-3.3-70b-versatile) — free tier ~30 req/min
"""

import os
import json
import hashlib
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from openai import OpenAI

# ── Config ─────────────────────────────────────────────────────────────────────
CACHE_DIR = Path("data/profile_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "llama-3.3-70b-versatile"

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ.get("GROQ_API_KEY", ""),
)

# ── DANA Context untuk LLM ─────────────────────────────────────────────────────
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

# ── System Prompt (Enhanced) ───────────────────────────────────────────────────
SYSTEM_PROMPT = f"""Kamu adalah senior KOL analyst di tim marketing DANA Indonesia (aplikasi dompet digital fintech).
Tugasmu: analisis MENDALAM apakah seorang KOL cocok untuk campaign DANA, dengan mempertimbangkan:
1. Siapa SEBENARNYA audiensnya (bukan hanya kategori kontennya)
2. Cross-niche potential: apakah audiensnya pakai DANA even kalau topiknya bukan finance
3. Risiko brand safety

Context tentang DANA:
{DANA_CONTEXT}

PENTING: 
- KOL lifestyle/parenting/food BISA sangat cocok untuk DANA kalau audiensnya = DANA target user
- Jangan hanya lihat kategori — lihat siapa yang NONTON kontennya
- Selalu balas HANYA dengan JSON valid, tanpa markdown, tanpa penjelasan tambahan
"""

# ── User Prompt Template (Enhanced) ───────────────────────────────────────────
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
- Topik: {topics}
- Target audience: {target_audience}
- Deskripsi: {description}

TUGASMU:
1. Identifikasi siapa SEBENARNYA yang nonton konten ini (beyond kategori)
2. Cek apakah ada CROSS-NICHE potential untuk DANA
3. Nilai kesesuaian dengan campaign ini
4. Berikan go/no-go summary yang actionable

Balas dengan JSON PERSIS format ini (no markdown):
{{
  "audience_profile": "Deskripsi konkret siapa audiensnya: umur, gender, pekerjaan, kebiasaan digital (1-2 kalimat)",
  "audience_dana_overlap": ["list segment DANA yang ada di audiens ini, misal: ibu-RT-belanja-online, mahasiswa-terima-uang-saku, pekerja-gajian"],
  "content_style": "Gaya konten dalam 3-5 kata",
  "cross_niche_angle": "Kalau bukan finance KOL, jelaskan angle DANA yang bisa dipromote ke audiensnya. Kosongkan jika finance KOL.",
  "dana_use_cases": ["list fitur DANA yang relevan untuk audiens ini, max 3 item, misal: transfer-uang, bayar-tagihan, cashback-belanja"],
  "campaign_fit_reason": "Kenapa cocok/tidak untuk campaign {goals} ini — spesifik dan konkret (1-2 kalimat)",
  "fit_score": 0.75,
  "risk_flag": "Isi jika ada: kontroversi, niche mismatch, brand safety concern. Kosongkan jika aman.",
  "summary": "Go/No-go dalam 1 kalimat dengan alasan utama, format: GO/NO-GO: [alasan konkret]"
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
    "audience_profile": "",
    "audience_dana_overlap": [],
    "content_style": "",
    "cross_niche_angle": "",
    "dana_use_cases": [],
    "campaign_fit_reason": "",
    "fit_score": 0.5,
    "risk_flag": "",
    "summary": "",
    # backward compat
    "cross_topics": [],
    "audience_overlap": [],
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def _cache_key(username: str, goals: str, topics: str, description: str = "") -> str:
    # Include description hash agar cache invalidate kalau campaign berubah
    raw = f"{username}|{goals}|{topics}|{description[:100]}"
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

    # Type safety
    profile["fit_score"] = float(max(0.0, min(1.0, profile.get("fit_score", 0.5))))

    # Normalize list fields
    for field in ["audience_dana_overlap", "dana_use_cases", "cross_topics", "audience_overlap"]:
        val = profile.get(field, [])
        if isinstance(val, str):
            profile[field] = [v.strip() for v in val.split(",") if v.strip()]
        elif not isinstance(val, list):
            profile[field] = []

    # Backward compat: map new fields ke old field names
    if not profile.get("audience_overlap") and profile.get("audience_dana_overlap"):
        profile["audience_overlap"] = profile["audience_dana_overlap"]
    if not profile.get("cross_topics") and profile.get("dana_use_cases"):
        profile["cross_topics"] = profile["dana_use_cases"]

    return profile


def _load_cache(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _save_cache(path: Path, data: dict) -> None:
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
    Results cached by username+goals+topics+description hash.
    """
    username    = str(kol.get("username", "")).strip()
    goals       = str(campaign.get("goals", ""))
    topics      = str(campaign.get("topics", ""))
    description = str(campaign.get("campaign_description", ""))

    cache_path = CACHE_DIR / f"{_cache_key(username, goals, topics, description)}.json"
    if cached := _load_cache(cache_path):
        return _normalize_profile(cached)

    prompt = USER_PROMPT_TEMPLATE.format(
        username       = username,
        social_media   = kol.get("social_media", ""),
        category       = kol.get("category", "konten umum"),
        tier           = _tier_label(kol),
        followers      = kol.get("followers_raw", ""),
        location       = kol.get("location_raw", ""),
        goals          = goals,
        topics         = topics,
        target_audience= campaign.get("target_audience", ""),
        description    = description,
    )

    try:
        response = client.chat.completions.create(
            model    = MODEL,
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            max_tokens  = 500,
            temperature = 0.15,  # lebih deterministik untuk profiling
        )
        raw     = response.choices[0].message.content or ""
        profile = _normalize_profile(_extract_json(raw))
        _save_cache(cache_path, profile)
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
    Cache sangat efektif karena profil KOL + campaign yang sama = hit cache.
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


# ── Quick fit check (tanpa LLM, pakai rules) ──────────────────────────────────
# Dipakai sebagai fallback atau pre-filter sebelum LLM

CROSS_NICHE_RULES = {
    # category_keyword → (dana_segments, base_score)
    "lifestyle":    (["urban-millennial", "gen-z"], 0.65),
    "parenting":    (["ibu-RT", "keluarga"], 0.72),
    "food":         (["semua-umur", "cashless-merchant"], 0.60),
    "kuliner":      (["semua-umur", "cashless-merchant"], 0.60),
    "travel":       (["pekerja-produktif", "urban"], 0.62),
    "fashion":      (["perempuan-urban", "belanja-online"], 0.63),
    "beauty":       (["perempuan-urban", "belanja-online"], 0.63),
    "skincare":     (["perempuan-urban"], 0.60),
    "comedy":       (["gen-z", "brand-awareness"], 0.55),
    "entertainment":  (["gen-z", "brand-awareness"], 0.55),
    "finance":      (["investor", "literasi-keuangan"], 0.90),
    "keuangan":     (["investor", "literasi-keuangan"], 0.90),
    "investasi":    (["investor", "literasi-keuangan"], 0.88),
    "bisnis":       (["entrepreneur", "UMKM"], 0.80),
    "entrepreneur": (["UMKM", "pembayaran-bisnis"], 0.80),
    "edukasi":      (["pelajar", "mahasiswa"], 0.68),
    "mahasiswa":    (["pelajar", "transfer-uang-saku"], 0.70),
    "olahraga":     (["gen-z", "millennial"], 0.50),
    "gaming":       (["gen-z", "top-up-game"], 0.58),
    "otomotif":     (["laki-laki-produktif"], 0.45),
    "ibu":          (["ibu-RT", "belanja-keluarga"], 0.75),
    "rumah":        (["ibu-RT", "tagihan-rumah"], 0.68),
}

def quick_cross_niche_score(category: str) -> tuple[float, list[str]]:
    """
    Rule-based cross-niche scoring sebagai fallback kalau LLM gagal.
    Returns (score, dana_segments)
    """
    cat_lower = (category or "").lower()
    best_score = 0.35
    best_segments = []

    for keyword, (segments, score) in CROSS_NICHE_RULES.items():
        if keyword in cat_lower:
            if score > best_score:
                best_score = score
                best_segments = segments

    return best_score, best_segments