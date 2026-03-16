from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os, shutil, subprocess, sys, json, threading

from recommender import recommend, get_meta, load_models
from homeless_recommender import recommend_homeless_media
from hf_storage import download_models, upload_models

app = FastAPI(title="DANA AI Campaign Planner v2 - HuggingFace + Campaign Learning")

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
    # Download dari HF Hub kalau models belum ada
    download_models()
    if os.path.exists(os.path.join(MODELS_DIR, 'st_model.pkl')):
        load_models()
        print("Models loaded!")
    else:
        print("Belum ada model. Upload data lalu hit /train")


class CampaignRequest(BaseModel):
    campaign_name:        str
    campaign_description: Optional[str] = ""
    goals:                Optional[str] = ""
    topics:               Optional[str] = ""
    target_audience:      Optional[str] = ""
    location:             Optional[str] = "nasional"
    budget:               float
    budget_kol_pct:       float = 0.70
    num_kol:              int = 5
    num_media:            int = 3
    content_type:         Optional[str] = "semua"
    preferred_tier:       Optional[str] = "semua"
    include_homeless_media: bool = True


@app.get("/")
def root():
    return {"status": "ok", "version": "2.2", "message": "DANA AI Campaign Planner"}


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


@app.post("/upload-kol")
async def upload_kol(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx','.xls')):
        raise HTTPException(400, "File harus .xlsx")
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, 'KOL.xlsx'), 'wb') as f:
        shutil.copyfileobj(file.file, f)
    return {"status": "uploaded", "filename": file.filename}


@app.post("/upload-insight")
async def upload_insight(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx','.xls')):
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

        # Auto upload ke HF Hub di background
        threading.Thread(target=upload_models, daemon=True).start()
        print("[BG] Upload ke HF Hub dimulai di background...")

        return {
            "status":                "success",
            "message":               "Model berhasil dilatih + sync ke HF Hub",
            "has_campaign_patterns": has_patterns,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/recommend")
def get_recommendations(req: CampaignRequest):
    if not os.path.exists(os.path.join(MODELS_DIR, 'st_model.pkl')):
        raise HTTPException(503, "Model belum dilatih. Hit /train dulu.")
    if req.budget <= 0:
        raise HTTPException(400, "Budget harus > 0")

    kol_pct      = max(0.0, min(1.0, req.budget_kol_pct))
    media_pct    = 1.0 - kol_pct
    budget_kol   = req.budget * kol_pct
    budget_media = req.budget * media_pct

    kol_result = recommend(
        topics               = req.topics or "",
        goals                = req.goals or "",
        campaign_description = req.campaign_description or "",
        location             = req.location or "nasional",
        budget_total         = budget_kol,
        num_kol              = req.num_kol,
        content_type         = req.content_type or "semua",
        preferred_tier       = req.preferred_tier or "semua",
    )

    kol_cost_min = kol_result.get('estimated_cost_min', 0)
    kol_cost_max = kol_result.get('estimated_cost_max', 0)

    response = {
        "campaign_name":      req.campaign_name,
        **kol_result,
        "budget_total":       int(req.budget),
        "budget_kol_alloc":   int(budget_kol),
        "budget_media_alloc": int(budget_media),
        "budget_kol_pct":     round(kol_pct * 100, 1),
        "budget_media_pct":   round(media_pct * 100, 1),
    }

    if req.include_homeless_media:
        media_result = recommend_homeless_media(
            topics               = req.topics or "",
            goals                = req.goals or "",
            campaign_description = req.campaign_description or "",
            location             = req.location or "nasional",
            budget_total         = budget_media,
            num_media            = req.num_media,
            content_type         = req.content_type or "semua",
        )
        response['homeless_media'] = media_result

        media_cost_min = media_result.get('estimated_cost_media_min', 0)
        media_cost_max = media_result.get('estimated_cost_media_max', 0)
        total_min = kol_cost_min + media_cost_min
        total_max = kol_cost_max + media_cost_max

        response['total_estimated_min']  = int(total_min)
        response['total_estimated_max']  = int(total_max)
        response['budget_remaining_min'] = int(max(0, req.budget - total_min))
        response['budget_remaining_max'] = int(max(0, req.budget - total_max))
        response['over_budget']          = total_min > req.budget

    return response
