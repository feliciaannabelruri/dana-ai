/**
 * ShareView.js
 * ============
 * Halaman read-only untuk melihat hasil rekomendasi campaign yang di-share.
 * Data dikodekan di URL sebagai base64 compressed JSON.
 * Tidak butuh backend — semua dari URL parameter.
 *
 * Cara pakai di App.js:
 *   import ShareView from './components/ShareView';
 *   // Di router / kondisi:
 *   if (window.location.search.includes('?share=')) return <ShareView />;
 *
 * Atau pakai React Router:
 *   <Route path="/share" element={<ShareView />} />
 */

import { useState, useEffect } from 'react';

// ── Design tokens (sama dengan App.js) ───────────────────────
const C = {
  blue:        '#1A6FE8',
  blueDark:    '#1259C4',
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
  teal:        '#0891B2',
  tealBg:      '#ECFEFF',
  tealBorder:  '#A5F3FC',
};

// ── Icons ────────────────────────────────────────────────────
const Icon = {
  bolt:       (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z"/></svg>,
  check:      (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alert:      (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  user:       (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  link:       (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  newspaper:  (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>,
  pin:        (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  whatsapp:   (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  instagram:  (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  tiktok:     (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>,
  lightbulb:  (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>,
  copy:       (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  externalLink:(s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  chevronDown:(s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevronUp:  (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  share:      (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  calendar:   (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

// ── Formatters ───────────────────────────────────────────────
const fmt = n => {
  if (!n || isNaN(n)) return 'Rp –';
  const v = Math.round(n);
  if (v >= 1_000_000_000) return `Rp ${(v/1e9).toFixed(1).replace(/\.0$/,'')} M`;
  if (v >= 1_000_000) return `Rp ${(v/1e6).toFixed(1).replace(/\.0$/,'')} jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};
const fmtF = n => {
  if (!n) return '–';
  if (n >= 1_000_000) return `${(n/1e6).toFixed(1).replace(/\.0$/,'')} M`;
  if (n >= 1_000) return `${Math.round(n/1000)} K`;
  return String(n);
};

// ── URL encode/decode helpers ────────────────────────────────
/**
 * Encode result data ke URL-safe base64 string.
 * Dipakai di App.js saat generate share link.
 */
export function encodeShareData(resultData) {
  try {
    const json    = JSON.stringify(resultData);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    // URL-safe: replace + / = characters
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (e) {
    console.error('encodeShareData error:', e);
    return null;
  }
}

/**
 * Decode URL share param kembali ke result object.
 */
function decodeShareData(param) {
  try {
    // Restore base64 padding dan special chars
    let b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch (e) {
    console.error('decodeShareData error:', e);
    return null;
  }
}

// ── Sub-components ───────────────────────────────────────────
function Chip({ label, color=C.blue, bg=C.blueLight, icon=null }) {
  return (
    <span style={{ background:bg, color, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
      {icon && <span style={{ display:'flex' }}>{icon}</span>}{label}
    </span>
  );
}

function StatBox({ label, value, color=C.text }) {
  return (
    <div style={{ background:C.bgGray, borderRadius:8, padding:'8px 10px' }}>
      <div style={{ color:C.textMuted, fontSize:10, fontWeight:600, marginBottom:2 }}>{label}</div>
      <div style={{ color, fontSize:13, fontWeight:700 }}>{value}</div>
    </div>
  );
}

function ScoreBar({ score, color=C.blue }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(score), 300); return () => clearTimeout(t); }, [score]);
  return (
    <div style={{ height:4, background:C.bgGray2, borderRadius:2, overflow:'hidden', marginTop:4 }}>
      <div style={{ width:`${w}%`, height:'100%', background:color, borderRadius:2, transition:'width 1s cubic-bezier(.4,0,.2,1)' }}/>
    </div>
  );
}

function getProfileUrl(username, socialMedia) {
  if (!username) return null;
  const sm    = (socialMedia || '').toLowerCase();
  const clean = username.replace(/^@/, '').trim();
  if (sm.includes('tiktok')) return `https://www.tiktok.com/@${clean}`;
  return `https://www.instagram.com/${clean}`;
}

// ── KOL Card (read-only) ─────────────────────────────────────
function KOLCard({ kol, rank, isMobile }) {
  const [open, setOpen] = useState(false);
  const rc   = [C.gold, '#94A3B8', '#CD7F32'][rank - 1] || C.blue;
  const isTK = kol.social_media?.toLowerCase().includes('tiktok');
  const sc   = kol.match_score >= 70 ? C.green : kol.match_score >= 40 ? C.gold : C.textMuted;

  const cStyles = {
    whatsapp:  { bg:'#F0FDF4', border:C.greenBorder, text:'#15803D', Ic:Icon.whatsapp },
    instagram: { bg:'#FDF2F8', border:'#F9A8D4',     text:'#BE185D', Ic:Icon.instagram },
    tiktok:    { bg:'#FFF1F2', border:'#FECDD3',     text:'#BE123C', Ic:Icon.tiktok },
    profile:   { bg:'#FDF2F8', border:'#F9A8D4',     text:'#BE185D', Ic:Icon.instagram },
  };
  const cc = cStyles[kol.contact_action?.type] || cStyles.instagram;

  const profileUrl     = getProfileUrl(kol.username, kol.social_media);
  const platformColor  = isTK ? '#BE123C' : '#BE185D';

  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', animation:'cardIn .4s ease forwards', opacity:0, animationDelay:`${rank * 0.06}s` }}>
      <div style={{ height:3, background:rank <= 3 ? rc : C.blue }}/>
      <div style={{ padding:16 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, gap:8 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', minWidth:0 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:isTK?'#FFF1F2':C.blueLight, display:'flex', alignItems:'center', justifyContent:'center', color:isTK?'#BE123C':C.blue, flexShrink:0 }}>
              {isTK ? Icon.tiktok(17) : Icon.instagram(17)}
            </div>
            <div style={{ minWidth:0 }}>
              <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:4, fontWeight:700, color:C.text, fontSize:14, textDecoration:'none', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', transition:'color .15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = platformColor; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.text; }}>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{kol.username}</span>
                <span style={{ flexShrink:0, opacity:.5 }}>{Icon.externalLink(10)}</span>
              </a>
              <div style={{ color:C.textMuted, fontSize:11, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{kol.category}</div>
            </div>
          </div>
          <span style={{ background:rank<=3?rc:C.blueLight, color:rank<=3?'#fff':C.blue, borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700, flexShrink:0 }}>#{rank}</span>
        </div>

        {/* Score */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:'.5px' }}>MATCH SCORE</span>
            <span style={{ fontSize:18, fontWeight:800, color:sc }}>{kol.match_score}%</span>
          </div>
          <ScoreBar score={kol.match_score} color={sc}/>
        </div>

        {/* Real ER badge */}
        {kol.has_real_er && kol.avg_er_pct && (
          <div style={{ background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:8, padding:'8px 10px', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:C.green, display:'flex' }}>{Icon.check(13)}</span>
            <span style={{ color:C.green, fontSize:13, fontWeight:600 }}>ER Aktual {kol.avg_er_pct}% — data nyata</span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <StatBox label="Followers" value={fmtF(kol.followers_num) || kol.followers}/>
          <StatBox label="Type"      value={kol.type || '–'}/>
          <StatBox label="Rate Min"  value={fmt(kol.rate_min)} color={C.gold}/>
          <StatBox label="Lokasi"    value={kol.location || '–'}/>
        </div>

        {/* Chips */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          <Chip label={kol.social_media || '–'}/>
          {kol.tier && <Chip label={`Tier ${kol.tier}`} color={C.purple} bg={C.purpleBg}/>}
          {kol.has_real_er && <Chip label="Real ER" color={C.green} bg={C.greenBg} icon={Icon.check(10)}/>}
        </div>

        {/* Rate card */}
        {kol.rate_card && Object.keys(kol.rate_card).length > 0 && (
          <div style={{ background:C.bgGray, borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
            <div style={{ color:C.textMuted, fontSize:10, fontWeight:700, letterSpacing:'.8px', marginBottom:6 }}>RATE CARD</div>
            {Object.entries(kol.rate_card).map(([p, r]) => (
              <div key={p} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ color:C.textSub, fontSize:12 }}>{p}</span>
                <span style={{ color:C.gold, fontWeight:700, fontSize:12 }}>{fmt(r)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reasoning */}
        {kol.reasoning && (
          <div style={{ background:C.blueLight, borderRadius:8, padding:'8px 10px', marginBottom:10, display:'flex', gap:7, alignItems:'flex-start' }}>
            <span style={{ color:C.blue, flexShrink:0, marginTop:1 }}>{Icon.lightbulb(12)}</span>
            <span style={{ color:C.blue, fontSize:12, lineHeight:1.6 }}>{kol.reasoning}</span>
          </div>
        )}

        {/* Score detail toggle */}
        {kol.score_detail && (
          <>
            <button onClick={() => setOpen(o => !o)}
              style={{ background:'none', border:`1px solid ${C.border}`, color:C.textSub, borderRadius:8, padding:'10px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit', width:'100%', marginBottom:open?8:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6, touchAction:'manipulation' }}>
              {open ? Icon.chevronUp(11) : Icon.chevronDown(11)}
              {open ? 'Sembunyikan detail' : 'Detail scoring'}
            </button>
            {open && (
              <div style={{ background:C.bgGray, borderRadius:8, padding:'10px 12px' }}>
                {Object.entries(kol.score_detail).map(([k, v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                    <span style={{ color:C.textSub, fontSize:12 }}>{k}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:50, height:3, background:C.bgGray2, borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:`${v}%`, height:'100%', background:v>=70?C.green:v>=40?C.gold:C.textMuted, borderRadius:2 }}/>
                      </div>
                      <span style={{ color:C.textSub, fontSize:12, minWidth:32, textAlign:'right' }}>{v}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Contact */}
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
          {kol.pic_name && (
            <div style={{ display:'flex', alignItems:'center', gap:5, color:C.textMuted, fontSize:12, marginBottom:10 }}>
              {Icon.user(12)} PIC: <span style={{ color:C.textSub, fontWeight:600 }}>{kol.pic_name}</span>
            </div>
          )}
          {kol.contact_action ? (
            <a href={kol.contact_action.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:cc.bg, border:`1px solid ${cc.border}`, color:cc.text, borderRadius:10, padding:'12px 14px', fontSize:14, fontWeight:700, textDecoration:'none', fontFamily:'inherit' }}>
              {cc.Ic(14)} {kol.contact_action.label}
              <span style={{ display:'flex', opacity:.6 }}>{Icon.link(11)}</span>
            </a>
          ) : (
            <div style={{ color:C.textMuted, fontSize:12, textAlign:'center' }}>Tidak ada kontak</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Homeless Media Card (read-only) ──────────────────────────
function MediaCard({ media, rank, isMobile }) {
  const [open, setOpen] = useState(false);
  const sc = media.match_score >= 70 ? C.green : media.match_score >= 40 ? C.gold : C.textMuted;

  const cStyles = {
    whatsapp:  { bg:'#F0FDF4', border:C.greenBorder, text:'#15803D', Ic:Icon.whatsapp },
    instagram: { bg:'#FDF2F8', border:'#F9A8D4',     text:'#BE185D', Ic:Icon.instagram },
    profile:   { bg:'#FDF2F8', border:'#F9A8D4',     text:'#BE185D', Ic:Icon.instagram },
  };
  const cc         = cStyles[media.contact_action?.type] || cStyles.instagram;
  const isTK       = media.social_media?.toLowerCase().includes('tiktok');
  const profileUrl = getProfileUrl(media.username, media.social_media);

  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', animation:'cardIn .4s ease forwards', opacity:0, animationDelay:`${rank * 0.06}s` }}>
      <div style={{ height:3, background:`linear-gradient(90deg,${C.teal},${C.blue})` }}/>
      <div style={{ padding:16 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, gap:8 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', minWidth:0 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:C.tealBg, display:'flex', alignItems:'center', justifyContent:'center', color:C.teal, flexShrink:0 }}>
              {Icon.newspaper(17)}
            </div>
            <div style={{ minWidth:0 }}>
              <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:4, fontWeight:700, color:C.text, fontSize:14, textDecoration:'none', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', transition:'color .15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = C.teal; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.text; }}>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{media.username}</span>
                <span style={{ flexShrink:0, opacity:.5 }}>{Icon.externalLink(10)}</span>
              </a>
              <div style={{ color:C.textMuted, fontSize:11, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{media.category}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:5, alignItems:'center', flexShrink:0 }}>
            <Chip label="Media" color={C.teal} bg={C.tealBg}/>
            <span style={{ background:C.teal, color:'#fff', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700 }}>#{rank}</span>
          </div>
        </div>

        {/* Score */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:'.5px' }}>MATCH SCORE</span>
            <span style={{ fontSize:18, fontWeight:800, color:sc }}>{media.match_score}%</span>
          </div>
          <ScoreBar score={media.match_score} color={C.teal}/>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <StatBox label="Followers" value={media.followers || '–'}/>
          <StatBox label="Platform"  value={media.social_media || '–'}/>
          <StatBox label="Rate Min"  value={fmt(media.rate_min)} color={C.gold}/>
          <StatBox label="Lokasi"    value={media.location || '–'}/>
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          <Chip label={media.category} color={C.teal} bg={C.tealBg}/>
          <Chip label={media.location} icon={Icon.pin(10)} color={media.location_norm==='nasional'?C.green:C.gold} bg={media.location_norm==='nasional'?C.greenBg:C.goldBg}/>
        </div>

        {/* Rate card */}
        {media.rate_card && Object.keys(media.rate_card).length > 0 && (
          <div style={{ background:C.bgGray, borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
            <div style={{ color:C.textMuted, fontSize:10, fontWeight:700, letterSpacing:'.8px', marginBottom:6 }}>RATE CARD</div>
            {Object.entries(media.rate_card).map(([p, r]) => (
              <div key={p} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ color:C.textSub, fontSize:12 }}>{p}</span>
                <span style={{ color:C.gold, fontWeight:700, fontSize:12 }}>{fmt(r)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reasoning */}
        {media.reasoning && (
          <div style={{ background:C.tealBg, borderRadius:8, padding:'8px 10px', marginBottom:10, display:'flex', gap:7, alignItems:'flex-start' }}>
            <span style={{ color:C.teal, flexShrink:0, marginTop:1 }}>{Icon.lightbulb(12)}</span>
            <span style={{ color:C.teal, fontSize:12, lineHeight:1.6 }}>{media.reasoning}</span>
          </div>
        )}

        {/* Score detail toggle */}
        {media.score_detail && (
          <>
            <button onClick={() => setOpen(o => !o)}
              style={{ background:'none', border:`1px solid ${C.border}`, color:C.textSub, borderRadius:8, padding:'10px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit', width:'100%', marginBottom:open?8:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {open ? Icon.chevronUp(11) : Icon.chevronDown(11)}
              {open ? 'Sembunyikan detail' : 'Detail scoring'}
            </button>
            {open && (
              <div style={{ background:C.bgGray, borderRadius:8, padding:'10px 12px' }}>
                {Object.entries(media.score_detail).map(([k, v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                    <span style={{ color:C.textSub, fontSize:12 }}>{k}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:50, height:3, background:C.bgGray2, borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:`${v}%`, height:'100%', background:v>=70?C.green:v>=40?C.gold:C.textMuted, borderRadius:2 }}/>
                      </div>
                      <span style={{ color:C.textSub, fontSize:12, minWidth:32, textAlign:'right' }}>{v}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Contact */}
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
          {media.pic_name && (
            <div style={{ display:'flex', alignItems:'center', gap:5, color:C.textMuted, fontSize:12, marginBottom:10 }}>
              {Icon.user(12)} PIC: <span style={{ color:C.textSub, fontWeight:600 }}>{media.pic_name}</span>
            </div>
          )}
          {media.contact_action ? (
            <a href={media.contact_action.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:cc.bg, border:`1px solid ${cc.border}`, color:cc.text, borderRadius:10, padding:'12px 14px', fontSize:14, fontWeight:700, textDecoration:'none', fontFamily:'inherit' }}>
              {cc.Ic(14)} {media.contact_action.label}
              <span style={{ display:'flex', opacity:.6 }}>{Icon.link(11)}</span>
            </a>
          ) : (
            <div style={{ color:C.textMuted, fontSize:12, textAlign:'center' }}>Tidak ada kontak</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Share Banner (copy link button) ─────────────────────────
function ShareBanner({ url }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div style={{ background:C.blueLight, border:`1px solid ${C.blue}33`, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
      <span style={{ color:C.blue, display:'flex', flexShrink:0 }}>{Icon.share(14)}</span>
      <span style={{ color:C.blue, fontSize:13, fontWeight:600, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {url}
      </span>
      <button onClick={handleCopy}
        style={{ background:copied?C.green:C.blue, border:'none', color:'#fff', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, flexShrink:0, transition:'background .2s' }}>
        {copied ? Icon.check(13) : Icon.copy(13)}
        {copied ? 'Tersalin!' : 'Copy Link'}
      </button>
    </div>
  );
}

// ── Main ShareView component ─────────────────────────────────
export default function ShareView() {
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const px = isMobile ? 16 : 24;

  useEffect(() => {
    // Parse ?share=<base64> from URL
    const params = new URLSearchParams(window.location.search);
    const raw    = params.get('share');
    if (!raw) { setError(true); return; }

    const decoded = decodeShareData(raw);
    if (!decoded) { setError(true); return; }

    setResult(decoded);
    setShareUrl(window.location.href);
  }, []);

  const GLOBAL_CSS = `
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
    @keyframes cardIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    body { font-family: 'DM Sans','Segoe UI',sans-serif; background: ${C.bgGray}; margin:0; }
    ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-thumb { background:#D1D5DB; border-radius:2px }
  `;

  // ── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight:'100vh', background:C.bgGray, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:24, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ width:48, height:48, borderRadius:12, background:C.redBg, display:'flex', alignItems:'center', justifyContent:'center', color:C.red }}>
          {Icon.alert(24)}
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontWeight:800, fontSize:18, color:C.text, marginBottom:6 }}>Link Tidak Valid</div>
          <div style={{ color:C.textSub, fontSize:14, maxWidth:320 }}>Link yang kamu buka tidak valid atau sudah kadaluarsa. Minta link baru dari pembuat campaign.</div>
        </div>
        <a href="/" style={{ background:C.blue, color:'#fff', borderRadius:10, padding:'11px 20px', fontWeight:700, fontSize:14, textDecoration:'none', fontFamily:'inherit' }}>
          Buat Campaign Baru
        </a>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────
  if (!result) {
    return (
      <div style={{ minHeight:'100vh', background:C.bgGray, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ color:C.textMuted, fontSize:14 }}>Memuat hasil campaign...</div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────
  const hm    = result.homeless_media;
  const hasHM = hm?.recommended_media?.length > 0;

  const kolMin  = result.estimated_cost_min  || 0;
  const kolMax  = result.estimated_cost_max  || 0;
  const medMin  = hm?.estimated_cost_media_min || 0;
  const medMax  = hm?.estimated_cost_media_max || 0;
  const totMin  = result.total_estimated_min  || (kolMin + medMin);
  const totMax  = result.total_estimated_max  || (kolMax + medMax);
  const budget  = result.budget_total || 0;
  const overBudget = totMin > budget && budget > 0;

  // Format tanggal dari meta jika ada
  const sharedAt = result._sharedAt
    ? new Date(result._sharedAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : null;

  return (
    <div style={{ minHeight:'100vh', background:C.bgGray, fontFamily:"'DM Sans','Segoe UI',sans-serif", color:C.text }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Navbar ── */}
      <div style={{ background:C.bg, borderBottom:`1px solid ${C.border}`, padding:`0 ${px}px`, height:52, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>
            {Icon.bolt(14)}
          </div>
          <span style={{ fontWeight:800, fontSize:15, letterSpacing:'-0.3px', flexShrink:0 }}>
            DANA <span style={{ color:C.blue }}>AI</span>
          </span>
          {!isMobile && (
            <>
              <div style={{ width:1, height:18, background:C.border, margin:'0 6px' }}/>
              <span style={{ fontSize:12, color:C.textMuted, fontWeight:500 }}>Shared Campaign</span>
            </>
          )}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
          {/* Read-only badge */}
          <span style={{ background:C.bgGray2, border:`1px solid ${C.border}`, color:C.textMuted, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600 }}>
            Read Only
          </span>
          <a href="/" style={{ background:C.blue, border:'none', color:'#fff', borderRadius:8, padding:isMobile?'7px 10px':'6px 14px', cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
            {Icon.bolt(12)} {isMobile ? 'Buat baru' : 'Buat Campaign Baru'}
          </a>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:`20px ${px}px 48px` }}>

        {/* ── Share URL banner ── */}
        <div style={{ marginBottom:16, animation:'fadeIn .4s ease' }}>
          <ShareBanner url={shareUrl}/>
        </div>

        {/* ── Campaign summary ── */}
        <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:isMobile?'16px':'20px 24px', marginBottom:20, overflow:'hidden', position:'relative', animation:'fadeIn .4s ease .05s both' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.blue},${C.teal})` }}/>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:'1px', marginBottom:4 }}>HASIL ANALISIS CAMPAIGN</div>
              <div style={{ fontSize:isMobile?18:22, fontWeight:800, color:C.text, letterSpacing:'-0.5px' }}>{result.campaign_name}</div>
            </div>
            {sharedAt && (
              <div style={{ display:'flex', alignItems:'center', gap:5, color:C.textMuted, fontSize:12, flexShrink:0 }}>
                {Icon.calendar(12)} {sharedAt}
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
            <Chip label={result.target_location || 'Nasional'} icon={Icon.pin(10)}/>
            <Chip label={`Avg match ${result.avg_match_score}%`} color={C.green} bg={C.greenBg}/>
            <Chip label={`${result.total_kol} KOL`}/>
            {hasHM && <Chip label={`${hm.total_media} Media`} color={C.teal} bg={C.tealBg} icon={Icon.newspaper(10)}/>}
          </div>

          {/* Cost summary */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ background:overBudget?C.redBg:C.greenBg, border:`1px solid ${overBudget?C.redBorder:C.greenBorder}`, borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ color:overBudget?C.red:C.green, fontSize:10, fontWeight:700, letterSpacing:'.8px', marginBottom:4 }}>TOTAL ESTIMASI BIAYA</div>
                <div style={{ color:overBudget?C.red:C.green, fontWeight:800, fontSize:isMobile?18:22, letterSpacing:'-0.5px' }}>
                  {fmt(totMin)}
                  {totMax > totMin && <span style={{ fontSize:isMobile?13:15, fontWeight:600, opacity:.7 }}> — {fmt(totMax)}</span>}
                </div>
              </div>
              {budget > 0 && (
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:C.textMuted, fontSize:10, fontWeight:600, marginBottom:2 }}>BUDGET CAMPAIGN</div>
                  <div style={{ color:C.textSub, fontWeight:700, fontSize:14 }}>{fmt(budget)}</div>
                  <div style={{ color:overBudget?C.red:C.green, fontSize:11, fontWeight:700, marginTop:2 }}>
                    {overBudget ? `⚠ Over budget` : `✓ Sisa ~${fmt(budget - totMin)}`}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:hasHM?'1fr 1fr':'1fr', gap:8 }}>
              <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ color:C.gold, fontSize:10, fontWeight:700, letterSpacing:'.6px', marginBottom:5 }}>KOL ({result.total_kol} orang)</div>
                <div style={{ color:C.text, fontWeight:800, fontSize:14 }}>{fmt(kolMin)}</div>
                {kolMax > kolMin && <div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>s/d {fmt(kolMax)}</div>}
                <div style={{ color:C.textMuted, fontSize:10, marginTop:4 }}>~{fmt(Math.round(kolMin / Math.max(result.total_kol, 1)))} / KOL</div>
              </div>
              {hasHM && (
                <div style={{ background:C.tealBg, border:`1px solid ${C.tealBorder}`, borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ color:C.teal, fontSize:10, fontWeight:700, letterSpacing:'.6px', marginBottom:5 }}>HOMELESS MEDIA ({hm.total_media} akun)</div>
                  <div style={{ color:C.text, fontWeight:800, fontSize:14 }}>{fmt(medMin)}</div>
                  {medMax > medMin && <div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>s/d {fmt(medMax)}</div>}
                  <div style={{ color:C.textMuted, fontSize:10, marginTop:4 }}>~{fmt(Math.round(medMin / Math.max(hm.total_media, 1)))} / akun</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── KOL List ── */}
        {result.recommended_kol?.length > 0 && (
          <div style={{ marginBottom:28, animation:'fadeIn .4s ease .1s both' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:3, height:20, background:C.blue, borderRadius:2 }}/>
              <h2 style={{ margin:0, fontSize:isMobile?15:17, fontWeight:800, color:C.text, letterSpacing:'-0.3px' }}>
                Rekomendasi KOL
              </h2>
              <Chip label={`${result.total_kol} KOL`}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(290px,1fr))', gap:12 }}>
              {result.recommended_kol.map((k, i) => (
                <KOLCard key={k.id || i} kol={k} rank={i + 1} isMobile={isMobile}/>
              ))}
            </div>
          </div>
        )}

        {/* ── Homeless Media ── */}
        {hasHM && (
          <div style={{ animation:'fadeIn .4s ease .15s both' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:3, height:20, background:C.teal, borderRadius:2 }}/>
              <h2 style={{ margin:0, fontSize:isMobile?15:17, fontWeight:800, color:C.text, letterSpacing:'-0.3px' }}>
                Homeless Media
              </h2>
              <Chip label={`${hm.total_media} Media`} color={C.teal} bg={C.tealBg} icon={Icon.newspaper(10)}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(290px,1fr))', gap:12 }}>
              {hm.recommended_media.map((m, i) => (
                <MediaCard key={m.id || i} media={m} rank={i + 1} isMobile={isMobile}/>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign:'center', color:C.textMuted, fontSize:11, marginTop:32 }}>
          DANA AI · Shared Campaign Result · Read Only
        </p>
      </div>
    </div>
  );
}