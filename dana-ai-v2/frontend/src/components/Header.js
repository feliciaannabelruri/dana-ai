import React from 'react';

const C = {
  blue: '#1A6FE8',
  text: '#111827',
  textSub: '#6B7280',
  border: '#E5E7EB',
  bgGray2: '#F3F4F6',
};

const Header = ({ status, onRefresh }) => {
  const isErr = status?.error;
  const isLoading = status?.status === 'loading';
  const isOk = !isErr && !isLoading;

  return (
    <div style={{
      background: '#fff',
      borderBottom: `1px solid ${C.border}`,
      padding: '0 20px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: C.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.text, letterSpacing: '-0.5px' }}>
            DANA <span style={{ color: C.blue }}>AI</span>
          </div>
          <div style={{ fontSize: 10, color: C.textSub, fontWeight: 700, letterSpacing: '0.5px', marginTop: -2 }}>
            CAMPAIGN PLANNER v3
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: isOk ? '#F0FDF4' : isErr ? '#FEF2F2' : C.bgGray2,
          padding: '4px 10px',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${isOk ? '#BBF7D0' : isErr ? '#FECDD3' : C.border}`
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOk ? '#10B981' : isErr ? '#EF4444' : C.textSub }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: isOk ? '#15803D' : isErr ? '#B91C1C' : C.textSub }}>
            {isOk ? 'System Ready' : isErr ? 'Backend Offline' : 'Connecting...'}
          </span>
        </div>
        <button 
          onClick={onRefresh}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: C.textSub,
            display: 'flex',
            alignItems: 'center',
            padding: 4
          }}
          title="Refresh Status"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Header;
