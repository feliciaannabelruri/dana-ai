import React from 'react';

const C = {
  orange: '#EA580C',
  orangeBg: '#FFF7ED',
  orangeBorder: '#FED7AA',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  bgGray: '#F9FAFB',
};

const ZeroBudgetBanner = ({ active, onToggle }) => {
  return (
    <div onClick={onToggle} style={{ cursor: 'pointer', background: active ? C.orangeBg : C.bgGray, border: `1.5px solid ${active ? C.orangeBorder : C.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, transition: 'all .15s', userSelect: 'none' }}>
      <div style={{ width: 36, height: 20, borderRadius: 10, background: active ? C.orange : '#D1D5DB', transition: 'background .2s', position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: active ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)', transition: 'left .2s' }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: active ? C.orange : C.textSub }}>Mode Tier-Only (Budget = 0)</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{active ? 'Budget diabaikan — fokus ke tier & kualitas KOL saja' : 'Aktifkan untuk cari KOL tanpa filter budget'}</div>
      </div>
    </div>
  );
};

export default ZeroBudgetBanner;
