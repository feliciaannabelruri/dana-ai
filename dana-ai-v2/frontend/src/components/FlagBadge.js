import React, { useState } from 'react';
import { getKolFlags, addKolFlag, updateKolFlag, deleteKolFlag, scanKolNews } from '../services/apiService';

// Severity palette
const SEV = {
  critical: { c: '#B91C1C', bg: '#FEF2F2', br: '#FECACA', label: 'Critical', dot: '🔴' },
  warning:  { c: '#B45309', bg: '#FFFBEB', br: '#FDE68A', label: 'Warning',  dot: '🟡' },
  watch:    { c: '#1D4ED8', bg: '#EFF6FF', br: '#BFDBFE', label: 'Watch',    dot: '🟠' },
  clear:    { c: '#059669', bg: '#ECFDF5', br: '#A7F3D0', label: 'Clear',    dot: '🟢' },
};

const TYPE_LABEL = {
  brand_safety: 'Brand Safety',
  performance:  'Performance',
  relationship: 'Relationship',
  critical:     'Critical',
  competitive:  'Competitive',
};

const TYPE_OPTS = [
  ['brand_safety', 'Brand Safety'],
  ['performance',  'Performance'],
  ['relationship', 'Relationship'],
  ['competitive',  'Competitive Exclusivity'],
  ['critical',     'Critical'],
];
const SEV_OPTS = [['watch', 'Watch'], ['warning', 'Warning'], ['critical', 'Critical']];

const ACTIVE = ['detected', 'reviewed', 'active'];

