import { useState, useEffect, useRef } from 'react';
import {
  checkStatus, uploadKOL, uploadInsight,
  uploadHomelessMedia, trainModel, getRecommendations, getLocations
} from './services/apiService';
import LocationDropdown from './components/LocationDropdown';

// ── Tokens ────────────────────────────────────────────────────
const C = {
  blue:       '#1A6FE8',
  blueDark:   '#1259C4',
  blueLight:  '#EBF2FD',
  text:       '#111827',
  textSub:    '#6B7280',
  textMuted:  '#9CA3AF',
  border:     '#E5E7EB',
  bg:         '#FFFFFF',
  bgGray:     '#F9FAFB',
  bgGray2:    '#F3F4F6',
  green:      '#059669',
  greenBg:    '#ECFDF5',
  greenBorder:'#A7F3D0',
  red:        '#DC2626',
  redBg:      '#FEF2F2',
  redBorder:  '#FCA5A5',
  gold:       '#D97706',
  goldBg:     '#FFFBEB',
  goldBorder: '#FCD34D',
  purple:     '#7C3AED',
  purpleBg:   '#F5F3FF',
  teal:       '#0891B2',
  tealBg:     '#ECFEFF',
  tealBorder: '#A5F3FC',
};

// ── Responsive hook ───────────────────────────────────────────
function useIsMobile(bp = 640) {
  const [mobile, setMobile] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return mobile;
}

