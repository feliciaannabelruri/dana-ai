from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os, shutil, subprocess, sys, json, threading

from recommender import recommend, get_meta, load_models
from homeless_recommender import recommend_homeless_media
from hf_storage import download_models, upload_models
from free_pool_recommender import recommend_kol_free, recommend_community

app = FastAPI(title="DANA AI Campaign Planner v3 - Multi-Location + Smart Budget")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
DATA_DIR   = os.path.join(os.path.dirname(__file__), 'data')


@app.on_event("startup")
async def startup():
    success = download_models()
    marker = os.path.join(MODELS_DIR, 'st_model.pkl')
    if success and os.path.exists(marker):
        try:
            load_models()
            print("Models loaded!")
        except Exception as e:
            print(f"Load model gagal: {e} — hit /train untuk retrain")
    else:
        print("Model belum ada. Upload KOL.xlsx lalu hit /train")

class TierBudgetSplit(BaseModel):
    """
    Split budget per tier. Jumlah semua nilai harus = 100 (persen).
    Contoh: {"nano": 40, "mikro": 40, "makro": 20}
    Jika tidak diisi, sistem pakai preferred_tier tunggal.
    """
    nano:  Optional[float] = 0
    mikro: Optional[float] = 0
    makro: Optional[float] = 0
    mega:  Optional[float] = 0


class CampaignRequest(BaseModel):
    campaign_name:        str
    campaign_description: Optional[str] = ""
    goals:                Optional[str] = ""  
    topics:               Optional[str] = ""  
    target_audience:      Optional[str] = ""
    location:             Optional[str]       = "nasional"
    locations:            Optional[List[str]] = None  
    budget:               float = 0
    budget_kol_pct:       float = 0.70
    num_kol:              int = 5
    num_media:            int = 3

    content_type:         Optional[str] = "semua"
    preferred_tier:       Optional[str] = "semua"
    tier_budget_split:    Optional[TierBudgetSplit] = None

    include_homeless_media: bool = True


@app.get("/")
def root():
    return {"status": "ok", "version": "3.0", "message": "DANA AI Campaign Planner"}


@app.get("/status")
def status():
    trained = os.path.exists(os.path.join(MODELS_DIR, 'st_model.pkl'))
    homeless_loaded = os.path.exists(os.path.join(DATA_DIR, 'homeless_media.json'))
    has_patterns = os.path.exists(os.path.join(MODELS_DIR, 'campaign_patterns.json'))

    homeless_count = 0
    if homeless_loaded:
        with open(os.path.join(DATA_DIR, 'homeless_media.json')) as f:
            homeless_count = len(json.load(f))

    pattern_summary = None
    if has_patterns:
        with open(os.path.join(MODELS_DIR, 'campaign_patterns.json')) as f:
            p = json.load(f)
            pattern_summary = {
                'total_records':  p.get('total_with_er', 0),
                'overall_avg_er': p.get('overall_avg_er'),
                'best_tier':      p.get('best_tier'),
                'tier_stats':     p.get('tier_stats', {}),
            }

    return {
        "model_trained":         trained,
        "homeless_media_loaded": homeless_loaded,
        "homeless_media_count":  homeless_count,
        "has_campaign_patterns": has_patterns,
        "campaign_patterns":     pattern_summary,
        "meta": get_meta() if trained else {},
    }


