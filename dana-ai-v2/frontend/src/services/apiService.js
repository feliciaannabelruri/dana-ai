const BASE = process.env.REACT_APP_API_URL || 'https://feliciaaaaaaaaae-dana-ai-backend.hf.space';

export async function checkStatus() {
  const r = await fetch(`${BASE}/status`);
  if (!r.ok) throw new Error('Backend tidak bisa dihubungi');
  return r.json();
}

export async function getLocations() {
  const r = await fetch(`${BASE}/locations`);
  if (!r.ok) throw new Error('Gagal load lokasi');
  return r.json();
}

export async function getExchangeRates() {
  const r = await fetch(`${BASE}/exchange-rates`);
  if (!r.ok) throw new Error('Gagal load kurs');
  return r.json();
}

export async function uploadKOL(file) {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/upload-kol`, { method: 'POST', body: form });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Upload KOL gagal'); }
  return r.json();
}

export async function uploadInsight(file) {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/upload-insight`, { method: 'POST', body: form });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Upload insight gagal'); }
  return r.json();
}

export async function uploadHomelessMedia(file) {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/upload-homeless-media`, { method: 'POST', body: form });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Upload Homeless Media gagal'); }
  return r.json();
}

export async function trainModel() {
  const r = await fetch(`${BASE}/train`, { method: 'POST' });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Training gagal'); }
  return r.json();
}

export async function getRecommendations(form) {
  const payload = {
    campaign_name:          form.campaign_name,
    campaign_description:   form.campaign_description || '',
    goals:                  form.goals || '',
    topics:                 form.topics || '',
    target_audience:        form.target_audience || '',
    location:               form.location || 'nasional',
    locations:              form.locations,
    budget:                 form.zeroBudget ? 0 : parseFloat(form.budget_min || 0),
    budget_kol_pct:         (form.budget_kol_pct || 60) / 100,
    budget_hm_pct:          (form.budget_hm_pct  || 30) / 100,
    num_kol:                parseInt(form.num_kol) || 5,
    num_media:              parseInt(form.num_media) || 3,
    content_type:           form.content_type || 'semua',
    preferred_tier:         form.preferred_tier || 'semua',
    tier_budget_split:      form.tier_budget_split,
    include_kol:            form.include_kol ?? true,
    include_homeless_media: form.include_homeless_media ?? true,
    include_community:      form.include_community ?? true,
  };

  const r = await fetch(`${BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Gagal generate rekomendasi'); }
  return r.json();
}

export async function suggestParams(name, description) {
  const r = await fetch(`${BASE}/suggest-params`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!r.ok) throw new Error('Gagal auto-suggest');
  return r.json();
}

export async function uploadKOLHomelessFree(file) {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/upload-kol-homeless-free`, { method: 'POST', body: form });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Upload KOL Homeless Free gagal'); }
  return r.json();
}

export async function uploadCommunity(file) {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/upload-community`, { method: 'POST', body: form });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Upload Community gagal'); }
  return r.json();
}
// ── KOL Risk Intelligence & Flag System ──────────────────────────────────────
export async function getFlagMeta() {
  const r = await fetch(`${BASE}/flags/meta`);
  if (!r.ok) throw new Error('Gagal load flag meta');
  return r.json();
}

export async function getAllFlags() {
  const r = await fetch(`${BASE}/flags`);
  if (!r.ok) throw new Error('Gagal load semua flags');
  return r.json();
}

export async function getKolFlags(username) {
  const r = await fetch(`${BASE}/flags/${encodeURIComponent(username)}`);
  if (!r.ok) throw new Error('Gagal load flags');
  return r.json();
}

export async function addKolFlag(payload) {
  // payload: { username, reason, type, severity, source, context, detected_by, status, expires_in_days }
  const r = await fetch(`${BASE}/flags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Gagal tambah flag'); }
  return r.json();
}

export async function updateKolFlag(flagId, status, by = '') {
  const r = await fetch(`${BASE}/flags/${flagId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, by }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Gagal update flag'); }
  return r.json();
}

export async function deleteKolFlag(flagId) {
  const r = await fetch(`${BASE}/flags/${flagId}`, { method: 'DELETE' });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Gagal hapus flag'); }
  return r.json();
}

export async function scanErAnomalies() {
  const r = await fetch(`${BASE}/flags/scan-er`, { method: 'POST' });
  if (!r.ok) throw new Error('Gagal scan ER');
  return r.json();
}

export async function scanKolNews(username, category = '', fullName = '') {
  const r = await fetch(`${BASE}/flags/scan-news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, category, full_name: fullName }),
  });
  if (!r.ok) throw new Error('Gagal scan news');
  return r.json();
}