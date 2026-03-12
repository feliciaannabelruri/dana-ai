import { useState, useEffect, useRef } from 'react';
import { checkStatus, uploadKOL, uploadInsight, trainModel, getRecommendations } from './services/apiService';

const BG = '#07070f', ACCENT = '#4f8ef7', GOLD = '#f5a623', GREEN = '#22c55e', RED = '#ef4444', PURPLE = '#a78bfa';

function fmt(n) {
  if (!n||isNaN(n)) return 'Rp -';
  if (n>=1e9) return `Rp ${(n/1e9).toFixed(1)}M`;
  if (n>=1e6) return `Rp ${(n/1e6).toFixed(0)}jt`;
  if (n>=1e3) return `Rp ${(n/1e3).toFixed(0)}rb`;
  return `Rp ${n}`;
}
function fmtF(n) {
  if (!n) return '-';
  if (n>=1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n>=1e3) return `${(n/1e3).toFixed(0)}K`;
  return String(n);
}

// ── SVG Icons ─────────────────────────────────────────────────
const Icon = {
  bolt: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13L13 2Z"/>
    </svg>
  ),
  whatsapp: (s=15) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  ),
  tiktok: (s=15) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/>
    </svg>
  ),
  instagram: (s=15) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  upload: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  chart: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  cpu: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  ),
  star: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  pin: (s=13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  wallet: (s=13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/>
    </svg>
  ),
  target: (s=13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  chevronDown: (s=12) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  chevronUp: (s=12) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  externalLink: (s=11) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  checkCircle: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  alertCircle: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  xCircle: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  loader: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin 1s linear infinite' }}>
      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  ),
  user: (s=13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  lightbulb: (s=13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/>
    </svg>
  ),
};

function Badge({ label, color=ACCENT, icon=null }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:color+'22', color, border:`1px solid ${color}44`, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
      {icon && icon}
      {label}
    </span>
  );
}

function Stat({ label, value, color=ACCENT }) {
  return (
    <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
      <div style={{ color:'#555', fontSize:9, letterSpacing:'1.2px', marginBottom:3, textTransform:'uppercase' }}>{label}</div>
      <div style={{ color, fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:14 }}>{value}</div>
    </div>
  );
}

