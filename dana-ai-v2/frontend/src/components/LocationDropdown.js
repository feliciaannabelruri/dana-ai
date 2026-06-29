import React, { useState, useEffect, useRef } from 'react';

const C = {
  blue: '#1A6FE8',
  blueLight: '#EBF2FD',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  bg: '#FFFFFF',
  bgGray: '#F9FAFB',
};

const Ic = {
  chevDown: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  check: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  pin: (s = 10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  x: (s = 10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

const LocationDropdown = ({ options = [], selected = [], onChange, loading }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggle = (val) => {
    const s = Array.isArray(selected) ? selected : [];
    if (val === 'nasional') {
      onChange(['nasional']);
    } else {
      const filtered = s.filter(x => x !== 'nasional');
      if (filtered.includes(val)) {
        const next = filtered.filter(x => x !== val);
        onChange(next.length === 0 ? ['nasional'] : next);
      } else {
        onChange([...filtered, val]);
      }
    }
  };

  const selArr = Array.isArray(selected) ? selected : [];
  const optArr = Array.isArray(options) ? options : [];

  const isNas = selArr.includes('nasional') || selArr.length === 0;
  const label = isNas ? '🌏 Nasional (Semua Indonesia)' : `${selArr.length} lokasi dipilih`;
  const grouped = {};
  for (const loc of optArr) {
    if (!loc) continue;
    const g = loc.group || 'Lainnya';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(loc);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: C.bg, border: `1px solid ${open ? C.blue : C.border}`, borderRadius: 8, padding: '11px 12px', fontSize: 14, color: C.text, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: open ? `0 0 0 3px ${C.blue}15` : 'none', transition: 'all .12s' }}>
        <span style={{ fontWeight: isNas ? 400 : 600 }}>{loading ? 'Memuat lokasi...' : label}</span>
        {Ic.chevDown(12)}
      </button>
      {!isNas && selArr.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
          {selArr.map(val => {
            const loc = optArr.find(l => l && l.value === val);
            return (
              <span key={val} style={{ background: C.blueLight, color: C.blue, borderRadius: 16, padding: '3px 8px 3px 10px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {Ic.pin(10)}{loc?.label || val}
                <button onClick={() => toggle(val)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.blue, display: 'flex', padding: 0 }}>{Ic.x(10)}</button>
              </span>
            );
          })}
          <button onClick={() => onChange(['nasional'])} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: '3px 6px', textDecoration: 'underline' }}>Reset</button>
        </div>
      )}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, maxHeight: 300, overflowY: 'auto' }}>
          <div onClick={() => { toggle('nasional'); setOpen(false); }} style={{ padding: '10px 14px', cursor: 'pointer', background: isNas ? C.blueLight : 'transparent', color: isNas ? C.blue : C.text, fontWeight: isNas ? 700 : 400, fontSize: 13, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            {isNas && Ic.check(12)}🌏 Nasional (Semua Indonesia)
          </div>
          {Object.entries(grouped).filter(([g]) => g !== 'nasional').map(([group, locs]) => {
            const isFocus = group === 'Defence Cities' || group === 'Expansion Cities';
            const groupBg  = isFocus ? (group === 'Defence Cities' ? '#FFF7ED' : '#F0FDF4') : C.bgGray;
            const groupClr = isFocus ? (group === 'Defence Cities' ? '#C2410C' : '#15803D') : C.textMuted;
            return (
              <div key={group}>
                <div style={{ padding: '6px 14px 4px', fontSize: 10, fontWeight: 700, color: groupClr, letterSpacing: '.5px', background: groupBg }}>{group.toUpperCase()}</div>
                {locs.filter(l => l && l.value !== 'nasional').map(loc => {
                  const on = selArr.includes(loc.value);
                  return (
                    <div key={loc.value} onClick={() => toggle(loc.value)} style={{ padding: '8px 14px', cursor: 'pointer', background: on ? C.blueLight : 'transparent', fontSize: 13, fontWeight: on ? 600 : 400, display: 'flex', alignItems: 'center', gap: 8, transition: 'background .08s' }}>
                      <span style={{ color: on ? C.blue : 'transparent', flexShrink: 0 }}>{Ic.check(12)}</span>
                      <span style={{ flex: 1, color: on ? C.blue : C.text }}>{loc.label}</span>
                      {loc.province && !on && <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>{loc.province.replace('Jawa ', 'Jawa ').replace('Sumatera ', 'Sum. ')}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocationDropdown;
