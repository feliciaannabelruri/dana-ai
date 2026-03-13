from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os, shutil, subprocess, sys

from recommender import recommend, get_meta, load_models
from homeless_recommender import recommend_homeless_media

app = FastAPI(title="DANA AI Campaign Planner v2 — HuggingFace Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
DATA_DIR   = os.path.join(os.path.dirname(__file__), 'data')


@app.on_event("startup")
async def startup():
    if os.path.exists(os.path.join(MODELS_DIR, 'st_model.pkl')):
        load_models()
        print("Models + HuggingFace loaded on startup")
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
    num_kol:              int = 5
    num_media:            int = 3   # jumlah homeless media yang direkomendasikan
    content_type:         Optional[str] = "semua"
    preferred_tier:       Optional[str] = "semua"
    include_homeless_media: bool = True  # toggle homeless media di response


@app.get("/")
def root():
    return {"status": "ok", "version": "2.1", "message": "DANA AI Campaign Planner — HuggingFace + Homeless Media Edition"}


@app.get("/status")
def status():
    trained = os.path.exists(os.path.join(MODELS_DIR, 'st_model.pkl'))
    homeless_loaded = os.path.exists(os.path.join(DATA_DIR, 'homeless_media.json'))
    import json
    homeless_count = 0
    if homeless_loaded:
        with open(os.path.join(DATA_DIR, 'homeless_media.json')) as f:
            homeless_count = len(json.load(f))
    return {
        "model_trained": trained,
        "homeless_media_loaded": homeless_loaded,
        "homeless_media_count": homeless_count,
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
    """Upload insight.xlsx yang berisi data ER aktual."""
    if not file.filename.endswith(('.xlsx','.xls')):
        raise HTTPException(400, "File harus .xlsx")
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, 'insight.xlsx'), 'wb') as f:
        shutil.copyfileobj(file.file, f)

    # Auto extract ER data
    er_script = os.path.join(os.path.dirname(__file__), 'scripts', 'extract_er.py')
    r = subprocess.run([sys.executable, er_script],
                       capture_output=True, text=True, cwd=os.path.dirname(__file__))
    return {
        "status": "uploaded",
        "filename": file.filename,
        "er_extracted": r.returncode == 0,
        "log": r.stdout[-200:] if r.stdout else r.stderr[-200:]
    }


@app.post("/upload-homeless-media")
async def upload_homeless_media(file: UploadFile = File(...)):
    """
    Upload HomelessMedia.xlsx.
    Otomatis parse Sheet2 menjadi homeless_media.json.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "File harus .xlsx")
    os.makedirs(DATA_DIR, exist_ok=True)

    dest = os.path.join(DATA_DIR, 'HomelessMedia.xlsx')
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)

    # Auto-parse
    parse_script = os.path.join(os.path.dirname(__file__), 'scripts', 'parse_homeless_media.py')
    env = os.environ.copy()
    env['HOMELESS_MEDIA_PATH'] = dest

    r = subprocess.run(
        [sys.executable, parse_script],
        capture_output=True, text=True,
        cwd=os.path.dirname(__file__),
        env=env
    )

    import json
    count = 0
    json_path = os.path.join(DATA_DIR, 'homeless_media.json')
    if os.path.exists(json_path):
        with open(json_path) as jf:
            count = len(json.load(jf))

    return {
        "status": "uploaded",
        "filename": file.filename,
        "parsed": r.returncode == 0,
        "homeless_media_count": count,
        "log": r.stdout[-300:] if r.stdout else r.stderr[-300:]
    }


@app.post("/train")
def train():
    """Parse data + encode dengan HuggingFace + train KNN."""
    if not os.path.exists(os.path.join(DATA_DIR, 'KOL.xlsx')):
        raise HTTPException(400, "KOL.xlsx tidak ditemukan. Upload dulu.")
    try:
        scripts = os.path.join(os.path.dirname(__file__), 'scripts')

        r1 = subprocess.run([sys.executable, os.path.join(scripts,'parse_data.py')],
                            capture_output=True, text=True, cwd=os.path.dirname(__file__))
        if r1.returncode != 0:
            raise HTTPException(500, f"Parse error: {r1.stderr[-400:]}")

        r2 = subprocess.run([sys.executable, os.path.join(scripts,'train_model.py')],
                            capture_output=True, text=True, cwd=os.path.dirname(__file__))
        if r2.returncode != 0:
            raise HTTPException(500, f"Train error: {r2.stderr[-400:]}")

        import recommender
        recommender._cache = {}
        load_models()

        return {"status": "success", "message": "Model + HuggingFace embeddings berhasil dilatih"}
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/recommend")
def get_recommendations(req: CampaignRequest):
    if not os.path.exists(os.path.join(MODELS_DIR, 'st_model.pkl')):
        raise HTTPException(503, "Model belum dilatih. Hit /train dulu.")
    if req.budget <= 0:
        raise HTTPException(400, "Budget harus > 0")

    # Rekomendasi KOL
    kol_result = recommend(
        topics               = req.topics or "",
        goals                = req.goals or "",
        campaign_description = req.campaign_description or "",
        location             = req.location or "nasional",
        budget_total         = req.budget,
        num_kol              = req.num_kol,
        content_type         = req.content_type or "semua",
        preferred_tier       = req.preferred_tier or "semua",
    )

    response = {"campaign_name": req.campaign_name, **kol_result}

    # Rekomendasi Homeless Media (jika diminta dan data tersedia)
    if req.include_homeless_media:
        media_result = recommend_homeless_media(
            topics               = req.topics or "",
            goals                = req.goals or "",
            campaign_description = req.campaign_description or "",
            location             = req.location or "nasional",
            budget_total         = req.budget,
            num_media            = req.num_media,
            content_type         = req.content_type or "semua",
        )
        response['homeless_media'] = media_result

    return response
