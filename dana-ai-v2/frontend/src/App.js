import { useState, useEffect, useRef } from 'react';
import { checkStatus, uploadKOL, uploadInsight, uploadHomelessMedia, trainModel, getRecommendations } from './services/apiService';

const BG = '#07070f', ACCENT = '#4f8ef7', GOLD = '#f5a623', GREEN = '#22c55e', RED = '#ef4444', PURPLE = '#a78bfa', TEAL = '#2dd4bf';

function fmt(n) {
  if (!n||isNaN(n)) return 'Rp -';
  if (n>=1e9) return `Rp ${(n/1e9).toFixed(1)}M`;
  if (n>=1e6) return `Rp ${(n/1e6).toFixed(0)}jt`;
  if (n>=1e3) return `Rp ${(n/1e3).toFixed(0)}rb`;
  return `Rp ${n}`;
}
function fmtF(n) {
  if (!n) return '-';
  if (n>=1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n>=1e3) return `${(n/1e3).toFixed(0)}K`;
  return String(n);
}

// ── SVG Icons ─────────────────────────────────────────────────
const Icon = {
  bolt: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13L13 2Z"/></svg>),
  whatsapp: (s=15) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>),
  tiktok: (s=15) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>),
  instagram: (s=15) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>),
  upload: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>),
  chart: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
  cpu: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>),
  star: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>),
  pin: (s=13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  wallet: (s=13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>),
  target: (s=13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>),
  newspaper: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>),
  users: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>),
  chevronDown: (s=12) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>),
  chevronUp: (s=12) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>),
  externalLink: (s=11) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>),
  checkCircle: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  alertCircle: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>),
  xCircle: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>),
  loader: (s=14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>),
  user: (s=13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  lightbulb: (s=13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>),
  pencil: (s=13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
};

// ── Budget Slider ──────────────────────────────────────────────
const BUDGET_PRESETS = [
  { label: 'Micro',   min: 1_000_000,    max: 5_000_000,    color: '#6ee7b7', desc: '1jt – 5jt'    },
  { label: 'Kecil',   min: 5_000_000,    max: 25_000_000,   color: '#67e8f9', desc: '5jt – 25jt'   },
  { label: 'Medium',  min: 25_000_000,   max: 100_000_000,  color: '#4f8ef7', desc: '25jt – 100jt' },
  { label: 'Besar',   min: 100_000_000,  max: 500_000_000,  color: '#a78bfa', desc: '100jt – 500jt' },
  { label: 'Premium', min: 500_000_000,  max: 2_000_000_000,color: '#f5a623', desc: '500jt – 2M'   },
];

const SLIDER_MAX_POS = 1000;

function logToValue(pos) {
  const minV = Math.log(500_000);
  const maxV = Math.log(2_000_000_000);
  return Math.round(Math.exp(minV + (pos / SLIDER_MAX_POS) * (maxV - minV)));
}

function valueToLog(val) {
  if (!val || val <= 0) return 200;
  const minV = Math.log(500_000);
  const maxV = Math.log(2_000_000_000);
  const clamped = Math.max(500_000, Math.min(2_000_000_000, val));
  return Math.round(((Math.log(clamped) - minV) / (maxV - minV)) * SLIDER_MAX_POS);
}

function fmtBudget(n) {
  if (!n || isNaN(n)) return 'Rp 0';
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(2).replace(/\.?0+$/, '')} Miliar`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(n >= 100e6 ? 0 : 1).replace(/\.0$/, '')} juta`;
  if (n >= 1e3) return `Rp ${(n / 1e3).toFixed(0)} ribu`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function getActivePreset(val) {
  for (const p of BUDGET_PRESETS) {
    if (val >= p.min && val <= p.max) return p;
  }
  if (val < BUDGET_PRESETS[0].min) return BUDGET_PRESETS[0];
  return BUDGET_PRESETS[BUDGET_PRESETS.length - 1];
}

// BudgetSlider — dual range (min & max), custom input per thumb, slider ikut
function BudgetSlider({ budgetMin, budgetMax, onChangeMin, onChangeMax }) {
  const minVal = parseFloat(budgetMin) || 5_000_000;
  const maxVal = parseFloat(budgetMax) || 50_000_000;

  const posMin = valueToLog(minVal);
  const posMax = valueToLog(maxVal);

  // Preset aktif = range yang paling overlap dengan [minVal, maxVal]
  const midVal = (minVal + maxVal) / 2;
  const activePreset = getActivePreset(midVal);
  const tc = activePreset.color;

  const pctMin = (posMin / SLIDER_MAX_POS) * 100;
  const pctMax = (posMax / SLIDER_MAX_POS) * 100;

  const [rawMin, setRawMin] = useState('');
  const [rawMax, setRawMax] = useState('');
  const [focusMin, setFocusMin] = useState(false);
  const [focusMax, setFocusMax] = useState(false);

  const clampMin = (v) => Math.min(v, maxVal - 1);
  const clampMax = (v) => Math.max(v, minVal + 1);

  const handleSliderMin = (e) => {
    const v = logToValue(parseInt(e.target.value));
    if (v < maxVal) { onChangeMin(String(v)); setRawMin(''); }
  };
  const handleSliderMax = (e) => {
    const v = logToValue(parseInt(e.target.value));
    if (v > minVal) { onChangeMax(String(v)); setRawMax(''); }
  };

  const handlePresetClick = (p) => {
    onChangeMin(String(p.min));
    onChangeMax(String(p.max));
    setRawMin(''); setRawMax('');
  };

  const handleRawMin = (e) => {
    const r = e.target.value.replace(/[^0-9]/g, '');
    setRawMin(r);
    const n = parseInt(r);
    if (r && n > 0) onChangeMin(String(clampMin(n)));
  };
  const handleRawMax = (e) => {
    const r = e.target.value.replace(/[^0-9]/g, '');
    setRawMax(r);
    const n = parseInt(r);
    if (r && n > 0) onChangeMax(String(clampMax(n)));
  };

  const trackStyle = {
    background: `linear-gradient(to right,
      rgba(255,255,255,.06) 0%,
      rgba(255,255,255,.06) ${pctMin}%,
      ${tc} ${pctMin}%,
      ${tc} ${pctMax}%,
      rgba(255,255,255,.06) ${pctMax}%,
      rgba(255,255,255,.06) 100%)`,
  };

  const thumbCss = `
    .bsl::-webkit-slider-thumb {
      -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
      background: ${tc}; box-shadow: 0 0 0 3px ${tc}35, 0 2px 8px rgba(0,0,0,.7);
      cursor: pointer; transition: box-shadow .15s, background .25s;
    }
    .bsl::-webkit-slider-thumb:hover { box-shadow: 0 0 0 7px ${tc}28; }
    .bsl::-moz-range-thumb {
      width: 20px; height: 20px; border-radius: 50%; border: none;
      background: ${tc}; box-shadow: 0 0 0 3px ${tc}35;
    }
    .bsl {
      -webkit-appearance: none; appearance: none;
      width: 100%; height: 6px; border-radius: 3px; outline: none;
      cursor: pointer; background: transparent; pointer-events: none;
    }
    .bsl::-webkit-slider-thumb { pointer-events: all; }
    .bsl::-moz-range-thumb { pointer-events: all; }
  `;

  const inputStyle = (focused) => ({
    background: 'transparent',
    border: 'none',
    borderBottom: `1.5px solid ${focused ? tc : 'rgba(255,255,255,.1)'}`,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Syne', sans-serif",
    outline: 'none',
    padding: '2px 0',
    width: '100%',
    transition: 'border-color .2s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Preset chips */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {BUDGET_PRESETS.map((p) => {
          // aktif kalau preset range overlap signifikan dengan nilai saat ini
          const overlap = Math.max(0, Math.min(maxVal, p.max) - Math.max(minVal, p.min));
          const isActive = overlap > 0 && p.min === minVal && p.max === maxVal;
          const isClose  = !isActive && p.min <= maxVal && p.max >= minVal;
          return (
            <button key={p.label} onClick={() => handlePresetClick(p)} style={{
              background: isActive ? p.color + '20' : isClose ? p.color + '0a' : 'rgba(255,255,255,.02)',
              border: `1.5px solid ${isActive ? p.color + 'cc' : isClose ? p.color + '33' : 'rgba(255,255,255,.06)'}`,
              color: isActive ? p.color : isClose ? p.color + 'aa' : '#3a3a4a',
              borderRadius: 10, padding: '5px 12px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s',
              lineHeight: 1.35, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
            }}>
              <span style={{ fontSize: 11 }}>{p.label}</span>
              <span style={{ fontSize: 9, opacity: .7, fontWeight: 500 }}>{p.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Dual range slider — dua input range ditumpuk */}
      <div style={{ position: 'relative' }}>
        <style>{thumbCss}</style>

        {/* Track visual */}
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: 0, right: 0, height: 6, borderRadius: 3,
          ...trackStyle, transition: 'background .2s',
          pointerEvents: 'none',
        }} />

        {/* Dua slider ditumpuk */}
        <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
          <input type="range" className="bsl" min={0} max={SLIDER_MAX_POS}
            value={posMin} onChange={handleSliderMin}
            style={{ position: 'absolute', width: '100%', zIndex: posMin > SLIDER_MAX_POS * 0.8 ? 5 : 4 }}
          />
          <input type="range" className="bsl" min={0} max={SLIDER_MAX_POS}
            value={posMax} onChange={handleSliderMax}
            style={{ position: 'absolute', width: '100%', zIndex: posMin > SLIDER_MAX_POS * 0.8 ? 4 : 5 }}
          />
        </div>

        {/* Tick labels */}
        <div style={{ position: 'relative', height: 18, marginTop: 3 }}>
          {BUDGET_PRESETS.map((p) => {
            const mid = Math.round((p.min + p.max) / 2);
            const lp = (valueToLog(mid) / SLIDER_MAX_POS) * 100;
            const inRange = p.min <= maxVal && p.max >= minVal;
            return (
              <span key={p.label} style={{
                position: 'absolute', left: `${lp}%`, transform: 'translateX(-50%)',
                color: inRange ? tc : '#252535',
                fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
                transition: 'color .2s', pointerEvents: 'none',
              }}>{p.label}</span>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
          <span style={{ color: '#1e1e2e', fontSize: 9 }}>Rp 500rb</span>
          <span style={{ color: '#1e1e2e', fontSize: 9 }}>Rp 2 Miliar</span>
        </div>
      </div>

      {/* Dua custom input + display range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>

        {/* Min input */}
        <div style={{
          background: focusMin ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)',
          border: `1.5px solid ${focusMin ? tc + '99' : 'rgba(255,255,255,.08)'}`,
          borderRadius: 10, padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 3,
          transition: 'all .2s',
        }}>
          <span style={{ color: '#3a3a4a', fontSize: 9, fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase' }}>Min Budget</span>
          <span style={{ color: tc, fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800 }}>
            {fmtBudget(minVal)}
          </span>
          <input
            type="text" inputMode="numeric"
            placeholder="contoh: 5000000"
            value={rawMin}
            onChange={handleRawMin}
            onFocus={() => { setFocusMin(true); setRawMin(String(Math.round(minVal))); }}
            onBlur={() => { setFocusMin(false); setRawMin(''); }}
            style={inputStyle(focusMin)}
          />
          <span style={{ color: '#2a2a3a', fontSize: 8 }}>custom angka Rp</span>
        </div>

        {/* Separator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,.06)' }} />
          <span style={{ color: '#2a2a3a', fontSize: 10, fontWeight: 700 }}>–</span>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,.06)' }} />
        </div>

        {/* Max input */}
        <div style={{
          background: focusMax ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)',
          border: `1.5px solid ${focusMax ? tc + '99' : 'rgba(255,255,255,.08)'}`,
          borderRadius: 10, padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 3,
          transition: 'all .2s',
        }}>
          <span style={{ color: '#3a3a4a', fontSize: 9, fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase' }}>Max Budget</span>
          <span style={{ color: tc, fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800 }}>
            {fmtBudget(maxVal)}
          </span>
          <input
            type="text" inputMode="numeric"
            placeholder="contoh: 50000000"
            value={rawMax}
            onChange={handleRawMax}
            onFocus={() => { setFocusMax(true); setRawMax(String(Math.round(maxVal))); }}
            onBlur={() => { setFocusMax(false); setRawMax(''); }}
            style={inputStyle(focusMax)}
          />
          <span style={{ color: '#2a2a3a', fontSize: 8 }}>custom angka Rp</span>
        </div>
      </div>

      {/* Summary range + tier bar */}
      <div style={{
        background: tc + '0a', border: `1px solid ${tc}22`,
        borderRadius: 8, padding: '8px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#444', fontSize: 10 }}>Range dipilih</span>
        <span style={{ color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13 }}>
          {fmtBudget(minVal)} <span style={{ color: tc }}>—</span> {fmtBudget(maxVal)}
        </span>
        <span style={{ color: tc, fontSize: 10, fontWeight: 700 }}>{activePreset.label}</span>
      </div>

      <div style={{ display: 'flex', gap: 2, height: 3, borderRadius: 3, overflow: 'hidden' }}>
        {BUDGET_PRESETS.map((p) => {
          const inRange = p.min <= maxVal && p.max >= minVal;
          return (
            <div key={p.label} style={{
              flex: 1, borderRadius: 2, transition: 'background .3s',
              background: inRange ? p.color : p.color + '15',
            }} />
          );
        })}
      </div>
    </div>
  );
}

function MAEBadge({ meta }) {
  if (!meta?.metrics?.random_forest?.mae) return null;
  const rf  = meta.metrics.random_forest;
  const xgb = meta.metrics.xgboost;
  const mae = rf.mae;
  const color = mae <= 0.05 ? GREEN : mae <= 0.10 ? GOLD : RED;
  return (
    <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
      <span style={{ color:'#333', fontSize:10 }}>Model Accuracy:</span>
      <span style={{
        background: color + '18', border: `1px solid ${color}44`,
        color, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:800,
        fontFamily:"'Syne',sans-serif",
      }}>
        MAE {mae.toFixed(4)}
      </span>
      {xgb?.mae_train && (
        <span style={{
          background: GOLD+'18', border:`1px solid ${GOLD}44`,
          color:GOLD, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:800,
          fontFamily:"'Syne',sans-serif",
        }}>
          ER MAE {xgb.mae_train.toFixed(2)}%
        </span>
      )}
      <span style={{ color:'#2a2a3a', fontSize:9 }}>
        {mae <= 0.05 ? 'Sangat baik' : mae <= 0.10 ? 'Baik' : 'Cukup'}
      </span>
    </div>
  );
}

function Badge({ label, color=ACCENT, icon=null }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:color+'22', color, border:`1px solid ${color}44`, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
      {icon && icon}
      {label}
    </span>
  );
}

function Stat({ label, value, color=ACCENT }) {
  return (
    <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
      <div style={{ color:'#555', fontSize:9, letterSpacing:'1.2px', marginBottom:3, textTransform:'uppercase' }}>{label}</div>
      <div style={{ color, fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:14 }}>{value}</div>
    </div>
  );
}

function Bar({ score, color }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(()=>setW(score),150); return ()=>clearTimeout(t); }, [score]);
  return (
    <div style={{ height:5, background:'#1a1a2a', borderRadius:3, overflow:'hidden', margin:'6px 0' }}>
      <div style={{ width:`${w}%`, height:'100%', background:color, borderRadius:3, transition:'width 1.1s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

function KOLCard({ kol, rank }) {
  const c = rank===1?GOLD:rank===2?'#a0c4ff':rank===3?'#cd7f32':ACCENT;
  const [open, setOpen] = useState(false);
  const isTiktok = kol.social_media?.toLowerCase().includes('tiktok');
  const contactColors = {
    whatsapp:  { bg:'rgba(37,211,102,.12)',  border:'rgba(37,211,102,.35)', text:'#25d366' },
    tiktok:    { bg:'rgba(255,0,80,.10)',    border:'rgba(255,0,80,.3)',    text:'#ff0050' },
    instagram: { bg:'rgba(193,53,132,.10)', border:'rgba(193,53,132,.3)', text:'#c13584' },
    profile:   { bg:'rgba(193,53,132,.10)', border:'rgba(193,53,132,.3)', text:'#c13584' },
  };
  const cc = kol.contact_action ? (contactColors[kol.contact_action.type] || contactColors.profile) : null;

  return (
    <div
      style={{ background:'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.02))', border:`1px solid ${c}33`, borderRadius:14, padding:18, position:'relative', transition:'all .25s' }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=c+'88';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=c+'33';e.currentTarget.style.transform='translateY(0)';}}
    >
      <div style={{ position:'absolute', top:14, right:14, background:c, color:'#000', width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 }}>#{rank}</div>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:c+'22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:c }}>
          {isTiktok ? Icon.tiktok(18) : Icon.instagram(18)}
        </div>
        <div>
          <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>@{kol.username}</div>
          <div style={{ color:'#666', fontSize:11, marginTop:2 }}>{kol.category}</div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'#555', fontSize:10, letterSpacing:'.5px' }}>MATCH SCORE</span>
        <span style={{ color:c, fontWeight:800, fontSize:15, fontFamily:'Syne,sans-serif' }}>{kol.match_score}%</span>
      </div>
      <Bar score={kol.match_score} color={c} />
      {kol.has_real_er && kol.avg_er_pct && (
        <div style={{ marginBottom:10, display:'flex', alignItems:'center', gap:6, background:GREEN+'11', border:`1px solid ${GREEN}33`, borderRadius:8, padding:'6px 10px' }}>
          <span style={{ color:GREEN, display:'flex' }}>{Icon.chart(13)}</span>
          <span style={{ color:GREEN, fontSize:11, fontWeight:700 }}>ER Aktual: {kol.avg_er_pct}%</span>
          <span style={{ color:'#555', fontSize:10 }}>data nyata dari campaign</span>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
        <Stat label="Followers" value={fmtF(kol.followers_num)||kol.followers} color={PURPLE} />
        <Stat label="Type" value={kol.type||'-'} color={ACCENT} />
        <Stat label="Rate Min" value={fmt(kol.rate_min)} color={GOLD} />
        <Stat label="Lokasi" value={kol.location||'-'} color={GREEN} />
      </div>
      <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
        <Badge label={kol.social_media||'-'} color={c} />
        {kol.tier && <Badge label={`Tier ${kol.tier}`} color={PURPLE} />}
        {kol.has_real_er && <Badge label="Real ER" color={GREEN} icon={Icon.checkCircle(10)} />}
      </div>
      {kol.score_detail && (
        <>
          <button onClick={()=>setOpen(o=>!o)} style={{ marginTop:10, background:'transparent', border:'1px solid rgba(255,255,255,.08)', color:'#555', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:11, fontFamily:'inherit', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {open ? Icon.chevronUp(12) : Icon.chevronDown(12)}
            {open ? 'Sembunyikan detail' : 'Detail scoring'}
          </button>
          {open && (
            <div style={{ marginTop:10, background:'rgba(0,0,0,.3)', borderRadius:8, padding:'10px 12px' }}>
              {Object.entries(kol.score_detail).map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ color:'#666', fontSize:11 }}>{k}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:60, height:4, background:'#1a1a2a', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${v}%`, height:'100%', background:v>=70?GREEN:v>=40?GOLD:RED, borderRadius:2 }} />
                    </div>
                    <span style={{ color:'#aaa', fontSize:11, minWidth:32, textAlign:'right' }}>{v}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {kol.rate_card && Object.keys(kol.rate_card).length > 0 && (
        <div style={{ marginTop:10, background:'rgba(0,0,0,.3)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ color:'#444', fontSize:9, letterSpacing:'1px', marginBottom:6, fontWeight:700 }}>RATE CARD</div>
          {Object.entries(kol.rate_card).map(([p,r])=>(
            <div key={p} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ color:'#777', fontSize:11 }}>{p}</span>
              <span style={{ color:GOLD, fontWeight:700, fontSize:11 }}>{fmt(r)}</span>
            </div>
          ))}
        </div>
      )}
      {kol.reasoning && (
        <div style={{ marginTop:10, background:c+'0e', border:`1px solid ${c}22`, borderRadius:8, padding:'8px 10px', display:'flex', gap:6, alignItems:'flex-start' }}>
          <span style={{ color:c, flexShrink:0, marginTop:1 }}>{Icon.lightbulb(12)}</span>
          <span style={{ color:'#bbb', fontSize:11, lineHeight:1.55 }}>{kol.reasoning}</span>
        </div>
      )}
      <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.05)' }}>
        {kol.pic_name && (
          <div style={{ display:'flex', alignItems:'center', gap:5, color:'#555', fontSize:10, marginBottom:8 }}>
            {Icon.user(11)}<span>PIC:</span><span style={{ color:'#777' }}>{kol.pic_name}</span>
          </div>
        )}
        {kol.contact_action && cc ? (
          <a href={kol.contact_action.url} target="_blank" rel="noopener noreferrer"
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:cc.bg, border:`1px solid ${cc.border}`, color:cc.text, borderRadius:8, padding:'9px 14px', fontSize:12, fontWeight:700, textDecoration:'none', fontFamily:'inherit', transition:'opacity .2s' }}
            onMouseEnter={e=>e.currentTarget.style.opacity='.75'}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            {kol.contact_action.type === 'whatsapp' && Icon.whatsapp(14)}
            {kol.contact_action.type === 'tiktok' && Icon.tiktok(14)}
            {(kol.contact_action.type === 'instagram' || kol.contact_action.type === 'profile') && Icon.instagram(14)}
            <span>{kol.contact_action.label}</span>{Icon.externalLink(10)}
          </a>
        ) : (
          <div style={{ color:'#2a2a3a', fontSize:11, textAlign:'center', padding:'4px 0' }}>Tidak ada kontak</div>
        )}
      </div>
    </div>
  );
}

function HomelessMediaCard({ media, rank }) {
  const c = rank===1?TEAL:rank===2?'#67e8f9':rank===3?'#a5f3fc':TEAL;
  const [open, setOpen] = useState(false);
  const contactColors = {
    whatsapp:  { bg:'rgba(37,211,102,.12)',  border:'rgba(37,211,102,.35)', text:'#25d366' },
    instagram: { bg:'rgba(193,53,132,.10)', border:'rgba(193,53,132,.3)', text:'#c13584' },
    profile:   { bg:'rgba(193,53,132,.10)', border:'rgba(193,53,132,.3)', text:'#c13584' },
  };
  const cc = media.contact_action ? (contactColors[media.contact_action.type] || contactColors.instagram) : null;

  return (
    <div
      style={{ background:`linear-gradient(135deg,rgba(45,212,191,.05),rgba(45,212,191,.01))`, border:`1px solid ${c}33`, borderRadius:14, padding:18, position:'relative', transition:'all .25s' }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=c+'88';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=c+'33';e.currentTarget.style.transform='translateY(0)';}}
    >
      <div style={{ position:'absolute', top:14, right:14, background:c, color:'#000', width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 }}>#{rank}</div>
      <div style={{ position:'absolute', top:14, left:14 }}><Badge label="MEDIA" color={TEAL} icon={Icon.newspaper(10)} /></div>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12, marginTop:28 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:c+'22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:c }}>
          {Icon.newspaper(18)}
        </div>
        <div>
          <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>@{media.username}</div>
          <div style={{ color:'#666', fontSize:11, marginTop:2 }}>{media.category}</div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'#555', fontSize:10, letterSpacing:'.5px' }}>MATCH SCORE</span>
        <span style={{ color:c, fontWeight:800, fontSize:15, fontFamily:'Syne,sans-serif' }}>{media.match_score}%</span>
      </div>
      <Bar score={media.match_score} color={c} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
        <Stat label="Followers" value={media.followers||'-'} color={TEAL} />
        <Stat label="Platform" value={media.social_media||'-'} color={PURPLE} />
        <Stat label="Rate Min" value={fmt(media.rate_min)} color={GOLD} />
        <Stat label="Lokasi" value={media.location||'-'} color={GREEN} />
      </div>
      <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
        <Badge label={media.category} color={TEAL} />
        <Badge label={media.location} color={media.location_norm==='nasional'?GREEN:GOLD} icon={Icon.pin(10)} />
      </div>
      {media.score_detail && (
        <>
          <button onClick={()=>setOpen(o=>!o)} style={{ marginTop:10, background:'transparent', border:'1px solid rgba(255,255,255,.08)', color:'#555', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:11, fontFamily:'inherit', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {open ? Icon.chevronUp(12) : Icon.chevronDown(12)}
            {open ? 'Sembunyikan detail' : 'Detail scoring'}
          </button>
          {open && (
            <div style={{ marginTop:10, background:'rgba(0,0,0,.3)', borderRadius:8, padding:'10px 12px' }}>
              {Object.entries(media.score_detail).map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ color:'#666', fontSize:11 }}>{k}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:60, height:4, background:'#1a1a2a', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${v}%`, height:'100%', background:v>=70?GREEN:v>=40?GOLD:RED, borderRadius:2 }} />
                    </div>
                    <span style={{ color:'#aaa', fontSize:11, minWidth:32, textAlign:'right' }}>{v}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {media.rate_card && Object.keys(media.rate_card).length > 0 && (
        <div style={{ marginTop:10, background:'rgba(0,0,0,.3)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ color:'#444', fontSize:9, letterSpacing:'1px', marginBottom:6, fontWeight:700 }}>RATE CARD</div>
          {Object.entries(media.rate_card).map(([p,r])=>(
            <div key={p} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ color:'#777', fontSize:11 }}>{p}</span>
              <span style={{ color:GOLD, fontWeight:700, fontSize:11 }}>{fmt(r)}</span>
            </div>
          ))}
        </div>
      )}
      {media.reasoning && (
        <div style={{ marginTop:10, background:TEAL+'0e', border:`1px solid ${TEAL}22`, borderRadius:8, padding:'8px 10px', display:'flex', gap:6, alignItems:'flex-start' }}>
          <span style={{ color:TEAL, flexShrink:0, marginTop:1 }}>{Icon.lightbulb(12)}</span>
          <span style={{ color:'#bbb', fontSize:11, lineHeight:1.55 }}>{media.reasoning}</span>
        </div>
      )}
      <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.05)' }}>
        {media.pic_name && (
          <div style={{ display:'flex', alignItems:'center', gap:5, color:'#555', fontSize:10, marginBottom:8 }}>
            {Icon.user(11)}<span>PIC:</span><span style={{ color:'#777' }}>{media.pic_name}</span>
          </div>
        )}
        {media.contact_action && cc ? (
          <a href={media.contact_action.url} target="_blank" rel="noopener noreferrer"
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:cc.bg, border:`1px solid ${cc.border}`, color:cc.text, borderRadius:8, padding:'9px 14px', fontSize:12, fontWeight:700, textDecoration:'none', fontFamily:'inherit', transition:'opacity .2s' }}
            onMouseEnter={e=>e.currentTarget.style.opacity='.75'}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            {media.contact_action.type === 'whatsapp' && Icon.whatsapp(14)}
            {Icon.instagram(14)}
            <span>{media.contact_action.label}</span>{Icon.externalLink(10)}
          </a>
        ) : (
          <div style={{ color:'#2a2a3a', fontSize:11, textAlign:'center', padding:'4px 0' }}>Tidak ada kontak</div>
        )}
      </div>
    </div>
  );
}

function Spinner({ msg }) {
  return (
    <div style={{ minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:20, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
      <div style={{ position:'relative', width:70, height:70 }}>
        {[[70,ACCENT,'1s','normal'],[50,GOLD,'1.4s','reverse'],[30,PURPLE,'1.8s','normal']].map(([sz,c,dur,dir],i)=>(
          <div key={i} style={{ position:'absolute', top:(70-sz)/2, left:(70-sz)/2, width:sz, height:sz, borderRadius:'50%', border:'2.5px solid transparent', borderTopColor:c, animation:`spin ${dur} linear ${dir} infinite` }} />
        ))}
      </div>
      <div style={{ fontFamily:'Syne,sans-serif', color:ACCENT, fontSize:18, fontWeight:800 }}>DANA AI</div>
      <div style={{ color:'#777', fontSize:13, animation:'pulse 2s ease infinite', textAlign:'center', maxWidth:300 }}>{msg}</div>
    </div>
  );
}

const MSGS = [
  'Memproses kebutuhan campaign...',
  'HuggingFace encoding query...',
  'Semantic matching KOL vs campaign...',
  'Mencari Homeless Media yang relevan...',
  'Menyusun rekomendasi final...',
];

export default function App() {
  const [page, setPage]     = useState('form');
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [msg, setMsg]       = useState(MSGS[0]);
  const [kolMsg, setKolMsg] = useState('');
  const [insightMsg, setInsightMsg] = useState('');
  const [homelessMsg, setHomelessMsg] = useState('');
  const [training, setTraining]     = useState(false);
  const [form, setForm] = useState({
    campaign_name:'', campaign_description:'', goals:'',
    target_audience:'', topics:'', location:'',
    budget_min:'5000000', budget_max:'50000000',
    budget_kol_pct: 70,   // default 70% KOL, 30% media
    num_kol:5, num_media:3, content_type:'semua', preferred_tier:'semua',
  });
  const kolRef      = useRef();
  const insightRef  = useRef();
  const homelessRef = useRef();
  const msgIdx      = useRef(0);

  useEffect(() => {
    checkStatus().then(setStatus).catch(()=>setStatus({error:true}));
  }, []);

  useEffect(() => {
    if (page!=='loading') return;
    const iv = setInterval(()=>{
      msgIdx.current = (msgIdx.current+1)%MSGS.length;
      setMsg(MSGS[msgIdx.current]);
    }, 1100);
    return ()=>clearInterval(iv);
  }, [page]);

  const handleKOLUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setKolMsg('Uploading...');
    try { await uploadKOL(file); setKolMsg('KOL.xlsx uploaded. Klik Latih Model.'); }
    catch(err) { setKolMsg('Error: ' + err.message); }
  };

  const handleInsightUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setInsightMsg('Uploading & extracting ER data...');
    try {
      const r = await uploadInsight(file);
      setInsightMsg(r.er_extracted ? 'insight.xlsx uploaded. ER data diekstrak.' : 'Uploaded tapi ER extract gagal.');
    } catch(err) { setInsightMsg('Error: ' + err.message); }
  };

  const handleHomelessUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setHomelessMsg('Uploading & parsing...');
    try {
      const r = await uploadHomelessMedia(file);
      if (r.parsed) {
        setHomelessMsg(`✓ ${r.homeless_media_count} Homeless Media berhasil diload.`);
        const s = await checkStatus();
        setStatus(s);
      } else {
        setHomelessMsg('Uploaded tapi parsing gagal. Cek format Sheet2.');
      }
    } catch(err) { setHomelessMsg('Error: ' + err.message); }
  };

  const handleTrain = async () => {
    setTraining(true);
    setKolMsg('Training... HuggingFace download ~100MB pertama kali.');
    try {
      await trainModel();
      const s = await checkStatus();
      setStatus(s);
      const meta = s.meta||{};
      setKolMsg(`Model siap. ${meta.total_kol||0} KOL | ${meta.kol_with_er||0} dengan ER nyata`);
    } catch(err) { setKolMsg('Error: ' + err.message); }
    setTraining(false);
  };

  const handleSubmit = async () => {
    if (!form.campaign_name || !form.budget_min) return;
    setPage('loading'); msgIdx.current=0; setMsg(MSGS[0]);
    const budgetMid = Math.round((parseFloat(form.budget_min) + parseFloat(form.budget_max)) / 2);
    try {
      const data = await getRecommendations({
        ...form,
        budget: String(budgetMid),
        budget_kol_pct: form.budget_kol_pct / 100,
      });
      setResult(data); setPage('result');
    } catch(err) { alert(err.message); setPage('form'); }
  };

  const inp = {
    background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)',
    borderRadius:10, color:'#fff', padding:'11px 14px', fontSize:14,
    width:'100%', outline:'none', fontFamily:'inherit', boxSizing:'border-box',
  };
  const lbl = {
    color:'#666', fontSize:11, fontWeight:700, letterSpacing:'.7px',
    marginBottom:5, display:'block', textTransform:'uppercase',
  };

  if (page==='loading') return <Spinner msg={msg} />;

  /* ── RESULT PAGE ── */
  if (page==='result' && result) {
    const homelessData = result.homeless_media;
    const hasHomeless  = homelessData && homelessData.recommended_media && homelessData.recommended_media.length > 0;
    const budgetMin = parseFloat(form.budget_min) || 0;
    const budgetMax = parseFloat(form.budget_max) || 0;

    return (
      <div style={{ minHeight:'100vh', background:BG, fontFamily:"'Plus Jakarta Sans',sans-serif", color:'#fff' }}>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          ::-webkit-scrollbar{width:5px}
          ::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:3px}
          @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
          .fu{animation:fu .5s ease forwards}
        `}</style>

        <div style={{ background:'rgba(7,7,15,.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:`linear-gradient(135deg,${ACCENT},${PURPLE})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
              {Icon.bolt(14)}
            </div>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:14 }}>DANA AI</span>
            <Badge label="HuggingFace NLP" color={PURPLE} icon={Icon.cpu(10)} />
            {hasHomeless && <Badge label={`${homelessData.total_media} Homeless Media`} color={TEAL} icon={Icon.newspaper(10)} />}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <Badge label={`KOL AVG ${result.avg_match_score}%`} color={GREEN} />
            <button onClick={()=>setPage('form')} style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', color:'#ccc', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>Baru</button>
          </div>
        </div>

        <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 20px' }}>
          <div className="fu" style={{ marginBottom:20 }}>
            <div style={{ background:ACCENT+'12', border:`1px solid ${ACCENT}30`, borderRadius:16, padding:'20px 22px' }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:20, justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ color:ACCENT, fontSize:10, letterSpacing:'1.5px', fontWeight:700, marginBottom:6 }}>HASIL ANALISIS — SEMANTIC ML + HOMELESS MEDIA</div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(18px,3vw,26px)', fontWeight:800, marginBottom:10 }}>{result.campaign_name}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <Badge label={result.target_location} color={ACCENT} icon={Icon.pin(11)} />
                    <Badge label={`${fmtBudget(budgetMin)} – ${fmtBudget(budgetMax)}`} color={GOLD} icon={Icon.wallet(11)} />
                    <Badge label={`${result.total_kol} KOL`} color={GREEN} icon={Icon.users(11)} />
                    {hasHomeless && <Badge label={`${homelessData.total_media} Media`} color={TEAL} icon={Icon.newspaper(11)} />}
                    {result.hf_model_used && <Badge label={result.hf_model_used.split('/')[1]} color={PURPLE} icon={Icon.cpu(10)} />}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, minWidth:220 }}>
                  <Stat label="KOL Avg Match" value={`${result.avg_match_score}%`} color={ACCENT} />
                  <Stat label="Total KOL" value={result.total_kol} color={GOLD} />
                  <Stat label="KOL Est. Min" value={fmt(result.estimated_cost_min)} color={GOLD} />
                  {hasHomeless
                    ? <Stat label="Media Est. Min" value={fmt(result.homeless_media?.estimated_cost_media_min)} color={TEAL} />
                    : <Stat label="Sisa Budget" value={fmt(result.budget_remaining)} color={GREEN} />
                  }
                </div>
              </div>

              {/* Budget breakdown bar */}
              {result.budget_total > 0 && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ color:'#555', fontSize:10 }}>Budget breakdown</span>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13 }}>
                        {fmt(result.total_estimated_min || (result.estimated_cost_min + (result.homeless_media?.estimated_cost_media_min||0)))}
                      </span>
                      <span style={{ color:'#444', fontSize:10 }}>dari</span>
                      <span style={{ color:GOLD, fontWeight:700, fontSize:13 }}>{fmt(result.budget_total)}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  {(() => {
                    const total    = result.budget_total || 1;
                    const kolMin   = result.estimated_cost_min || 0;
                    const mediaMin = result.homeless_media?.estimated_cost_media_min || 0;
                    const kolPct   = Math.min(kolMin / total * 100, 100);
                    const mediaPct = Math.min(mediaMin / total * 100, 100 - kolPct);
                    const over     = result.over_budget;
                    return (
                      <div>
                        <div style={{ height:8, background:'rgba(255,255,255,.05)', borderRadius:4, overflow:'hidden', display:'flex' }}>
                          <div style={{ width:`${kolPct}%`, background:GOLD, transition:'width .8s', borderRadius:'4px 0 0 4px' }} />
                          <div style={{ width:`${mediaPct}%`, background:TEAL, transition:'width .8s' }} />
                        </div>
                        <div style={{ display:'flex', gap:12, marginTop:6 }}>
                          <span style={{ color:GOLD, fontSize:9 }}>KOL {fmt(kolMin)}</span>
                          {mediaMin > 0 && <span style={{ color:TEAL, fontSize:9 }}>Media {fmt(mediaMin)}</span>}
                          {result.budget_remaining_min > 0 && (
                            <span style={{ color:GREEN, fontSize:9, marginLeft:'auto' }}>
                              Sisa {fmt(result.budget_remaining_min)}
                            </span>
                          )}
                          {over && (
                            <span style={{ color:RED, fontSize:9, fontWeight:700, marginLeft:'auto' }}>
                              Over budget!
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="fu" style={{ marginBottom:20, animationDelay:'.05s' }}>
            <div style={{ background:PURPLE+'0d', border:`1px solid ${PURPLE}22`, borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ color:PURPLE }}>{Icon.cpu(14)}</span>
              <span style={{ color:PURPLE, fontSize:12, fontWeight:600 }}>Semantic matching powered by HuggingFace</span>
              <span style={{ color:'#444', fontSize:11 }}>memahami konteks Bahasa Indonesia & English</span>
            </div>
          </div>

          <div className="fu" style={{ animationDelay:'.1s', marginBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:4, height:20, background:GOLD, borderRadius:2 }} />
              <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:17, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:GOLD }}>{Icon.star(16)}</span>Rekomendasi KOL
              </span>
              <Badge label={`${result.total_kol} KOL`} color={GOLD} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(285px,1fr))', gap:14 }}>
              {result.recommended_kol.map((kol,i)=><KOLCard key={kol.id} kol={kol} rank={i+1} />)}
            </div>
          </div>

          {hasHomeless && (
            <div className="fu" style={{ animationDelay:'.2s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${TEAL}44,transparent)` }} />
                <div style={{ display:'flex', alignItems:'center', gap:8, color:TEAL }}>
                  {Icon.newspaper(16)}<span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:13, letterSpacing:'1px' }}>HOMELESS MEDIA</span>
                </div>
                <div style={{ flex:1, height:1, background:`linear-gradient(90deg,transparent,${TEAL}44)` }} />
              </div>
              <div style={{ background:TEAL+'0d', border:`1px solid ${TEAL}22`, borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'flex-start', gap:10, marginBottom:14 }}>
                <span style={{ color:TEAL, flexShrink:0, marginTop:1 }}>{Icon.newspaper(14)}</span>
                <div>
                  <span style={{ color:TEAL, fontSize:12, fontWeight:700 }}>Media Placement Recommendations</span>
                  <span style={{ color:'#555', fontSize:11, marginLeft:8 }}>Akun media/berita dengan reach besar untuk amplifikasi campaign</span>
                  {homelessData.relevant_categories && (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                      {homelessData.relevant_categories.map(c=>(<Badge key={c} label={c} color={TEAL} />))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:17, display:'flex', alignItems:'center', gap:8, color:TEAL }}>
                  {Icon.newspaper(16)}Homeless Media Terpilih
                </span>
                <Badge label={`${homelessData.total_media} Media`} color={TEAL} />
                <Badge label={`Est. ${fmt(homelessData.estimated_cost_media_min)} – ${fmt(homelessData.estimated_cost_media_max)}`} color={GOLD} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(285px,1fr))', gap:14 }}>
                {homelessData.recommended_media.map((media,i)=>(<HomelessMediaCard key={media.id} media={media} rank={i+1} />))}
              </div>
            </div>
          )}

          {!hasHomeless && (
            <div className="fu" style={{ animationDelay:'.2s' }}>
              <div style={{ background:'rgba(45,212,191,.04)', border:`1px solid ${TEAL}20`, borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ color:TEAL }}>{Icon.newspaper(18)}</span>
                <div>
                  <div style={{ color:TEAL, fontWeight:700, fontSize:13 }}>Homeless Media belum diload</div>
                  <div style={{ color:'#555', fontSize:11, marginTop:3 }}>Upload HomelessMedia.xlsx di panel setup untuk mendapatkan rekomendasi media placement.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── FORM PAGE ── */
  const modelReady     = status?.model_trained;
  const backendErr     = status?.error;
  const homelessLoaded = status?.homeless_media_loaded;
  const homelessCount  = status?.homeless_media_count || 0;
  const meta           = status?.meta || {};
  const canSubmit = form.campaign_name && form.budget_min && modelReady;

  const statusIcon = backendErr
    ? <span style={{ color:RED }}>{Icon.xCircle(18)}</span>
    : status===null
    ? <span style={{ color:'#555' }}>{Icon.loader(18)}</span>
    : modelReady
    ? <span style={{ color:GREEN }}>{Icon.checkCircle(18)}</span>
    : <span style={{ color:GOLD }}>{Icon.alertCircle(18)}</span>;

  return (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:"'Plus Jakarta Sans',sans-serif", color:'#fff' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        input,select,textarea{color-scheme:dark}
        input:focus,textarea:focus{border-color:${ACCENT}99!important;box-shadow:0 0 0 3px ${ACCENT}18}
        select{
          -webkit-appearance:none;
          appearance:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat:no-repeat;
          background-position:right 12px center;
          padding-right:32px !important;
          cursor:pointer;
        }
        select:focus{border-color:${ACCENT}99!important;box-shadow:0 0 0 3px ${ACCENT}18;outline:none}
        select option{background:#0f0f1a;color:#fff}
        @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .fu{animation:fu .5s ease forwards}
      `}</style>

      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle,${ACCENT}10 0%,transparent 70%)`, top:-150, right:'10%' }} />
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:`radial-gradient(circle,${PURPLE}0a 0%,transparent 70%)`, bottom:60, left:'5%' }} />
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', padding:'36px 20px', position:'relative', zIndex:1 }}>

        {/* hero */}
        <div className="fu" style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:ACCENT+'14', border:`1px solid ${ACCENT}30`, borderRadius:30, padding:'7px 18px', marginBottom:18 }}>
            <span style={{ color:ACCENT, display:'flex' }}>{Icon.bolt(13)}</span>
            <span style={{ color:ACCENT, fontWeight:700, fontSize:11, letterSpacing:'1.5px' }}>DANA AI CAMPAIGN PLANNER</span>
            <Badge label="HuggingFace" color={PURPLE} icon={Icon.cpu(10)} />
          </div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(22px,5vw,38px)', fontWeight:800, margin:'0 0 10px', lineHeight:1.15 }}>
            KOL + Homeless Media<br />
            <span style={{ background:`linear-gradient(90deg,${ACCENT},${PURPLE})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Semantic Matching
            </span>
          </h1>
        </div>

        {/* database panel */}
        <div className="fu" style={{ marginBottom:16, animationDelay:'.08s' }}>
          <div style={{ background:backendErr?RED+'0a':modelReady?GREEN+'08':'rgba(255,255,255,.02)', border:`1px solid ${backendErr?RED+'30':modelReady?GREEN+'22':'rgba(255,255,255,.07)'}`, borderRadius:12, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              {statusIcon}
              <span style={{ fontWeight:700, fontSize:13, color:backendErr?RED:modelReady?GREEN:'#ccc' }}>
                {backendErr?'Backend tidak bisa dihubungi — jalankan server Python dulu':status===null?'Menghubungi backend...':modelReady?`Model siap — ${meta.total_kol||0} KOL | ${meta.kol_with_er||0} ER nyata${meta.metrics?.random_forest?.mae ? ` | MAE ${meta.metrics.random_forest.mae.toFixed(4)}` : ''}`:'Model belum dilatih'}
              </span>
              {homelessLoaded && <Badge label={`${homelessCount} Homeless Media`} color={TEAL} icon={Icon.newspaper(10)} />}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              <div style={{ background:'rgba(0,0,0,.2)', borderRadius:8, padding:'12px' }}>
                <div style={{ color:'#555', fontSize:10, fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>DATABASE KOL</div>
                <input ref={kolRef} type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleKOLUpload} />
                <button onClick={()=>kolRef.current.click()} disabled={!!backendErr} style={{ background:ACCENT+'20', border:`1px solid ${ACCENT}40`, color:ACCENT, borderRadius:8, padding:'7px 10px', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit', width:'100%', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'center', gap:5, opacity:backendErr?.4:1 }}>
                  {Icon.upload(12)} KOL.xlsx
                </button>
                {kolMsg && <div style={{ fontSize:10, color:kolMsg.startsWith('Model')||kolMsg.startsWith('KOL')?GREEN:kolMsg.startsWith('Error')?RED:'#888', lineHeight:1.4 }}>{kolMsg}</div>}
              </div>
              <div style={{ background:'rgba(0,0,0,.2)', borderRadius:8, padding:'12px' }}>
                <div style={{ color:'#555', fontSize:10, fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>INSIGHT / ER DATA</div>
                <input ref={insightRef} type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleInsightUpload} />
                <button onClick={()=>insightRef.current.click()} disabled={!!backendErr} style={{ background:GREEN+'20', border:`1px solid ${GREEN}40`, color:GREEN, borderRadius:8, padding:'7px 10px', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit', width:'100%', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'center', gap:5, opacity:backendErr?.4:1 }}>
                  {Icon.chart(12)} insight.xlsx
                </button>
                {insightMsg && <div style={{ fontSize:10, color:insightMsg.startsWith('insight')?GREEN:insightMsg.startsWith('Error')?RED:'#888', lineHeight:1.4 }}>{insightMsg}</div>}
              </div>
              <div style={{ background:'rgba(45,212,191,.04)', borderRadius:8, padding:'12px', border:`1px solid ${TEAL}22` }}>
                <div style={{ color:TEAL, fontSize:10, fontWeight:700, letterSpacing:'1px', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
                  {Icon.newspaper(10)} HOMELESS MEDIA
                </div>
                <input ref={homelessRef} type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleHomelessUpload} />
                <button onClick={()=>homelessRef.current.click()} disabled={!!backendErr} style={{ background:TEAL+'20', border:`1px solid ${TEAL}40`, color:TEAL, borderRadius:8, padding:'7px 10px', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit', width:'100%', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'center', gap:5, opacity:backendErr?.4:1 }}>
                  {Icon.upload(12)} HomelessMedia.xlsx
                </button>
                {homelessLoaded && !homelessMsg && <div style={{ fontSize:10, color:TEAL, lineHeight:1.4 }}>✓ {homelessCount} media loaded</div>}
                {homelessMsg && <div style={{ fontSize:10, color:homelessMsg.startsWith('✓')||homelessMsg.includes('berhasil')?TEAL:homelessMsg.startsWith('Error')?RED:'#888', lineHeight:1.4 }}>{homelessMsg}</div>}
              </div>
            </div>

            <button onClick={handleTrain} disabled={training||!!backendErr} style={{ background:training?'rgba(255,255,255,.05)':`linear-gradient(135deg,${PURPLE},${ACCENT})`, border:'none', color:'#fff', borderRadius:10, padding:'11px 20px', cursor:training||backendErr?'not-allowed':'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:backendErr?.4:1 }}>
              {training ? Icon.loader(14) : Icon.cpu(14)}
              {training ? 'Training + HuggingFace download...' : 'Latih Model (HuggingFace)'}
            </button>

            <div style={{ marginTop:14, borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:12 }}>
              <div style={{ color:'#333', fontSize:10, fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>CARA SETUP</div>
              {[
                ['1','Upload KOL.xlsx — database KOL kamu', modelReady],
                ['2','Upload HomelessMedia.xlsx — database media placement', homelessLoaded],
                ['3','Opsional: Upload insight.xlsx untuk ER data nyata', false],
                ['4','Klik Latih Model — HuggingFace ~100MB pertama kali', modelReady],
                ['5','Isi form, generate rekomendasi KOL + Homeless Media', false],
              ].map(([n,txt,done])=>(
                <div key={n} style={{ display:'flex', gap:8, marginBottom:5, alignItems:'flex-start' }}>
                  <span style={{ color:done?GREEN:ACCENT, fontWeight:800, fontSize:11, minWidth:16, marginTop:1, display:'flex' }}>
                    {done ? Icon.checkCircle(11) : <span>{n}.</span>}
                  </span>
                  <span style={{ color:done?'#3a3a4a':'#555', fontSize:11, lineHeight:1.55, textDecoration:done?'line-through':'none' }}>{txt}</span>
                </div>
              ))}
            </div>

            {/* MAE — tampil setelah training */}
            {modelReady && <MAEBadge meta={meta} />}

          </div>
        </div>

        {/* form */}
        <div className="fu" style={{ animationDelay:'.15s' }}>
          <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:24 }}>
            <div style={{ display:'grid', gap:15 }}>

              <div>
                <label style={lbl}>Nama Campaign *</label>
                <input style={inp} placeholder="Campaign Literasi Keuangan 2025" value={form.campaign_name} onChange={e=>setForm(f=>({...f,campaign_name:e.target.value}))} />
              </div>
              <div>
                <label style={lbl}>Deskripsi Campaign</label>
                <textarea style={{...inp,minHeight:68,resize:'vertical'}} placeholder="Tujuan dan pesan utama campaign — semakin detail semakin akurat matching-nya..." value={form.campaign_description} onChange={e=>setForm(f=>({...f,campaign_description:e.target.value}))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>Goals</label>
                  <select style={inp} value={form.goals} onChange={e=>setForm(f=>({...f,goals:e.target.value}))}>
                    <option value="">Pilih goals...</option>
                    <option value="brand awareness">Brand Awareness</option>
                    <option value="edukasi audience">Edukasi Audience</option>
                    <option value="product launch">Product Launch</option>
                    <option value="lead generation">Lead Generation</option>
                    <option value="engagement">Engagement</option>
                    <option value="conversion penjualan">Conversion / Penjualan</option>
                    <option value="community building">Community Building</option>
                    <option value="viral campaign">Viral Campaign</option>
                    <option value="repositioning brand">Repositioning Brand</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Target Audience</label>
                  <input style={inp} placeholder="Pemuda 20-30 tahun" value={form.target_audience} onChange={e=>setForm(f=>({...f,target_audience:e.target.value}))} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>Topik / Niche</label>
                  <select style={inp} value={form.topics} onChange={e=>setForm(f=>({...f,topics:e.target.value}))}>
                    <option value="">Pilih topik...</option>
                    <option value="finance keuangan investasi">Finance &amp; Keuangan</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="beauty skincare">Beauty &amp; Skincare</option>
                    <option value="fashion">Fashion</option>
                    <option value="food kuliner">Food &amp; Kuliner</option>
                    <option value="travel wisata">Travel &amp; Wisata</option>
                    <option value="health wellness">Health &amp; Wellness</option>
                    <option value="teknologi gadget">Teknologi &amp; Gadget</option>
                    <option value="edukasi pendidikan">Edukasi</option>
                    <option value="entertainment hiburan">Entertainment</option>
                    <option value="parenting keluarga">Parenting &amp; Keluarga</option>
                    <option value="bisnis entrepreneurship">Bisnis &amp; Entrepreneurship</option>
                    <option value="gaming">Gaming</option>
                    <option value="olahraga fitness">Olahraga &amp; Fitness</option>
                    <option value="otomotif">Otomotif</option>
                    <option value="properti">Properti</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Lokasi Target</label>
                  <input style={inp} placeholder="Jakarta, Surabaya, Nasional..." value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} />
                </div>
              </div>

              {/* ── BUDGET SLIDER ── */}
              <div>
                <label style={{ ...lbl, display:'flex', alignItems:'center', gap:6 }}>
                  {Icon.wallet(11)} Budget Range *
                </label>
                <div style={{ background:'rgba(0,0,0,.2)', border:'1px solid rgba(255,255,255,.06)', borderRadius:12, padding:'16px' }}>
                  <BudgetSlider
                    budgetMin={form.budget_min}
                    budgetMax={form.budget_max}
                    onChangeMin={(val) => setForm(f => ({ ...f, budget_min: val }))}
                    onChangeMax={(val) => setForm(f => ({ ...f, budget_max: val }))}
                  />
                </div>
              </div>

              {/* ── BUDGET SPLIT ── */}
              <div>
                <label style={{ ...lbl, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {Icon.chart(11)} Alokasi Budget
                  </span>
                  <span style={{ color:'#444', fontSize:10, fontWeight:500, textTransform:'none', letterSpacing:0 }}>
                    KOL {form.budget_kol_pct}% · Media {100 - form.budget_kol_pct}%
                  </span>
                </label>
                <div style={{ background:'rgba(0,0,0,.2)', border:'1px solid rgba(255,255,255,.06)', borderRadius:12, padding:'14px 16px' }}>
                  {/* Split bar visual */}
                  <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', marginBottom:10 }}>
                    <div style={{ width:`${form.budget_kol_pct}%`, background:GOLD, transition:'width .2s' }} />
                    <div style={{ flex:1, background:TEAL }} />
                  </div>
                  {/* Slider */}
                  <style>{`
                    .split-slider{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:3px;background:transparent;outline:none;cursor:pointer}
                    .split-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.5);cursor:pointer}
                    .split-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;border:none;background:#fff;cursor:pointer}
                  `}</style>
                  <input type="range" className="split-slider" min={10} max={90} step={5}
                    value={form.budget_kol_pct}
                    onChange={e=>setForm(f=>({...f,budget_kol_pct:parseInt(e.target.value)}))}
                  />
                  {/* Labels */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
                    <div style={{ background:GOLD+'12', border:`1px solid ${GOLD}33`, borderRadius:8, padding:'8px 12px' }}>
                      <div style={{ color:GOLD, fontSize:9, fontWeight:700, letterSpacing:'.7px', marginBottom:3 }}>KOL</div>
                      <div style={{ color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14 }}>
                        {fmtBudget(Math.round((parseFloat(form.budget_min)||0) * form.budget_kol_pct / 100))}
                      </div>
                      <div style={{ color:'#555', fontSize:9, marginTop:1 }}>
                        – {fmtBudget(Math.round((parseFloat(form.budget_max)||0) * form.budget_kol_pct / 100))}
                      </div>
                    </div>
                    <div style={{ background:TEAL+'12', border:`1px solid ${TEAL}33`, borderRadius:8, padding:'8px 12px' }}>
                      <div style={{ color:TEAL, fontSize:9, fontWeight:700, letterSpacing:'.7px', marginBottom:3 }}>HOMELESS MEDIA</div>
                      <div style={{ color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14 }}>
                        {fmtBudget(Math.round((parseFloat(form.budget_min)||0) * (100 - form.budget_kol_pct) / 100))}
                      </div>
                      <div style={{ color:'#555', fontSize:9, marginTop:1 }}>
                        – {fmtBudget(Math.round((parseFloat(form.budget_max)||0) * (100 - form.budget_kol_pct) / 100))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>Platform</label>
                  <select style={inp} value={form.content_type} onChange={e=>setForm(f=>({...f,content_type:e.target.value}))}>
                    <option value="semua">Semua Platform</option>
                    <option value="tiktok">Tiktok</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tier KOL</label>
                  <select style={inp} value={form.preferred_tier} onChange={e=>setForm(f=>({...f,preferred_tier:e.target.value}))}>
                    <option value="semua">Semua Tier</option>
                    <option value="nano">Nano</option>
                    <option value="mikro">Mikro</option>
                    <option value="makro">Makro</option>
                    <option value="mega">Mega</option>
                  </select>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>Jumlah KOL</label>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={()=>setForm(f=>({...f,num_kol:Math.max(1,f.num_kol-1)}))} style={{ width:32, height:32, borderRadius:8, background:ACCENT+'20', border:`1px solid ${ACCENT}40`, color:ACCENT, fontWeight:800, fontSize:16, cursor:'pointer' }}>−</button>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, minWidth:28, textAlign:'center' }}>{form.num_kol}</span>
                    <button onClick={()=>setForm(f=>({...f,num_kol:Math.min(50,f.num_kol+1)}))} style={{ width:32, height:32, borderRadius:8, background:ACCENT+'20', border:`1px solid ${ACCENT}40`, color:ACCENT, fontWeight:800, fontSize:16, cursor:'pointer' }}>+</button>
                    <span style={{ color:'#444', fontSize:11 }}>dari {meta.total_kol||0}</span>
                  </div>
                </div>
                <div>
                  <label style={{ color:TEAL, fontSize:11, fontWeight:700, letterSpacing:'.7px', marginBottom:5, textTransform:'uppercase', display:'flex', alignItems:'center', gap:5 }}>
                    {Icon.newspaper(10)} Jumlah Homeless Media
                  </label>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={()=>setForm(f=>({...f,num_media:Math.max(1,f.num_media-1)}))} style={{ width:32, height:32, borderRadius:8, background:TEAL+'20', border:`1px solid ${TEAL}40`, color:TEAL, fontWeight:800, fontSize:16, cursor:'pointer' }}>−</button>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, minWidth:28, textAlign:'center', color:TEAL }}>{form.num_media}</span>
                    <button onClick={()=>setForm(f=>({...f,num_media:Math.min(20,f.num_media+1)}))} style={{ width:32, height:32, borderRadius:8, background:TEAL+'20', border:`1px solid ${TEAL}40`, color:TEAL, fontWeight:800, fontSize:16, cursor:'pointer' }}>+</button>
                    <span style={{ color:'#444', fontSize:11 }}>dari {homelessCount||0}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit} disabled={!canSubmit}
                style={{ background:canSubmit?`linear-gradient(135deg,${ACCENT},${PURPLE})`:'rgba(255,255,255,.05)', border:'none', color:'#fff', borderRadius:12, padding:'14px 28px', fontSize:14, fontWeight:700, cursor:canSubmit?'pointer':'not-allowed', fontFamily:'Syne,sans-serif', opacity:canSubmit?1:.4, transition:'all .25s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
              >
                {Icon.bolt(15)}
                Generate Rekomendasi KOL {homelessLoaded && '+ Homeless Media'}
              </button>

              {!modelReady && (
                <p style={{ textAlign:'center', color:'#333', fontSize:11, margin:0, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <span style={{ color:'#444' }}>{Icon.alertCircle(12)}</span>
                  Latih model terlebih dahulu
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop:16, textAlign:'center', color:'#2a2a3a', fontSize:11 }}>
          DANA AI · HuggingFace Multilingual · KOL + Homeless Media · No external API
        </div>
      </div>
    </div>
  );
}