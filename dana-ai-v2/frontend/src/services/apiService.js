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
    budget_kol_pct:         (form.budget_kol_pct || 70) / 100,
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