@app.get("/locations")
def get_locations():
    """
    Return daftar lokasi unik dari KOL database dan Homeless Media database.
    Frontend pakai ini untuk dropdown multi-select.
    """
    kol_locations = []
    homeless_locations = []

    kol_pkl = os.path.join(MODELS_DIR, 'kol_df.pkl')
    if os.path.exists(kol_pkl):
        try:
            import joblib, pandas as pd
            df = joblib.load(kol_pkl)
            raw = df['location_raw'].dropna().astype(str).str.strip()
            raw = raw[raw.str.len() > 0].unique().tolist()
            kol_locations = sorted(set(raw))
        except Exception as e:
            print(f"[WARN] Gagal load KOL locations: {e}")

    homeless_path = os.path.join(DATA_DIR, 'homeless_media.json')
    if os.path.exists(homeless_path):
        try:
            with open(homeless_path) as f:
                media_list = json.load(f)
            raw = [m.get('location_raw', '').strip() for m in media_list]
            raw = [r for r in raw if r]
            homeless_locations = sorted(set(raw))
        except Exception as e:
            print(f"[WARN] Gagal load homeless locations: {e}")

    all_raw = sorted(set(kol_locations + homeless_locations))

    from recommender import normalize_location_query
    grouped = {}
    for loc_raw in all_raw:
        norm = normalize_location_query(loc_raw)
        if norm not in grouped:
            grouped[norm] = []
        grouped[norm].append(loc_raw)

    region_order = [
        "nasional",
        "jakarta", "bandung", "cirebon", "yogyakarta", "solo",
        "semarang", "jawa_tengah", "surabaya", "malang", "jawa_timur",
        "bali", "sumatra", "kalimantan", "sulawesi", "other"
    ]

    result = []
    result.append({"value": "nasional", "label": "🌏 Nasional (Semua Indonesia)", "group": "nasional"})

    for region in region_order:
        if region == "nasional":
            continue
        locs = grouped.get(region, [])
        if not locs:
            continue
        label_map = {
            "jakarta": "Jakarta & Sekitarnya",
            "bandung": "Bandung & Cimahi",
            "cirebon": "Cirebon",
            "yogyakarta": "Yogyakarta",
            "solo": "Solo / Surakarta",
            "semarang": "Semarang",
            "jawa_tengah": "Jawa Tengah Lainnya",
            "surabaya": "Surabaya & Sekitarnya",
            "malang": "Malang",
            "jawa_timur": "Jawa Timur Lainnya",
            "bali": "Bali",
            "sumatra": "Sumatra",
            "kalimantan": "Kalimantan",
            "sulawesi": "Sulawesi",
            "other": "Kota Lainnya",
        }
        group_label = label_map.get(region, region)
        for loc in sorted(locs):
            result.append({
                "value": loc,
                "label": loc,
                "group": group_label,
                "norm":  region,
            })

    for region, locs in grouped.items():
        if region not in region_order:
            for loc in sorted(locs):
                result.append({
                    "value": loc,
                    "label": loc,
                    "group": "Kota Lainnya",
                    "norm":  region,
                })

    return {
        "locations":   result,
        "total":       len(result),
        "kol_count":   len(kol_locations),
        "media_count": len(homeless_locations),
    }


@app.post("/upload-kol")
async def upload_kol(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "File harus .xlsx")
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, 'KOL.xlsx'), 'wb') as f:
        shutil.copyfileobj(file.file, f)
    return {"status": "uploaded", "filename": file.filename}


@app.post("/upload-insight")
async def upload_insight(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "File harus .xlsx")
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, 'insight.xlsx'), 'wb') as f:
        shutil.copyfileobj(file.file, f)

    scripts = os.path.join(os.path.dirname(__file__), 'scripts')
    new_script = os.path.join(scripts, 'extract_insights.py')
    old_script = os.path.join(scripts, 'extract_er.py')
    script_to_use = new_script if os.path.exists(new_script) else old_script

    r = subprocess.run(
        [sys.executable, script_to_use],
        capture_output=True, text=True, cwd=os.path.dirname(__file__)
    )

    patterns_count = 0
    has_patterns   = False
    patterns_path  = os.path.join(DATA_DIR, 'campaign_patterns.json')
    if os.path.exists(patterns_path):
        with open(patterns_path) as pf:
            p = json.load(pf)
            patterns_count = p.get('total_with_er', 0)
            has_patterns   = True

    return {
        "status":         "uploaded",
        "filename":       file.filename,
        "er_extracted":   r.returncode == 0,
        "has_patterns":   has_patterns,
        "patterns_count": patterns_count,
        "log":            r.stdout[-500:] if r.stdout else r.stderr[-500:]
    }


