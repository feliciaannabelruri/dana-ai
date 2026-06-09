"""
KOL Risk Intelligence & Flag System
===================================
Tiga layer:
  Layer 1  Internal memory   -> data/kol_flags.json (manual + campaign history)
  Layer 2  AI news monitoring -> Groq scan (scan_news_groq)
  Layer 3  Community intel    -> manual crowdsource input dari sesama campaign manager

Pengaruh ke scoring di recommender.py:
  - severity "critical" -> KOL di-filter out sepenuhnya
  - severity "warning"  -> penalty -30% per flag, dibatasi maksimum -40%
  - severity "watch"    -> tidak mengubah score, hanya jadi notifikasi

Storage: data/kol_flags.json, keyed by username (lowercase, tanpa @).
  {
    "<username>": [ {flag}, {flag}, ... ],
    ...
  }
"""

import os
import json
import uuid
import threading
from datetime import datetime, timezone, timedelta

DATA_DIR   = os.path.join(os.path.dirname(__file__), "data")
FLAGS_PATH = os.path.join(DATA_DIR, "kol_flags.json")
ER_PATH    = os.path.join(DATA_DIR, "er_data.json")

_lock = threading.Lock()

# ── Taxonomy ──────────────────────────────────────────────────────────────────
FLAG_TYPES = {
    "brand_safety": "Brand Safety",
    "performance":  "Performance",
    "relationship": "Relationship",
    "critical":     "Critical",
    "competitive":  "Competitive Exclusivity",
}
SEVERITIES = ("critical", "warning", "watch")
SOURCES    = ("manual", "auto", "community")
STATUSES   = ("detected", "reviewed", "active", "dismissed", "resolved")

# Status yang dianggap masih "aktif" / berpengaruh ke scoring & notifikasi
ACTIVE_STATUSES = ("detected", "reviewed", "active")

# Penalty multiplikatif terhadap final score
WARNING_PENALTY_PER_FLAG = 0.30   # -30% per warning flag aktif
WARNING_PENALTY_CAP      = 0.40   # total penalty warning dibatasi -40%

# Kompetitor e-wallet / fintech DANA di Indonesia (untuk competitive exclusivity)
COMPETITORS = [
    "GoPay", "OVO", "ShopeePay", "LinkAja", "Jenius",
    "Flip", "Sakuku", "i.saku", "DOKU", "AstraPay", "blu",
]


# ── Helpers ─────────────────────────────────────────────────────────────────--
def _norm(username: str) -> str:
    return str(username or "").strip().lstrip("@").lower()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load() -> dict:
    if not os.path.exists(FLAGS_PATH):
        return {}
    try:
        with open(FLAGS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save(data: dict) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = FLAGS_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, FLAGS_PATH)


def _is_expired(flag: dict) -> bool:
    exp = flag.get("expires_at")
    if not exp:
        return False
    try:
        return datetime.fromisoformat(exp) < datetime.now(timezone.utc)
    except Exception:
        return False


# ── CRUD ────────────────────────────────────────────────────────────────────--
def add_flag(
    username: str,
    reason: str,
    type: str = "brand_safety",
    severity: str = "watch",
    source: str = "manual",
    context: str = "",
    detected_by: str = "",
    status: str = "active",
    expires_in_days=None,
    rule: str = "",
) -> dict:
    """Tambah flag baru. Returns flag dict."""
    uname = _norm(username)
    if not uname:
        raise ValueError("username kosong")
    if severity not in SEVERITIES:
        severity = "watch"
    if source not in SOURCES:
        source = "manual"
    if status not in STATUSES:
        status = "active"
    if type not in FLAG_TYPES:
        type = "brand_safety"

    expires_at = None
    if expires_in_days:
        try:
            expires_at = (datetime.now(timezone.utc) + timedelta(days=int(expires_in_days))).isoformat()
        except Exception:
            expires_at = None

    flag = {
        "id":          uuid.uuid4().hex[:12],
        "username":    uname,
        "type":        type,
        "type_label":  FLAG_TYPES[type],
        "severity":    severity,
        "source":      source,
        "status":      status,
        "reason":      str(reason or "").strip(),
        "context":     str(context or "").strip(),
        "detected_by": str(detected_by or "").strip(),
        "rule":        str(rule or "").strip(),
        "created_at":  _now_iso(),
        "updated_at":  _now_iso(),
        "expires_at":  expires_at,
    }

    with _lock:
        data = _load()
        data.setdefault(uname, []).append(flag)
        _save(data)
    return flag


def list_all() -> dict:
    return _load()


def list_for_user(username: str) -> list:
    return _load().get(_norm(username), [])


def get_active_flags(username: str) -> list:
    """Flag yang masih aktif & belum expired."""
    out = []
    for f in list_for_user(username):
        if f.get("status") in ACTIVE_STATUSES and not _is_expired(f):
            out.append(f)
    return out


