import { useState, useEffect, useRef } from 'react';

const C = {
  blue:      '#1A6FE8',
  blueLight: '#EBF2FD',
  text:      '#111827',
  textSub:   '#6B7280',
  textMuted: '#9CA3AF',
  border:    '#E5E7EB',
  bg:        '#FFFFFF',
  bgGray:    '#F9FAFB',
  bgGray2:   '#F3F4F6',
  green:     '#059669',
};

export default function LocationDropdown({ value, onChange, locations, loading }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const containerRef        = useRef();
  const searchRef           = useRef();

  // Detect mobile for bottom sheet vs dropdown behaviour
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  useEffect(() => {
    const h = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setSearch('');
      }
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, []);

  useEffect(() => {
    if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 80);
    // Prevent body scroll when open on mobile
    if (typeof document !== 'undefined') {
      document.body.style.overflow = open && isMobile ? 'hidden' : '';
    }
    return () => { if (typeof document !== 'undefined') document.body.style.overflow = ''; };
  }, [open, isMobile]);

  const selectedLabel = value
    ? (locations.find(l => l.value === value)?.label || value)
    : null;

  const filtered = search.trim()
    ? locations.filter(l =>
        l.label.toLowerCase().includes(search.toLowerCase()) ||
        l.group?.toLowerCase().includes(search.toLowerCase()))
    : locations;

  const grouped = {};
  for (const loc of filtered) {
    const g = loc.group || 'Lainnya';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(loc);
  }

  const handleSelect = val => { onChange(val); setOpen(false); setSearch(''); };
  const isNas = !value || value === 'nasional';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button type="button" onClick={() => setOpen(o => !o)} disabled={loading}
        style={{
          width: '100%', background: C.bg,
          border: `1px solid ${open ? C.blue : C.border}`,
          borderRadius: 8, color: value ? C.text : C.textMuted,
          padding: '11px 36px 11px 12px', fontSize: 16,
          fontFamily: 'inherit', cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          boxSizing: 'border-box', outline: 'none', textAlign: 'left',
          position: 'relative', WebkitAppearance: 'none',
          transition: 'border-color .15s',
          boxShadow: open ? `0 0 0 3px ${C.blue}15` : 'none',
          touchAction: 'manipulation',
        }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: value ? (isNas ? C.green : C.blue) : C.border }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading ? 'Memuat lokasi...' : selectedLabel || 'Pilih lokasi target...'}
        </span>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', right: 12, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: 'transform .2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Overlay backdrop on mobile */}
      {open && isMobile && (
        <div onClick={() => { setOpen(false); setSearch(''); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 998 }} />
      )}

      {/* Dropdown / Bottom sheet */}
      {open && !loading && (
        <div style={isMobile ? {
          // Bottom sheet on mobile
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: C.bg, borderRadius: '16px 16px 0 0',
          zIndex: 999, boxShadow: '0 -4px 30px rgba(0,0,0,.15)',
          overflow: 'hidden', maxHeight: '75vh',
          display: 'flex', flexDirection: 'column',
        } : {
          // Standard dropdown on desktop
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 10, zIndex: 999,
          boxShadow: '0 8px 24px rgba(0,0,0,.10)',
          overflow: 'hidden', maxHeight: 340,
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Handle bar on mobile */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
            </div>
          )}

          {/* Header on mobile */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px 10px' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Pilih Lokasi</span>
              <button onClick={() => { setOpen(false); setSearch(''); }}
                style={{ background: C.bgGray2, border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}

          {/* Search */}
          <div style={{ padding: isMobile ? '0 16px 8px' : '8px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bgGray, borderRadius: 8, padding: isMobile ? '10px 12px' : '7px 10px' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input ref={searchRef} type="text" placeholder="Cari kota atau wilayah..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', flex: 1, WebkitAppearance: 'none' }} />
              {search && (
                <button onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', touchAction: 'manipulation' }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            {Object.keys(grouped).length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>Tidak ada lokasi ditemukan</div>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <div style={{ padding: isMobile ? '10px 16px 4px' : '8px 12px 3px', color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', borderTop: `1px solid ${C.bgGray2}` }}>
                    {group}
                  </div>
                  {items.map(loc => {
                    const active   = value === loc.value;
                    const locIsNas = loc.value === 'nasional';
                    return (
                      <button key={loc.value} type="button" onClick={() => handleSelect(loc.value)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '13px 16px' : '9px 12px', background: active ? C.blueLight : 'transparent', border: 'none', color: active ? C.blue : C.text, cursor: 'pointer', fontSize: isMobile ? 15 : 13, fontFamily: 'inherit', textAlign: 'left', touchAction: 'manipulation' }}
                        onMouseEnter={e => { if (!active && !isMobile) e.currentTarget.style.background = C.bgGray; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? C.blueLight : 'transparent'; }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: active ? (locIsNas ? C.green : C.blue) : C.border }} />
                        <span style={{ flex: 1 }}>{loc.label}</span>
                        {active && (
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: isMobile ? '10px 16px 20px' : '7px 12px', borderTop: `1px solid ${C.bgGray2}`, color: C.textMuted, fontSize: 11, flexShrink: 0 }}>
            {filtered.length} lokasi tersedia
          </div>
        </div>
      )}
    </div>
  );
}