@app.post("/upload-homeless-media")
async def upload_homeless_media(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "File harus .xlsx")
    os.makedirs(DATA_DIR, exist_ok=True)

    dest = os.path.join(DATA_DIR, 'HomelessMedia.xlsx')
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)

    parse_script = os.path.join(os.path.dirname(__file__), 'scripts', 'parse_homeless_media.py')
    env = os.environ.copy()
    env['HOMELESS_MEDIA_PATH'] = dest

    r = subprocess.run(
        [sys.executable, parse_script],
        capture_output=True, text=True,
        cwd=os.path.dirname(__file__),
        env=env
    )

    count = 0
    json_path = os.path.join(DATA_DIR, 'homeless_media.json')
    if os.path.exists(json_path):
        with open(json_path) as jf:
            count = len(json.load(jf))

    return {
        "status":               "uploaded",
        "filename":             file.filename,
        "parsed":               r.returncode == 0,
        "homeless_media_count": count,
        "log":                  r.stdout[-300:] if r.stdout else r.stderr[-300:]
    }


@app.post("/upload-kol-homeless-free")
async def upload_kol_homeless_free(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "File harus .xlsx")
    os.makedirs(DATA_DIR, exist_ok=True)
    dest = os.path.join(DATA_DIR, 'KOLHomeless.xlsx')
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)

    # Parse ONLY kol_free — jangan timpa community_pool.json yang sudah ada
    parse_script = os.path.join(os.path.dirname(__file__), 'scripts', 'parse_free_pools.py')
    env = os.environ.copy()
    env['KOL_HOMELESS_PATH']  = dest
    env['COMMUNITY_PATH']     = ''          # kosongkan agar community tidak di-reparse
    env['SKIP_COMMUNITY']     = '1'

    r = subprocess.run(
        [sys.executable, parse_script],
        capture_output=True, text=True,
        cwd=os.path.dirname(__file__), env=env
    )

    count = 0
    out_path = os.path.join(DATA_DIR, 'kol_homeless_free.json')
    if os.path.exists(out_path):
        with open(out_path) as jf:
            count = len(json.load(jf))

    return {
        "status":         "uploaded",
        "filename":       file.filename,
        "parsed":         r.returncode == 0,
        "kol_free_count": count,
        "log":            r.stdout[-300:] if r.stdout else r.stderr[-300:]
    }


@app.post("/upload-community")
async def upload_community(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "File harus .xlsx")
    os.makedirs(DATA_DIR, exist_ok=True)
    dest = os.path.join(DATA_DIR, 'Community.xlsx')
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)

    parse_script = os.path.join(os.path.dirname(__file__), 'scripts', 'parse_free_pools.py')
    env = os.environ.copy()
    env['KOL_HOMELESS_PATH']  = ''          # kosongkan agar KOLHomeless tidak di-reparse
    env['COMMUNITY_PATH']     = dest
    env['SKIP_KOL_FREE']      = '1'

    r = subprocess.run(
        [sys.executable, parse_script],
        capture_output=True, text=True,
        cwd=os.path.dirname(__file__), env=env
    )

    count = 0
    out_path = os.path.join(DATA_DIR, 'community_pool.json')
    if os.path.exists(out_path):
        with open(out_path) as jf:
            count = len(json.load(jf))

    return {
        "status":          "uploaded",
        "filename":        file.filename,
        "parsed":          r.returncode == 0,
        "community_count": count,
        "log":             r.stdout[-300:] if r.stdout else r.stderr[-300:]
    }


