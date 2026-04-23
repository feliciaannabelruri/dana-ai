import { useState } from 'react';
import CampaignToolkit from './CampaignToolkit';
import LLMProfileBadge from './LLMProfileBadge';

// ── Design tokens ─────────────────────────────────────────────
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
  orange:      '#EA580C',
  orangeBg:    '#FFF7ED',
};

// ── Formatters ────────────────────────────────────────────────
const fmt = n => {
  if (!n || isNaN(n)) return 'Rp –';
  const v = Math.round(n);
  if (v >= 1_000_000_000) return `Rp ${(v/1e9).toFixed(1).replace(/\.0$/,'')} M`;
  if (v >= 1_000_000)     return `Rp ${(v/1e6).toFixed(1).replace(/\.0$/,'')} jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};
const fmtF = n => {
  if (!n) return '–';
  if (n >= 1_000_000) return `${(n/1e6).toFixed(n%1e6===0?0:1)} M`;
  if (n >= 1_000)     return `${Math.round(n/1000)} K`;
  return String(n);
};
const fmtRate  = n => (!n || isNaN(n)) ? 'Rp –' : fmt(Math.round(n));
const fmtBudget = n => {
  if (!n || isNaN(n)) return 'Rp 0';
  const v = Math.round(n);
  if (v >= 1_000_000_000) return `Rp ${(v/1e9).toFixed(2).replace(/\.?0+$/,'')} M`;
  if (v >= 1_000_000)     return `Rp ${(v/1e6).toFixed(1).replace(/\.0$/,'')} juta`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

function getProfileUrl(username, socialMedia) {
  if (!username) return null;
  const sm = (socialMedia||'').toLowerCase();
  const clean = username.replace(/^@/,'').trim();
  if (sm.includes('tiktok')) return `https://www.tiktok.com/@${clean}`;
  return `https://www.instagram.com/${clean}`;
}

