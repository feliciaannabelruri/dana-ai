/**
 * CampaignToolkit.jsx
 * ===================
 * Drop-in component untuk dana-ai-v2/frontend/src/components/CampaignToolkit.jsx
 *
 * ZERO dependencies tambahan — hanya React (sudah ada di project kamu).
 * ZERO API key — semua pakai localStorage browser.
 *
 * Fitur:
 *  Tab 1 — Budget Tracker  : status per KOL/media, harga deal, catatan, progress bar
 *  Tab 2 — Campaign History : auto-save tiap campaign, compare 2 kampanye, expand detail
 *
 * Cara pakai di App.js (result page):
 *
 *   import CampaignToolkit from './components/CampaignToolkit';
 *
 *   // Taruh tepat setelah blok summary, sebelum section "── KOL ──":
 *   <CampaignToolkit result={result} />
 */

import { useState, useEffect } from 'react';

// ─── Design tokens (sama persis App.js) ───────────────────────────────────────
const C = {
  blue: '#1A6FE8', blueDark: '#1259C4', blueLight: '#EBF2FD',
  text: '#111827', textSub: '#6B7280', textMuted: '#9CA3AF',
  border: '#E5E7EB', bg: '#FFFFFF', bgGray: '#F9FAFB', bgGray2: '#F3F4F6',
  green: '#059669', greenBg: '#ECFDF5', greenBorder: '#A7F3D0',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FCA5A5',
  gold: '#D97706', goldBg: '#FFFBEB', goldBorder: '#FCD34D',
  teal: '#0891B2', tealBg: '#ECFEFF', tealBorder: '#A5F3FC',
  purple: '#7C3AED', purpleBg: '#F5F3FF', purpleBorder: '#DDD6FE',
  orange: '#EA580C', orangeBg: '#FFF7ED', orangeBorder: '#FED7AA',
};

