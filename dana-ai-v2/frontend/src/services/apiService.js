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
  const zeroBudget = !form.budget || parseFloat(form.budget) <= 0;
  const locations = form.locations && form.locations.length > 0 ? form.locations : undefined;
  const tierSplit = form.tier_budget_split &&
    Object.values(form.tier_budget_split).some(v => v > 0)
    ? form.tier_budget_split : undefined;

  const payload = {
    campaign_name:          form.campaign_name,
    campaign_description:   form.campaign_description || '',
    goals:                  form.goals || '',
    topics:                 form.topics || '',
    target_audience:        form.target_audience || '',
    location:               form.location || 'nasional',
    locations:              locations,
    budget:                 zeroBudget ? 0 : parseFloat(form.budget),
    budget_kol_pct:         form.budget_kol_pct || 0.70,
    num_kol:                parseInt(form.num_kol) || 5,
    num_media:              parseInt(form.num_media) || 3,
    content_type:           form.content_type || 'semua',
    preferred_tier:         form.preferred_tier || 'semua',
    tier_budget_split:      tierSplit,
    include_homeless_media: !zeroBudget,
  };

  const r = await fetch(`${BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Gagal'); }
  return r.json();
}