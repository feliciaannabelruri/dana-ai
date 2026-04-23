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
  const Ic = {
    gift: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>,
    check: (s = 10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  };

  return (
    <div
      onClick={onToggle}
      style={{
        cursor: 'pointer',
        background: active ? `linear-gradient(135deg, ${C.orangeBg} 0%, #FFF1E0 100%)` : C.bgGray,
        border: `1.5px solid ${active ? C.orange : C.border}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
        boxShadow: active ? '0 4px 15px rgba(234, 88, 12, 0.15)' : 'none',
        transform: active ? 'translateY(-1px)' : 'none',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: active ? C.orange : '#fff',
        color: active ? '#fff' : C.textMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${active ? C.orange : C.border}`,
        transition: 'all .2s',
        flexShrink: 0
      }}>
        {active ? Ic.check(18) : Ic.gift(20)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: active ? C.orange : C.text }}>Mode Tier-Only (Barter)</div>
          {active && <span style={{ background: C.orange, color: '#fff', fontSize: 9, fontWeight: 900, padding: '1px 5px', borderRadius: 4 }}>ACTIVE</span>}
        </div>
        <div style={{ fontSize: 11, color: active ? '#9A3412' : C.textMuted, lineHeight: 1.4 }}>
          {active
            ? 'Budget diabaikan. Mencari KOL yang paling cocok untuk barter/kerjasama tanpa biaya (0 budget).'
            : 'Aktifkan jika campaign tidak memiliki budget (barter value/kerjasama gratis).'}
        </div>
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 12, background: active ? C.orange : '#D1D5DB',
        position: 'relative', transition: 'background .2s', flexShrink: 0
      }}>
        <div style={{
          position: 'absolute', top: 3, left: active ? 23 : 3, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)'
        }} />
      </div>
    </div>
  );
};

export default ZeroBudgetBanner;