const ic = {
  flag: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>,
  chev: (s = 11, up) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{up ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}</svg>,
  plus: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  scan: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  x: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

function worstSeverity(flags) {
  const active = flags.filter(f => ACTIVE.includes(f.status));
  if (active.some(f => f.severity === 'critical')) return 'critical';
  if (active.some(f => f.severity === 'warning')) return 'warning';
  if (active.some(f => f.severity === 'watch')) return 'watch';
  return 'clear';
}

export default function FlagBadge({ kol, onPenaltyChange }) {
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState(kol.flags || []);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ type: 'brand_safety', severity: 'watch', reason: '', context: '', detected_by: '' });

  const sev = worstSeverity(flags);
  const S = SEV[sev];
  const activeCount = flags.filter(f => ACTIVE.includes(f.status)).length;

  async function refresh() {
    try {
      const data = await getKolFlags(kol.username);
      setFlags(data.all || []);
      setLoaded(true);
      if (onPenaltyChange && data.bundle) onPenaltyChange(data.bundle.penalty);
    } catch (e) { /* keep current */ }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) refresh();
  }

  async function submitFlag() {
    if (!form.reason.trim()) return;
    setBusy(true);
    try {
      await addKolFlag({
        username: kol.username, source: 'manual', status: 'active',
        type: form.type, severity: form.severity,
        reason: form.reason, context: form.context, detected_by: form.detected_by,
      });
      setForm({ type: 'brand_safety', severity: 'watch', reason: '', context: '', detected_by: '' });
      setFormOpen(false);
      await refresh();
    } catch (e) { setScanMsg(e.message); }
    setBusy(false);
  }

  async function changeStatus(id, status) {
    setBusy(true);
    try { await updateKolFlag(id, status); await refresh(); }
    catch (e) { setScanMsg(e.message); }
    setBusy(false);
  }

  async function removeFlag(id) {
    setBusy(true);
    try { await deleteKolFlag(id); await refresh(); }
    catch (e) { setScanMsg(e.message); }
    setBusy(false);
  }

  async function runNewsScan() {
    setBusy(true); setScanMsg('Mencari di web…');
    try {
      const res = await scanKolNews(kol.username, kol.category || '');
      const r = res.result || {};
      const n = (r.evidence || []).length;
      if (r.search_error) {
        setScanMsg(`Pencarian web error — ${r.search_error}. Cek SERPER_API_KEY di backend.`);
      } else if (r.searched && n === 0) {
        setScanMsg('0 hasil web — coba scan pakai nama lengkap KOL dari dashboard.');
      } else {
        const prefix = r.searched ? `Cek ${n} sumber web. ` : '(tanpa pencarian web) ';
        setScanMsg(prefix + (r.flag_created ? 'Risiko terdeteksi — flag dibuat.'
          : r.risk_found ? 'Indikasi risiko (confidence rendah) — tidak di-flag.'
            : 'Bersih: tidak ada risiko reputasi terdeteksi.'));
      }
      await refresh();
    } catch (e) { setScanMsg(e.message); }
    setBusy(false);
  }

  const sel = { padding: '6px 8px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 12, fontFamily: 'inherit', background: '#fff', color: '#111827' };

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Collapsed header */}
      <button onClick={toggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: S.bg, border: `1px solid ${S.br}`, color: S.c, borderRadius: 8, padding: '8px 11px', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 }}>
          <span style={{ display: 'flex' }}>{ic.flag(13)}</span>
          {sev === 'clear'
            ? 'Risk Intelligence — Clear'
            : `${activeCount} active flag${activeCount > 1 ? 's' : ''} · ${S.label}`}
          {kol.flag_penalty_pct > 0 && <span style={{ fontWeight: 800 }}>(-{kol.flag_penalty_pct}%)</span>}
        </span>
        {ic.chev(11, open)}
      </button>

      {/* Insight summary line */}
      {!open && kol.flag_summary && (
        <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5, padding: '6px 4px 0' }}>⚠️ {kol.flag_summary}</div>
      )}

      {open && (
        <div style={{ border: `1px solid ${S.br}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 10, background: '#fff' }}>
          {/* Flag list */}
          {flags.length === 0 && <div style={{ fontSize: 12, color: '#9CA3AF', padding: '4px 2px 10px' }}>Belum ada flag untuk KOL ini.</div>}
          {flags.map(f => {
            const fs = SEV[f.severity] || SEV.watch;
            const isActive = ACTIVE.includes(f.status);
            return (
              <div key={f.id} style={{ border: `1px solid ${fs.br}`, background: isActive ? fs.bg : '#F9FAFB', borderRadius: 8, padding: 9, marginBottom: 7, opacity: isActive ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: fs.c, color: '#fff', borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{fs.label}</span>
                    <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{f.type_label || TYPE_LABEL[f.type] || f.type}</span>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>· {f.source}{f.status !== 'active' ? ` · ${f.status}` : ''}</span>
                  </span>
                  <button onClick={() => removeFlag(f.id)} disabled={busy} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', padding: 2 }}>{ic.x(12)}</button>
                </div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{f.reason}</div>
                {f.context && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, fontStyle: 'italic' }}>{f.context}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                  {isActive
                    ? <>
                        <MiniBtn onClick={() => changeStatus(f.id, 'dismissed')} disabled={busy} label="Dismiss" />
                        <MiniBtn onClick={() => changeStatus(f.id, 'resolved')} disabled={busy} label="Resolve" />
                      </>
                    : <MiniBtn onClick={() => changeStatus(f.id, 'active')} disabled={busy} label="Re-activate" />}
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 7, marginTop: 4, flexWrap: 'wrap' }}>
            <MiniBtn onClick={() => setFormOpen(o => !o)} disabled={busy} icon={ic.plus(11)} label="Add flag" primary />
            <MiniBtn onClick={runNewsScan} disabled={busy} icon={ic.scan(11)} label="AI news scan (Groq)" />
          </div>
          {scanMsg && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>{scanMsg}</div>}

          {/* Add-flag form */}
          {formOpen && (
            <div style={{ marginTop: 9, padding: 10, background: '#F9FAFB', borderRadius: 8, display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', gap: 7 }}>
                <select style={{ ...sel, flex: 1 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select style={{ ...sel, flex: 1 }} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                  {SEV_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <input style={sel} placeholder="Reason (mis. ghosting mid-campaign)" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              <input style={sel} placeholder="Context — kapan aman / tidak (opsional)" value={form.context} onChange={e => setForm({ ...form, context: e.target.value })} />
              <input style={sel} placeholder="Dilaporkan oleh (opsional)" value={form.detected_by} onChange={e => setForm({ ...form, detected_by: e.target.value })} />
              <div style={{ display: 'flex', gap: 7 }}>
                <MiniBtn onClick={submitFlag} disabled={busy || !form.reason.trim()} label={busy ? 'Saving…' : 'Save flag'} primary />
                <MiniBtn onClick={() => setFormOpen(false)} disabled={busy} label="Cancel" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniBtn({ onClick, disabled, label, icon = null, primary = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
      padding: '6px 10px', borderRadius: 7, cursor: disabled ? 'default' : 'pointer',
      background: primary ? '#1A6FE8' : '#fff', color: primary ? '#fff' : '#374151',
      border: primary ? 'none' : '1px solid #E5E7EB', opacity: disabled ? 0.5 : 1,
    }}>{icon}{label}</button>
  );
}