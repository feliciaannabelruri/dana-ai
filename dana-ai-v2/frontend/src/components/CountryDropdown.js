import React, { useState, useEffect, useRef } from 'react';

const C = {
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  bg: '#FFFFFF',
};

const Ic = {
  chevDown: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  check: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  x: (s = 10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

export const COUNTRY_OPTIONS = [
  { value: 'au', label: 'Australia', flag: '🇦🇺' },
  { value: 'cn', label: 'China',     flag: '🇨🇳' },
  { value: 'sg', label: 'Singapore', flag: '🇸🇬' },
  { value: 'my', label: 'Malaysia',  flag: '🇲🇾' },
  { value: 'jp', label: 'Japan',     flag: '🇯🇵' },
  { value: 'kr', label: 'Korea',     flag: '🇰🇷' },
];

const CountryDropdown = ({ selected = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selArr = Array.isArray(selected) ? selected : [];

  const toggle = val => {
    if (selArr.includes(val)) onChange(selArr.filter(x => x !== val));
    else onChange([...selArr, val]);
  };

  const label = selArr.length === 0
    ? 'Pilih negara...'
    : selArr.map(v => COUNTRY_OPTIONS.find(c => c.value === v)?.flag).join(' ') + ` ${selArr.length} negara dipilih`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: C.bg, border: `1px solid ${open ? C.indigo : C.border}`, borderRadius: 8, padding: '11px 12px', fontSize: 14, color: selArr.length ? C.text : C.textMuted, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: open ? `0 0 0 3px ${C.indigo}15` : 'none', transition: 'all .12s' }}>
        <span style={{ fontWeight: selArr.length ? 600 : 400 }}>{label}</span>
        {Ic.chevDown(12)}
      </button>

      {selArr.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
          {selArr.map(val => {
            const c = COUNTRY_OPTIONS.find(x => x.value === val);
            return (
              <span key={val} style={{ background: C.indigoLight, color: C.indigo, borderRadius: 16, padding: '3px 8px 3px 10px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {c?.flag} {c?.label || val}
                <button onClick={() => toggle(val)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.indigo, display: 'flex', padding: 0 }}>{Ic.x(10)}</button>
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, maxHeight: 260, overflowY: 'auto' }}>
          {COUNTRY_OPTIONS.map(c => {
            const on = selArr.includes(c.value);
            return (
              <div key={c.value} onClick={() => toggle(c.value)} style={{ padding: '9px 14px', cursor: 'pointer', background: on ? C.indigoLight : 'transparent', fontSize: 13, fontWeight: on ? 600 : 400, display: 'flex', alignItems: 'center', gap: 8, transition: 'background .08s' }}>
                <span style={{ color: on ? C.indigo : 'transparent', flexShrink: 0 }}>{Ic.check(12)}</span>
                <span style={{ fontSize: 15 }}>{c.flag}</span>
                <span style={{ flex: 1, color: on ? C.indigo : C.text }}>{c.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CountryDropdown;
