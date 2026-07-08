import React from 'react';

const C = {
  indigo: '#4F46E5',
  indigoBg: '#EEF2FF',
  indigoBorder: '#C7D2FE',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  bgGray: '#F9FAFB',
};

const GlobalKolBanner = ({ active, onToggle }) => {
  const Ic = {
    globe: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    check: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  };

  return (
    <div
      onClick={onToggle}
      style={{
        cursor: 'pointer',
        background: active ? `linear-gradient(135deg, ${C.indigoBg} 0%, #F5F3FF 100%)` : C.bgGray,
        border: `1.5px solid ${active ? C.indigo : C.border}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
        boxShadow: active ? '0 4px 15px rgba(79, 70, 229, 0.15)' : 'none',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: active ? C.indigo : '#fff',
        color: active ? '#fff' : C.textMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${active ? C.indigo : C.border}`,
        transition: 'all .2s',
        flexShrink: 0,
      }}>
        {active ? Ic.check(18) : Ic.globe(20)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: active ? C.indigo : '#111827' }}>KOL Global</div>
          <span style={{ background: active ? C.indigo : '#E5E7EB', color: active ? '#fff' : C.textSub, fontSize: 9, fontWeight: 900, padding: '1px 5px', borderRadius: 4 }}>BETA</span>
        </div>
        <div style={{ fontSize: 11, color: active ? '#4338CA' : C.textMuted, lineHeight: 1.4 }}>
          {active
            ? 'Cari KOL dari negara pilihan, di luar target lokasi domestik.'
            : 'Aktifkan untuk menargetkan KOL dari luar Indonesia.'}
        </div>
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 12, background: active ? C.indigo : '#D1D5DB',
        position: 'relative', transition: 'background .2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: active ? 23 : 3, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
    </div>
  );
};

export default GlobalKolBanner;
