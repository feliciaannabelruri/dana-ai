import { useState, useEffect, useRef } from 'react';

const ACCENT = '#4f8ef7';
const GREEN  = '#22c55e';

/**
 * LocationDropdown — Searchable grouped dropdown
 * Load lokasi dari backend /locations endpoint
 * Grouped by wilayah (Jakarta, Bandung, Semarang, dll)
 */
export default function LocationDropdown({ value, onChange, locations, loading }) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const containerRef          = useRef();
  const searchRef             = useRef();
  const listRef               = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when open
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const selectedLabel = value
    ? (locations.find(l => l.value === value)?.label || value)
    : null;

  // Filter by search
  const filtered = search.trim()
    ? locations.filter(l =>
        l.label.toLowerCase().includes(search.toLowerCase()) ||
        l.group?.toLowerCase().includes(search.toLowerCase())
      )
    : locations;

  // Group filtered items
  const grouped = {};
  for (const loc of filtered) {
    const g = loc.group || 'Lainnya';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(loc);
  }

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  const isNasional = value === 'nasional' || !value;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,.04)',
          border: `1px solid ${open ? ACCENT + '99' : 'rgba(255,255,255,.09)'}`,
          borderRadius: 10,
          color: value ? '#fff' : '#555',
          padding: '11px 14px',
          fontSize: 14,
          fontFamily: 'inherit',
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          transition: 'border-color .2s',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Dot indikator lokasi */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: value
              ? (isNasional ? GREEN : ACCENT)
              : 'rgba(255,255,255,.15)',
          }} />
          <span>
            {loading
              ? 'Memuat lokasi...'
              : selectedLabel || 'Pilih lokasi target...'
            }
          </span>
        </span>
        {/* Chevron */}
        <svg
          width={12} height={12}
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            flexShrink: 0, color: '#555',
            transition: 'transform .2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && !loading && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0, right: 0,
          background: '#0d0d1a',
          border: `1px solid ${ACCENT}44`,
          borderRadius: 12,
          zIndex: 999,
          boxShadow: '0 16px 48px rgba(0,0,0,.7)',
          overflow: 'hidden',
          maxHeight: 340,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Search bar */}
          <div style={{
            padding: '10px 12px',
            borderBottom: '1px solid rgba(255,255,255,.07)',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 8, padding: '7px 10px',
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Cari kota atau wilayah..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#fff', fontSize: 13, fontFamily: 'inherit', flex: 1,
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  background: 'none', border: 'none', color: '#555',
                  cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1,
                }}>✕</button>
              )}
            </div>
          </div>

          {/* List */}
          <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
            {Object.keys(grouped).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontSize: 13 }}>
                Tidak ada lokasi ditemukan
              </div>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  {/* Group header */}
                  <div style={{
                    padding: '8px 14px 4px',
                    color: '#3a3a5a',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    borderTop: '1px solid rgba(255,255,255,.03)',
                  }}>
                    {group}
                  </div>
                  {/* Items */}
                  {items.map(loc => {
                    const isActive = value === loc.value;
                    const isNas    = loc.value === 'nasional';
                    return (
                      <button
                        key={loc.value}
                        type="button"
                        onClick={() => handleSelect(loc.value)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 14px',
                          background: isActive ? ACCENT + '18' : 'transparent',
                          border: 'none',
                          color: isActive ? '#fff' : '#bbb',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          transition: 'background .12s',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,.05)';
                        }}
                        onMouseLeave={e => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                          background: isActive
                            ? (isNas ? GREEN : ACCENT)
                            : 'rgba(255,255,255,.15)',
                        }} />
                        <span style={{ flex: 1 }}>{loc.label}</span>
                        {isActive && (
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                            stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer info */}
          <div style={{
            padding: '8px 14px',
            borderTop: '1px solid rgba(255,255,255,.05)',
            color: '#2a2a4a',
            fontSize: 10,
            flexShrink: 0,
          }}>
            {filtered.length} lokasi tersedia dari database
          </div>
        </div>
      )}
    </div>
  );
}