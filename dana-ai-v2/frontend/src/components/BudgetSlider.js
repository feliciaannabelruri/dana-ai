import React, { useState, useEffect } from 'react';

const C = {
  blue: '#1A6FE8',
  blueLight: '#EBF2FD',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  bgGray2: '#F3F4F6',
};

const PRESETS = [
  { label: 'Micro', min: 1e6, max: 5e6, desc: '1–5jt' },
  { label: 'Kecil', min: 5e6, max: 25e6, desc: '5–25jt' },
  { label: 'Medium', min: 25e6, max: 100e6, desc: '25–100jt' },
  { label: 'Besar', min: 100e6, max: 500e6, desc: '100–500jt' },
  { label: 'Premium', min: 500e6, max: 2e9, desc: '500jt–2M' },
  { label: 'Enterprise', min: 2e9, max: 5e9, desc: '2–5M' }
];

const SMAX = 1000;
const l2v = p => { const lo = Math.log(500000), hi = Math.log(5e9); return Math.round(Math.exp(lo + (p / SMAX) * (hi - lo))); };
const v2l = v => { if (!v || v <= 0) return 200; const lo = Math.log(500000), hi = Math.log(5e9); return Math.round(((Math.log(Math.max(500000, Math.min(5e9, v))) - lo) / (hi - lo)) * SMAX); };
const getP = v => { for (const p of PRESETS) if (v >= p.min && v <= p.max) return p; return v < PRESETS[0].min ? PRESETS[0] : PRESETS[PRESETS.length - 1]; };

const fmtB = n => {
  if (!n || isNaN(n)) return 'Rp 0';
  const v = Math.round(n);
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(2).replace(/\.?0+$/, '')} M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(1).replace(/\.0$/, '')} juta`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

const BudgetSlider = ({ budgetMin, budgetMax, onChangeMin, onChangeMax }) => {
  const minV = parseFloat(budgetMin) || 5e6, maxV = parseFloat(budgetMax) || 50e6;
  const posMin = v2l(minV), posMax = v2l(maxV), ap = getP((minV + maxV) / 2);
  const pMin = (posMin / SMAX) * 100, pMax = (posMax / SMAX) * 100;
  const [rMin, sRMin] = useState(''); const [rMax, sRMax] = useState('');
  const [fMin, sFMin] = useState(false); const [fMax, sFMax] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`.bsl{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;background:transparent;pointer-events:none}.bsl::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:${C.blue};border:3px solid #fff;box-shadow:0 1px 8px rgba(26,111,232,.3);cursor:pointer;pointer-events:all}.bsl::-moz-range-thumb{width:24px;height:24px;border-radius:50%;border:3px solid #fff;background:${C.blue};cursor:pointer;pointer-events:all}`}</style>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PRESETS.map(p => {
          const on = p.min === minV && p.max === maxV;
          return (
            <button key={p.label} onClick={() => { onChangeMin(String(p.min)); onChangeMax(String(p.max)); sRMin(''); sRMax(''); }} style={{ background: on ? C.blue : C.bgGray2, border: `1px solid ${on ? C.blue : C.border}`, color: on ? '#fff' : C.textSub, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {p.label} <span style={{ opacity: .65, fontSize: 10 }}>{p.desc}</span>
            </button>
          );
        })}
      </div>
      <div style={{ position: 'relative', padding: '4px 0' }}>
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 4, borderRadius: 2, pointerEvents: 'none', background: `linear-gradient(to right,${C.bgGray2} 0%,${C.bgGray2} ${pMin}%,${C.blue} ${pMin}%,${C.blue} ${pMax}%,${C.bgGray2} ${pMax}%,${C.bgGray2} 100%)` }} />
        <div style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center' }}>
          <input type="range" className="bsl" min={0} max={SMAX} value={posMin} onChange={e => { const v = l2v(parseInt(e.target.value)); if (v < maxV) { onChangeMin(String(v)); sRMin(''); } }} style={{ position: 'absolute', width: '100%', zIndex: posMin > SMAX * 0.8 ? 5 : 4 }} />
          <input type="range" className="bsl" min={0} max={SMAX} value={posMax} onChange={e => { const v = l2v(parseInt(e.target.value)); if (v > minV) { onChangeMax(String(v)); sRMax(''); } }} style={{ position: 'absolute', width: '100%', zIndex: posMin > SMAX * 0.8 ? 4 : 5 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
        {[{ label: 'Min', val: minV, raw: rMin, focus: fMin, sR: sRMin, sF: sFMin, set: v => onChangeMin(String(Math.min(v, maxV - 1))) }, null, { label: 'Max', val: maxV, raw: rMax, focus: fMax, sR: sRMax, sF: sFMax, set: v => onChangeMax(String(Math.max(v, minV + 1))) }].map((item, i) => {
          if (!item) return <span key="sep" style={{ color: C.textMuted, fontSize: 14, textAlign: 'center' }}>—</span>;
          return (
            <div key={item.label} style={{ border: `1px solid ${item.focus ? C.blue : C.border}`, borderRadius: 8, padding: '9px 12px', boxShadow: item.focus ? `0 0 0 3px ${C.blue}15` : 'none', transition: 'border-color .15s' }}>
              <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{item.label.toUpperCase()}</div>
              <div style={{ color: C.blue, fontWeight: 700, fontSize: 13 }}>{fmtB(item.val)}</div>
              <input type="text" inputMode="numeric" placeholder="custom Rp" value={item.raw} onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ''); item.sR(r); const n = parseInt(r); if (r && n > 0) item.set(n); }} onFocus={() => { item.sF(true); item.sR(String(Math.round(item.val))); }} onBlur={() => { item.sF(false); item.sR(''); }} style={{ border: 'none', outline: 'none', background: 'transparent', color: C.textSub, fontSize: 11, width: '100%', fontFamily: 'inherit', marginTop: 2 }} />
            </div>
          );
        })}
      </div>
      <div style={{ background: C.blueLight, borderRadius: 8, padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ color: C.textSub, fontSize: 12 }}>Range</span>
        <span style={{ color: C.blue, fontWeight: 700, fontSize: 13 }}>{fmtB(minV)} — {fmtB(maxV)}</span>
        <span style={{ background: C.blue, color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{ap.label}</span>
      </div>
    </div>
  );
};

export default BudgetSlider;
