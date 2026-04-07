import os
import json
import hashlib
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from openai import OpenAI

# ── Config ────────────────────────────────────────────────────

CACHE_DIR = Path("data/profile_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "llama-3.3-70b-versatile"

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ.get("GROQ_API_KEY", ""),
)

# ── Prompts ───────────────────────────────────────────────────

SYSTEM_PROMPT = """Kamu adalah analis KOL marketing Indonesia untuk brand DANA (aplikasi dompet digital fintech).
Tugasmu: profiling KOL berdasarkan data yang diberikan, lalu nilai kesesuaiannya dengan campaign.
Selalu balas HANYA dengan JSON valid, tanpa markdown, tanpa penjelasan tambahan."""

USER_PROMPT_TEMPLATE = """\
Data KOL:
- Username: {username}
- Platform: {social_media}
- Kategori konten: {category}
- Tier: {tier} | Followers: {followers}
- Lokasi: {location}

Campaign DANA:
- Goals: {goals}
- Topik: {topics}
- Target audience: {target_audience}
- Deskripsi: {description}

Balas dengan JSON persis format ini:
{{
  "audience_profile": "siapa yang menonton konten ini (1 kalimat)",
  "content_style": "gaya konten singkat",
  "cross_topics": ["topik lain yang di-cover selain kategori utama"],
  "campaign_fit_reason": "kenapa cocok atau tidak untuk campaign ini (1-2 kalimat)",
  "fit_score": 0.75,
  "audience_overlap": ["segment DANA yang overlap, misal: mahasiswa, ibu RT, gen-z"],
  "risk_flag": "isi jika ada mismatch/risiko, kosongkan jika tidak ada",
  "summary": "ringkasan 1 kalimat untuk tim campaign"
}}

fit_score: float 0.0-1.0. Pertimbangkan cross-niche (misal lifestyle+finance = bagus untuk DANA)."""

# ── Defaults ──────────────────────────────────────────────────

DEFAULT_PROFILE: dict = {
    "audience_profile": "",
    "content_style": "",
    "cross_topics": [],
    "campaign_fit_reason": "",
    "fit_score": 0.5,
    "audience_overlap": [],
    "risk_flag": "",
    "summary": "",
}

# ── Helpers ───────────────────────────────────────────────────

def _cache_key(username: str, goals: str, topics: str) -> str:
    raw = f"{username}|{goals}|{topics}"
    return hashlib.md5(raw.encode()).hexdigest()


def _extract_json(text: str) -> dict:
    text = re.sub(r"```(?:json)?", "", text).strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found in response: {text[:200]}")
    return json.loads(match.group())


def _load_cache(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _save_cache(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

# ── Core ──────────────────────────────────────────────────────

def get_kol_profile(kol: dict, campaign: dict) -> dict:
    """Profile a single KOL against a campaign. Results are cached."""
    username = str(kol.get("username", "")).strip()
    goals    = str(campaign.get("goals", ""))
    topics   = str(campaign.get("topics", ""))

    cache_path = CACHE_DIR / f"{_cache_key(username, goals, topics)}.json"
    if cached := _load_cache(cache_path):
        return cached

    prompt = USER_PROMPT_TEMPLATE.format(
        username=username,
        social_media=kol.get("social_media", ""),
        category=kol.get("category", "konten umum"),
        tier=kol.get("type_raw", "mikro"),
        followers=kol.get("followers_raw", ""),
        location=kol.get("location_raw", ""),
        goals=goals,
        topics=topics,
        target_audience=campaign.get("target_audience", ""),
        description=campaign.get("campaign_description", ""),
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=350,
            temperature=0.2,
        )
        raw     = response.choices[0].message.content or ""
        profile = _extract_json(raw)
        profile["fit_score"] = float(max(0.0, min(1.0, profile.get("fit_score", 0.5))))

        _save_cache(cache_path, profile)
        return profile

    except Exception as e:
        print(f"[profiler] error @{username}: {e}")
        return DEFAULT_PROFILE.copy()


def batch_profile_kols(
    kol_list: list[dict],
    campaign: dict,
    max_workers: int = 5,  # Groq free tier: ~30 req/min
) -> dict[str, dict]:
    """Profile multiple KOLs concurrently. Returns {username: profile}."""
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