@app.post("/train")
def train():
    if not os.path.exists(os.path.join(DATA_DIR, 'KOL.xlsx')):
        raise HTTPException(400, "KOL.xlsx tidak ditemukan. Upload dulu.")
    try:
        scripts = os.path.join(os.path.dirname(__file__), 'scripts')

        r1 = subprocess.run(
            [sys.executable, os.path.join(scripts, 'parse_data.py')],
            capture_output=True, text=True, cwd=os.path.dirname(__file__)
        )
        if r1.returncode != 0:
            raise HTTPException(500, f"Parse error: {r1.stderr[-400:]}")

        r2 = subprocess.run(
            [sys.executable, os.path.join(scripts, 'train_model.py')],
            capture_output=True, text=True, cwd=os.path.dirname(__file__)
        )
        if r2.returncode != 0:
            raise HTTPException(500, f"Train error: {r2.stderr[-400:]}")

        import recommender
        recommender._cache = {}
        load_models()

        has_patterns = os.path.exists(os.path.join(MODELS_DIR, 'campaign_patterns.json'))

        threading.Thread(target=upload_models, daemon=True).start()

        return {
            "status":                "success",
            "message":               "Model berhasil dilatih + sync ke HF Hub",
            "has_campaign_patterns": has_patterns,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


def _resolve_locations(req: CampaignRequest) -> list[str]:
    """
    Resolve lokasi dari request. Support:
    - locations: ["jakarta", "bandung"]  → multi-location
    - location: "jakarta, bandung"       → comma-separated string
    - location: "nasional"               → single
    """
    if req.locations and len(req.locations) > 0:
        locs = [l.strip() for l in req.locations if l.strip()]
    elif req.location and "," in req.location:
        locs = [l.strip() for l in req.location.split(",") if l.strip()]
    else:
        locs = [req.location or "nasional"]
    return locs if locs else ["nasional"]


def _resolve_tier_splits(req: CampaignRequest, num_kol: int, budget_kol: float) -> list[dict]:
    """
    Resolve tier splits menjadi list of {tier, num_kol, budget}.
    Jika tier_budget_split diisi → split proportional.
    Jika tidak → single tier run.

    budget=0 → tier-only mode: budget_per_kol = 0 (skip budget scoring).
    """
    zero_budget = (req.budget <= 0)

    split = req.tier_budget_split
    if split is None:
        return [{
            "tier":          req.preferred_tier or "semua",
            "num_kol":       num_kol,
            "budget_total":  budget_kol,
            "zero_budget":   zero_budget,
        }]

    # Parse tier split
    raw = {
        "nano":  split.nano  or 0,
        "mikro": split.mikro or 0,
        "makro": split.makro or 0,
        "mega":  split.mega  or 0,
    }
    total_pct = sum(raw.values())
    if total_pct <= 0:
        return [{"tier": "semua", "num_kol": num_kol, "budget_total": budget_kol, "zero_budget": zero_budget}]

    # Normalize ke 100%
    runs = []
    allocated_kol = 0
    tiers_with_pct = [(t, p) for t, p in raw.items() if p > 0]
    for i, (tier, pct) in enumerate(tiers_with_pct):
        frac = pct / total_pct
        # Last tier gets remainder to avoid rounding loss
        if i == len(tiers_with_pct) - 1:
            n = num_kol - allocated_kol
        else:
            n = max(1, round(num_kol * frac))
        allocated_kol += n
        runs.append({
            "tier":         tier,
            "num_kol":      n,
            "budget_total": budget_kol * frac if not zero_budget else 0,
            "zero_budget":  zero_budget,
        })

    return runs


@app.post("/recommend")
def get_recommendations(req: CampaignRequest):
    if not os.path.exists(os.path.join(MODELS_DIR, 'st_model.pkl')):
        raise HTTPException(503, "Model belum dilatih. Hit /train dulu.")

    zero_budget = (req.budget <= 0)

    kol_pct      = max(0.0, min(1.0, req.budget_kol_pct))
    media_pct    = 1.0 - kol_pct
    budget_kol   = req.budget * kol_pct   if not zero_budget else 0
    budget_media = req.budget * media_pct if not zero_budget else 0

    locations = _resolve_locations(req)
    is_multi_loc = len(locations) > 1

    tier_runs = _resolve_tier_splits(req, req.num_kol, budget_kol)

    all_kol_results: list[dict] = []
    seen_usernames:  set[str]   = set()

    for loc in locations:
        for run in tier_runs:
            result = recommend(
                topics               = req.topics or "",
                goals                = req.goals or "",
                campaign_description = req.campaign_description or "",
                location             = loc,
                budget_total         = run["budget_total"],
                num_kol              = run["num_kol"],
                content_type         = req.content_type or "semua",
                preferred_tier       = run["tier"],
                zero_budget_mode     = run["zero_budget"],
            )
            for kol in result.get("recommended_kol", []):
                uname = kol.get("username", "")
                if uname not in seen_usernames:
                    # Tag lokasi asal untuk display
                    kol["matched_location"] = loc
                    all_kol_results.append(kol)
                    seen_usernames.add(uname)
    all_kol_results.sort(key=lambda x: x["match_score"], reverse=True)
    top_kol = all_kol_results[:req.num_kol]

    cost_min = sum(r.get("rate_min", 0) for r in top_kol)
    cost_max = sum(r.get("rate_max", 0) for r in top_kol)

    first_result = recommend(
        topics               = req.topics or "",
        goals                = req.goals or "",
        campaign_description = req.campaign_description or "",
        location             = locations[0],
        budget_total         = budget_kol,
        num_kol              = 1,
        content_type         = req.content_type or "semua",
        preferred_tier       = req.preferred_tier or "semua",
        zero_budget_mode     = zero_budget,
    ) if not top_kol else {}

    response = {
        "campaign_name":      req.campaign_name,
        "recommended_kol":    top_kol,
        "total_kol":          len(top_kol),
        "budget_per_kol":     int(round(budget_kol / max(req.num_kol, 1))) if not zero_budget else 0,
        "estimated_cost_min": int(cost_min),
        "estimated_cost_max": int(cost_max),
        "budget_remaining":   int(max(0, budget_kol - cost_min)) if not zero_budget else None,
        "avg_match_score":    round(sum(r["match_score"] for r in top_kol) / len(top_kol), 1) if top_kol else 0.0,
        "target_location":    locations if is_multi_loc else locations[0],
        "zero_budget_mode":   zero_budget,
        "tier_splits_used":   [{"tier": r["tier"], "num_kol": r["num_kol"]} for r in tier_runs] if req.tier_budget_split else None,
        "budget_total":       int(req.budget),
        "budget_kol_alloc":   int(budget_kol),
        "budget_media_alloc": int(budget_media),
        "budget_kol_pct":     round(kol_pct * 100, 1),
        "budget_media_pct":   round(media_pct * 100, 1),
        "hf_model_used":      first_result.get("hf_model_used", ""),
        "models_active":      first_result.get("models_active", {}),
        "campaign_patterns":  first_result.get("campaign_patterns"),
    }

    if req.include_homeless_media and not zero_budget:
        media_result = recommend_homeless_media(
            topics               = req.topics or "",
            goals                = req.goals or "",
            campaign_description = req.campaign_description or "",
            location             = locations[0],  
            budget_total         = budget_media,
            num_media            = req.num_media,
            content_type         = req.content_type or "semua",
        )
        response['homeless_media'] = media_result

        media_cost_min = media_result.get('estimated_cost_media_min', 0)
        media_cost_max = media_result.get('estimated_cost_media_max', 0)
        total_min = cost_min + media_cost_min
        total_max = cost_max + media_cost_max

        response['total_estimated_min']  = int(total_min)
        response['total_estimated_max']  = int(total_max)
        response['budget_remaining_min'] = int(max(0, req.budget - total_min))
        response['budget_remaining_max'] = int(max(0, req.budget - total_max))
        response['over_budget']          = total_min > req.budget

    if zero_budget:
        kol_free_result = recommend_kol_free(
            topics               = req.topics or "",
            goals                = req.goals or "",
            campaign_description = req.campaign_description or "",
            num_kol              = req.num_kol,
        )
        response['kol_homeless_free'] = kol_free_result
        response['kol_free_count']    = len(kol_free_result)
    community_result = recommend_community(
        topics               = req.topics or "",
        goals                = req.goals or "",
        campaign_description = req.campaign_description or "",
        num_community        = req.num_media,
    )
    response['community'] = community_result
    response['community_count'] = len(community_result)

    return response