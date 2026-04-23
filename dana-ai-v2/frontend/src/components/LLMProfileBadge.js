/**
 * LLMProfileBadge.jsx
 * ====================
 * Drop-in component untuk KOL Card dan Homeless Media Card.
 * Menampilkan:
 *  - Go/No-Go badge dari LLM verdict
 *  - Audience profile (siapa yang nonton)
 *  - Cross-niche angle (kenapa bisa cocok walau bukan finance KOL)
 *  - DANA use cases yang relevan untuk audiens ini
 *  - Risk flag kalau ada
 *
 * Cara pakai di KOLCard (App.js):
 *   import LLMProfileBadge from './components/LLMProfileBadge';
 *
 *   // Taruh setelah blok reasoning, sebelum score_detail toggle:
 *   {kol.llm_profile && kol.llm_profile.summary && (
 *     <LLMProfileBadge profile={kol.llm_profile} matchScore={kol.match_score} />
 *   )}
 */

import { useState } from 'react';

const C = {
  blue:        '#1A6FE8',
  blueLight:   '#EBF2FD',
  text:        '#111827',
  textSub:     '#6B7280',
  textMuted:   '#9CA3AF',
  border:      '#E5E7EB',
  bg:          '#FFFFFF',
  bgGray:      '#F9FAFB',
  bgGray2:     '#F3F4F6',
  green:       '#059669',
  greenBg:     '#ECFDF5',
  greenBorder: '#A7F3D0',
  red:         '#DC2626',
  redBg:       '#FEF2F2',
  redBorder:   '#FCA5A5',
  gold:        '#D97706',
  goldBg:      '#FFFBEB',
  goldBorder:  '#FCD34D',
  purple:      '#7C3AED',
  purpleBg:    '#F5F3FF',
  purpleBorder:'#DDD6FE',
  teal:        '#0891B2',
  tealBg:      '#ECFEFF',
  tealBorder:  '#A5F3FC',
};