// ── SVG Icons ─────────────────────────────────────────────────
const Icon = {
  bolt: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z" /></svg>,
  upload: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  cpu: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  chart: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  newspaper: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>,
  check: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alert: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  xCircle: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  loader: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
  user: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  link: (s = 11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  chevronDown: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevronUp: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  pin: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  whatsapp: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  instagram: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  tiktok: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>,
  lightbulb: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>,
  arrowLeft: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  externalLink: (s = 11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

// ── Helper: build social media profile URL ────────────────────
function getProfileUrl(username, socialMedia) {
  if (!username) return null;
  const sm = (socialMedia || '').toLowerCase();
  const clean = username.replace(/^@/, '').trim();
  if (sm.includes('tiktok')) return `https://www.tiktok.com/@${clean}`;
  // Default to Instagram
  return `https://www.instagram.com/${clean}`;
}

// ── Formatters ────────────────────────────────────────────────
const fmt = n => { if (!n || isNaN(n)) return 'Rp –'; if (n >= 1e9) return `Rp ${(n/1e9).toFixed(1)}M`; if (n >= 1e6) return `Rp ${(n/1e6).toFixed(0)}jt`; if (n >= 1e3) return `Rp ${(n/1e3).toFixed(0)}rb`; return `Rp ${n}`; };
const fmtF = n => { if (!n) return '–'; if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return String(n); };
const fmtBudget = n => { if (!n || isNaN(n)) return 'Rp 0'; if (n >= 1e9) return `Rp ${(n/1e9).toFixed(2).replace(/\.?0+$/,'')} M`; if (n >= 1e6) return `Rp ${(n/1e6).toFixed(n>=100e6?0:1).replace(/\.0$/,'')} juta`; if (n >= 1e3) return `Rp ${(n/1e3).toFixed(0)} rb`; return `Rp ${n.toLocaleString('id-ID')}`; };

// ── Budget Slider ─────────────────────────────────────────────
const PRESETS = [
  { label:'Micro',   min:1_000_000,   max:5_000_000,    desc:'1–5jt'    },
  { label:'Kecil',   min:5_000_000,   max:25_000_000,   desc:'5–25jt'   },
  { label:'Medium',  min:25_000_000,  max:100_000_000,  desc:'25–100jt' },
  { label:'Besar',   min:100_000_000, max:500_000_000,  desc:'100–500jt'},
  { label:'Premium', min:500_000_000, max:2_000_000_000,desc:'500jt–2M' },
];
const SMAX = 1000;
const l2v = pos => { const lo=Math.log(500_000),hi=Math.log(2e9); return Math.round(Math.exp(lo+(pos/SMAX)*(hi-lo))); };
const v2l = val => { if (!val||val<=0) return 200; const lo=Math.log(500_000),hi=Math.log(2e9); return Math.round(((Math.log(Math.max(500_000,Math.min(2e9,val)))-lo)/(hi-lo))*SMAX); };
const getPreset = val => { for(const p of PRESETS) if(val>=p.min&&val<=p.max) return p; return val<PRESETS[0].min?PRESETS[0]:PRESETS[PRESETS.length-1]; };

function BudgetSlider({ budgetMin, budgetMax, onChangeMin, onChangeMax }) {
  const minV = parseFloat(budgetMin)||5_000_000, maxV = parseFloat(budgetMax)||50_000_000;
  const posMin = v2l(minV), posMax = v2l(maxV);
  const ap = getPreset((minV+maxV)/2);
  const pMin = (posMin/SMAX)*100, pMax = (posMax/SMAX)*100;
  const [rawMin,setRawMin]=useState(''), [rawMax,setRawMax]=useState('');
  const [fMin,setFMin]=useState(false), [fMax,setFMax]=useState(false);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <style>{`.bsl{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;background:transparent;pointer-events:none}.bsl::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:${C.blue};border:3px solid #fff;box-shadow:0 1px 8px rgba(26,111,232,.3);cursor:pointer;pointer-events:all}.bsl::-moz-range-thumb{width:24px;height:24px;border-radius:50%;border:3px solid #fff;background:${C.blue};cursor:pointer;pointer-events:all}`}</style>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {PRESETS.map(p => { const on=p.min===minV&&p.max===maxV; return (
          <button key={p.label} onClick={()=>{onChangeMin(String(p.min));onChangeMax(String(p.max));setRawMin('');setRawMax('');}}
            style={{ background:on?C.blue:C.bgGray2, border:`1px solid ${on?C.blue:C.border}`, color:on?'#fff':C.textSub, borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', touchAction:'manipulation' }}>
            {p.label} <span style={{ opacity:.65, fontSize:10 }}>{p.desc}</span>
          </button>
        );})}
      </div>

      <div style={{ position:'relative', padding:'4px 0' }}>
        <div style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', left:0, right:0, height:4, borderRadius:2, pointerEvents:'none', background:`linear-gradient(to right,${C.bgGray2} 0%,${C.bgGray2} ${pMin}%,${C.blue} ${pMin}%,${C.blue} ${pMax}%,${C.bgGray2} ${pMax}%,${C.bgGray2} 100%)` }} />
        <div style={{ position:'relative', height:32, display:'flex', alignItems:'center' }}>
          <input type="range" className="bsl" min={0} max={SMAX} value={posMin} onChange={e=>{const v=l2v(parseInt(e.target.value));if(v<maxV){onChangeMin(String(v));setRawMin('');}}} style={{ position:'absolute', width:'100%', zIndex:posMin>SMAX*0.8?5:4 }} />
          <input type="range" className="bsl" min={0} max={SMAX} value={posMax} onChange={e=>{const v=l2v(parseInt(e.target.value));if(v>minV){onChangeMax(String(v));setRawMax('');}}} style={{ position:'absolute', width:'100%', zIndex:posMin>SMAX*0.8?4:5 }} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center' }}>
        {[
          { label:'Min', val:minV, raw:rawMin, focus:fMin, setRaw:setRawMin, setFocus:setFMin, set:v=>onChangeMin(String(Math.min(v,maxV-1))) },
          null,
          { label:'Max', val:maxV, raw:rawMax, focus:fMax, setRaw:setRawMax, setFocus:setFMax, set:v=>onChangeMax(String(Math.max(v,minV+1))) },
        ].map((item,i) => {
          if (!item) return <span key="sep" style={{ color:C.textMuted, fontSize:14, textAlign:'center' }}>—</span>;
          return (
            <div key={item.label} style={{ border:`1px solid ${item.focus?C.blue:C.border}`, borderRadius:8, padding:'9px 12px', boxShadow:item.focus?`0 0 0 3px ${C.blue}15`:'none', transition:'border-color .15s' }}>
              <div style={{ color:C.textMuted, fontSize:10, fontWeight:600, marginBottom:2 }}>{item.label.toUpperCase()}</div>
              <div style={{ color:C.blue, fontWeight:700, fontSize:13 }}>{fmtBudget(item.val)}</div>
              <input type="text" inputMode="numeric" placeholder="custom Rp" value={item.raw}
                onChange={e=>{const r=e.target.value.replace(/[^0-9]/g,'');item.setRaw(r);const n=parseInt(r);if(r&&n>0)item.set(n);}}
                onFocus={()=>{item.setFocus(true);item.setRaw(String(Math.round(item.val)));}}
                onBlur={()=>{item.setFocus(false);item.setRaw('');}}
                style={{ border:'none', outline:'none', background:'transparent', color:C.textSub, fontSize:11, width:'100%', fontFamily:'inherit', marginTop:2 }} />
            </div>
          );
        })}
      </div>

      <div style={{ background:C.blueLight, borderRadius:8, padding:'9px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
        <span style={{ color:C.textSub, fontSize:12 }}>Range</span>
        <span style={{ color:C.blue, fontWeight:700, fontSize:13 }}>{fmtBudget(minV)} — {fmtBudget(maxV)}</span>
        <span style={{ background:C.blue, color:'#fff', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:600 }}>{ap.label}</span>
      </div>
    </div>
  );
}

// ── UI Atoms ──────────────────────────────────────────────────
function Chip({ label, color=C.blue, bg=C.blueLight, icon=null }) {
  return <span style={{ background:bg, color, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>{icon&&<span style={{ display:'flex' }}>{icon}</span>}{label}</span>;
}

function ScoreBar({ score, color=C.blue }) {
  const [w,setW]=useState(0);
  useEffect(()=>{ const t=setTimeout(()=>setW(score),200); return ()=>clearTimeout(t); },[score]);
  return <div style={{ height:4, background:C.bgGray2, borderRadius:2, overflow:'hidden', marginTop:4 }}><div style={{ width:`${w}%`, height:'100%', background:color, borderRadius:2, transition:'width 1s cubic-bezier(.4,0,.2,1)' }}/></div>;
}

function StatBox({ label, value, color=C.text }) {
  return (
    <div style={{ background:C.bgGray, borderRadius:8, padding:'8px 10px' }}>
      <div style={{ color:C.textMuted, fontSize:10, fontWeight:600, marginBottom:2 }}>{label}</div>
      <div style={{ color, fontSize:13, fontWeight:700 }}>{value}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:'0.7px', textTransform:'uppercase', marginBottom:6 }}>{children}</div>;
}

function Field({ label, children }) {
  return <div><label style={{ display:'block', color:C.textSub, fontSize:12, fontWeight:600, marginBottom:5 }}>{label}</label>{children}</div>;
}

const INP = { background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'11px 12px', fontSize:16, width:'100%', outline:'none', fontFamily:"'DM Sans','Segoe UI',sans-serif", boxSizing:'border-box', transition:'border-color .15s', WebkitAppearance:'none' };

// ── KOL Card ──────────────────────────────────────────────────
function KOLCard({ kol, rank }) {
  const [open,setOpen]=useState(false);
  const rc=[C.gold,'#94A3B8','#CD7F32'][rank-1]||C.blue;
  const isTK=kol.social_media?.toLowerCase().includes('tiktok');
  const sc=kol.match_score>=70?C.green:kol.match_score>=40?C.gold:C.textMuted;
  const cStyles={ whatsapp:{bg:'#F0FDF4',border:C.greenBorder,text:'#15803D',Ic:Icon.whatsapp}, instagram:{bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',Ic:Icon.instagram}, tiktok:{bg:'#FFF1F2',border:'#FECDD3',text:'#BE123C',Ic:Icon.tiktok}, profile:{bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',Ic:Icon.instagram} };
  const cc=cStyles[kol.contact_action?.type]||cStyles.instagram;

  // Build profile URL for username click
  const profileUrl = getProfileUrl(kol.username, kol.social_media);
  const platformColor = isTK ? '#BE123C' : '#BE185D';
  const platformBg = isTK ? '#FFF1F2' : '#FDF2F8';

  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ height:3, background:rank<=3?rc:C.blue }}/>
      <div style={{ padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, gap:8 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', minWidth:0 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:isTK?'#FFF1F2':C.blueLight, display:'flex', alignItems:'center', justifyContent:'center', color:isTK?'#BE123C':C.blue, flexShrink:0 }}>{isTK?Icon.tiktok(17):Icon.instagram(17)}</div>
            <div style={{ minWidth:0 }}>
              {/* ── CLICKABLE USERNAME ── */}
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Buka profil @${kol.username} di ${isTK ? 'TikTok' : 'Instagram'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 700,
                  color: C.text,
                  fontSize: 14,
                  textDecoration: 'none',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  borderRadius: 4,
                  padding: '1px 0',
                  transition: 'color .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = platformColor; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.text; }}
              >
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{kol.username}</span>
                <span style={{ flexShrink:0, opacity:.5 }}>{Icon.externalLink(10)}</span>
              </a>
              <div style={{ color:C.textMuted, fontSize:11, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{kol.category}</div>
            </div>
          </div>
          <span style={{ background:rank<=3?rc:C.blueLight, color:rank<=3?'#fff':C.blue, borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700, flexShrink:0 }}>#{rank}</span>
        </div>

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
          <StatBox label="Type" value={kol.type||'–'}/>
          <StatBox label="Rate Min" value={fmt(kol.rate_min)} color={C.gold}/>
          <StatBox label="Lokasi" value={kol.location||'–'}/>
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
                <span style={{ color:C.gold, fontWeight:700, fontSize:12 }}>{fmt(r)}</span>
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

        {kol.score_detail&&(
          <>
            <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:`1px solid ${C.border}`, color:C.textSub, borderRadius:8, padding:'10px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit', width:'100%', marginBottom:open?8:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6, touchAction:'manipulation' }}>
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
            <a href={kol.contact_action.url} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:cc.bg, border:`1px solid ${cc.border}`, color:cc.text, borderRadius:10, padding:'12px 14px', fontSize:14, fontWeight:700, textDecoration:'none', fontFamily:'inherit', touchAction:'manipulation' }}>
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
  const cStyles={ whatsapp:{bg:'#F0FDF4',border:C.greenBorder,text:'#15803D',Ic:Icon.whatsapp}, instagram:{bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',Ic:Icon.instagram}, profile:{bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',Ic:Icon.instagram} };
  const cc=cStyles[media.contact_action?.type]||cStyles.instagram;

  // Build profile URL for username click
  const isTK = media.social_media?.toLowerCase().includes('tiktok');
  const profileUrl = getProfileUrl(media.username, media.social_media);

  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ height:3, background:`linear-gradient(90deg,${C.teal},${C.blue})` }}/>
      <div style={{ padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, gap:8 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', minWidth:0 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:C.tealBg, display:'flex', alignItems:'center', justifyContent:'center', color:C.teal, flexShrink:0 }}>{Icon.newspaper(17)}</div>
            <div style={{ minWidth:0 }}>
              {/* ── CLICKABLE USERNAME ── */}
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Buka profil @${media.username} di ${isTK ? 'TikTok' : 'Instagram'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 700,
                  color: C.text,
                  fontSize: 14,
                  textDecoration: 'none',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  borderRadius: 4,
                  padding: '1px 0',
                  transition: 'color .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.teal; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.text; }}
              >
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

        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:'.5px' }}>MATCH SCORE</span>
            <span style={{ fontSize:18, fontWeight:800, color:sc }}>{media.match_score}%</span>
          </div>
          <ScoreBar score={media.match_score} color={C.teal}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <StatBox label="Followers" value={media.followers||'–'}/>
          <StatBox label="Platform" value={media.social_media||'–'}/>
          <StatBox label="Rate Min" value={fmt(media.rate_min)} color={C.gold}/>
          <StatBox label="Lokasi" value={media.location||'–'}/>
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
                <span style={{ color:C.gold, fontWeight:700, fontSize:12 }}>{fmt(r)}</span>
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
            <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:`1px solid ${C.border}`, color:C.textSub, borderRadius:8, padding:'10px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit', width:'100%', marginBottom:open?8:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6, touchAction:'manipulation' }}>
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
            <a href={media.contact_action.url} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:cc.bg, border:`1px solid ${cc.border}`, color:cc.text, borderRadius:10, padding:'12px 14px', fontSize:14, fontWeight:700, textDecoration:'none', fontFamily:'inherit', touchAction:'manipulation' }}>
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

// ── Loading ───────────────────────────────────────────────────
const MSGS = ['Memproses campaign...','HuggingFace encoding query...','Semantic matching KOL...','Mencari Homeless Media...','Menyusun rekomendasi final...'];

function LoadingScreen({ msg }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28, fontFamily:"'DM Sans','Segoe UI',sans-serif", padding:'0 20px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>{Icon.bolt(18)}</div>
        <span style={{ fontWeight:800, fontSize:24, color:C.text, letterSpacing:'-0.5px' }}>DANA <span style={{ color:C.blue }}>AI</span></span>
      </div>
      <div style={{ position:'relative', width:48, height:48 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`3px solid ${C.border}` }}/>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'3px solid transparent', borderTopColor:C.blue, animation:'spin 0.9s linear infinite' }}/>
      </div>
      <p style={{ color:C.textSub, fontSize:15, animation:'pulse 1.5s ease infinite', margin:0, textAlign:'center', maxWidth:280 }}>{msg}</p>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const px = isMobile ? 16 : 24;

  const [page,setPage]     = useState('form');
  const [status,setStatus] = useState(null);
  const [result,setResult] = useState(null);
  const [msg,setMsg]       = useState(MSGS[0]);
  const [kolMsg,setKolMsg] = useState('');
  const [insightMsg,setInsightMsg] = useState('');
  const [homelessMsg,setHomelessMsg] = useState('');
  const [training,setTraining] = useState(false);
  const [locations,setLocations] = useState([]);
  const [locLoading,setLocLoading] = useState(false);
  const [form,setForm] = useState({
    campaign_name:'', campaign_description:'', goals:'',
    target_audience:'', topics:'', location:'nasional',
    budget_min:'5000000', budget_max:'50000000',
    budget_kol_pct:70, num_kol:5, num_media:3,
    content_type:'semua', preferred_tier:'semua',
  });
  const kolRef=useRef(), insightRef=useRef(), homelessRef=useRef();
  const msgIdx=useRef(0);

  useEffect(()=>{ checkStatus().then(setStatus).catch(()=>setStatus({error:true})); },[]);
  useEffect(()=>{ if(!status||status.error) return; loadLocs(); },[status]);

  const loadLocs = async () => {
    setLocLoading(true);
    try { const d=await getLocations(); setLocations(d.locations||[]); }
    catch { setLocations([{value:'nasional',label:'Nasional (Semua Indonesia)',group:'Nasional'}]); }
    setLocLoading(false);
  };

  useEffect(()=>{
    if(page!=='loading') return;
    const iv=setInterval(()=>{ msgIdx.current=(msgIdx.current+1)%MSGS.length; setMsg(MSGS[msgIdx.current]); },1100);
    return ()=>clearInterval(iv);
  },[page]);

  const handleKOL = async e => { const f=e.target.files[0]; if(!f) return; setKolMsg('Uploading...'); try { await uploadKOL(f); setKolMsg('Upload berhasil. Klik Latih Model.'); } catch(err){setKolMsg('Error: '+err.message);} };
  const handleInsight = async e => { const f=e.target.files[0]; if(!f) return; setInsightMsg('Uploading...'); try { const r=await uploadInsight(f); setInsightMsg(r.er_extracted?'Upload berhasil, ER diekstrak.':'Upload berhasil.'); } catch(err){setInsightMsg('Error: '+err.message);} };
  const handleHomeless = async e => { const f=e.target.files[0]; if(!f) return; setHomelessMsg('Uploading...'); try { const r=await uploadHomelessMedia(f); if(r.parsed){setHomelessMsg(`${r.homeless_media_count} media dimuat.`);const s=await checkStatus();setStatus(s);loadLocs();}else setHomelessMsg('Parsing gagal. Cek format Sheet2.'); } catch(err){setHomelessMsg('Error: '+err.message);} };
  const handleTrain = async () => { setTraining(true); setKolMsg('Training... (HuggingFace ~100MB pertama kali)'); try { await trainModel(); const s=await checkStatus(); setStatus(s); const m=s.meta||{}; setKolMsg(`Model siap — ${m.total_kol||0} KOL`); loadLocs(); } catch(err){setKolMsg('Error: '+err.message);} setTraining(false); };
  const handleSubmit = async () => {
    if(!form.campaign_name||!form.budget_min) return;
    setPage('loading'); msgIdx.current=0; setMsg(MSGS[0]);
    const mid=Math.round((parseFloat(form.budget_min)+parseFloat(form.budget_max))/2);
    try { const d=await getRecommendations({...form,budget:String(mid),budget_kol_pct:form.budget_kol_pct/100}); setResult(d); setPage('result'); }
    catch(err){ alert(err.message); setPage('form'); }
  };

  if(page==='loading') return <LoadingScreen msg={msg}/>;

  const GLOBAL_CSS = `
    @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fu{animation:fu .35s ease forwards}
    *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
    input,select,textarea{font-family:"DM Sans","Segoe UI",sans-serif;-webkit-appearance:none;appearance:none}
    input:focus,textarea:focus,select:focus{border-color:${C.blue}!important;outline:none;box-shadow:0 0 0 3px ${C.blue}15}
    select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px!important;cursor:pointer}
    select option{color:${C.text};background:#fff}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:2px}
    button{touch-action:manipulation}
    a{touch-action:manipulation}
  `;

  // ── RESULT ─────────────────────────────────────────────────
  if(page==='result'&&result) {
    const hm=result.homeless_media, hasHM=hm?.recommended_media?.length>0;
    return (
      <div style={{ minHeight:'100vh', background:C.bgGray, fontFamily:"'DM Sans','Segoe UI',sans-serif", color:C.text }}>
        <style>{GLOBAL_CSS}</style>

        {/* Navbar */}
        <div style={{ background:C.bg, borderBottom:`1px solid ${C.border}`, padding:`0 ${px}px`, height:52, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
            <div style={{ width:30, height:30, borderRadius:7, background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>{Icon.bolt(14)}</div>
            <span style={{ fontWeight:800, fontSize:15, color:C.text, letterSpacing:'-0.3px', flexShrink:0 }}>DANA <span style={{ color:C.blue }}>AI</span></span>
            {!isMobile&&<><div style={{ width:1, height:18, background:C.border, margin:'0 6px' }}/><span style={{ color:C.textSub, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{result.campaign_name}</span></>}
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
            {!isMobile&&<Chip label={`${result.total_kol} KOL`}/>}
            {!isMobile&&hasHM&&<Chip label={`${hm.total_media} Media`} color={C.teal} bg={C.tealBg}/>}
            <button onClick={()=>setPage('form')} style={{ display:'flex', alignItems:'center', gap:5, background:C.bgGray2, border:`1px solid ${C.border}`, color:C.textSub, borderRadius:8, padding:isMobile?'8px 10px':'6px 14px', cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600 }}>
              {Icon.arrowLeft(13)} {isMobile?'Baru':'Buat baru'}
            </button>
          </div>
        </div>

        <div style={{ maxWidth:1100, margin:'0 auto', padding:`20px ${px}px 48px` }}>

          {/* Summary */}
          <div className="fu" style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:isMobile?'16px':'20px 24px', marginBottom:20, overflow:'hidden', position:'relative' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.blue},${C.teal})` }}/>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:'1px', marginBottom:6 }}>HASIL ANALISIS</div>
            <div style={{ fontSize:isMobile?18:22, fontWeight:800, color:C.text, letterSpacing:'-0.5px', marginBottom:10 }}>{result.campaign_name}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
              <Chip label={result.target_location} icon={Icon.pin(10)}/>
              <Chip label={`Avg ${result.avg_match_score}%`} color={C.green} bg={C.greenBg}/>
              {hasHM&&<Chip label={`${hm.total_media} Media`} color={C.teal} bg={C.tealBg} icon={Icon.newspaper(10)}/>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:isMobile?8:10 }}>
              {[{label:'Total KOL',value:result.total_kol,color:C.blue},{label:'Est. Min KOL',value:fmt(result.estimated_cost_min),color:C.gold},{label:'Avg Match',value:`${result.avg_match_score}%`,color:C.green}].map(s=>(
                <div key={s.label} style={{ background:C.bgGray, borderRadius:10, padding:isMobile?'10px 8px':'10px 14px', textAlign:'center' }}>
                  <div style={{ color:C.textMuted, fontSize:10, fontWeight:700, marginBottom:3 }}>{s.label}</div>
                  <div style={{ color:s.color, fontWeight:800, fontSize:isMobile?14:16 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* KOL */}
          <div className="fu" style={{ animationDelay:'.08s', marginBottom:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:3, height:20, background:C.blue, borderRadius:2 }}/>
              <h2 style={{ margin:0, fontSize:isMobile?15:17, fontWeight:800, color:C.text, letterSpacing:'-0.3px' }}>Rekomendasi KOL</h2>
              <Chip label={`${result.total_kol} KOL`}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(290px,1fr))', gap:12 }}>
              {result.recommended_kol.map((k,i)=><KOLCard key={k.id} kol={k} rank={i+1}/>)}
            </div>
          </div>

          {/* Homeless Media */}
          {hasHM&&(
            <div className="fu" style={{ animationDelay:'.16s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:3, height:20, background:C.teal, borderRadius:2 }}/>
                <h2 style={{ margin:0, fontSize:isMobile?15:17, fontWeight:800, color:C.text, letterSpacing:'-0.3px' }}>Homeless Media</h2>
                <Chip label={`${hm.total_media} Media`} color={C.teal} bg={C.tealBg} icon={Icon.newspaper(10)}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(290px,1fr))', gap:12 }}>
                {hm.recommended_media.map((m,i)=><HomelessMediaCard key={m.id} media={m} rank={i+1}/>)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FORM ───────────────────────────────────────────────────
  const modelReady=status?.model_trained, backendErr=status?.error;
  const hmLoaded=status?.homeless_media_loaded, hmCount=status?.homeless_media_count||0;
  const meta=status?.meta||{}, canSubmit=!!(form.campaign_name&&form.budget_min&&modelReady);

  const ssMap={ error:{bg:C.redBg,border:C.redBorder,color:C.red,icon:Icon.xCircle(13)}, loading:{bg:C.bgGray2,border:C.border,color:C.textSub,icon:Icon.loader(13)}, ok:{bg:C.greenBg,border:C.greenBorder,color:C.green,icon:Icon.check(13)}, warn:{bg:C.goldBg,border:C.goldBorder,color:C.gold,icon:Icon.alert(13)} };
  const ss=ssMap[backendErr?'error':status===null?'loading':modelReady?'ok':'warn'];
  const statusText=backendErr?'Backend tidak bisa dihubungi':status===null?'Menghubungi backend...':modelReady?`Model siap — ${meta.total_kol||0} KOL, ${meta.kol_with_er||0} dengan ER nyata`:'Model belum dilatih — upload KOL.xlsx lalu klik Latih Model';

  return (
    <div style={{ minHeight:'100vh', background:C.bgGray, fontFamily:"'DM Sans','Segoe UI',sans-serif", color:C.text }}>
      <style>{GLOBAL_CSS}</style>

      {/* Navbar */}
      <div style={{ background:C.bg, borderBottom:`1px solid ${C.border}`, padding:`0 ${px}px`, height:52, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>{Icon.bolt(14)}</div>
          <span style={{ fontWeight:800, fontSize:15, color:C.text, letterSpacing:'-0.3px' }}>DANA <span style={{ color:C.blue }}>AI</span></span>
          {!isMobile&&<><div style={{ width:1, height:18, background:C.border, margin:'0 6px' }}/><span style={{ color:C.textMuted, fontSize:12, fontWeight:500 }}>Campaign Planner</span></>}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {modelReady&&<Chip label={`${meta.total_kol||0} KOL`} color={C.green} bg={C.greenBg} icon={Icon.check(10)}/>}
          {hmLoaded&&!isMobile&&<Chip label={`${hmCount} Media`} color={C.teal} bg={C.tealBg} icon={Icon.newspaper(10)}/>}
        </div>
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:`24px ${px}px 60px` }}>

        {/* Hero */}
        <div className="fu" style={{ textAlign:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:isMobile?22:32, fontWeight:800, color:C.text, margin:'0 0 8px', letterSpacing:'-0.7px', lineHeight:1.2 }}>KOL & Media Recommender</h1>
          <p style={{ color:C.textSub, fontSize:isMobile?14:15, margin:0, lineHeight:1.6 }}>Temukan KOL dan Homeless Media terbaik untuk campaign DANA Indonesia</p>
        </div>

        {/* Setup */}
        <div className="fu" style={{ animationDelay:'.06s', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:isMobile?16:22, marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:8, background:ss.bg, border:`1px solid ${ss.border}`, borderRadius:8, padding:'10px 12px', marginBottom:16 }}>
            <span style={{ color:ss.color, display:'flex', alignItems:'center', marginTop:1, flexShrink:0 }}>{ss.icon}</span>
            <span style={{ color:ss.color, fontWeight:600, fontSize:13, lineHeight:1.4 }}>{statusText}</span>
          </div>

          <SectionLabel>Upload data</SectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
            <div style={{ background:C.bgGray, borderRadius:10, padding:12 }}>
              <div style={{ color:C.textSub, fontSize:10, fontWeight:700, letterSpacing:'.5px', marginBottom:8 }}>DATABASE KOL</div>
              <input ref={kolRef} type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleKOL}/>
              <button onClick={()=>kolRef.current.click()} disabled={!!backendErr} style={{ background:C.blueLight, border:`1px solid ${C.blue}33`, color:C.blue, borderRadius:8, padding:'11px', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:backendErr?.4:1 }}>
                {Icon.upload(13)} KOL.xlsx
              </button>
              {kolMsg&&<div style={{ marginTop:7, fontSize:11, lineHeight:1.5, color:kolMsg.startsWith('Error')?C.red:C.textSub }}>{kolMsg}</div>}
            </div>
            <div style={{ background:C.bgGray, borderRadius:10, padding:12 }}>
              <div style={{ color:C.textSub, fontSize:10, fontWeight:700, letterSpacing:'.5px', marginBottom:8 }}>INSIGHT / ER DATA</div>
              <input ref={insightRef} type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleInsight}/>
              <button onClick={()=>insightRef.current.click()} disabled={!!backendErr} style={{ background:C.greenBg, border:`1px solid ${C.green}33`, color:C.green, borderRadius:8, padding:'11px', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:backendErr?.4:1 }}>
                {Icon.chart(13)} insight.xlsx
              </button>
              {insightMsg&&<div style={{ marginTop:7, fontSize:11, lineHeight:1.5, color:insightMsg.startsWith('Error')?C.red:C.textSub }}>{insightMsg}</div>}
            </div>
            <div style={{ background:C.tealBg, border:`1px solid ${C.tealBorder}`, borderRadius:10, padding:12 }}>
              <div style={{ color:C.teal, fontSize:10, fontWeight:700, letterSpacing:'.5px', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>{Icon.newspaper(10)} HOMELESS MEDIA</div>
              <input ref={homelessRef} type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleHomeless}/>
              <button onClick={()=>homelessRef.current.click()} disabled={!!backendErr} style={{ background:C.bg, border:`1px solid ${C.teal}44`, color:C.teal, borderRadius:8, padding:'11px', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:backendErr?.4:1 }}>
                {Icon.upload(13)} HomelessMedia.xlsx
              </button>
              {hmLoaded&&!homelessMsg&&<div style={{ marginTop:7, fontSize:11, color:C.teal }}>{hmCount} media dimuat</div>}
              {homelessMsg&&<div style={{ marginTop:7, fontSize:11, lineHeight:1.5, color:homelessMsg.startsWith('Error')?C.red:C.teal }}>{homelessMsg}</div>}
            </div>
          </div>

          <button onClick={handleTrain} disabled={training||!!backendErr} style={{ background:training?C.bgGray2:C.blue, border:'none', color:training?C.textMuted:'#fff', borderRadius:10, padding:'13px', cursor:training||backendErr?'not-allowed':'pointer', fontSize:14, fontWeight:700, fontFamily:'inherit', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:backendErr?.4:1, transition:'background .15s' }}>
            {training?Icon.loader(15):Icon.cpu(14)} {training?'Training...':'Latih Model'}
          </button>
        </div>

        {/* Form card */}
        <div className="fu" style={{ animationDelay:'.12s', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:isMobile?16:22, display:'flex', flexDirection:'column', gap:18 }}>

          <div>
            <SectionLabel>Informasi Campaign</SectionLabel>
            <div style={{ display:'grid', gap:12 }}>
              <Field label="Nama Campaign *">
                <input style={INP} placeholder="Campaign Literasi Keuangan 2025" value={form.campaign_name} onChange={e=>setForm(f=>({...f,campaign_name:e.target.value}))}/>
              </Field>
              <Field label="Deskripsi">
                <textarea style={{...INP,minHeight:72,resize:'vertical'}} placeholder="Tujuan dan pesan utama campaign..." value={form.campaign_description} onChange={e=>setForm(f=>({...f,campaign_description:e.target.value}))}/>
              </Field>
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:12 }}>
                <Field label="Goals">
                  <select style={INP} value={form.goals} onChange={e=>setForm(f=>({...f,goals:e.target.value}))}>
                    <option value="">Pilih goals...</option>
                    <option value="brand awareness">Brand Awareness</option>
                    <option value="edukasi audience">Edukasi Audience</option>
                    <option value="product launch">Product Launch</option>
                    <option value="lead generation">Lead Generation</option>
                    <option value="engagement">Engagement</option>
                    <option value="conversion penjualan">Conversion / Penjualan</option>
                    <option value="community building">Community Building</option>
                    <option value="viral campaign">Viral Campaign</option>
                    <option value="repositioning brand">Repositioning Brand</option>
                  </select>
                </Field>
                <Field label="Target Audience">
                  <input style={INP} placeholder="Pemuda 20–30 tahun, urban" value={form.target_audience} onChange={e=>setForm(f=>({...f,target_audience:e.target.value}))}/>
                </Field>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:12 }}>
                <Field label="Topik / Niche">
                  <select style={INP} value={form.topics} onChange={e=>setForm(f=>({...f,topics:e.target.value}))}>
                    <option value="">Pilih topik...</option>
                    <option value="finance keuangan investasi">Finance &amp; Keuangan</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="beauty skincare">Beauty &amp; Skincare</option>
                    <option value="fashion">Fashion</option>
                    <option value="food kuliner">Food &amp; Kuliner</option>
                    <option value="travel wisata">Travel &amp; Wisata</option>
                    <option value="health wellness">Health &amp; Wellness</option>
                    <option value="teknologi gadget">Teknologi &amp; Gadget</option>
                    <option value="edukasi pendidikan">Edukasi</option>
                    <option value="entertainment hiburan">Entertainment</option>
                    <option value="parenting keluarga">Parenting &amp; Keluarga</option>
                    <option value="bisnis entrepreneurship">Bisnis &amp; Entrepreneurship</option>
                    <option value="gaming">Gaming</option>
                    <option value="olahraga fitness">Olahraga &amp; Fitness</option>
                  </select>
                </Field>
                <Field label="Lokasi Target">
                  <LocationDropdown value={form.location} onChange={val=>setForm(f=>({...f,location:val}))} locations={locations} loading={locLoading}/>
                </Field>
              </div>
            </div>
          </div>

          {/* Budget */}
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:18 }}>
            <SectionLabel>Budget</SectionLabel>
            <BudgetSlider budgetMin={form.budget_min} budgetMax={form.budget_max} onChangeMin={v=>setForm(f=>({...f,budget_min:v}))} onChangeMax={v=>setForm(f=>({...f,budget_max:v}))}/>
          </div>

          {/* Budget split */}
          <div style={{ background:C.bgGray, borderRadius:10, padding:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6 }}>
              <SectionLabel>Alokasi Budget</SectionLabel>
              <span style={{ color:C.textSub, fontSize:12 }}>KOL {form.budget_kol_pct}% — Media {100-form.budget_kol_pct}%</span>
            </div>
            <div style={{ display:'flex', height:5, borderRadius:3, overflow:'hidden', marginBottom:12 }}>
              <div style={{ width:`${form.budget_kol_pct}%`, background:C.gold, transition:'width .2s' }}/>
              <div style={{ flex:1, background:C.teal }}/>
            </div>
            <style>{`.spl{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:${C.border};outline:none;cursor:pointer;margin-bottom:14px}.spl::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${C.textMuted};box-shadow:0 1px 5px rgba(0,0,0,.15);cursor:pointer}.spl::-moz-range-thumb{width:24px;height:24px;border-radius:50%;border:2px solid ${C.textMuted};background:#fff;cursor:pointer}`}</style>
            <input type="range" className="spl" min={10} max={90} step={5} value={form.budget_kol_pct} onChange={e=>setForm(f=>({...f,budget_kol_pct:parseInt(e.target.value)}))}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ color:C.gold, fontSize:10, fontWeight:700, marginBottom:3 }}>KOL</div>
                <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{fmtBudget(Math.round((parseFloat(form.budget_min)||0)*form.budget_kol_pct/100))}</div>
                <div style={{ color:C.textMuted, fontSize:10 }}>s/d {fmtBudget(Math.round((parseFloat(form.budget_max)||0)*form.budget_kol_pct/100))}</div>
              </div>
              <div style={{ background:C.tealBg, border:`1px solid ${C.tealBorder}`, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ color:C.teal, fontSize:10, fontWeight:700, marginBottom:3 }}>Homeless Media</div>
                <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{fmtBudget(Math.round((parseFloat(form.budget_min)||0)*(100-form.budget_kol_pct)/100))}</div>
                <div style={{ color:C.textMuted, fontSize:10 }}>s/d {fmtBudget(Math.round((parseFloat(form.budget_max)||0)*(100-form.budget_kol_pct)/100))}</div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:18 }}>
            <SectionLabel>Preferensi</SectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:12, marginBottom:16 }}>
              <Field label="Platform">
                <select style={INP} value={form.content_type} onChange={e=>setForm(f=>({...f,content_type:e.target.value}))}>
                  <option value="semua">Semua Platform</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                </select>
              </Field>
              <Field label="Tier KOL">
                <select style={INP} value={form.preferred_tier} onChange={e=>setForm(f=>({...f,preferred_tier:e.target.value}))}>
                  <option value="semua">Semua Tier</option>
                  <option value="nano">Nano</option>
                  <option value="mikro">Mikro</option>
                  <option value="makro">Makro</option>
                  <option value="mega">Mega</option>
                </select>
              </Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[{label:'Jumlah KOL',key:'num_kol',max:50,color:C.blue,total:meta.total_kol||0},{label:'Jumlah Media',key:'num_media',max:20,color:C.teal,total:hmCount}].map(({label,key,max,color,total})=>(
                <div key={key}>
                  <label style={{ display:'block', color:C.textSub, fontSize:12, fontWeight:600, marginBottom:8 }}>{label}</label>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button onClick={()=>setForm(f=>({...f,[key]:Math.max(1,f[key]-1)}))} style={{ width:40, height:40, borderRadius:8, background:C.bgGray2, border:`1px solid ${C.border}`, color:C.textSub, fontWeight:700, fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>−</button>
                    <span style={{ fontSize:20, fontWeight:800, minWidth:24, textAlign:'center', color }}>{form[key]}</span>
                    <button onClick={()=>setForm(f=>({...f,[key]:Math.min(max,f[key]+1)}))} style={{ width:40, height:40, borderRadius:8, background:C.bgGray2, border:`1px solid ${C.border}`, color:C.textSub, fontWeight:700, fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
                    <span style={{ color:C.textMuted, fontSize:11 }}>dari {total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={!canSubmit} style={{ background:canSubmit?C.blue:C.bgGray2, border:'none', color:canSubmit?'#fff':C.textMuted, borderRadius:10, padding:'15px', fontSize:15, fontWeight:700, cursor:canSubmit?'pointer':'not-allowed', fontFamily:'inherit', opacity:canSubmit?1:.55, display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', letterSpacing:'-0.2px', transition:'background .15s' }}>
            {Icon.bolt(15)} Generate Rekomendasi {hmLoaded?'KOL + Homeless Media':'KOL'}
          </button>

          {!modelReady&&(
            <p style={{ textAlign:'center', color:C.textMuted, fontSize:12, margin:0, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <span style={{ display:'flex' }}>{Icon.alert(12)}</span>
              Upload KOL.xlsx lalu klik Latih Model terlebih dahulu
            </p>
          )}
        </div>

        <p style={{ textAlign:'center', color:C.textMuted, fontSize:11, marginTop:24 }}>DANA AI · HuggingFace Multilingual · KOL + Homeless Media Recommender</p>
      </div>
    </div>
  );
}