// ─── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (!n || isNaN(n)) return 'Rp –';
  const v = Math.round(n);
  if (v >= 1_000_000_000) return `Rp ${(v / 1e9).toFixed(1).replace(/\.0$/, '')} M`;
  if (v >= 1_000_000)     return `Rp ${(v / 1e6).toFixed(1).replace(/\.0$/, '')} jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

// ─── localStorage helpers ─────────────────────────────────────────────────────
const HISTORY_KEY = 'dana_ai_campaign_history_v2';
const TRACKER_KEY = 'dana_ai_budget_tracker_v2';

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
};
const saveHistory = (h) =>
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 40)));

const loadTracker = (id) => {
  try {
    const all = JSON.parse(localStorage.getItem(TRACKER_KEY) || '{}');
    return all[id] || {};
  } catch { return {}; }
};
const saveTracker = (id, data) => {
  try {
    const all = JSON.parse(localStorage.getItem(TRACKER_KEY) || '{}');
    all[id] = data;
    localStorage.setItem(TRACKER_KEY, JSON.stringify(all));
  } catch {}
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUSES = ['Belum dihubungi', 'Dalam negosiasi', 'Deal', 'Tidak jadi'];
const STATUS_STYLE = {
  'Belum dihubungi': { bg: C.bgGray2,   color: C.textSub, border: C.border       },
  'Dalam negosiasi': { bg: C.goldBg,    color: C.gold,    border: C.goldBorder   },
  'Deal':            { bg: C.greenBg,   color: C.green,   border: C.greenBorder  },
  'Tidak jadi':      { bg: C.redBg,     color: C.red,     border: C.redBorder    },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  tracker: (s = 15) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  history: (s = 15) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4.41"/>
    </svg>
  ),
  check: (s = 13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  trash: (s = 13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
    </svg>
  ),
  chevDown: (s = 11) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  chevUp: (s = 11) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  pin: (s = 11) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  newspaper: (s = 11) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
    </svg>
  ),
  bolt: (s = 13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z"/>
    </svg>
  ),
  compare: (s = 13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
};

// ─── Shared atom ──────────────────────────────────────────────────────────────
function TabBtn({ id, active, onClick, icon, label, badge }) {
  return (
    <button onClick={() => onClick(id)} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 16px', border: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
      borderBottom: `2px solid ${active ? C.blue : 'transparent'}`,
      background: 'transparent',
      color: active ? C.blue : C.textSub,
      transition: 'color .15s',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: active ? C.blue : C.textMuted, display: 'flex' }}>{icon}</span>
      {label}
      {badge != null && (
        <span style={{
          background: active ? C.blue : C.bgGray2,
          color: active ? '#fff' : C.textSub,
          borderRadius: 20, padding: '1px 7px',
          fontSize: 11, fontWeight: 700,
        }}>{badge}</span>
      )}
    </button>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '.6px', marginBottom: 5 }}>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — BUDGET TRACKER
// ══════════════════════════════════════════════════════════════════════════════
function TrackerTab({ result }) {
  // Build a stable campaign ID from name + location
  const campaignId = `${result?.campaign_name || 'unknown'}_${result?.target_location || 'id'}`
    .replace(/\s+/g, '_').toLowerCase();

  const kols  = result?.recommended_kol || [];
  const media = result?.homeless_media?.recommended_media || [];
  const allItems = [
    ...kols.map((k) => ({ ...k, _type: 'kol' })),
    ...media.map((m) => ({ ...m, _type: 'media' })),
  ];

  const [tracker, setTracker] = useState(() => loadTracker(campaignId));

  const update = (username, field, value) => {
    const next = { ...tracker, [username]: { ...(tracker[username] || {}), [field]: value } };
    setTracker(next);
    saveTracker(campaignId, next);
  };

  // ── Aggregates ──────────────────────────────────────────────────────────────
  const deals = allItems.filter((i) => tracker[i.username]?.status === 'Deal');
  const dealCost = deals.reduce((sum, i) => {
    const agreed = parseFloat(tracker[i.username]?.agreed_rate || 0);
    return sum + (agreed > 0 ? agreed : i.rate_min || 0);
  }, 0);
  const budgetTotal  = result?.budget_total || 0;
  const remaining    = budgetTotal - dealCost;
  const pctSpent     = budgetTotal > 0 ? Math.min((dealCost / budgetTotal) * 100, 100) : 0;
  const isOverBudget = budgetTotal > 0 && dealCost > budgetTotal;

  const statusCount = {};
  STATUSES.forEach((s) => {
    statusCount[s] = allItems.filter(
      (i) => (tracker[i.username]?.status || 'Belum dihubungi') === s
    ).length;
  });

  if (allItems.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
        Tidak ada KOL atau media di hasil ini.
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>

      {/* ── Summary card ── */}
      <div style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '16px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          {/* Left: spend number */}
          <div>
            <Label>TOTAL DEAL TERKONFIRMASI</Label>
            <div style={{ fontSize: 26, fontWeight: 800, color: isOverBudget ? C.red : C.text, letterSpacing: '-0.5px' }}>
              {fmt(dealCost)}
            </div>
            {budgetTotal > 0 && (
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
                dari budget {fmt(budgetTotal)} ·{' '}
                <span style={{ fontWeight: 700, color: isOverBudget ? C.red : C.green }}>
                  {isOverBudget ? `⚠ over ${fmt(dealCost - budgetTotal)}` : `sisa ${fmt(remaining)}`}
                </span>
              </div>
            )}
          </div>

          {/* Right: status pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map((s) => {
              const st = STATUS_STYLE[s];
              return (
                <div key={s} style={{
                  background: st.bg, border: `1px solid ${st.border}`, color: st.color,
                  borderRadius: 8, padding: '6px 10px', textAlign: 'center', minWidth: 68,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{statusCount[s]}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3 }}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        {budgetTotal > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>Progress budget</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: isOverBudget ? C.red : C.textSub }}>
                {Math.round(pctSpent)}%
              </span>
            </div>
            <div style={{ height: 7, background: C.bgGray2, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${pctSpent}%`, height: '100%', borderRadius: 4,
                background: pctSpent >= 100 ? C.red : pctSpent >= 80 ? C.gold : C.green,
                transition: 'width .6s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Per-item rows ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allItems.map((item) => {
          const t   = tracker[item.username] || {};
          const st  = STATUS_STYLE[t.status || 'Belum dihubungi'];
          const isDeal    = (t.status || 'Belum dihubungi') === 'Deal';
          const agreedNum = parseFloat(t.agreed_rate || 0);
          const savings   = item.rate_min && agreedNum > 0 ? item.rate_min - agreedNum : 0;
          const isMedia   = item._type === 'media';

          return (
            <div key={item.username} style={{
              background: C.bg, border: `1px solid ${isDeal ? C.greenBorder : C.border}`,
              borderRadius: 10, padding: '14px',
              boxShadow: isDeal ? `0 0 0 3px ${C.green}12` : 'none',
            }}>

              {/* Item header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ color: isMedia ? C.teal : C.textMuted, display: 'flex' }}>
                      {isMedia ? Ic.newspaper(12) : Ic.bolt(12)}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>@{item.username}</span>
                    <span style={{ background: isMedia ? C.tealBg : C.bgGray2, color: isMedia ? C.teal : C.textSub, borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600 }}>
                      {isMedia ? 'Media' : item.social_media}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {item.category} · Est. {fmt(item.rate_min)}
                    {item.rate_max > item.rate_min && ` – ${fmt(item.rate_max)}`}
                  </div>
                </div>

                {/* Status dropdown */}
                <select
                  value={t.status || 'Belum dihubungi'}
                  onChange={(e) => update(item.username, 'status', e.target.value)}
                  style={{
                    background: st.bg, border: `1px solid ${st.border}`, color: st.color,
                    borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                    fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                    WebkitAppearance: 'none', appearance: 'none',
                  }}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Input fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <Label>HARGA DEAL (Rp)</Label>
                  <input
                    type="number"
                    placeholder={item.rate_min || 'Masukkan harga...'}
                    value={t.agreed_rate || ''}
                    onChange={(e) => update(item.username, 'agreed_rate', e.target.value)}
                    style={{
                      border: `1px solid ${C.border}`, borderRadius: 8,
                      padding: '9px 11px', fontSize: 14, fontFamily: 'inherit',
                      width: '100%', boxSizing: 'border-box',
                      background: C.bgGray, color: C.text, outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <Label>CATATAN</Label>
                  <input
                    type="text"
                    placeholder="Revisi, deadline, syarat..."
                    value={t.note || ''}
                    onChange={(e) => update(item.username, 'note', e.target.value)}
                    style={{
                      border: `1px solid ${C.border}`, borderRadius: 8,
                      padding: '9px 11px', fontSize: 14, fontFamily: 'inherit',
                      width: '100%', boxSizing: 'border-box',
                      background: C.bgGray, color: C.text, outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Deal confirmed banner */}
              {isDeal && agreedNum > 0 && (
                <div style={{
                  marginTop: 10, background: C.greenBg, border: `1px solid ${C.greenBorder}`,
                  borderRadius: 8, padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ color: C.green, display: 'flex' }}>{Ic.check(13)}</span>
                  <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>
                    Deal {fmt(agreedNum)}
                    {savings > 0 && (
                      <span style={{ fontWeight: 400, opacity: .8 }}> · hemat {fmt(savings)} dari estimasi</span>
                    )}
                  </span>
                </div>
              )}

              {/* Note display */}
              {t.note && (
                <div style={{ marginTop: 8, fontSize: 12, color: C.textSub, fontStyle: 'italic' }}>
                  📝 {t.note}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: C.textMuted, textAlign: 'center' }}>
        Tersimpan otomatis di browser ini · tidak dikirim ke server
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — CAMPAIGN HISTORY
// ══════════════════════════════════════════════════════════════════════════════
function HistoryTab({ currentResult }) {
  const [history,   setHistory]   = useState([]);
  const [comparing, setComparing] = useState(null);
  const [expanded,  setExpanded]  = useState(null);

  // Auto-save current result on mount
  useEffect(() => {
    const h = loadHistory();
    setHistory(h);

    if (!currentResult?.campaign_name) return;

    // Don't duplicate if last save was same campaign (same name + location)
    const last = h[0];
    const isDuplicate =
      last &&
      last.campaign_name === currentResult.campaign_name &&
      last.target_location === currentResult.target_location;

    if (!isDuplicate) {
      const entry = {
        id:                 Date.now(),
        savedAt:            new Date().toISOString(),
        campaign_name:      currentResult.campaign_name,
        total_kol:          currentResult.total_kol || 0,
        avg_match_score:    currentResult.avg_match_score || 0,
        budget_total:       currentResult.budget_total || 0,
        estimated_cost_min: currentResult.estimated_cost_min || 0,
        estimated_cost_max: currentResult.estimated_cost_max || 0,
        target_location:    currentResult.target_location || 'nasional',
        kol_names:          (currentResult.recommended_kol || []).slice(0, 6).map((k) => k.username),
        media_count:        currentResult.homeless_media?.total_media || 0,
        goals:              currentResult.goals || '',
        topics:             currentResult.topics || '',
      };
      const updated = [entry, ...h];
      saveHistory(updated);
      setHistory(updated);
    }
  }, [currentResult]);

  const deleteEntry = (id) => {
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
    setHistory(updated);
    if (comparing?.id === id) setComparing(null);
  };

  const clearAll = () => {
    if (!window.confirm('Hapus semua history campaign?')) return;
    saveHistory([]);
    setHistory([]);
    setComparing(null);
  };

  // Score color helper
  const scoreColor = (s) => s >= 70 ? C.green : s >= 40 ? C.gold : C.textSub;

  return (
    <div style={{ padding: '20px 0' }}>

      {/* Compare banner */}
      {comparing && (
        <div style={{
          background: C.purpleBg, border: `1px solid ${C.purpleBorder}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ color: C.purple, fontSize: 11, fontWeight: 700 }}>MEMBANDINGKAN</span>
          <span style={{ color: C.purple, fontSize: 13, fontWeight: 700 }}>{comparing.campaign_name}</span>
          <span style={{ color: C.textMuted, fontSize: 12 }}>vs campaign sekarang</span>
          <button onClick={() => setComparing(null)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: C.purple, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
          }}>Tutup ✕</button>
        </div>
      )}

      {history.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: C.textMuted }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Belum ada history</div>
          <div style={{ fontSize: 13 }}>Campaign yang kamu generate tersimpan otomatis di sini.</div>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>{history.length} campaign tersimpan</span>
            <button onClick={clearAll} style={{
              background: 'none', border: `1px solid ${C.border}`,
              color: C.textMuted, borderRadius: 7, padding: '5px 10px',
              cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {Ic.trash(11)} Hapus semua
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((entry, i) => {
              const isCurrent  = i === 0;
              const isCmp      = comparing?.id === entry.id;
              const isExpanded = expanded === entry.id;

              // Delta vs comparing entry
              const curScore = currentResult?.avg_match_score || 0;
              const curCost  = currentResult?.estimated_cost_min || 0;
              const scoreDelta = comparing && !isCmp ? (curScore - comparing.avg_match_score) : null;
              const costDelta  = comparing && !isCmp ? (curCost  - comparing.estimated_cost_min) : null;

              return (
                <div key={entry.id} style={{
                  background: C.bg,
                  border: `1px solid ${isCmp ? C.purple : isCurrent ? C.blue : C.border}`,
                  borderRadius: 10, overflow: 'hidden',
                  boxShadow: isCurrent ? `0 0 0 3px ${C.blue}15` : isCmp ? `0 0 0 3px ${C.purple}15` : 'none',
                }}>
                  <div style={{ padding: '14px 16px' }}>

                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          {isCurrent && (
                            <span style={{ background: C.blueLight, color: C.blue, borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                              SEKARANG
                            </span>
                          )}
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.campaign_name}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                          {Ic.pin(10)}
                          {entry.target_location} · {fmtDate(entry.savedAt)}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        {!isCurrent && (
                          <button
                            onClick={() => setComparing(isCmp ? null : entry)}
                            style={{
                              background: isCmp ? C.purple : C.bgGray2,
                              border: `1px solid ${isCmp ? C.purple : C.border}`,
                              color: isCmp ? '#fff' : C.textSub,
                              borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
                              fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            {Ic.compare(11)} {isCmp ? 'Aktif' : 'Bandingkan'}
                          </button>
                        )}
                        <button
                          onClick={() => setExpanded(isExpanded ? null : entry.id)}
                          style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textSub, borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}>
                          {isExpanded ? Ic.chevUp(11) : Ic.chevDown(11)}
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}>
                          {Ic.trash(11)}
                        </button>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[
                        {
                          label: 'Match avg',
                          value: `${entry.avg_match_score}%`,
                          color: scoreColor(entry.avg_match_score),
                          delta: scoreDelta != null ? `${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(1)}% sekarang` : null,
                          deltaColor: scoreDelta > 0 ? C.green : C.red,
                        },
                        {
                          label: 'KOL',
                          value: entry.total_kol,
                          color: C.text,
                          delta: null,
                        },
                        {
                          label: 'Est. biaya',
                          value: fmt(entry.estimated_cost_min),
                          color: C.gold,
                          delta: costDelta != null ? `${fmt(Math.abs(costDelta))} ${costDelta < 0 ? '↓ lebih hemat' : '↑ lebih mahal'}` : null,
                          deltaColor: costDelta < 0 ? C.green : C.red,
                        },
                      ].map((s) => (
                        <div key={s.label} style={{ background: C.bgGray, borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
                          <div style={{ color: s.color, fontWeight: 700, fontSize: 13 }}>{s.value}</div>
                          {s.delta && (
                            <div style={{ color: s.deltaColor, fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                              {s.delta}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Expanded KOL list */}
                    {isExpanded && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                        {entry.kol_names?.length > 0 && (
                          <>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, marginBottom: 7 }}>KOL YANG DIPILIH</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {entry.kol_names.map((n) => (
                                <span key={n} style={{ background: C.bgGray2, borderRadius: 20, padding: '3px 10px', fontSize: 12, color: C.textSub }}>
                                  @{n}
                                </span>
                              ))}
                              {entry.media_count > 0 && (
                                <span style={{ background: C.tealBg, color: C.teal, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                                  +{entry.media_count} media
                                </span>
                              )}
                            </div>
                          </>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                          {entry.budget_total > 0 && (
                            <div style={{ background: C.bgGray, borderRadius: 8, padding: '8px 10px' }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 2 }}>BUDGET</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmt(entry.budget_total)}</div>
                            </div>
                          )}
                          {entry.estimated_cost_max > entry.estimated_cost_min && (
                            <div style={{ background: C.bgGray, borderRadius: 8, padding: '8px 10px' }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 2 }}>EST. MAX</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>{fmt(entry.estimated_cost_max)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function CampaignToolkit({ result }) {
  const [tab, setTab] = useState('tracker');

  const kolCount  = (result?.recommended_kol?.length || 0) + (result?.homeless_media?.recommended_media?.length || 0);
  const histCount = loadHistory().length;

  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      marginBottom: 28,
      overflow: 'hidden',
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>
      <style>{`
        @keyframes tkFadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0 }
        input[type=number] { -moz-appearance:textfield }
      `}</style>

      {/* ── Toolbar header ── */}
      <div style={{ padding: '16px 20px 0', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            {Ic.bolt(13)}
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: C.text, letterSpacing: '-0.3px' }}>
            Campaign Toolkit
          </span>
        </div>

        <div style={{ display: 'flex', overflow: 'auto' }}>
          <TabBtn
            id="tracker" active={tab === 'tracker'} onClick={setTab}
            icon={Ic.tracker(14)} label="Budget Tracker" badge={kolCount}
          />
          <TabBtn
            id="history" active={tab === 'history'} onClick={setTab}
            icon={Ic.history(14)} label="History" badge={histCount}
          />
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: '0 20px' }}>
        {tab === 'tracker' && <TrackerTab result={result} />}
        {tab === 'history' && <HistoryTab currentResult={result} />}
      </div>
    </div>
  );
}