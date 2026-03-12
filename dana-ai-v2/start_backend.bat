@echo off
echo ==========================================
echo   DANA AI v2 — HuggingFace Edition
echo ==========================================
echo.

cd /d "%~dp0backend"

echo [1/3] Aktivasi virtual environment...
if not exist "venv" (
    echo Membuat venv baru...
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [2/3] Install dependencies (termasuk sentence-transformers)...
pip install -r requirements.txt -q

echo [3/3] Cek model...
if not exist "models\st_model.pkl" (
    echo Model belum ada. Latih dulu setelah server jalan via web UI.
)

echo.
echo Backend siap di http://localhost:8000
echo HuggingFace model ~100MB akan didownload saat pertama kali Latih Model
echo.
uvicorn main:app --reload --port 8000
