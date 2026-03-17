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
  const r = await fetch(`${BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign_name:          form.campaign_name,
      campaign_description:   form.campaign_description || '',
      goals:                  form.goals || '',
      topics:                 form.topics || '',
      target_audience:        form.target_audience || '',
      location:               form.location || 'nasional',
      budget:                 parseFloat(form.budget) || 0,
      num_kol:                parseInt(form.num_kol) || 5,
      num_media:              parseInt(form.num_media) || 3,
      content_type:           form.content_type || 'semua',
      preferred_tier:         form.preferred_tier || 'semua',
      include_homeless_media: true,
    }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Gagal'); }
  return r.json();
}