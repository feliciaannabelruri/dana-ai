import React, { useState, useEffect, useMemo } from 'react';
import { C } from './common/Atoms';
import { getAllFlags, scanErAnomalies, updateKolFlag, deleteKolFlag } from '../services/apiService';

const SEV = {
  critical: { c: '#B91C1C', bg: '#FEF2F2', br: '#FECACA', label: 'Critical' },
  warning:  { c: '#B45309', bg: '#FFFBEB', br: '#FDE68A', label: 'Warning' },
  watch:    { c: '#1D4ED8', bg: '#EFF6FF', br: '#BFDBFE', label: 'Watch' },
  clear:    { c: '#059669', bg: '#ECFDF5', br: '#A7F3D0', label: 'Clear' },
};
const ACTIVE = ['detected', 'reviewed', 'active'];
const SEV_RANK = { critical: 3, warning: 2, watch: 1, clear: 0 };

const ic = {
  flag: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>,
  scan: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  refresh: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>,
  back: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  x: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  chev: (s = 11, up) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{up ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}</svg>,
};

function worst(flags) {
  const a = flags.filter(f => ACTIVE.includes(f.status));
  if (a.some(f => f.severity === 'critical')) return 'critical';
  if (a.some(f => f.severity === 'warning')) return 'warning';
  if (a.some(f => f.severity === 'watch')) return 'watch';
  return 'clear';
}