def update_status(flag_id: str, status: str, by: str = "") -> dict:
    if status not in STATUSES:
        raise ValueError(f"status tidak valid: {status}")
    with _lock:
        data = _load()
        for uname, flags in data.items():
            for f in flags:
                if f.get("id") == flag_id:
                    f["status"]     = status
                    f["updated_at"] = _now_iso()
                    if by:
                        f["overridden_by"] = by
                    _save(data)
                    return f
    raise KeyError(f"flag {flag_id} tidak ditemukan")


def delete_flag(flag_id: str) -> bool:
    with _lock:
        data = _load()
        for uname, flags in list(data.items()):
            new_flags = [f for f in flags if f.get("id") != flag_id]
            if len(new_flags) != len(flags):
                data[uname] = new_flags
                _save(data)
                return True
    return False


def _clear_auto_rule(data: dict, uname: str, rule: str) -> None:
    """Hapus auto-flag lama dengan rule yang sama (dedupe sebelum re-scan)."""
    if uname in data:
        data[uname] = [
            f for f in data[uname]
            if not (f.get("source") == "auto" and f.get("rule") == rule)
        ]


# ── Penalty / scoring impact ──────────────────────────────────────────────────
def compute_penalty(active_flags: list) -> dict:
    """
    Hitung dampak flag ke score.
    Returns {filter_out, penalty, critical, warning, watch}
    """
    critical = [f for f in active_flags if f.get("severity") == "critical"]
    warning  = [f for f in active_flags if f.get("severity") == "warning"]
    watch    = [f for f in active_flags if f.get("severity") == "watch"]

    filter_out = len(critical) > 0
    penalty = min(WARNING_PENALTY_CAP, WARNING_PENALTY_PER_FLAG * len(warning))

    return {
        "filter_out": filter_out,
        "penalty":    round(penalty, 3),
        "critical":   critical,
        "warning":    warning,
        "watch":      watch,
    }


def _summary_text(uname: str, active_flags: list, pen: dict) -> str:
    """Insight engine: bukan cuma flag, tapi rekomendasi singkat."""
    if not active_flags:
        return ""
    n = len(active_flags)
    parts = []
    if pen["critical"]:
        parts.append("STOP: ada critical flag — disarankan tidak dipakai.")
    elif pen["warning"]:
        parts.append(
            f"Penalty score -{int(pen['penalty'] * 100)}%. "
            "Cocok untuk awareness campaign, hindari conversion-heavy."
        )
    elif pen["watch"]:
        parts.append("Belum kritis, tapi perlu di-monitor sebelum deal.")
    reasons = "; ".join(f.get("reason", "") for f in active_flags[:3] if f.get("reason"))
    head = f"@{uname} — {n} active flag{'s' if n > 1 else ''}."
    return f"{head} {reasons}. {' '.join(parts)}".strip()


def get_flag_bundle(username: str) -> dict:
    """
    Dipakai recommender + UI.
    Returns {filter_out, penalty, active, summary, severity}
    """
    uname  = _norm(username)
    active = get_active_flags(uname)
    pen    = compute_penalty(active)
    severity = (
        "critical" if pen["critical"]
        else "warning" if pen["warning"]
        else "watch" if pen["watch"]
        else "clear"
    )
    return {
        "filter_out": pen["filter_out"],
        "penalty":    pen["penalty"],
        "active":     active,
        "summary":    _summary_text(uname, active, pen),
        "severity":   severity,
    }


def batch_bundles(usernames) -> dict:
    return {_norm(u): get_flag_bundle(u) for u in usernames}