const Icon = {
  check:  (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x:      (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  alert:  (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  users:  (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  link2:  (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  bolt:   (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z"/></svg>,
  chevDown: (s=10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevUp:   (s=10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
};

// ── Go/No-Go badge ─────────────────────────────────────────────────────────
function GoNoBadge({ verdict }) {
  if (!verdict || verdict === 'UNKNOWN') return null;

  const styles = {
    'GO':     { bg: C.greenBg,  border: C.greenBorder, color: C.green,  icon: Icon.check, label: 'GO' },
    'NO-GO':  { bg: C.redBg,    border: C.redBorder,   color: C.red,    icon: Icon.x,     label: 'NO-GO' },
    'REVIEW': { bg: C.goldBg,   border: C.goldBorder,  color: C.gold,   icon: Icon.alert, label: 'REVIEW' },
  };

  const s = styles[verdict] || styles['REVIEW'];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ display: 'flex' }}>{s.icon(10)}</span>
      {s.label}
    </span>
  );
}

// ── DANA use case pills ────────────────────────────────────────────────────
function DanaFeaturePill({ label }) {
  // Map backend value ke label yang lebih readable
  const MAP = {
    'transfer-gratis':      'Transfer gratis',
    'transfer':             'Transfer',
    'transfer-uang':        'Transfer uang',
    'transfer-uang-saku':   'Transfer uang saku',
    'bayar-tagihan':        'Bayar tagihan',
    'bayar-sekolah':        'Bayar sekolah',
    'bayar-merchant':       'Bayar merchant',
    'bayar-BPJS':           'Bayar BPJS',
    'bayar-delivery':       'Bayar delivery',
    'bayar-kos':            'Bayar kos',
    'bayar-biaya-kuliah':   'Biaya kuliah',
    'cashback':             'Cashback',
    'cashback-belanja':     'Cashback belanja',
    'cashback-kuliner':     'Cashback kuliner',
    'belanja-online':       'Belanja online',
    'top-up':               'Top-up',
    'top-up-game':          'Top-up game',
    'QRIS':                 'QRIS',
    'QRIS-merchant':        'QRIS merchant',
    'cicilan':              'Cicilan',
    'literasi-keuangan':    'Literasi keuangan',
    'brand-awareness':      'Brand awareness',
    'beli-tiket':           'Beli tiket',
    'booking-hotel':        'Booking hotel',
    'terima-gaji':          'Terima gaji',
    'terima-pembayaran':    'Terima pembayaran',
    'transfer-bisnis':      'Transfer bisnis',
    'transfer-ke-teman':    'Transfer ke teman',
  };

  const displayLabel = MAP[label] || label.replace(/-/g, ' ');

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: C.blueLight, color: C.blue,
      borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600,
    }}>
      <span style={{ display: 'flex' }}>{Icon.bolt(8)}</span>
      {displayLabel}
    </span>
  );
}

// ── Audience segment pills ─────────────────────────────────────────────────
function AudiencePill({ label }) {
  const MAP = {
    'ibu-RT':                   '👩‍👧 Ibu RT',
    'millennial_pekerja':       '💼 Pekerja',
    'gen_z':                    '📱 Gen Z',
    'pelajar_mahasiswa':        '🎓 Mahasiswa',
    'umkm_entrepreneur':        '🏪 UMKM',
    'income_menengah_atas':     '💎 Premium',
    'urban-millennial':         '🏙 Urban',
    'keluarga':                 '👨‍👩‍👧 Keluarga',
    'pekerja-produktif':        '💼 Produktif',
    'perempuan-urban':          '👩 Perempuan urban',
    'cashless-merchant':        '💳 Cashless',
    'semua-umur':               '🌐 Semua umur',
  };

  const display = MAP[label] || label.replace(/-/g, ' ').replace(/_/g, ' ');

  return (
    <span style={{
      display: 'inline-block',
      background: C.purpleBg, color: C.purple,
      border: `1px solid ${C.purpleBorder}`,
      borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600,
    }}>
      {display}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function LLMProfileBadge({ profile, matchScore = 0 }) {
  const [expanded, setExpanded] = useState(false);

  if (!profile) return null;

  const verdict     = profile.go_no_go || 'UNKNOWN';
  const summary     = profile.summary || '';
  const audience    = profile.audience_profile || '';
  const crossAngle  = profile.cross_niche_angle || '';
  const danaUses    = profile.dana_use_cases || profile.cross_topics || [];
  const danaSegs    = profile.audience_dana_overlap || profile.audience_overlap || [];
  const riskFlag    = profile.risk_flag || '';
  const fitReason   = profile.fit_reason || profile.campaign_fit_reason || '';

  const hasContent  = summary || audience || crossAngle || danaUses.length > 0 || riskFlag;
  if (!hasContent) return null;

  const isNoGo = verdict === 'NO-GO';
  const isGo   = verdict === 'GO';

  return (
    <div style={{
      border: `1px solid ${isNoGo ? C.redBorder : isGo ? C.greenBorder : C.purpleBorder}`,
      borderRadius: 10, overflow: 'hidden', marginBottom: 10,
      background: isNoGo ? C.redBg : isGo ? C.greenBg : C.purpleBg,
    }}>
      {/* Header row — selalu tampil */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', cursor: 'pointer',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {/* AI label */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: C.purple, color: '#fff',
            borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700,
            flexShrink: 0,
          }}>
            {Icon.bolt(9)} AI
          </span>

          {/* Go/No-go badge */}
          <GoNoBadge verdict={verdict} />

          {/* Summary snippet */}
          {summary && (
            <span style={{
              fontSize: 12, color: isNoGo ? C.red : isGo ? C.green : C.purple,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: 500,
            }}>
              {summary.replace(/^(GO|NO-GO|REVIEW):\s*/i, '').slice(0, 60)}
              {summary.length > 60 ? '...' : ''}
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <span style={{ color: C.purple, display: 'flex', flexShrink: 0 }}>
          {expanded ? Icon.chevUp(10) : Icon.chevDown(10)}
        </span>
      </div>

      {/* Risk flag — tampil langsung kalau ada (penting!) */}
      {riskFlag && (
        <div style={{
          margin: '0 12px 10px',
          display: 'flex', alignItems: 'flex-start', gap: 6,
          background: C.redBg, border: `1px solid ${C.redBorder}`,
          borderRadius: 7, padding: '7px 10px',
        }}>
          <span style={{ color: C.red, flexShrink: 0, marginTop: 1 }}>{Icon.alert(11)}</span>
          <span style={{ color: C.red, fontSize: 11, lineHeight: 1.5, fontWeight: 600 }}>
            ⚠ {riskFlag}
          </span>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Divider */}
          <div style={{ height: 1, background: isNoGo ? C.redBorder : isGo ? C.greenBorder : C.purpleBorder, opacity: 0.4 }}/>

          {/* Audience profile */}
          {audience && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <span style={{ color: C.purple, display: 'flex' }}>{Icon.users(11)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.purple, letterSpacing: '.5px' }}>
                  AUDIENCE
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
                {audience}
              </p>
            </div>
          )}

          {/* DANA audience segments */}
          {danaSegs.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.purple, letterSpacing: '.5px', marginBottom: 5 }}>
                SEGMENT DANA
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {danaSegs.map((seg, i) => <AudiencePill key={i} label={seg} />)}
              </div>
            </div>
          )}

          {/* Cross-niche angle */}
          {crossAngle && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <span style={{ color: C.teal, display: 'flex' }}>{Icon.link2(11)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: '.5px' }}>
                  CROSS-NICHE ANGLE
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
                {crossAngle}
              </p>
            </div>
          )}

          {/* DANA use cases */}
          {danaUses.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: '.5px', marginBottom: 5 }}>
                FITUR DANA YANG RELEVAN
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {danaUses.map((feat, i) => <DanaFeaturePill key={i} label={feat} />)}
              </div>
            </div>
          )}

          {/* Fit reason */}
          {fitReason && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '.5px', marginBottom: 4 }}>
                ALASAN FIT
              </div>
              <p style={{ margin: 0, fontSize: 12, color: C.textSub, lineHeight: 1.6, fontStyle: 'italic' }}>
                "{fitReason}"
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}