export default function FlagDashboard({ onBack, isMobile }) {
  const [raw, setRaw] = useState({});       // { username: [flags] }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');
  const [sevFilter, setSevFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [openUser, setOpenUser] = useState(null);

  async function refresh() {
    setLoading(true);
    try { setRaw(await getAllFlags()); }
    catch (e) { setMsg(e.message); }
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  async function runErScan() {
    setBusy(true); setMsg('Scanning ER anomalies…');
    try {
      const res = await scanErAnomalies();
      setMsg(`ER scan selesai — ${res.created} flag dibuat/diperbarui.`);
      await refresh();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  async function changeStatus(id, status) {
    setBusy(true);
    try { await updateKolFlag(id, status); await refresh(); }
    catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  async function removeFlag(id) {
    setBusy(true);
    try { await deleteKolFlag(id); await refresh(); }
    catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  // Build per-KOL rows
  const rows = useMemo(() => {
    const out = [];
    for (const [username, flags] of Object.entries(raw || {})) {
      if (!flags || !flags.length) continue;
      const visible = showInactive ? flags : flags.filter(f => ACTIVE.includes(f.status));
      if (!visible.length) continue;
      const sev = worst(flags);
      if (sevFilter !== 'all' && sev !== sevFilter) continue;
      if (query && !username.toLowerCase().includes(query.toLowerCase())) continue;
      out.push({ username, flags: visible, sev, activeCount: flags.filter(f => ACTIVE.includes(f.status)).length });
    }
    out.sort((a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev] || b.activeCount - a.activeCount);
    return out;
  }, [raw, query, sevFilter, showInactive]);

  // Summary stats (active only)
  const stats = useMemo(() => {
    let kols = 0, crit = 0, warn = 0, watch = 0;
    for (const flags of Object.values(raw || {})) {
      const a = (flags || []).filter(f => ACTIVE.includes(f.status));
      if (!a.length) continue;
      kols += 1;
      crit += a.filter(f => f.severity === 'critical').length;
      warn += a.filter(f => f.severity === 'warning').length;
      watch += a.filter(f => f.severity === 'watch').length;
    }
    return { kols, crit, warn, watch };
  }, [raw]);

  const btn = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', padding: '9px 14px', borderRadius: 9, cursor: busy ? 'default' : 'pointer', border: 'none', opacity: busy ? 0.6 : 1, ...extra });

  return (
    <div className="fu">
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} style={{ ...btn({ background: '#fff', color: C.textSub, border: `1px solid ${C.border}` }) }}>{ic.back(14)} Kembali</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refresh} disabled={busy} style={btn({ background: '#fff', color: C.textSub, border: `1px solid ${C.border}` })}>{ic.refresh(13)}{!isMobile && ' Refresh'}</button>
          <button onClick={runErScan} disabled={busy} style={btn({ background: C.blue, color: '#fff' })}>{ic.scan(13)} Run ER Scan</button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.6px' }}>Risk Intelligence Dashboard</h1>
        <p style={{ color: C.textSub, fontSize: 14, margin: 0 }}>Pantau red flag KOL lintas campaign — brand safety, performance, relationship & competitive.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <Stat label="KOL Flagged" value={stats.kols} color={C.text} />
        <Stat label="Critical" value={stats.crit} color={SEV.critical.c} />
        <Stat label="Warning" value={stats.warn} color={SEV.warning.c} />
        <Stat label="Watch" value={stats.watch} color={SEV.watch.c} />
      </div>

      {msg && <div style={{ background: C.blueLight, color: C.blue, borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 14 }}>{msg}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari username…" style={{ flex: '1 1 160px', minWidth: 120, padding: '9px 12px', borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit' }} />
        {['all', 'critical', 'warning', 'watch'].map(s => {
          const on = sevFilter === s;
          const col = s === 'all' ? C.blue : SEV[s].c;
          return <button key={s} onClick={() => setSevFilter(s)} style={{ padding: '8px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', border: `1px solid ${on ? col : C.border}`, background: on ? col : '#fff', color: on ? '#fff' : C.textSub, textTransform: 'capitalize' }}>{s}</button>;
        })}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSub, cursor: 'pointer' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Tampilkan dismissed/resolved
        </label>
      </div>

      {/* Rows */}
      {loading ? (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 40, fontSize: 14 }}>Memuat flags…</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: SEV.clear.c }}>{ic.flag(28)}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Tidak ada flag</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Coba "Run ER Scan" atau tambahkan flag manual dari kartu KOL di hasil rekomendasi.</div>
        </div>
      ) : rows.map(row => {
        const s = SEV[row.sev];
        const isOpen = openUser === row.username;
        return (
          <div key={row.username} style={{ border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden', background: '#fff' }}>
            <button onClick={() => setOpenUser(isOpen ? null : row.username)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'none', border: 'none', padding: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.c, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{row.username}</span>
                <span style={{ background: s.bg, color: s.c, border: `1px solid ${s.br}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{row.activeCount} active · {s.label}</span>
              </span>
              {ic.chev(12, isOpen)}
            </button>
            {isOpen && (
              <div style={{ padding: '0 14px 14px' }}>
                {row.flags.map(f => {
                  const fs = SEV[f.severity] || SEV.watch;
                  const active = ACTIVE.includes(f.status);
                  return (
                    <div key={f.id} style={{ border: `1px solid ${fs.br}`, background: active ? fs.bg : C.bgGray, borderRadius: 9, padding: 10, marginBottom: 8, opacity: active ? 1 : 0.65 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ background: fs.c, color: '#fff', borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{fs.label}</span>
                          <span style={{ fontSize: 11, color: C.textSub, fontWeight: 600 }}>{f.type_label || f.type}</span>
                          <span style={{ fontSize: 10, color: C.textMuted }}>· {f.source}{f.status !== 'active' ? ` · ${f.status}` : ''}{f.detected_by ? ` · ${f.detected_by}` : ''}</span>
                        </span>
                        <button onClick={() => removeFlag(f.id)} disabled={busy} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', display: 'flex', padding: 2 }}>{ic.x(12)}</button>
                      </div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{f.reason}</div>
                      {f.context && <div style={{ fontSize: 11, color: C.textSub, marginTop: 3, fontStyle: 'italic' }}>{f.context}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {active ? <>
                          <Mini onClick={() => changeStatus(f.id, 'dismissed')} disabled={busy} label="Dismiss" />
                          <Mini onClick={() => changeStatus(f.id, 'resolved')} disabled={busy} label="Resolve" />
                        </> : <Mini onClick={() => changeStatus(f.id, 'active')} disabled={busy} label="Re-activate" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.4px', marginTop: 4, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function Mini({ onClick, disabled, label }) {
  return <button onClick={onClick} disabled={disabled} style={{ fontSize: 11, fontWeight: 600, fontFamily: 'inherit', padding: '5px 10px', borderRadius: 7, cursor: disabled ? 'default' : 'pointer', background: '#fff', color: C.textSub, border: `1px solid ${C.border}`, opacity: disabled ? 0.5 : 1 }}>{label}</button>;
}