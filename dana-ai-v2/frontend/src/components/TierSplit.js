import React from 'react';

const C = {
  blue: '#1A6FE8',
  blueLight: '#EBF2FD',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  bg: '#FFFFFF',
  bgGray: '#F9FAFB',
  bgGray2: '#F3F4F6',
  green: '#059669',
  greenBg: '#ECFDF5',
  greenBorder: '#A7F3D0',
  gold: '#D97706',
  goldBg: '#FFFBEB',
  goldBorder: '#FCD34D',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  purpleBorder: '#DDD6FE',
  red: '#DC2626',
  redBg: '#FEF2F2',
  redBorder: '#FCA5A5',
};

const TIERS = [
  { k: 'nano', l: 'Nano', d: '< 10K', c: C.green, bg: C.greenBg, br: C.greenBorder },
  { k: 'mikro', l: 'Mikro', d: '10K–100K', c: C.blue, bg: C.blueLight, br: `${C.blue}33` },
  { k: 'makro', l: 'Makro', d: '100K–1M', c: C.gold, bg: C.goldBg, br: C.goldBorder },
  { k: 'mega', l: 'Mega', d: '> 1M', c: C.purple, bg: C.purpleBg, br: C.purpleBorder },
];

const TierSplit = ({ mode, split, pref, onMode, onSplit, onPref, numKol }) => {
  const total = Object.values(split).reduce((a, b) => a + (b || 0), 0);
  const valid = Math.abs(total - 100) < 1 || total === 0;
  const upd = (k, v) => onSplit({ ...split, [k]: Math.max(0, Math.min(100, parseInt(v) || 0)) });

  const Ic = {
    check: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    alert: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  };

  return (
    <div style={{ background: C.bgGray, borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[{ v: 'single', l: 'Satu Tier' }, { v: 'split', l: 'Split per Tier' }].map(({ v, l }) => (
          <button key={v} onClick={() => onMode(v)} style={{ flex: 1, background: mode === v ? C.blue : C.bg, border: `1px solid ${mode === v ? C.blue : C.border}`, color: mode === v ? '#fff' : C.textSub, borderRadius: 8, padding: '9px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}>{l}</button>
        ))}
      </div>
      {mode === 'single' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {[{ v: 'semua', l: 'Semua Tier' }, { v: 'nano', l: 'Nano < 10K' }, { v: 'mikro', l: 'Mikro 10K–100K' }, { v: 'makro', l: 'Makro 100K–1M' }, { v: 'mega', l: 'Mega > 1M' }].map(({ v, l }) => {
            const on = pref === v; const t = TIERS.find(x => x.k === v);
            return (
              <button key={v} onClick={() => onPref(v)} style={{ background: on ? (t?.bg || C.blueLight) : C.bg, border: `1.5px solid ${on ? (t?.c || C.blue) : C.border}`, color: on ? (t?.c || C.blue) : C.textSub, borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .12s', gridColumn: v === 'semua' ? '1/-1' : 'auto' }}>{l}</button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: C.textMuted }}>Total harus = 100%. Sisa: <b style={{ color: total > 100 ? C.red : total === 100 ? C.green : C.textSub }}>{100 - total}%</b></div>
          <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', gap: 1 }}>
            {TIERS.map(t => { const p = split[t.k] || 0; if (!p) return null; return <div key={t.k} style={{ width: `${p}%`, background: t.c, transition: 'width .2s' }} />; })}{total < 100 && <div style={{ flex: 1, background: C.bgGray2 }} />}
          </div>
          {TIERS.map(t => {
            const p = split[t.k] || 0; const nK = p ? Math.max(1, Math.round(numKol * p / 100)) : 0;
            return (
              <div key={t.k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.bg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${p ? t.br : C.border}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.c, flexShrink: 0 }} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: p ? t.c : C.textSub }}>{t.l}</div><div style={{ fontSize: 10, color: C.textMuted }}>{t.d}</div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => upd(t.k, p - 10)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bgGray2, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub, fontWeight: 700, fontSize: 16 }}>{"\u2212"}</button>
                  <div style={{ textAlign: 'center', minWidth: 40 }}><div style={{ fontWeight: 800, fontSize: 14, color: p ? t.c : C.textMuted }}>{p}%</div>{p > 0 && <div style={{ fontSize: 10, color: C.textMuted }}>{nK} KOL</div>}</div>
                  <button onClick={() => upd(t.k, p + 10)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bgGray2, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub, fontWeight: 700, fontSize: 16 }}>+</button>
                </div>
              </div>
            );
          })}
          {!valid && total > 0 && <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.red, display: 'flex', alignItems: 'center', gap: 6 }}>{Ic.alert(12)} Total harus tepat 100% (sekarang {total}%)</div>}
          {total === 100 && <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.green, display: 'flex', alignItems: 'center', gap: 6 }}>{Ic.check(12)} Split valid — {numKol} KOL dibagi proporsional</div>}
        </div>
      )}
    </div>
  );
};

export default TierSplit;