# ── Layer 2/auto: ER anomaly detector ────────────────────────────────────────-
def scan_er_anomalies(er_data: dict = None, detected_by: str = "auto-scan") -> list:
    """
    Auto-flag dari er_data.json yang sudah ada.
    Aturan:
      - ER sangat tinggi (>50%) dengan post_count kecil (<=2) -> inorganic/unreliable
      - ER outlier > mean + 2.5*std dari populasi -> spike aneh
    Severity = "watch" (notifikasi, tidak filter out).
    Dedupe via rule tag, jadi aman dijalankan berulang.
    """
    if er_data is None:
        try:
            with open(ER_PATH, "r", encoding="utf-8") as f:
                er_data = json.load(f)
        except Exception:
            er_data = {}

    vals = [
        float(v.get("avg_er_pct", 0) or 0)
        for v in er_data.values()
        if isinstance(v, dict)
    ]
    mean = sum(vals) / len(vals) if vals else 0.0
    var  = sum((x - mean) ** 2 for x in vals) / len(vals) if vals else 0.0
    std  = var ** 0.5
    outlier_threshold = mean + 2.5 * std

    created = []
    with _lock:
        data = _load()
        for uname_raw, v in er_data.items():
            if not isinstance(v, dict):
                continue
            uname = _norm(uname_raw)
            er    = float(v.get("avg_er_pct", 0) or 0)
            posts = int(v.get("post_count", 0) or 0)

            reason = context = rule = None
            if er > 50 and posts <= 2:
                rule    = "er_inorganic_lowsample"
                reason  = f"ER {er:.1f}% sangat tinggi dari hanya {posts} post — kemungkinan inorganic / sampel kecil"
                context = "Validasi keaslian engagement sebelum deal. Aman dipakai bila ER terverifikasi organik."
            elif std > 0 and er > outlier_threshold:
                rule    = "er_outlier_spike"
                reason  = f"ER {er:.1f}% jauh di atas rata-rata populasi ({mean:.1f}%) — spike tidak wajar"
                context = "Cek apakah ada engagement pod / bought engagement."

            if rule:
                _clear_auto_rule(data, uname, rule)
                flag = {
                    "id":          uuid.uuid4().hex[:12],
                    "username":    uname,
                    "type":        "performance",
                    "type_label":  FLAG_TYPES["performance"],
                    "severity":    "watch",
                    "source":      "auto",
                    "status":      "detected",
                    "reason":      reason,
                    "context":     context,
                    "detected_by": detected_by,
                    "rule":        rule,
                    "created_at":  _now_iso(),
                    "updated_at":  _now_iso(),
                    "expires_at":  (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
                }
                data.setdefault(uname, []).append(flag)
                created.append(flag)
        if created:
            _save(data)
    return created


# ── Layer 2: Groq news / reputation scan ──────────────────────────────────────
def scan_news_groq(username: str, category: str = "", full_name: str = "") -> dict:
    """
    Scan reputasi/berita negatif via Groq LLM.
    Catatan: LLM tidak punya akses web real-time, jadi prompt meminta model
    HANYA melaporkan jika benar-benar punya pengetahuan publik yang relevan,
    dan menyertakan confidence. Flag dibuat hanya bila risk_found & confidence cukup.

    Returns {risk_found, severity, type, reason, context, confidence, flag_created, source}
    """
    uname = _norm(username)
    groq_key   = os.environ.get("GROQ_API_KEY", "")
    groq_model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    if not groq_key:
        return {"risk_found": False, "source": "fallback",
                "reason": "GROQ_API_KEY belum di-set", "flag_created": False}

    try:
        from groq import Groq
        client = Groq(api_key=groq_key)

        system_prompt = (
            "Kamu adalah brand-safety analyst untuk DANA Indonesia. "
            "Tugasmu menilai apakah seorang KOL/influencer punya RIWAYAT PUBLIK NEGATIF "
            "(drama viral, cancel culture, konten kontroversial SARA/politik, kasus hukum, "
            "promosi scam/judi/produk ilegal, akun pernah di-takedown). "
            "PENTING: Kamu TIDAK punya akses internet real-time. Laporkan risiko HANYA bila "
            "kamu benar-benar punya pengetahuan publik yang spesifik. Jika tidak yakin atau "
            "tidak punya info, set risk_found=false dan confidence rendah. JANGAN mengarang. "
            "Respond ONLY valid JSON, no markdown."
        )
        user_prompt = (
            f"Username: @{uname}\n"
            f"Nama: {full_name}\n"
            f"Kategori konten: {category}\n\n"
            "Format JSON:\n"
            "{\n"
            '  "risk_found": true/false,\n'
            '  "severity": "critical|warning|watch",\n'
            '  "type": "brand_safety|critical|performance|relationship",\n'
            '  "reason": "ringkas, faktual",\n'
            '  "context": "kapan aman / tidak aman dipakai",\n'
            '  "confidence": 0.0\n'
            "}"
        )

        resp = client.chat.completions.create(
            model=groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            max_tokens=400,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content)

        risk = bool(result.get("risk_found"))
        conf = float(result.get("confidence", 0) or 0)
        flag_created = False

        # buat flag hanya jika ada risiko & confidence cukup meyakinkan
        if risk and conf >= 0.55:
            sev = result.get("severity", "watch")
            if sev not in SEVERITIES:
                sev = "watch"
            ftype = result.get("type", "brand_safety")
            if ftype not in FLAG_TYPES:
                ftype = "brand_safety"
            with _lock:
                data = _load()
                _clear_auto_rule(data, uname, "groq_news_scan")
                flag = {
                    "id":          uuid.uuid4().hex[:12],
                    "username":    uname,
                    "type":        ftype,
                    "type_label":  FLAG_TYPES[ftype],
                    "severity":    sev,
                    "source":      "auto",
                    "status":      "detected",
                    "reason":      result.get("reason", "Terdeteksi potensi risiko reputasi"),
                    "context":     result.get("context", "") + f" (AI confidence {int(conf*100)}%)",
                    "detected_by": f"groq:{groq_model}",
                    "rule":        "groq_news_scan",
                    "created_at":  _now_iso(),
                    "updated_at":  _now_iso(),
                    "expires_at":  (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                }
                data.setdefault(uname, []).append(flag)
                _save(data)
                flag_created = True

        result["flag_created"] = flag_created
        result["source"] = f"groq:{groq_model}"
        return result

    except Exception as e:
        return {"risk_found": False, "source": "error",
                "reason": f"Groq scan gagal: {e}", "flag_created": False}