// ── Icons ─────────────────────────────────────────────────────
const Icon = {
  bolt:        (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z"/></svg>,
  check:       (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  newspaper:   (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>,
  user:        (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  link:        (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  lightbulb:   (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>,
  pin:         (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  whatsapp:    (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  instagram:   (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  tiktok:      (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>,
  chevronDown: (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevronUp:   (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  arrowLeft:   (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  share:       (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  externalLink:(s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  users:       (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  tool:        (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
};

// ── Atoms ─────────────────────────────────────────────────────
function Chip({ label, color=C.blue, bg=C.blueLight, icon=null }) {
  return (
    <span style={{ background:bg, color, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
      {icon&&<span style={{display:'flex'}}>{icon}</span>}{label}
    </span>
  );
}

function ScoreBar({ score, color=C.blue }) {
  const [w,setW]=useState(0);
  useState(()=>{ const t=setTimeout(()=>setW(score),200); return ()=>clearTimeout(t); });
  return (
    <div style={{ height:4, background:C.bgGray2, borderRadius:2, overflow:'hidden', marginTop:4 }}>
      <div style={{ width:`${score}%`, height:'100%', background:color, borderRadius:2, transition:'width 1s cubic-bezier(.4,0,.2,1)' }}/>
    </div>
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

// ── KOL Card ─────────────────────────────────────────────────
function KOLCard({ kol, rank }) {
  const [open,setOpen]=useState(false);
  const rc=[C.gold,'#94A3B8','#CD7F32'][rank-1]||C.blue;
  const isTK=kol.social_media?.toLowerCase().includes('tiktok');
  const sc=kol.match_score>=70?C.green:kol.match_score>=40?C.gold:C.textMuted;
  const cStyles={
    whatsapp: {bg:'#F0FDF4',border:C.greenBorder,text:'#15803D',Ic:Icon.whatsapp},
    instagram:{bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',Ic:Icon.instagram},
    tiktok:   {bg:'#FFF1F2',border:'#FECDD3',text:'#BE123C',Ic:Icon.tiktok},
    profile:  {bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',Ic:Icon.instagram},
  };
  const cc=cStyles[kol.contact_action?.type]||cStyles.instagram;
  const profileUrl=getProfileUrl(kol.username,kol.social_media);
  const platformColor=isTK?'#BE123C':'#BE185D';

  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ height:3, background:rank<=3?rc:C.blue }}/>
      <div style={{ padding:16 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, gap:8 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', minWidth:0 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:isTK?'#FFF1F2':C.blueLight, display:'flex', alignItems:'center', justifyContent:'center', color:isTK?'#BE123C':C.blue, flexShrink:0 }}>
              {isTK?Icon.tiktok(17):Icon.instagram(17)}
            </div>
            <div style={{ minWidth:0 }}>
              <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:4, fontWeight:700, color:C.text, fontSize:14, textDecoration:'none', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', transition:'color .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.color=platformColor;}}
                onMouseLeave={e=>{e.currentTarget.style.color=C.text;}}>
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

        {kol.has_real_er&&kol.avg_er_pct&&(
          <div style={{ background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:8, padding:'8px 10px', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:C.green, display:'flex' }}>{Icon.check(13)}</span>
            <span style={{ color:C.green, fontSize:13, fontWeight:600 }}>ER Aktual {kol.avg_er_pct}% — data nyata</span>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <StatBox label="Followers" value={fmtF(kol.followers_num)||kol.followers}/>
          <StatBox label="Type"      value={kol.type||'–'}/>
          <StatBox label="Rate Min"  value={fmtRate(kol.rate_min)} color={C.gold}/>
          <StatBox label="Lokasi"    value={kol.location||'–'}/>
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          <Chip label={kol.social_media||'–'}/>
          {kol.tier&&<Chip label={`Tier ${kol.tier}`} color={C.purple} bg={C.purpleBg}/>}
          {kol.has_real_er&&<Chip label="Real ER" color={C.green} bg={C.greenBg} icon={Icon.check(10)}/>}
        </div>

        {kol.rate_card&&Object.keys(kol.rate_card).length>0&&(
          <div style={{ background:C.bgGray, borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
            <div style={{ color:C.textMuted, fontSize:10, fontWeight:700, letterSpacing:'.8px', marginBottom:6 }}>RATE CARD</div>
            {Object.entries(kol.rate_card).map(([p,r])=>(
              <div key={p} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ color:C.textSub, fontSize:12 }}>{p}</span>
                <span style={{ color:C.gold, fontWeight:700, fontSize:12 }}>{fmtRate(r)}</span>
              </div>
            ))}
          </div>
        )}

        {kol.reasoning&&(
          <div style={{ background:C.blueLight, borderRadius:8, padding:'8px 10px', marginBottom:10, display:'flex', gap:7, alignItems:'flex-start' }}>
            <span style={{ color:C.blue, flexShrink:0, marginTop:1 }}>{Icon.lightbulb(12)}</span>
            <span style={{ color:C.blue, fontSize:12, lineHeight:1.6 }}>{kol.reasoning}</span>
          </div>
        )}

        {kol.llm_profile && (kol.llm_profile.summary || kol.llm_profile.audience_profile) && (
          <LLMProfileBadge profile={kol.llm_profile} matchScore={kol.match_score}/>
        )}

        {kol.score_detail&&(
          <>
            <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:`1px solid ${C.border}`, color:C.textSub, borderRadius:8, padding:'10px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit', width:'100%', marginBottom:open?8:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {open?Icon.chevronUp(11):Icon.chevronDown(11)}{open?'Sembunyikan detail':'Detail scoring'}
            </button>
            {open&&(
              <div style={{ background:C.bgGray, borderRadius:8, padding:'10px 12px' }}>
                {Object.entries(kol.score_detail).map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                    <span style={{ color:C.textSub, fontSize:12 }}>{k}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:50, height:3, background:C.bgGray2, borderRadius:2, overflow:'hidden' }}><div style={{ width:`${v}%`, height:'100%', background:v>=70?C.green:v>=40?C.gold:C.textMuted, borderRadius:2 }}/></div>
                      <span style={{ color:C.textSub, fontSize:12, minWidth:32, textAlign:'right' }}>{v}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
          {kol.pic_name&&<div style={{ display:'flex', alignItems:'center', gap:5, color:C.textMuted, fontSize:12, marginBottom:10 }}>{Icon.user(12)} PIC: <span style={{ color:C.textSub, fontWeight:600 }}>{kol.pic_name}</span></div>}
          {kol.contact_action?(
            <a href={kol.contact_action.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:cc.bg, border:`1px solid ${cc.border}`, color:cc.text, borderRadius:10, padding:'12px 14px', fontSize:14, fontWeight:700, textDecoration:'none', fontFamily:'inherit' }}>
              {cc.Ic(14)} {kol.contact_action.label} <span style={{ display:'flex', opacity:.6 }}>{Icon.link(11)}</span>
            </a>
          ):(
            <div style={{ color:C.textMuted, fontSize:12, textAlign:'center' }}>Tidak ada kontak</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Homeless Media Card ───────────────────────────────────────
function HomelessMediaCard({ media, rank }) {
  const [open,setOpen]=useState(false);
  const sc=media.match_score>=70?C.green:media.match_score>=40?C.gold:C.textMuted;
  const cStyles={
    whatsapp: {bg:'#F0FDF4',border:C.greenBorder,text:'#15803D',Ic:Icon.whatsapp},
    instagram:{bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',Ic:Icon.instagram},
    profile:  {bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',Ic:Icon.instagram},
  };
  const cc=cStyles[media.contact_action?.type]||cStyles.instagram;
  const isTK=media.social_media?.toLowerCase().includes('tiktok');
  const profileUrl=getProfileUrl(media.username,media.social_media);

  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ height:3, background:`linear-gradient(90deg,${C.teal},${C.blue})` }}/>
      <div style={{ padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, gap:8 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', minWidth:0 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:C.tealBg, display:'flex', alignItems:'center', justifyContent:'center', color:C.teal, flexShrink:0 }}>{Icon.newspaper(17)}</div>
            <div style={{ minWidth:0 }}>
              <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:4, fontWeight:700, color:C.text, fontSize:14, textDecoration:'none', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', transition:'color .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.color=C.teal;}}
                onMouseLeave={e=>{e.currentTarget.style.color=C.text;}}>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{media.username}</span>
                <span style={{ flexShrink:0, opacity:.5 }}>{Icon.externalLink(10)}</span>
              </a>
              <div style={{ color:C.textMuted, fontSize:11, marginTop:1 }}>{media.category}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:5, alignItems:'center', flexShrink:0 }}>
            <Chip label="Media" color={C.teal} bg={C.tealBg}/>
            <span style={{ background:C.teal, color:'#fff', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700 }}>#{rank}</span>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:'.5px' }}>MATCH SCORE</span>
            <span style={{ fontSize:18, fontWeight:800, color:sc }}>{media.match_score}%</span>
          </div>
          <ScoreBar score={media.match_score} color={C.teal}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <StatBox label="Followers" value={media.followers||'–'}/>
          <StatBox label="Platform"  value={media.social_media||'–'}/>
          <StatBox label="Rate Min"  value={fmtRate(media.rate_min)} color={C.gold}/>
          <StatBox label="Lokasi"    value={media.location||'–'}/>
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          <Chip label={media.category} color={C.teal} bg={C.tealBg}/>
          <Chip label={media.location} icon={Icon.pin(10)} color={media.location_norm==='nasional'?C.green:C.gold} bg={media.location_norm==='nasional'?C.greenBg:C.goldBg}/>
        </div>

        {media.rate_card&&Object.keys(media.rate_card).length>0&&(
          <div style={{ background:C.bgGray, borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
            <div style={{ color:C.textMuted, fontSize:10, fontWeight:700, letterSpacing:'.8px', marginBottom:6 }}>RATE CARD</div>
            {Object.entries(media.rate_card).map(([p,r])=>(
              <div key={p} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ color:C.textSub, fontSize:12 }}>{p}</span>
                <span style={{ color:C.gold, fontWeight:700, fontSize:12 }}>{fmtRate(r)}</span>
              </div>
            ))}
          </div>
        )}

        {media.reasoning&&(
          <div style={{ background:C.tealBg, borderRadius:8, padding:'8px 10px', marginBottom:10, display:'flex', gap:7, alignItems:'flex-start' }}>
            <span style={{ color:C.teal, flexShrink:0, marginTop:1 }}>{Icon.lightbulb(12)}</span>
            <span style={{ color:C.teal, fontSize:12, lineHeight:1.6 }}>{media.reasoning}</span>
          </div>
        )}

        {media.score_detail&&(
          <>
            <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:`1px solid ${C.border}`, color:C.textSub, borderRadius:8, padding:'10px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit', width:'100%', marginBottom:open?8:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {open?Icon.chevronUp(11):Icon.chevronDown(11)}{open?'Sembunyikan detail':'Detail scoring'}
            </button>
            {open&&(
              <div style={{ background:C.bgGray, borderRadius:8, padding:'10px 12px' }}>
                {Object.entries(media.score_detail).map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                    <span style={{ color:C.textSub, fontSize:12 }}>{k}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:50, height:3, background:C.bgGray2, borderRadius:2, overflow:'hidden' }}><div style={{ width:`${v}%`, height:'100%', background:v>=70?C.green:v>=40?C.gold:C.textMuted, borderRadius:2 }}/></div>
                      <span style={{ color:C.textSub, fontSize:12, minWidth:32, textAlign:'right' }}>{v}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
          {media.pic_name&&<div style={{ display:'flex', alignItems:'center', gap:5, color:C.textMuted, fontSize:12, marginBottom:10 }}>{Icon.user(12)} PIC: <span style={{ color:C.textSub, fontWeight:600 }}>{media.pic_name}</span></div>}
          {media.contact_action?(
            <a href={media.contact_action.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:cc.bg, border:`1px solid ${cc.border}`, color:cc.text, borderRadius:10, padding:'12px 14px', fontSize:14, fontWeight:700, textDecoration:'none', fontFamily:'inherit' }}>
              {cc.Ic(14)} {media.contact_action.label} <span style={{ display:'flex', opacity:.6 }}>{Icon.link(11)}</span>
            </a>
          ):(
            <div style={{ color:C.textMuted, fontSize:12, textAlign:'center' }}>Tidak ada kontak</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FreePoolCard (KOL Free & Community) ──────────────────────
function FreePoolCard({ item, rank, accentColor, accentBg, accentDark, type }) {
  const [open, setOpen] = useState(false);
  const sc = item.match_score >= 70 ? C.green : item.match_score >= 40 ? C.gold : C.textMuted;

  const contactInfo = item.contact_info || {};
  const contactLabel = {
    whatsapp: 'Chat WhatsApp',
    email:    'Kirim Email',
    dm:       'DM Instagram',
    link:     'Lihat Profil',
  }[contactInfo.type] || 'Hubungi';

  const contactHref = {
    whatsapp: `https://wa.me/${(contactInfo.value||'').replace(/\D/g,'')}`,
    email:    `mailto:${contactInfo.value}`,
    dm:       `https://instagram.com/${(contactInfo.value||'').replace('@','')}`,
    link:     contactInfo.value,
  }[contactInfo.type] || '#';

  const approachColor = item.approachability >= 0.9 ? C.green
    : item.approachability >= 0.7 ? C.gold : C.textMuted;
  const approachBg = item.approachability >= 0.9 ? C.greenBg
    : item.approachability >= 0.7 ? C.goldBg : C.bgGray2;

  return (
    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden'}}>
      <div style={{height:3,background:`linear-gradient(90deg,${accentColor},${accentColor}88)`}}/>
      <div style={{padding:16}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:8}}>
          <div style={{display:'flex',gap:10,alignItems:'center',minWidth:0}}>
            <div style={{width:38,height:38,borderRadius:8,background:accentBg,display:'flex',alignItems:'center',justifyContent:'center',color:accentColor,flexShrink:0,fontWeight:800,fontSize:14}}>
              {type==='community'?'🤝':'👤'}
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:700,color:C.text,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {type==='community'
                  ? (item.nama_komunitas||item.username)
                  : `@${item.username}`}
              </div>
              <div style={{color:C.textMuted,fontSize:11,marginTop:1}}>{item.category}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
            <span style={{background:accentColor,color:'#fff',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700}}>#{rank}</span>
          </div>
        </div>

        {/* Match Score */}
        <div style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,color:C.textMuted,fontWeight:600,letterSpacing:'.5px'}}>MATCH SCORE</span>
            <span style={{fontSize:18,fontWeight:800,color:sc}}>{item.match_score}%</span>
          </div>
          <ScoreBar score={item.match_score} color={accentColor}/>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          {type==='kol'&&<StatBox label="Followers" value={item.followers||'–'}/>}
          {type==='kol'&&<StatBox label="Platform"  value={item.social_media||'–'}/>}
          <div style={{background:approachBg,borderRadius:8,padding:'8px 10px',gridColumn:type==='community'?'1/-1':'auto'}}>
            <div style={{fontSize:10,color:approachColor,fontWeight:700,letterSpacing:'.5px',marginBottom:2}}>APPROACHABILITY</div>
            <div style={{fontWeight:700,fontSize:13,color:approachColor}}>{item.approachability_label||'–'}</div>
          </div>
          {type==='community'&&item.social_url&&(
            <StatBox label="Platform" value="Instagram"/>
          )}
        </div>

        {/* Reasoning */}
        {item.reasoning&&(
          <div style={{background:accentBg,borderRadius:8,padding:'8px 10px',marginBottom:12,display:'flex',gap:7,alignItems:'flex-start'}}>
            <span style={{color:accentColor,flexShrink:0,marginTop:1}}>{Icon.lightbulb(12)}</span>
            <span style={{color:accentDark,fontSize:12,lineHeight:1.6}}>{item.reasoning}</span>
          </div>
        )}

        {/* Score detail */}
        {item.score_detail&&(
          <>
            <button onClick={()=>setOpen(o=>!o)} style={{background:'none',border:`1px solid ${C.border}`,color:C.textSub,borderRadius:8,padding:'10px 12px',cursor:'pointer',fontSize:12,fontFamily:'inherit',width:'100%',marginBottom:open?8:12,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              {open?Icon.chevronUp(11):Icon.chevronDown(11)}{open?'Sembunyikan detail':'Detail scoring'}
            </button>
            {open&&(
              <div style={{background:C.bgGray,borderRadius:8,padding:'10px 12px',marginBottom:12}}>
                {Object.entries(item.score_detail).map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                    <span style={{color:C.textSub,fontSize:12}}>{k}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:50,height:3,background:C.bgGray2,borderRadius:2,overflow:'hidden'}}><div style={{width:`${v}%`,height:'100%',background:v>=70?C.green:v>=40?C.gold:C.textMuted,borderRadius:2}}/></div>
                      <span style={{color:C.textSub,fontSize:12,minWidth:32,textAlign:'right'}}>{v}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Contact button */}
        <a href={contactHref} target="_blank" rel="noopener noreferrer"
          style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:accentBg,border:`1px solid ${accentColor}44`,color:accentDark,borderRadius:10,padding:'12px 14px',fontSize:14,fontWeight:700,textDecoration:'none',fontFamily:'inherit'}}>
          {Icon.link(14)} {contactLabel}
          <span style={{display:'flex',opacity:.6}}>{Icon.externalLink(10)}</span>
        </a>
      </div>
    </div>
  );
}

// ── Share Modal ───────────────────────────────────────────────
function ShareModal({ url, copied, onCopy, onClose, isMobile }) {
  const iconX     = (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  const iconCopy  = (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
  const iconWA    = (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, backdropFilter:'blur(2px)' }}/>
      <div style={{ position:'fixed', zIndex:201, background:'#fff', borderRadius:isMobile?'16px 16px 0 0':16, boxShadow:'0 20px 60px rgba(0,0,0,.18)', padding:isMobile?'24px 20px 32px':'28px 28px', width:isMobile?'100%':480, maxWidth:'100%', ...(isMobile?{bottom:0,left:0,right:0}:{top:'50%',left:'50%',transform:'translate(-50%,-50%)'}), animation:'modalIn .25s ease' }}>
        <style>{`@keyframes modalIn{from{opacity:0}to{opacity:1}}`}</style>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:C.blueLight, display:'flex', alignItems:'center', justifyContent:'center', color:C.blue }}>{Icon.share(16)}</div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:C.text }}>Share Campaign</div>
              <div style={{ color:C.textMuted, fontSize:12, marginTop:1 }}>Bagikan ke tim atau klien</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:C.bgGray2, border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.textSub }}>{iconX(14)}</button>
        </div>
        <div style={{ background:C.bgGray, border:`1px solid ${C.border}`, borderRadius:9, padding:'10px 12px', marginBottom:12 }}>
          <span style={{ flex:1, color:'#374151', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace', display:'block' }}>{url}</span>
        </div>
        <button onClick={onCopy} style={{ width:'100%', background:copied?C.green:C.blue, border:'none', color:'#fff', borderRadius:10, padding:'13px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans','Segoe UI',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:10, transition:'background .2s' }}>
          {copied?Icon.check(15):iconCopy(15)}{copied?'Link Tersalin! ✓':'Copy Link'}
        </button>
        <button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent('Cek rekomendasi campaign DANA AI ini: '+url)}`, '_blank')} style={{ width:'100%', background:'#F0FDF4', border:`1px solid ${C.greenBorder}`, color:'#15803D', borderRadius:10, padding:'11px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans','Segoe UI',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {iconWA(16)} Share via WhatsApp
        </button>
      </div>
    </>
  );
}

// ── Main ResultPage export ────────────────────────────────────
export default function ResultPage({
  result, isMobile, px,
  onNew, onShare,
  shareModal, shareUrl, shareCopied, onCopyShare, onCloseShare,
}) {
  const [activeTab, setActiveTab] = useState('rekomendasi');

  const hm    = result.homeless_media;
  const hasHM = hm?.recommended_media?.length > 0;

  const kolFree    = result.kol_homeless_free || [];
  const hasKolFree = kolFree.length > 0;

  const community = result.community || [];
  const hasComm   = community.length > 0;

  const kolMin = result.estimated_cost_min  || 0;
  const kolMax = result.estimated_cost_max  || 0;
  const medMin = hm?.estimated_cost_media_min || 0;
  const medMax = hm?.estimated_cost_media_max || 0;
  const totMin = result.total_estimated_min  || (kolMin + medMin);
  const totMax = result.total_estimated_max  || (kolMax + medMax);
  const budget = result.budget_total || 0;
  const overBudget = totMin > budget && budget > 0;

  const GLOBAL_CSS = `
    @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes tabFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fu{animation:fu .35s ease forwards}
    .tab-content{animation:tabFade .25s ease forwards}
    *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:2px}
    button{touch-action:manipulation}
    a{touch-action:manipulation}
  `;

  return (
    <div style={{ minHeight:'100vh', background:C.bgGray, fontFamily:"'DM Sans','Segoe UI',sans-serif", color:C.text }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Navbar ── */}
      <div style={{ background:C.bg, borderBottom:`1px solid ${C.border}`, padding:`0 ${px}px`, height:52, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>{Icon.bolt(14)}</div>
          <span style={{ fontWeight:800, fontSize:15, color:C.text, letterSpacing:'-0.3px', flexShrink:0 }}>DANA <span style={{ color:C.blue }}>AI</span></span>
          {!isMobile&&<><div style={{ width:1, height:18, background:C.border, margin:'0 6px' }}/><span style={{ color:C.textSub, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{result.campaign_name}</span></>}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
          {!isMobile&&<Chip label={`${result.total_kol} KOL`}/>}
          {!isMobile&&hasHM&&<Chip label={`${hm.total_media} Media`} color={C.teal} bg={C.tealBg}/>}
          <button onClick={onShare} style={{ display:'flex', alignItems:'center', gap:5, background:C.blue, border:'none', color:'#fff', borderRadius:8, padding:isMobile?'8px 10px':'6px 14px', cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600 }}>
            {Icon.share(13)} {isMobile?'Share':'Share Link'}
          </button>
          <button onClick={onNew} style={{ display:'flex', alignItems:'center', gap:5, background:C.bgGray2, border:`1px solid ${C.border}`, color:C.textSub, borderRadius:8, padding:isMobile?'8px 10px':'6px 14px', cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600 }}>
            {Icon.arrowLeft(13)} {isMobile?'Baru':'Buat baru'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:`20px ${px}px 48px` }}>

        {/* ── Summary Card (selalu tampil) ── */}
        <div className="fu" style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:isMobile?'16px':'20px 24px', marginBottom:20, overflow:'hidden', position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.blue},${C.teal})` }}/>
          <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:'1px', marginBottom:6 }}>HASIL ANALISIS</div>
          <div style={{ fontSize:isMobile?18:22, fontWeight:800, color:C.text, letterSpacing:'-0.5px', marginBottom:10 }}>{result.campaign_name}</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
            <Chip label={result.target_location} icon={Icon.pin(10)}/>
            <Chip label={`Avg match ${result.avg_match_score}%`} color={C.green} bg={C.greenBg}/>
            <Chip label={`${result.total_kol} KOL`}/>
            {hasHM&&<Chip label={`${hm.total_media} Media`} color={C.teal} bg={C.tealBg} icon={Icon.newspaper(10)}/>}
          </div>

          {/* Cost breakdown */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ background: budget === 0 ? C.orangeBg : (overBudget ? C.redBg : C.greenBg), border: `1.5px solid ${budget === 0 ? C.orange : (overBudget ? C.redBorder : C.greenBorder)}`, borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ color: budget === 0 ? C.orange : (overBudget ? C.red : C.green), fontSize: 10, fontWeight: 700, letterSpacing: '.8px', marginBottom: 6 }}>{budget === 0 ? 'MODE KERJASAMA' : 'TOTAL ESTIMASI BIAYA'}</div>
                <div style={{ color: budget === 0 ? C.orange : (overBudget ? C.red : C.green), fontWeight: 800, fontSize: isMobile ? 18 : 22, letterSpacing: '-0.5px' }}>
                  {budget === 0 ? 'BARTER / 0 BUDGET' : (
                    <>
                      {fmtRate(totMin)}
                      {totMax > totMin && <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 600, opacity: .7 }}> — {fmtRate(totMax)}</span>}
                    </>
                  )}
                </div>
              </div>
              {budget > 0 ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, marginBottom: 2 }}>BUDGET CAMPAIGN</div>
                  <div style={{ color: C.textSub, fontWeight: 700, fontSize: 14 }}>{fmtBudget(budget)}</div>
                  <div style={{ color: overBudget ? C.red : C.green, fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                    {overBudget ? `⚠ Over budget` : `✓ Sisa ~${fmtRate(budget - totMin)}`}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: C.orange, background: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, border: `1px solid ${C.orange}` }}>
                    TIER-ONLY MODE
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:hasHM?'1fr 1fr':'1fr', gap:8 }}>
              <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ color:C.gold, fontSize:10, fontWeight:700, letterSpacing:'.6px', marginBottom:5 }}>KOL ({result.total_kol} orang)</div>
                <div style={{ color:C.text, fontWeight:800, fontSize:14 }}>{fmtRate(kolMin)}</div>
                {kolMax>kolMin&&<div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>s/d {fmtRate(kolMax)}</div>}
                <div style={{ color:C.textMuted, fontSize:10, marginTop:4 }}>~{fmtRate(Math.round(kolMin/Math.max(result.total_kol,1)))} / KOL</div>
              </div>
              {hasHM&&(
                <div style={{ background:C.tealBg, border:`1px solid ${C.tealBorder}`, borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ color:C.teal, fontSize:10, fontWeight:700, letterSpacing:'.6px', marginBottom:5 }}>HOMELESS MEDIA ({hm.total_media} akun)</div>
                  <div style={{ color:C.text, fontWeight:800, fontSize:14 }}>{fmtRate(medMin)}</div>
                  {medMax>medMin&&<div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>s/d {fmtRate(medMax)}</div>}
                  <div style={{ color:C.textMuted, fontSize:10, marginTop:4 }}>~{fmtRate(Math.round(medMin/Math.max(hm.total_media,1)))} / akun</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="fu" style={{ animationDelay:'.05s', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:20, overflow:'hidden' }}>
          {/* Tab bar */}
          <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, padding:'0 4px' }}>
            {[
              {
                id: 'rekomendasi',
                label: 'Rekomendasi',
                icon: Icon.users(14),
                badge: result.total_kol + (hasHM ? hm.total_media : 0),
                badgeColor: C.blue,
              },
              {
                id: 'toolkit',
                label: 'Campaign Toolkit',
                icon: Icon.tool(14),
                badge: null,
                badgeColor: C.purple,
              },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:7,
                    padding:'14px 18px',
                    border:'none', cursor:'pointer',
                    fontSize:13, fontWeight:isActive?700:500,
                    fontFamily:"'DM Sans','Segoe UI',sans-serif",
                    borderBottom:`2px solid ${isActive?C.blue:'transparent'}`,
                    background:'transparent',
                    color:isActive?C.blue:C.textSub,
                    transition:'all .15s',
                    marginBottom:-1,
                    whiteSpace:'nowrap',
                  }}>
                  <span style={{ color:isActive?C.blue:C.textMuted, display:'flex' }}>{tab.icon}</span>
                  {tab.label}
                  {tab.badge!=null&&(
                    <span style={{
                      background:isActive?C.blue:C.bgGray2,
                      color:isActive?'#fff':C.textSub,
                      borderRadius:20, padding:'1px 8px',
                      fontSize:11, fontWeight:700,
                      transition:'all .15s',
                    }}>{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div style={{ padding:'20px' }}>

            {/* ── Tab: Rekomendasi ── */}
            {activeTab === 'rekomendasi' && (
              <div key="rekomendasi" className="tab-content">

                {/* KOL section */}
                <div style={{ marginBottom:28 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                    <div style={{ width:3, height:20, background:C.blue, borderRadius:2 }}/>
                    <h2 style={{ margin:0, fontSize:isMobile?15:17, fontWeight:800, color:C.text, letterSpacing:'-0.3px' }}>Rekomendasi KOL</h2>
                    <Chip label={`${result.total_kol} KOL`}/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(290px,1fr))', gap:12 }}>
                    {result.recommended_kol.map((k,i)=>(
                      <KOLCard key={k.id||i} kol={k} rank={i+1}/>
                    ))}
                  </div>
                </div>

                {/* Homeless Media section */}
                {hasHM&&(
                  <div style={{marginBottom:28}}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                      <div style={{ width:3, height:20, background:C.teal, borderRadius:2 }}/>
                      <h2 style={{ margin:0, fontSize:isMobile?15:17, fontWeight:800, color:C.text, letterSpacing:'-0.3px' }}>Homeless Media</h2>
                      <Chip label={`${hm.total_media} Media`} color={C.teal} bg={C.tealBg} icon={Icon.newspaper(10)}/>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(290px,1fr))', gap:12 }}>
                      {hm.recommended_media.map((m,i)=>(
                        <HomelessMediaCard key={m.id||i} media={m} rank={i+1}/>
                      ))}
                    </div>
                  </div>
                )}

                {/* KOL Homeless Free section — hanya muncul saat zero budget */}
                {hasKolFree&&(
                  <div style={{marginBottom:28}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <div style={{width:3,height:20,background:'#F59E0B',borderRadius:2}}/>
                      <h2 style={{margin:0,fontSize:isMobile?15:17,fontWeight:800,color:C.text,letterSpacing:'-0.3px'}}>KOL Free (Zero Budget)</h2>
                      <Chip label={`${kolFree.length} KOL`} color='#92400E' bg='#FEF3C7'/>
                    </div>
                    <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#92400E',lineHeight:1.5}}>
                      KOL tanpa rate card — approach langsung via DM/WA/email. Cocok untuk kolaborasi barter atau content partnership.
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                      {kolFree.map((k,i)=><FreePoolCard key={k.id||i} item={k} rank={i+1} accentColor='#F59E0B' accentBg='#FEF3C7' accentDark='#92400E' type='kol'/>)}
                    </div>
                  </div>
                )}

                {/* Community section — selalu tampil */}
                {hasComm&&(
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <div style={{width:3,height:20,background:'#10B981',borderRadius:2}}/>
                      <h2 style={{margin:0,fontSize:isMobile?15:17,fontWeight:800,color:C.text,letterSpacing:'-0.3px'}}>Komunitas</h2>
                      <Chip label={`${community.length} Komunitas`} color='#065F46' bg='#D1FAE5'/>
                    </div>
                    <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#065F46',lineHeight:1.5}}>
                      Komunitas relevan untuk partnership, co-branding, atau distribusi konten. Approach via kontak yang tersedia.
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                      {community.map((c,i)=><FreePoolCard key={c.id||i} item={c} rank={i+1} accentColor='#10B981' accentBg='#D1FAE5' accentDark='#065F46' type='community'/>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Campaign Toolkit ── */}
            {activeTab === 'toolkit' && (
              <div key="toolkit" className="tab-content">
                <CampaignToolkit result={result}/>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Share Modal */}
      {shareModal&&(
        <ShareModal
          url={shareUrl}
          copied={shareCopied}
          onCopy={onCopyShare}
          onClose={onCloseShare}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}