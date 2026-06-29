import React, { useState, useEffect } from 'react';
import LLMProfileBadge from './LLMProfileBadge';
import FlagBadge from './FlagBadge';

const C = {
  blue: '#1A6FE8',
  blueLight: '#EBF2FD',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  bg: '#FFFFFF',
  bgGray: '#F9FAFB',
  bgGray2: '#F3F4F6',
  green: '#059669',
  greenBg: '#ECFDF5',
  greenBorder: '#A7F3D0',
  gold: '#D97706',
  goldBg: '#FFFBEB',
  goldBorder: '#FCD34D',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  purpleBorder: '#DDD6FE',
};

const RISK_CFG = {
  critical: { bg:'#FEF2F2', border:'#FCA5A5', color:'#DC2626', barColor:'#DC2626', label:'Risiko Tinggi' },
  warning:  { bg:'#FFFBEB', border:'#FCD34D', color:'#D97706', barColor:'#D97706', label:'Peringatan' },
  watch:    { bg:'#FFF7ED', border:'#FDBA74', color:'#EA580C', barColor:'#EA580C', label:'Perlu Pantau' },
};

function RiskBadge({ severity, summary }) {
  const cfg = RISK_CFG[severity];
  if (!cfg) return null;
  const icons = {
    critical: <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
    warning:  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    watch:    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  };
  return (
    <span title={summary || ''} style={{
      background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color,
      borderRadius:20, padding:'2px 7px', fontSize:10, fontWeight:800,
      display:'inline-flex', alignItems:'center', gap:3,
      cursor: summary ? 'help' : 'default', whiteSpace:'nowrap', flexShrink:0,
    }}>
      <span style={{display:'flex'}}>{icons[severity]}</span>
      {cfg.label}
    </span>
  );
}

