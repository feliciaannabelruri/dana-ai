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

function SearchIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function ChevronIcon({ open }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#1A6FE8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function LocationDropdown({ value, onChange, locations, loading }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const containerRef        = useRef();
  const searchRef           = useRef();

  useEffect(() => {
    const h = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setSearch('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

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
  const isNas = value === 'nasional' || !value;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button type="button" onClick={() => setOpen(o => !o)} disabled={loading}
        style={{
          width: '100%', background: C.bg,
          border: `1px solid ${open ? C.blue : C.border}`,
          borderRadius: 8, color: value ? C.text : C.textMuted,
          padding: '10px 36px 10px 12px', fontSize: 14, fontFamily: 'inherit',
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          boxSizing: 'border-box', outline: 'none', textAlign: 'left',
          position: 'relative',
          transition: 'border-color .15s, box-shadow .15s',
          boxShadow: open ? `0 0 0 3px ${C.blue}15` : 'none',
        }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: value ? (isNas ? C.green : C.blue) : C.border }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading ? 'Memuat lokasi...' : selectedLabel || 'Pilih lokasi target...'}
        </span>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* Dropdown */}
      {open && !loading && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 10, zIndex: 999,
          boxShadow: '0 8px 24px rgba(0,0,0,.10)',
          overflow: 'hidden', maxHeight: 340,
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bgGray, borderRadius: 7, padding: '7px 10px' }}>
              <SearchIcon />
              <input ref={searchRef} type="text" placeholder="Cari kota atau wilayah..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 13, fontFamily: 'inherit', flex: 1 }} />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {Object.keys(grouped).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>Tidak ada lokasi ditemukan</div>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <div style={{ padding: '8px 12px 3px', color: C.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', borderTop: `1px solid ${C.bgGray2}` }}>
                    {group}
                  </div>
                  {items.map(loc => {
                    const active  = value === loc.value;
                    const locIsNas = loc.value === 'nasional';
                    return (
                      <button key={loc.value} type="button" onClick={() => handleSelect(loc.value)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: active ? C.blueLight : 'transparent', border: 'none', color: active ? C.blue : C.text, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left', transition: 'background .1s' }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bgGray; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: active ? (locIsNas ? C.green : C.blue) : C.border }} />
                        <span style={{ flex: 1 }}>{loc.label}</span>
                        {active && <CheckIcon />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '7px 12px', borderTop: `1px solid ${C.bgGray2}`, color: C.textMuted, fontSize: 10, flexShrink: 0 }}>
            {filtered.length} lokasi tersedia
          </div>
        </div>
      )}
    </div>
  );
}