function Bar({ score, color }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(()=>setW(score),150); return ()=>clearTimeout(t); }, [score]);
  return (
    <div style={{ height:5, background:'#1a1a2a', borderRadius:3, overflow:'hidden', margin:'6px 0' }}>
      <div style={{ width:`${w}%`, height:'100%', background:color, borderRadius:3, transition:'width 1.1s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

function KOLCard({ kol, rank }) {
  const c = rank===1?GOLD:rank===2?'#a0c4ff':rank===3?'#cd7f32':ACCENT;
  const [open, setOpen] = useState(false);
  const isTiktok = kol.social_media?.toLowerCase().includes('tiktok');

  const contactColors = {
    whatsapp:  { bg:'rgba(37,211,102,.12)',  border:'rgba(37,211,102,.35)', text:'#25d366' },
    tiktok:    { bg:'rgba(255,0,80,.10)',    border:'rgba(255,0,80,.3)',    text:'#ff0050' },
    instagram: { bg:'rgba(193,53,132,.10)', border:'rgba(193,53,132,.3)', text:'#c13584' },
    profile:   { bg:'rgba(193,53,132,.10)', border:'rgba(193,53,132,.3)', text:'#c13584' },
  };
  const cc = kol.contact_action ? (contactColors[kol.contact_action.type] || contactColors.profile) : null;

  return (
    <div
      style={{ background:'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.02))', border:`1px solid ${c}33`, borderRadius:14, padding:18, position:'relative', transition:'all .25s' }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=c+'88';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=c+'33';e.currentTarget.style.transform='translateY(0)';}}
    >
      {/* rank */}
      <div style={{ position:'absolute', top:14, right:14, background:c, color:'#000', width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 }}>#{rank}</div>

      {/* header */}
      <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:c+'22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:c }}>
          {isTiktok ? Icon.tiktok(18) : Icon.instagram(18)}
        </div>
        <div>
          <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>@{kol.username}</div>
          <div style={{ color:'#666', fontSize:11, marginTop:2 }}>{kol.category}</div>
        </div>
      </div>

      {/* match score */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'#555', fontSize:10, letterSpacing:'.5px' }}>MATCH SCORE</span>
        <span style={{ color:c, fontWeight:800, fontSize:15, fontFamily:'Syne,sans-serif' }}>{kol.match_score}%</span>
      </div>
      <Bar score={kol.match_score} color={c} />

      {/* real ER */}
      {kol.has_real_er && kol.avg_er_pct && (
        <div style={{ marginBottom:10, display:'flex', alignItems:'center', gap:6, background:GREEN+'11', border:`1px solid ${GREEN}33`, borderRadius:8, padding:'6px 10px' }}>
          <span style={{ color:GREEN, display:'flex' }}>{Icon.chart(13)}</span>
          <span style={{ color:GREEN, fontSize:11, fontWeight:700 }}>ER Aktual: {kol.avg_er_pct}%</span>
          <span style={{ color:'#555', fontSize:10 }}>data nyata dari campaign</span>
        </div>
      )}

      {/* stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
        <Stat label="Followers" value={fmtF(kol.followers_num)||kol.followers} color={PURPLE} />
        <Stat label="Type" value={kol.type||'-'} color={ACCENT} />
        <Stat label="Rate Min" value={fmt(kol.rate_min)} color={GOLD} />
        <Stat label="Lokasi" value={kol.location||'-'} color={GREEN} />
      </div>

      {/* badges */}
      <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
        <Badge label={kol.social_media||'-'} color={c} />
        {kol.tier && <Badge label={`Tier ${kol.tier}`} color={PURPLE} />}
        {kol.has_real_er && <Badge label="Real ER" color={GREEN} icon={Icon.checkCircle(10)} />}
      </div>

      {/* score detail */}
      {kol.score_detail && (
        <>
          <button
            onClick={()=>setOpen(o=>!o)}
            style={{ marginTop:10, background:'transparent', border:'1px solid rgba(255,255,255,.08)', color:'#555', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:11, fontFamily:'inherit', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
          >
            {open ? Icon.chevronUp(12) : Icon.chevronDown(12)}
            {open ? 'Sembunyikan detail' : 'Detail scoring'}
          </button>
          {open && (
            <div style={{ marginTop:10, background:'rgba(0,0,0,.3)', borderRadius:8, padding:'10px 12px' }}>
              {Object.entries(kol.score_detail).map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ color:'#666', fontSize:11 }}>{k}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:60, height:4, background:'#1a1a2a', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${v}%`, height:'100%', background:v>=70?GREEN:v>=40?GOLD:RED, borderRadius:2 }} />
                    </div>
                    <span style={{ color:'#aaa', fontSize:11, minWidth:32, textAlign:'right' }}>{v}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* rate card */}
      {kol.rate_card && Object.keys(kol.rate_card).length > 0 && (
        <div style={{ marginTop:10, background:'rgba(0,0,0,.3)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ color:'#444', fontSize:9, letterSpacing:'1px', marginBottom:6, fontWeight:700 }}>RATE CARD</div>
          {Object.entries(kol.rate_card).map(([p,r])=>(
            <div key={p} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ color:'#777', fontSize:11 }}>{p}</span>
              <span style={{ color:GOLD, fontWeight:700, fontSize:11 }}>{fmt(r)}</span>
            </div>
          ))}
        </div>
      )}

      {/* reasoning */}
      {kol.reasoning && (
        <div style={{ marginTop:10, background:c+'0e', border:`1px solid ${c}22`, borderRadius:8, padding:'8px 10px', display:'flex', gap:6, alignItems:'flex-start' }}>
          <span style={{ color:c, flexShrink:0, marginTop:1 }}>{Icon.lightbulb(12)}</span>
          <span style={{ color:'#bbb', fontSize:11, lineHeight:1.55 }}>{kol.reasoning}</span>
        </div>
      )}

      {/* contact */}
      <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.05)' }}>
        {kol.pic_name && (
          <div style={{ display:'flex', alignItems:'center', gap:5, color:'#555', fontSize:10, marginBottom:8 }}>
            {Icon.user(11)}
            <span>PIC:</span>
            <span style={{ color:'#777' }}>{kol.pic_name}</span>
          </div>
        )}
        {kol.contact_action && cc ? (
          <a
            href={kol.contact_action.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              background: cc.bg, border:`1px solid ${cc.border}`, color:cc.text,
              borderRadius:8, padding:'9px 14px', fontSize:12, fontWeight:700,
              textDecoration:'none', fontFamily:'inherit', transition:'opacity .2s',
            }}
            onMouseEnter={e=>e.currentTarget.style.opacity='.75'}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}
          >
            {kol.contact_action.type === 'whatsapp'   && Icon.whatsapp(14)}
            {kol.contact_action.type === 'tiktok'     && Icon.tiktok(14)}
            {(kol.contact_action.type === 'instagram' || kol.contact_action.type === 'profile') && Icon.instagram(14)}
            <span>{kol.contact_action.label}</span>
            {Icon.externalLink(10)}
          </a>
        ) : (
          <div style={{ color:'#2a2a3a', fontSize:11, textAlign:'center', padding:'4px 0' }}>Tidak ada kontak</div>
        )}
      </div>
    </div>
  );
}

function Spinner({ msg }) {
  return (
    <div style={{ minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:20, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
      <div style={{ position:'relative', width:70, height:70 }}>
        {[[70,ACCENT,'1s','normal'],[50,GOLD,'1.4s','reverse'],[30,PURPLE,'1.8s','normal']].map(([sz,c,dur,dir],i)=>(
          <div key={i} style={{ position:'absolute', top:(70-sz)/2, left:(70-sz)/2, width:sz, height:sz, borderRadius:'50%', border:'2.5px solid transparent', borderTopColor:c, animation:`spin ${dur} linear ${dir} infinite` }} />
        ))}
      </div>
      <div style={{ fontFamily:'Syne,sans-serif', color:ACCENT, fontSize:18, fontWeight:800 }}>DANA AI</div>
      <div style={{ color:'#777', fontSize:13, animation:'pulse 2s ease infinite', textAlign:'center', maxWidth:300 }}>{msg}</div>
    </div>
  );
}

const MSGS = [
  'Memproses kebutuhan campaign...',
  'HuggingFace encoding query...',
  'Semantic matching KOL vs campaign...',
  'Menghitung engagement & budget fit...',
  'Menyusun rekomendasi final...',
];

export default function App() {
  const [page, setPage]     = useState('form');
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [msg, setMsg]       = useState(MSGS[0]);
  const [kolMsg, setKolMsg] = useState('');
  const [insightMsg, setInsightMsg] = useState('');
  const [training, setTraining]     = useState(false);
  const [form, setForm] = useState({
    campaign_name:'', campaign_description:'', goals:'',
    target_audience:'', topics:'', location:'',
    budget:'', num_kol:5, content_type:'semua', preferred_tier:'semua',
  });
  const kolRef     = useRef();
  const insightRef = useRef();
  const msgIdx     = useRef(0);

  useEffect(() => {
    checkStatus().then(setStatus).catch(()=>setStatus({error:true}));
  }, []);

  useEffect(() => {
    if (page!=='loading') return;
    const iv = setInterval(()=>{
      msgIdx.current = (msgIdx.current+1)%MSGS.length;
      setMsg(MSGS[msgIdx.current]);
    }, 1100);
    return ()=>clearInterval(iv);
  }, [page]);

  const handleKOLUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setKolMsg('Uploading...');
    try { await uploadKOL(file); setKolMsg('KOL.xlsx uploaded. Klik Latih Model.'); }
    catch(err) { setKolMsg('Error: ' + err.message); }
  };

  const handleInsightUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setInsightMsg('Uploading & extracting ER data...');
    try {
      const r = await uploadInsight(file);
      setInsightMsg(r.er_extracted ? 'insight.xlsx uploaded. ER data diekstrak.' : 'Uploaded tapi ER extract gagal.');
    } catch(err) { setInsightMsg('Error: ' + err.message); }
  };

  const handleTrain = async () => {
    setTraining(true);
    setKolMsg('Training... HuggingFace download ~100MB pertama kali.');
    try {
      await trainModel();
      const s = await checkStatus();
      setStatus(s);
      const meta = s.meta||{};
      setKolMsg(`Model siap. ${meta.total_kol||0} KOL | ${meta.kol_with_er||0} dengan ER nyata`);
    } catch(err) { setKolMsg('Error: ' + err.message); }
    setTraining(false);
  };

  const handleSubmit = async () => {
    if (!form.campaign_name||!form.budget) return;
    setPage('loading'); msgIdx.current=0; setMsg(MSGS[0]);
    try {
      const data = await getRecommendations(form);
      setResult(data); setPage('result');
    } catch(err) { alert(err.message); setPage('form'); }
  };

  const inp = {
    background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)',
    borderRadius:10, color:'#fff', padding:'11px 14px', fontSize:14,
    width:'100%', outline:'none', fontFamily:'inherit', boxSizing:'border-box',
  };
  const lbl = {
    color:'#666', fontSize:11, fontWeight:700, letterSpacing:'.7px',
    marginBottom:5, display:'block', textTransform:'uppercase',
  };

  if (page==='loading') return <Spinner msg={msg} />;

  /* ── RESULT PAGE ── */
  if (page==='result' && result) return (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:"'Plus Jakarta Sans',sans-serif", color:'#fff' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:3px}
        @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .fu{animation:fu .5s ease forwards}
      `}</style>

      {/* topbar */}
      <div style={{ background:'rgba(7,7,15,.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:`linear-gradient(135deg,${ACCENT},${PURPLE})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            {Icon.bolt(14)}
          </div>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:14 }}>DANA AI</span>
          <Badge label="HuggingFace NLP" color={PURPLE} icon={Icon.cpu(10)} />
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Badge label={`AVG ${result.avg_match_score}%`} color={GREEN} />
          <button
            onClick={()=>setPage('form')}
            style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', color:'#ccc', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}
          >
            Baru
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 20px' }}>

        {/* summary */}
        <div className="fu" style={{ marginBottom:20 }}>
          <div style={{ background:ACCENT+'12', border:`1px solid ${ACCENT}30`, borderRadius:16, padding:'20px 22px' }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:20, justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ color:ACCENT, fontSize:10, letterSpacing:'1.5px', fontWeight:700, marginBottom:6 }}>HASIL ANALISIS — SEMANTIC ML</div>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(18px,3vw,26px)', fontWeight:800, marginBottom:10 }}>{result.campaign_name}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <Badge label={result.target_location} color={ACCENT} icon={Icon.pin(11)} />
                  <Badge label={fmt(parseFloat(form.budget))} color={GOLD} icon={Icon.wallet(11)} />
                  <Badge label={`${result.total_kol} KOL`} color={GREEN} icon={Icon.target(11)} />
                  {result.hf_model_used && <Badge label={result.hf_model_used.split('/')[1]} color={PURPLE} icon={Icon.cpu(10)} />}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, minWidth:200 }}>
                <Stat label="Avg Match" value={`${result.avg_match_score}%`} color={ACCENT} />
                <Stat label="KOL Dipilih" value={result.total_kol} color={GOLD} />
                <Stat label="Est. Min Cost" value={fmt(result.estimated_cost_min)} color={GREEN} />
                <Stat label="Sisa Budget" value={fmt(result.budget_remaining)} color={PURPLE} />
              </div>
            </div>
          </div>
        </div>

        {/* HF info */}
        <div className="fu" style={{ marginBottom:20, animationDelay:'.05s' }}>
          <div style={{ background:PURPLE+'0d', border:`1px solid ${PURPLE}22`, borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ color:PURPLE }}>{Icon.cpu(14)}</span>
            <span style={{ color:PURPLE, fontSize:12, fontWeight:600 }}>Semantic matching powered by HuggingFace</span>
            <span style={{ color:'#444', fontSize:11 }}>memahami konteks Bahasa Indonesia & English</span>
          </div>
        </div>

        {/* KOL grid */}
        <div className="fu" style={{ animationDelay:'.1s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:4, height:20, background:GOLD, borderRadius:2 }} />
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:17, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:GOLD }}>{Icon.star(16)}</span>
              Rekomendasi KOL
            </span>
            <Badge label={`${result.total_kol} KOL`} color={GOLD} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(285px,1fr))', gap:14 }}>
            {result.recommended_kol.map((kol,i)=><KOLCard key={kol.id} kol={kol} rank={i+1} />)}
          </div>
        </div>
      </div>
    </div>
  );

  /* ── FORM PAGE ── */
  const modelReady = status?.model_trained;
  const backendErr = status?.error;
  const meta       = status?.meta || {};
  const canSubmit  = form.campaign_name && form.budget && modelReady;

  const statusIcon = backendErr
    ? <span style={{ color:RED }}>{Icon.xCircle(18)}</span>
    : status===null
    ? <span style={{ color:'#555' }}>{Icon.loader(18)}</span>
    : modelReady
    ? <span style={{ color:GREEN }}>{Icon.checkCircle(18)}</span>
    : <span style={{ color:GOLD }}>{Icon.alertCircle(18)}</span>;

  return (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:"'Plus Jakarta Sans',sans-serif", color:'#fff' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        input,select,textarea{color-scheme:dark}
        input:focus,textarea:focus,select:focus{border-color:${ACCENT}99!important;box-shadow:0 0 0 3px ${ACCENT}18}
        @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .fu{animation:fu .5s ease forwards}
      `}</style>

      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle,${ACCENT}10 0%,transparent 70%)`, top:-150, right:'10%' }} />
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:`radial-gradient(circle,${PURPLE}0a 0%,transparent 70%)`, bottom:60, left:'5%' }} />
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', padding:'36px 20px', position:'relative', zIndex:1 }}>

        {/* hero */}
        <div className="fu" style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:ACCENT+'14', border:`1px solid ${ACCENT}30`, borderRadius:30, padding:'7px 18px', marginBottom:18 }}>
            <span style={{ color:ACCENT, display:'flex' }}>{Icon.bolt(13)}</span>
            <span style={{ color:ACCENT, fontWeight:700, fontSize:11, letterSpacing:'1.5px' }}>DANA AI CAMPAIGN PLANNER</span>
            <Badge label="HuggingFace" color={PURPLE} icon={Icon.cpu(10)} />
          </div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(22px,5vw,38px)', fontWeight:800, margin:'0 0 10px', lineHeight:1.15 }}>
            Semantic KOL Matching<br />
            <span style={{ background:`linear-gradient(90deg,${ACCENT},${PURPLE})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Powered by HuggingFace
            </span>
          </h1>
          <p style={{ color:'#555', fontSize:13, lineHeight:1.7, maxWidth:460, marginInline:'auto', margin:0 }}>
            Model memahami konteks campaign secara semantik. Diperkaya ER data nyata dari insight.xlsx.
          </p>
        </div>

        {/* database panel */}
        <div className="fu" style={{ marginBottom:16, animationDelay:'.08s' }}>
          <div style={{
            background: backendErr?RED+'0a':modelReady?GREEN+'08':'rgba(255,255,255,.02)',
            border: `1px solid ${backendErr?RED+'30':modelReady?GREEN+'22':'rgba(255,255,255,.07)'}`,
            borderRadius:12, padding:'16px 18px',
          }}>
            {/* status */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              {statusIcon}
              <span style={{ fontWeight:700, fontSize:13, color:backendErr?RED:modelReady?GREEN:'#ccc' }}>
                {backendErr     ? 'Backend tidak bisa dihubungi — jalankan server Python dulu'
                : status===null ? 'Menghubungi backend...'
                : modelReady    ? `Model siap — ${meta.total_kol||0} KOL | ${meta.kol_with_er||0} dengan ER nyata`
                :                 'Model belum dilatih'}
              </span>
            </div>

            {/* uploads */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div style={{ background:'rgba(0,0,0,.2)', borderRadius:8, padding:'12px' }}>
                <div style={{ color:'#555', fontSize:10, fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>DATABASE KOL</div>
                <input ref={kolRef} type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleKOLUpload} />
                <button
                  onClick={()=>kolRef.current.click()} disabled={!!backendErr}
                  style={{ background:ACCENT+'20', border:`1px solid ${ACCENT}40`, color:ACCENT, borderRadius:8, padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', width:'100%', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:backendErr?.4:1 }}
                >
                  {Icon.upload(13)} Upload KOL.xlsx
                </button>
                {kolMsg && <div style={{ fontSize:11, color:kolMsg.startsWith('Model')||kolMsg.startsWith('KOL')?GREEN:kolMsg.startsWith('Error')?RED:'#888', lineHeight:1.4 }}>{kolMsg}</div>}
              </div>

              <div style={{ background:'rgba(0,0,0,.2)', borderRadius:8, padding:'12px' }}>
                <div style={{ color:'#555', fontSize:10, fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>INSIGHT / ER DATA</div>
                <input ref={insightRef} type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleInsightUpload} />
                <button
                  onClick={()=>insightRef.current.click()} disabled={!!backendErr}
                  style={{ background:GREEN+'20', border:`1px solid ${GREEN}40`, color:GREEN, borderRadius:8, padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', width:'100%', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:backendErr?.4:1 }}
                >
                  {Icon.chart(13)} Upload insight.xlsx
                </button>
                {insightMsg && <div style={{ fontSize:11, color:insightMsg.startsWith('insight')?GREEN:insightMsg.startsWith('Error')?RED:'#888', lineHeight:1.4 }}>{insightMsg}</div>}
              </div>
            </div>

            {/* train */}
            <button
              onClick={handleTrain} disabled={training||!!backendErr}
              style={{ background:training?'rgba(255,255,255,.05)':`linear-gradient(135deg,${PURPLE},${ACCENT})`, border:'none', color:'#fff', borderRadius:10, padding:'11px 20px', cursor:training||backendErr?'not-allowed':'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:backendErr?.4:1 }}
            >
              {training ? Icon.loader(14) : Icon.cpu(14)}
              {training ? 'Training + HuggingFace download...' : 'Latih Model (HuggingFace)'}
            </button>

            {/* steps */}
            <div style={{ marginTop:14, borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:12 }}>
              <div style={{ color:'#333', fontSize:10, fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>CARA SETUP</div>
              {[
                ['1', 'Upload KOL.xlsx — database KOL kamu', modelReady],
                ['2', 'Opsional: Upload insight.xlsx untuk ER data nyata dari campaign', false],
                ['3', 'Klik Latih Model — HuggingFace download ~100MB pertama kali', modelReady],
                ['4', 'Isi form di bawah, lalu generate rekomendasi', false],
              ].map(([n, txt, done]) => (
                <div key={n} style={{ display:'flex', gap:8, marginBottom:5, alignItems:'flex-start' }}>
                  <span style={{ color:done?GREEN:ACCENT, fontWeight:800, fontSize:11, minWidth:16, marginTop:1, display:'flex' }}>
                    {done ? Icon.checkCircle(11) : <span>{n}.</span>}
                  </span>
                  <span style={{ color:done?'#3a3a4a':'#555', fontSize:11, lineHeight:1.55, textDecoration:done?'line-through':'none' }}>{txt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* form */}
        <div className="fu" style={{ animationDelay:'.15s' }}>
          <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:24 }}>
            <div style={{ display:'grid', gap:15 }}>

              <div>
                <label style={lbl}>Nama Campaign *</label>
                <input style={inp} placeholder="Campaign Literasi Keuangan 2025" value={form.campaign_name} onChange={e=>setForm(f=>({...f,campaign_name:e.target.value}))} />
              </div>
              <div>
                <label style={lbl}>Deskripsi Campaign</label>
                <textarea style={{...inp,minHeight:68,resize:'vertical'}} placeholder="Tujuan dan pesan utama campaign — semakin detail semakin akurat matching-nya..." value={form.campaign_description} onChange={e=>setForm(f=>({...f,campaign_description:e.target.value}))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>Goals</label>
                  <input style={inp} placeholder="Brand awareness, edukasi, dll" value={form.goals} onChange={e=>setForm(f=>({...f,goals:e.target.value}))} />
                </div>
                <div>
                  <label style={lbl}>Target Audience</label>
                  <input style={inp} placeholder="Pemuda 20-30 tahun" value={form.target_audience} onChange={e=>setForm(f=>({...f,target_audience:e.target.value}))} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>Topik / Niche</label>
                  <input style={inp} placeholder="Finance, lifestyle, edukasi..." value={form.topics} onChange={e=>setForm(f=>({...f,topics:e.target.value}))} />
                </div>
                <div>
                  <label style={lbl}>Lokasi Target</label>
                  <input style={inp} placeholder="Jakarta, Surabaya, Nasional..." value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} />
                </div>
              </div>
              <div>
                <label style={lbl}>Total Budget (Rp) *</label>
                <input style={inp} type="number" min="0" placeholder="50000000" value={form.budget} onChange={e=>setForm(f=>({...f,budget:e.target.value}))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>Platform</label>
                  <select style={inp} value={form.content_type} onChange={e=>setForm(f=>({...f,content_type:e.target.value}))}>
                    <option value="semua">Semua Platform</option>
                    <option value="tiktok">Tiktok</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tier KOL</label>
                  <select style={inp} value={form.preferred_tier} onChange={e=>setForm(f=>({...f,preferred_tier:e.target.value}))}>
                    <option value="semua">Semua Tier</option>
                    <option value="nano">Nano</option>
                    <option value="mikro">Mikro</option>
                    <option value="makro">Makro</option>
                    <option value="mega">Mega</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Jumlah KOL</label>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <button onClick={()=>setForm(f=>({...f,num_kol:Math.max(1,f.num_kol-1)}))} style={{ width:32, height:32, borderRadius:8, background:ACCENT+'20', border:`1px solid ${ACCENT}40`, color:ACCENT, fontWeight:800, fontSize:16, cursor:'pointer' }}>−</button>
                  <span style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, minWidth:28, textAlign:'center' }}>{form.num_kol}</span>
                  <button onClick={()=>setForm(f=>({...f,num_kol:Math.min(50,f.num_kol+1)}))} style={{ width:32, height:32, borderRadius:8, background:ACCENT+'20', border:`1px solid ${ACCENT}40`, color:ACCENT, fontWeight:800, fontSize:16, cursor:'pointer' }}>+</button>
                  <span style={{ color:'#444', fontSize:12 }}>dari {meta.total_kol||0} database</span>
                </div>
              </div>

              <button
                onClick={handleSubmit} disabled={!canSubmit}
                style={{ background:canSubmit?`linear-gradient(135deg,${ACCENT},${PURPLE})`:'rgba(255,255,255,.05)', border:'none', color:'#fff', borderRadius:12, padding:'14px 28px', fontSize:14, fontWeight:700, cursor:canSubmit?'pointer':'not-allowed', fontFamily:'Syne,sans-serif', opacity:canSubmit?1:.4, transition:'all .25s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
              >
                {Icon.bolt(15)}
                Generate Rekomendasi
              </button>

              {!modelReady && (
                <p style={{ textAlign:'center', color:'#333', fontSize:11, margin:0, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <span style={{ color:'#444' }}>{Icon.alertCircle(12)}</span>
                  Latih model terlebih dahulu
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop:16, textAlign:'center', color:'#2a2a3a', fontSize:11 }}>
          DANA AI · HuggingFace Multilingual · No external API
        </div>
      </div>
    </div>
  );
}