const Ic = {
  wa: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>,
  ig: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
  tt: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z" /></svg>,
  bulb: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" /></svg>,
  pin: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  extlink: (s = 10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  link: (s = 11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  user: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  check: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  chevDown: (s = 11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  chevUp: (s = 11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>,
};

const fmtF = n => { if (!n) return '–'; if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} M`; if (n >= 1e3) return `${Math.round(n / 1e3)} K`; return String(n); };
const fmtR = n => (!n || isNaN(n)) ? 'Rp –' : `Rp ${Math.round(n).toLocaleString('id-ID')}`;

const getPU = (u, sm) => { if (!u) return null; const s = (sm || '').toLowerCase(); const c = u.replace(/^@/, '').trim(); if (s.includes('tiktok')) return `https://www.tiktok.com/@${c}`; return `https://www.instagram.com/${c}`; };

const TIERS = [
  { k: 'nano', l: 'Nano', d: '< 10K', c: C.green, bg: C.greenBg, br: C.greenBorder },
  { k: 'mikro', l: 'Mikro', d: '10K–100K', c: C.blue, bg: C.blueLight, br: `${C.blue}33` },
  { k: 'makro', l: 'Makro', d: '100K–1M', c: C.gold, bg: C.goldBg, br: C.goldBorder },
  { k: 'mega', l: 'Mega', d: '> 1M', c: C.purple, bg: C.purpleBg, br: C.purpleBorder },
];

function Chip({ label, color = C.blue, bg = C.blueLight, icon = null }) { return <span style={{ background: bg, color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>{icon && <span style={{ display: 'flex' }}>{icon}</span>}{label}</span>; }
function ScoreBar({ score, color = C.blue }) { const [w, sW] = useState(0); useEffect(() => { const t = setTimeout(() => sW(score), 200); return () => clearImmediate(t); }, [score]); return <div style={{ height: 4, background: C.bgGray2, borderRadius: 2, overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} /></div>; }
function StatBox({ label, value, color = C.text }) { return <div style={{ background: C.bgGray, borderRadius: 8, padding: '8px 10px' }}><div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{label}</div><div style={{ color, fontSize: 13, fontWeight: 700 }}>{value}</div></div>; }

export default function KOLCard({ kol, rank }) {
  const [open, sO] = useState(false);
  const rc = [C.gold, '#94A3B8', '#CD7F32'][rank - 1] || C.blue;
  const isTK = kol.social_media?.toLowerCase().includes('tiktok');
  const sc = kol.match_score >= 70 ? C.green : kol.match_score >= 40 ? C.gold : C.textMuted;
  const cSt = { whatsapp: { bg: '#F0FDF4', border: C.greenBorder, text: '#15803D', I: Ic.wa }, instagram: { bg: '#FDF2F8', border: '#F9A8D4', text: '#BE185D', I: Ic.ig }, tiktok: { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', I: Ic.tt }, profile: { bg: '#FDF2F8', border: '#F9A8D4', text: '#BE185D', I: Ic.ig } };
  const cc = cSt[kol.contact_action?.type] || cSt.instagram;
  const pu = getPU(kol.username, kol.social_media);
  const pc = isTK ? '#BE123C' : '#BE185D';
  const ti = TIERS.find(t => t.k === ['nano', 'mikro', 'makro', 'mega'][kol.tier - 1]);
  const riskCfg    = RISK_CFG[kol.flag_severity];
  const cardBorder = riskCfg ? `1.5px solid ${riskCfg.border}` : `1px solid ${C.border}`;
  const topBarBg   = riskCfg ? riskCfg.barColor : (rank <= 3 ? rc : C.blue);

  return (
    <div style={{ background: C.bg, border: cardBorder, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ height: 3, background: topBarBg }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: riskCfg ? riskCfg.bg : isTK ? '#FFF1F2' : C.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: riskCfg ? riskCfg.color : isTK ? '#BE123C' : C.blue, flexShrink: 0 }}>{isTK ? Ic.tt(17) : Ic.ig(17)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 2 }}>
                <a href={pu} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: riskCfg ? riskCfg.color : C.text, fontSize: 14, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color .15s' }} onMouseEnter={e => { e.currentTarget.style.color = riskCfg ? riskCfg.color : pc; }} onMouseLeave={e => { e.currentTarget.style.color = riskCfg ? riskCfg.color : C.text; }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{kol.username}</span><span style={{ flexShrink: 0, opacity: .5 }}>{Ic.extlink(10)}</span>
                </a>
                <RiskBadge severity={kol.flag_severity} summary={kol.flag_summary} />
              </div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>{kol.category}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span style={{ background: rank <= 3 ? rc : C.blueLight, color: rank <= 3 ? '#fff' : C.blue, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>#{rank}</span>
            {kol.matched_location && kol.matched_location !== 'nasional' && <span style={{ background: C.bgGray, color: C.textSub, borderRadius: 20, padding: '2px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>{Ic.pin(9)}{kol.matched_location}</span>}
          </div>
        </div>
        {riskCfg && kol.flag_summary && (
          <div style={{ background: riskCfg.bg, border: `1px solid ${riskCfg.border}`, borderRadius: 8, padding: '8px 10px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ color: riskCfg.color, fontSize: 11, lineHeight: 1.5, fontWeight: 600 }}>{kol.flag_summary}</span>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: '.5px' }}>MATCH SCORE</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: sc }}>{kol.match_score}%</span>
          </div>
          <ScoreBar score={kol.match_score} color={sc} />
        </div>
        {kol.has_real_er && kol.avg_er_pct && <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: '8px 10px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.green, display: 'flex' }}>{Ic.check(13)}</span><span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>ER Aktual {kol.avg_er_pct}% — data nyata</span></div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <StatBox label="Followers" value={fmtF(kol.followers_num) || kol.followers} />
          <StatBox label="Type" value={kol.type || '–'} />
          <StatBox label="Rate Min" value={fmtR(kol.rate_min)} color={C.gold} />
          <StatBox label="Lokasi" value={kol.location || '–'} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <Chip label={kol.social_media || '–'} />
          {kol.tier && <Chip label={`Tier ${kol.tier} ${['Nano', 'Mikro', 'Makro', 'Mega'][kol.tier - 1] || ''}`} color={ti?.c || C.purple} bg={ti?.bg || C.purpleBg} />}
          {kol.has_real_er && <Chip label="Real ER" color={C.green} bg={C.greenBg} icon={Ic.check(10)} />}
        </div>
        {kol.rate_card && Object.keys(kol.rate_card).length > 0 && <div style={{ background: C.bgGray, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}><div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: '.8px', marginBottom: 6 }}>RATE CARD</div>{Object.entries(kol.rate_card).map(([p, r]) => <div key={p} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ color: C.textSub, fontSize: 12 }}>{p}</span><span style={{ color: C.gold, fontWeight: 700, fontSize: 12 }}>{fmtR(r)}</span></div>)}</div>}
        {kol.reasoning && <div style={{ background: C.blueLight, borderRadius: 8, padding: '8px 10px', marginBottom: 10, display: 'flex', gap: 7, alignItems: 'flex-start' }}><span style={{ color: C.blue, flexShrink: 0, marginTop: 1 }}>{Ic.bulb(12)}</span><span style={{ color: C.blue, fontSize: 12, lineHeight: 1.6 }}>{kol.reasoning}</span></div>}
        <FlagBadge kol={kol} />
        {kol.llm_profile && kol.llm_profile.summary && <LLMProfileBadge profile={kol.llm_profile} matchScore={kol.match_score} />}
        {kol.score_detail && <>
          <button onClick={() => sO(o => !o)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textSub, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', width: '100%', marginBottom: open ? 8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {open ? Ic.chevUp(11) : Ic.chevDown(11)}{open ? 'Sembunyikan detail' : 'Detail scoring'}
          </button>
          {open && <div style={{ background: C.bgGray, borderRadius: 8, padding: '10px 12px' }}>{Object.entries(kol.score_detail).map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}><span style={{ color: C.textSub, fontSize: 12 }}>{k}</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 50, height: 3, background: C.bgGray2, borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${v}%`, height: '100%', background: v >= 70 ? C.green : v >= 40 ? C.gold : C.textMuted, borderRadius: 2 }} /></div><span style={{ color: C.textSub, fontSize: 12, minWidth: 32, textAlign: 'right' }}>{v}%</span></div></div>)}</div>}
        </>}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {kol.pic_name && <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.textMuted, fontSize: 12, marginBottom: 10 }}>{Ic.user(12)} PIC: <span style={{ color: C.textSub, fontWeight: 600 }}>{kol.pic_name}</span></div>}
          {kol.contact_action ? <a href={kol.contact_action.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: cc.bg, border: `1px solid ${cc.border}`, color: cc.text, borderRadius: 10, padding: '12px 14px', fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit' }}>{cc.I(14)} {kol.contact_action.label} <span style={{ display: 'flex', opacity: .6 }}>{Ic.link(11)}</span></a> : <div style={{ color: C.textMuted, fontSize: 12, textAlign: 'center' }}>Tidak ada kontak</div>}
        </div>
      </div>
    </div>
  );
}