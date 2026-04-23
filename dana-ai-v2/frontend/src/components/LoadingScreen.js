import React from 'react';

const C = {
  blue: '#1A6FE8',
  text: '#111827',
  textSub: '#6B7280',
  border: '#E5E7EB',
};

const Ic = {
  bolt: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z" /></svg>,
};

const LoadingScreen = ({ msg }) => {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: '0 20px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.blue, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: '#fff' }}>{Ic.bolt(18)}</div>
        <span style={{ fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: '-0.5px' }}>DANA <span style={{ color: C.blue }}>AI</span></span>
      </div>
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${C.border}` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: C.blue, animation: 'spin 0.9s linear infinite' }} />
      </div>
      <p style={{ color: C.textSub, fontSize: 15, animation: 'pulse 1.5s ease infinite', margin: 0, textAlign: 'center', maxWidth: 280 }}>{msg}</p>
    </div>
  );
};

export default LoadingScreen;
