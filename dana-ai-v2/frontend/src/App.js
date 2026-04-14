import { useState, useEffect, useRef } from 'react';
import {
  checkStatus, uploadKOL, uploadInsight,
  uploadHomelessMedia, trainModel, getRecommendations, getLocations
} from './services/apiService';
import ResultPage from './components/ResultPage';
import ShareView, { encodeShareData } from './components/ShareView';
import LLMProfileBadge from './components/LLMProfileBadge';

const C = {
  blue:'#1A6FE8',blueDark:'#1259C4',blueLight:'#EBF2FD',
  text:'#111827',textSub:'#6B7280',textMuted:'#9CA3AF',
  border:'#E5E7EB',bg:'#FFFFFF',bgGray:'#F9FAFB',bgGray2:'#F3F4F6',
  green:'#059669',greenBg:'#ECFDF5',greenBorder:'#A7F3D0',
  red:'#DC2626',redBg:'#FEF2F2',redBorder:'#FCA5A5',
  gold:'#D97706',goldBg:'#FFFBEB',goldBorder:'#FCD34D',
  purple:'#7C3AED',purpleBg:'#F5F3FF',purpleBorder:'#DDD6FE',
  teal:'#0891B2',tealBg:'#ECFEFF',tealBorder:'#A5F3FC',
  orange:'#EA580C',orangeBg:'#FFF7ED',orangeBorder:'#FED7AA',
};

function useIsMobile(bp=640){const[m,s]=useState(()=>window.innerWidth<bp);useEffect(()=>{const h=()=>s(window.innerWidth<bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[bp]);return m;}

const Ic={
  bolt:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z"/></svg>,
  upload:(s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  cpu:(s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  chart:(s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  news:(s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>,
  check:(s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alert:(s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  xcircle:(s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  loader:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation:'spin 1s linear infinite'}}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
  user:(s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  link:(s=11)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  chevDown:(s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevUp:(s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  pin:(s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  x:(s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  share:(s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  wa:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  ig:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  tt:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>,
  bulb:(s=12)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>,
  extlink:(s=11)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

const fmt=n=>{if(!n||isNaN(n))return'Rp \u2013';const v=Math.round(n);if(v>=1e9)return`Rp ${(v/1e9).toFixed(1).replace(/\.0$/,'')} M`;if(v>=1e6)return`Rp ${(v/1e6).toFixed(1).replace(/\.0$/,'')} jt`;return`Rp ${v.toLocaleString('id-ID')}`;};
const fmtF=n=>{if(!n)return'\u2013';if(n>=1e6)return`${(n/1e6).toFixed(1).replace(/\.0$/,'')} M`;if(n>=1e3)return`${Math.round(n/1e3)} K`;return String(n);};
const fmtR=n=>(!n||isNaN(n))?'Rp \u2013':fmt(Math.round(n));
const fmtB=n=>{if(!n||isNaN(n))return'Rp 0';const v=Math.round(n);if(v>=1e9)return`Rp ${(v/1e9).toFixed(2).replace(/\.?0+$/,'')} M`;if(v>=1e6)return`Rp ${(v/1e6).toFixed(1).replace(/\.0$/,'')} juta`;return`Rp ${v.toLocaleString('id-ID')}`;};
const getPU=(u,sm)=>{if(!u)return null;const s=(sm||'').toLowerCase();const c=u.replace(/^@/,'').trim();if(s.includes('tiktok'))return`https://www.tiktok.com/@${c}`;return`https://www.instagram.com/${c}`;};

// Budget slider
const PRESETS=[{label:'Micro',min:1e6,max:5e6,desc:'1–5jt'},{label:'Kecil',min:5e6,max:25e6,desc:'5–25jt'},{label:'Medium',min:25e6,max:100e6,desc:'25–100jt'},{label:'Besar',min:100e6,max:500e6,desc:'100–500jt'},{label:'Premium',min:500e6,max:2e9,desc:'500jt–2M'}];
const SMAX=1000;
const l2v=p=>{const lo=Math.log(500000),hi=Math.log(2e9);return Math.round(Math.exp(lo+(p/SMAX)*(hi-lo)));};
const v2l=v=>{if(!v||v<=0)return 200;const lo=Math.log(500000),hi=Math.log(2e9);return Math.round(((Math.log(Math.max(500000,Math.min(2e9,v)))-lo)/(hi-lo))*SMAX);};
const getP=v=>{for(const p of PRESETS)if(v>=p.min&&v<=p.max)return p;return v<PRESETS[0].min?PRESETS[0]:PRESETS[PRESETS.length-1];};

function BudgetSlider({budgetMin,budgetMax,onChangeMin,onChangeMax}){
  const minV=parseFloat(budgetMin)||5e6,maxV=parseFloat(budgetMax)||50e6;
  const posMin=v2l(minV),posMax=v2l(maxV),ap=getP((minV+maxV)/2);
  const pMin=(posMin/SMAX)*100,pMax=(posMax/SMAX)*100;
  const[rMin,sRMin]=useState('');const[rMax,sRMax]=useState('');
  const[fMin,sFMin]=useState(false);const[fMax,sFMax]=useState(false);
  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <style>{`.bsl{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;background:transparent;pointer-events:none}.bsl::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:${C.blue};border:3px solid #fff;box-shadow:0 1px 8px rgba(26,111,232,.3);cursor:pointer;pointer-events:all}.bsl::-moz-range-thumb{width:24px;height:24px;border-radius:50%;border:3px solid #fff;background:${C.blue};cursor:pointer;pointer-events:all}`}</style>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {PRESETS.map(p=>{const on=p.min===minV&&p.max===maxV;return(<button key={p.label} onClick={()=>{onChangeMin(String(p.min));onChangeMax(String(p.max));sRMin('');sRMax('');}} style={{background:on?C.blue:C.bgGray2,border:`1px solid ${on?C.blue:C.border}`,color:on?'#fff':C.textSub,borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{p.label} <span style={{opacity:.65,fontSize:10}}>{p.desc}</span></button>);})}
      </div>
      <div style={{position:'relative',padding:'4px 0'}}>
        <div style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:0,right:0,height:4,borderRadius:2,pointerEvents:'none',background:`linear-gradient(to right,${C.bgGray2} 0%,${C.bgGray2} ${pMin}%,${C.blue} ${pMin}%,${C.blue} ${pMax}%,${C.bgGray2} ${pMax}%,${C.bgGray2} 100%)`}}/>
        <div style={{position:'relative',height:32,display:'flex',alignItems:'center'}}>
          <input type="range" className="bsl" min={0} max={SMAX} value={posMin} onChange={e=>{const v=l2v(parseInt(e.target.value));if(v<maxV){onChangeMin(String(v));sRMin('');}}} style={{position:'absolute',width:'100%',zIndex:posMin>SMAX*0.8?5:4}}/>
          <input type="range" className="bsl" min={0} max={SMAX} value={posMax} onChange={e=>{const v=l2v(parseInt(e.target.value));if(v>minV){onChangeMax(String(v));sRMax('');}}} style={{position:'absolute',width:'100%',zIndex:posMin>SMAX*0.8?4:5}}/>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center'}}>
        {[{label:'Min',val:minV,raw:rMin,focus:fMin,sR:sRMin,sF:sFMin,set:v=>onChangeMin(String(Math.min(v,maxV-1)))},null,{label:'Max',val:maxV,raw:rMax,focus:fMax,sR:sRMax,sF:sFMax,set:v=>onChangeMax(String(Math.max(v,minV+1)))}].map((item,i)=>{
          if(!item)return<span key="sep" style={{color:C.textMuted,fontSize:14,textAlign:'center'}}>—</span>;
          return(<div key={item.label} style={{border:`1px solid ${item.focus?C.blue:C.border}`,borderRadius:8,padding:'9px 12px',boxShadow:item.focus?`0 0 0 3px ${C.blue}15`:'none',transition:'border-color .15s'}}>
            <div style={{color:C.textMuted,fontSize:10,fontWeight:600,marginBottom:2}}>{item.label.toUpperCase()}</div>
            <div style={{color:C.blue,fontWeight:700,fontSize:13}}>{fmtB(item.val)}</div>
            <input type="text" inputMode="numeric" placeholder="custom Rp" value={item.raw} onChange={e=>{const r=e.target.value.replace(/[^0-9]/g,'');item.sR(r);const n=parseInt(r);if(r&&n>0)item.set(n);}} onFocus={()=>{item.sF(true);item.sR(String(Math.round(item.val)));}} onBlur={()=>{item.sF(false);item.sR('');}} style={{border:'none',outline:'none',background:'transparent',color:C.textSub,fontSize:11,width:'100%',fontFamily:'inherit',marginTop:2}}/>
          </div>);
        })}
      </div>
      <div style={{background:C.blueLight,borderRadius:8,padding:'9px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
        <span style={{color:C.textSub,fontSize:12}}>Range</span>
        <span style={{color:C.blue,fontWeight:700,fontSize:13}}>{fmtB(minV)} — {fmtB(maxV)}</span>
        <span style={{background:C.blue,color:'#fff',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600}}>{ap.label}</span>
      </div>
    </div>
  );
}

// Multi-Topic
const ALL_TOPICS=[
  {v:'lifestyle',l:'Lifestyle'},
  {v:'parenting keluarga',l:'Parenting & Keluarga'},
  {v:'mama ibu',l:'Mama / Ibu Rumah Tangga'},
  {v:'food kuliner',l:'Food & Kuliner'},
  {v:'travel wisata',l:'Travel & Wisata'},
  {v:'fashion',l:'Fashion'},
  {v:'beauty skincare',l:'Beauty & Skincare'},
  {v:'finance keuangan investasi',l:'Finance & Keuangan'},
  {v:'bisnis entrepreneurship umkm',l:'Bisnis & UMKM'},
  {v:'edukasi pendidikan',l:'Edukasi'},
  {v:'entertainment hiburan comedy',l:'Entertainment & Comedy'},
  {v:'gaming',l:'Gaming'},
  {v:'olahraga fitness',l:'Olahraga & Fitness'},
  {v:'teknologi gadget',l:'Teknologi'},
  {v:'kesehatan health',l:'Kesehatan'},
  {v:'otomotif',l:'Otomotif'},
];

function MultiTopicSelector({selected,onChange}){
  const toggle=v=>{if(selected.includes(v))onChange(selected.filter(x=>x!==v));else onChange([...selected,v]);};
  return(
    <div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {ALL_TOPICS.map(t=>{const on=selected.includes(t.v);return(
          <button key={t.v} onClick={()=>toggle(t.v)} style={{background:on?C.blue:C.bg,border:`1.5px solid ${on?C.blue:C.border}`,color:on?'#fff':C.textSub,borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:on?700:500,cursor:'pointer',fontFamily:'inherit',transition:'all .12s',display:'flex',alignItems:'center',gap:5}}>
            {on&&<span style={{display:'flex',opacity:.8}}>{Ic.check(10)}</span>}{t.l}
          </button>
        );})}
      </div>
      {selected.length>0&&<div style={{marginTop:8,padding:'8px 10px',background:C.blueLight,borderRadius:8,fontSize:12,color:C.blue,fontWeight:600}}>{selected.length} topik: {selected.map(v=>ALL_TOPICS.find(t=>t.v===v)?.l||v).join(', ')}</div>}
    </div>
  );
}

// Multi-Location
function MultiLocSelector({selected,onChange,locations,loading}){
  const[open,setOpen]=useState(false);const ref=useRef();
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
  const toggle=val=>{
    if(val==='nasional'){onChange(['nasional']);setOpen(false);return;}
    const wo=selected.filter(v=>v!=='nasional');
    if(wo.includes(val)){const n=wo.filter(v=>v!==val);onChange(n.length===0?['nasional']:n);}else onChange([...wo,val]);
  };
  const isNas=selected.includes('nasional')||selected.length===0;
  const label=isNas?'🌏 Nasional (Semua Indonesia)':`${selected.length} lokasi dipilih`;
  const grouped={};for(const loc of locations){const g=loc.group||'Lainnya';if(!grouped[g])grouped[g]=[];grouped[g].push(loc);}
  return(
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',background:C.bg,border:`1px solid ${open?C.blue:C.border}`,borderRadius:8,padding:'11px 12px',fontSize:14,color:C.text,cursor:'pointer',fontFamily:'inherit',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:open?`0 0 0 3px ${C.blue}15`:'none',transition:'all .12s'}}>
        <span style={{fontWeight:isNas?400:600}}>{loading?'Memuat lokasi...':label}</span>{Ic.chevDown(12)}
      </button>
      {!isNas&&selected.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:6}}>
        {selected.map(val=>{const loc=locations.find(l=>l.value===val);return(<span key={val} style={{background:C.blueLight,color:C.blue,borderRadius:16,padding:'3px 8px 3px 10px',fontSize:11,fontWeight:600,display:'inline-flex',alignItems:'center',gap:5}}>
          {Ic.pin(10)}{loc?.label||val}<button onClick={()=>toggle(val)} style={{background:'none',border:'none',cursor:'pointer',color:C.blue,display:'flex',padding:0}}>{Ic.x(10)}</button>
        </span>);})}
        <button onClick={()=>onChange(['nasional'])} style={{background:'none',border:'none',color:C.textMuted,fontSize:11,cursor:'pointer',fontFamily:'inherit',padding:'3px 6px',textDecoration:'underline'}}>Reset</button>
      </div>}
      {open&&<div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:200,maxHeight:300,overflowY:'auto'}}>
        <div onClick={()=>{toggle('nasional');setOpen(false);}} style={{padding:'10px 14px',cursor:'pointer',background:isNas?C.blueLight:'transparent',color:isNas?C.blue:C.text,fontWeight:isNas?700:400,fontSize:13,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
          {isNas&&Ic.check(12)}🌏 Nasional (Semua Indonesia)
        </div>
        {Object.entries(grouped).filter(([g])=>g!=='nasional').map(([group,locs])=>(
          <div key={group}>
            <div style={{padding:'6px 14px 4px',fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:'.5px',background:C.bgGray}}>{group.toUpperCase()}</div>
            {locs.filter(l=>l.value!=='nasional').map(loc=>{const on=selected.includes(loc.value);return(
              <div key={loc.value} onClick={()=>toggle(loc.value)} style={{padding:'9px 14px',cursor:'pointer',background:on?C.blueLight:'transparent',color:on?C.blue:C.text,fontSize:13,fontWeight:on?600:400,display:'flex',alignItems:'center',gap:8,transition:'background .08s'}}>
                {on?Ic.check(12):<span style={{width:12}}/>}{loc.label}
              </div>
            );})}
          </div>
        ))}
      </div>}
    </div>
  );
}

// Tier Split
const TIERS=[
  {k:'nano',l:'Nano',d:'< 10K',c:C.green,bg:C.greenBg,br:C.greenBorder},
  {k:'mikro',l:'Mikro',d:'10K–100K',c:C.blue,bg:C.blueLight,br:`${C.blue}33`},
  {k:'makro',l:'Makro',d:'100K–1M',c:C.gold,bg:C.goldBg,br:C.goldBorder},
  {k:'mega',l:'Mega',d:'> 1M',c:C.purple,bg:C.purpleBg,br:C.purpleBorder},
];

function TierSplit({mode,split,pref,onMode,onSplit,onPref,numKol}){
  const total=Object.values(split).reduce((a,b)=>a+(b||0),0);
  const valid=Math.abs(total-100)<1||total===0;
  const upd=(k,v)=>onSplit({...split,[k]:Math.max(0,Math.min(100,parseInt(v)||0))});
  return(
    <div style={{background:C.bgGray,borderRadius:10,padding:14}}>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[{v:'single',l:'Satu Tier'},{v:'split',l:'Split per Tier'}].map(({v,l})=>(
          <button key={v} onClick={()=>onMode(v)} style={{flex:1,background:mode===v?C.blue:C.bg,border:`1px solid ${mode===v?C.blue:C.border}`,color:mode===v?'#fff':C.textSub,borderRadius:8,padding:'9px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .12s'}}>{l}</button>
        ))}
      </div>
      {mode==='single'?(
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
          {[{v:'semua',l:'Semua Tier'},{v:'nano',l:'Nano < 10K'},{v:'mikro',l:'Mikro 10K–100K'},{v:'makro',l:'Makro 100K–1M'},{v:'mega',l:'Mega > 1M'}].map(({v,l})=>{
            const on=pref===v;const t=TIERS.find(x=>x.k===v);
            return(<button key={v} onClick={()=>onPref(v)} style={{background:on?(t?.bg||C.blueLight):C.bg,border:`1.5px solid ${on?(t?.c||C.blue):C.border}`,color:on?(t?.c||C.blue):C.textSub,borderRadius:8,padding:'9px 12px',fontSize:12,fontWeight:on?700:500,cursor:'pointer',fontFamily:'inherit',textAlign:'left',transition:'all .12s',gridColumn:v==='semua'?'1/-1':'auto'}}>{l}</button>);
          })}
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontSize:11,color:C.textMuted}}>Total harus = 100%. Sisa: <b style={{color:total>100?C.red:total===100?C.green:C.textSub}}>{100-total}%</b></div>
          <div style={{height:8,borderRadius:4,overflow:'hidden',display:'flex',gap:1}}>
            {TIERS.map(t=>{const p=split[t.k]||0;if(!p)return null;return<div key={t.k} style={{width:`${p}%`,background:t.c,transition:'width .2s'}}/>;})}{total<100&&<div style={{flex:1,background:C.bgGray2}}/>}
          </div>
          {TIERS.map(t=>{const p=split[t.k]||0;const nK=p?Math.max(1,Math.round(numKol*p/100)):0;return(
            <div key={t.k} style={{display:'flex',alignItems:'center',gap:10,background:C.bg,borderRadius:8,padding:'10px 12px',border:`1px solid ${p?t.br:C.border}`}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:t.c,flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:p?t.c:C.textSub}}>{t.l}</div><div style={{fontSize:10,color:C.textMuted}}>{t.d}</div></div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                {/* FIX: use JS string expression so unicode escape renders correctly */}
                <button onClick={()=>upd(t.k,p-10)} style={{width:28,height:28,borderRadius:6,background:C.bgGray2,border:`1px solid ${C.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.textSub,fontWeight:700,fontSize:16}}>{"\u2212"}</button>
                <div style={{textAlign:'center',minWidth:40}}><div style={{fontWeight:800,fontSize:14,color:p?t.c:C.textMuted}}>{p}%</div>{p>0&&<div style={{fontSize:10,color:C.textMuted}}>{nK} KOL</div>}</div>
                <button onClick={()=>upd(t.k,p+10)} style={{width:28,height:28,borderRadius:6,background:C.bgGray2,border:`1px solid ${C.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.textSub,fontWeight:700,fontSize:16}}>+</button>
              </div>
            </div>
          );})}
          {!valid&&total>0&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.red,display:'flex',alignItems:'center',gap:6}}>{Ic.alert(12)} Total harus tepat 100% (sekarang {total}%)</div>}
          {total===100&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:'8px 12px',fontSize:12,color:C.green,display:'flex',alignItems:'center',gap:6}}>{Ic.check(12)} Split valid — {numKol} KOL dibagi proporsional</div>}
        </div>
      )}
    </div>
  );
}

function ZeroBudgetBanner({active,onToggle}){return(
  <div onClick={onToggle} style={{cursor:'pointer',background:active?C.orangeBg:C.bgGray,border:`1.5px solid ${active?C.orangeBorder:C.border}`,borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,transition:'all .15s',userSelect:'none'}}>
    <div style={{width:36,height:20,borderRadius:10,background:active?C.orange:'#D1D5DB',transition:'background .2s',position:'relative',flexShrink:0}}>
      <div style={{position:'absolute',top:2,left:active?18:2,width:16,height:16,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,.2)',transition:'left .2s'}}/>
    </div>
    <div>
      <div style={{fontWeight:700,fontSize:13,color:active?C.orange:C.textSub}}>Mode Tier-Only (Budget = 0)</div>
      <div style={{fontSize:11,color:C.textMuted,marginTop:1}}>{active?'Budget diabaikan — fokus ke tier & kualitas KOL saja':'Aktifkan untuk cari KOL tanpa filter budget'}</div>
    </div>
  </div>
);}

function Chip({label,color=C.blue,bg=C.blueLight,icon=null}){return<span style={{background:bg,color,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600,display:'inline-flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>{icon&&<span style={{display:'flex'}}>{icon}</span>}{label}</span>;}
function ScoreBar({score,color=C.blue}){const[w,sW]=useState(0);useEffect(()=>{const t=setTimeout(()=>sW(score),200);return()=>clearTimeout(t);},[score]);return<div style={{height:4,background:C.bgGray2,borderRadius:2,overflow:'hidden',marginTop:4}}><div style={{width:`${w}%`,height:'100%',background:color,borderRadius:2,transition:'width 1s cubic-bezier(.4,0,.2,1)'}}/></div>;}
function StatBox({label,value,color=C.text}){return<div style={{background:C.bgGray,borderRadius:8,padding:'8px 10px'}}><div style={{color:C.textMuted,fontSize:10,fontWeight:600,marginBottom:2}}>{label}</div><div style={{color,fontSize:13,fontWeight:700}}>{value}</div></div>;}
function SL({children}){return<div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:'0.7px',textTransform:'uppercase',marginBottom:6}}>{children}</div>;}
function Field({label,children}){return<div><label style={{display:'block',color:C.textSub,fontSize:12,fontWeight:600,marginBottom:5}}>{label}</label>{children}</div>;}
const INP={background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:'11px 12px',fontSize:16,width:'100%',outline:'none',fontFamily:"'DM Sans','Segoe UI',sans-serif",boxSizing:'border-box',transition:'border-color .15s',WebkitAppearance:'none'};

function KOLCard({kol,rank}){
  const[open,sO]=useState(false);
  const rc=[C.gold,'#94A3B8','#CD7F32'][rank-1]||C.blue;
  const isTK=kol.social_media?.toLowerCase().includes('tiktok');
  const sc=kol.match_score>=70?C.green:kol.match_score>=40?C.gold:C.textMuted;
  const cSt={whatsapp:{bg:'#F0FDF4',border:C.greenBorder,text:'#15803D',I:Ic.wa},instagram:{bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',I:Ic.ig},tiktok:{bg:'#FFF1F2',border:'#FECDD3',text:'#BE123C',I:Ic.tt},profile:{bg:'#FDF2F8',border:'#F9A8D4',text:'#BE185D',I:Ic.ig}};
  const cc=cSt[kol.contact_action?.type]||cSt.instagram;
  const pu=getPU(kol.username,kol.social_media);
  const pc=isTK?'#BE123C':'#BE185D';
  const ti=TIERS.find(t=>t.k===['nano','mikro','makro','mega'][kol.tier-1]);
  return(
    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden'}}>
      <div style={{height:3,background:rank<=3?rc:C.blue}}/>
      <div style={{padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:8}}>
          <div style={{display:'flex',gap:10,alignItems:'center',minWidth:0}}>
            <div style={{width:38,height:38,borderRadius:8,background:isTK?'#FFF1F2':C.blueLight,display:'flex',alignItems:'center',justifyContent:'center',color:isTK?'#BE123C':C.blue,flexShrink:0}}>{isTK?Ic.tt(17):Ic.ig(17)}</div>
            <div style={{minWidth:0}}>
              <a href={pu} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,fontWeight:700,color:C.text,fontSize:14,textDecoration:'none',maxWidth:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',borderRadius:4,padding:'1px 0',transition:'color .15s'}} onMouseEnter={e=>{e.currentTarget.style.color=pc;}} onMouseLeave={e=>{e.currentTarget.style.color=C.text;}}>
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>@{kol.username}</span><span style={{flexShrink:0,opacity:.5}}>{Ic.extlink(10)}</span>
              </a>
              <div style={{color:C.textMuted,fontSize:11,marginTop:1}}>{kol.category}</div>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
            <span style={{background:rank<=3?rc:C.blueLight,color:rank<=3?'#fff':C.blue,borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700}}>#{rank}</span>
            {kol.matched_location&&kol.matched_location!=='nasional'&&<span style={{background:C.bgGray,color:C.textSub,borderRadius:20,padding:'2px 8px',fontSize:10,display:'flex',alignItems:'center',gap:3}}>{Ic.pin(9)}{kol.matched_location}</span>}
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,color:C.textMuted,fontWeight:600,letterSpacing:'.5px'}}>MATCH SCORE</span>
            <span style={{fontSize:18,fontWeight:800,color:sc}}>{kol.match_score}%</span>
          </div>
          <ScoreBar score={kol.match_score} color={sc}/>
        </div>
        {kol.has_real_er&&kol.avg_er_pct&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:'8px 10px',marginBottom:12,display:'flex',alignItems:'center',gap:6}}><span style={{color:C.green,display:'flex'}}>{Ic.check(13)}</span><span style={{color:C.green,fontSize:13,fontWeight:600}}>ER Aktual {kol.avg_er_pct}% — data nyata</span></div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <StatBox label="Followers" value={fmtF(kol.followers_num)||kol.followers}/>
          <StatBox label="Type" value={kol.type||'–'}/>
          <StatBox label="Rate Min" value={fmtR(kol.rate_min)} color={C.gold}/>
          <StatBox label="Lokasi" value={kol.location||'–'}/>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          <Chip label={kol.social_media||'–'}/>
          {kol.tier&&<Chip label={`Tier ${kol.tier} ${['Nano','Mikro','Makro','Mega'][kol.tier-1]||''}`} color={ti?.c||C.purple} bg={ti?.bg||C.purpleBg}/>}
          {kol.has_real_er&&<Chip label="Real ER" color={C.green} bg={C.greenBg} icon={Ic.check(10)}/>}
        </div>
        {kol.rate_card&&Object.keys(kol.rate_card).length>0&&<div style={{background:C.bgGray,borderRadius:8,padding:'10px 12px',marginBottom:10}}><div style={{color:C.textMuted,fontSize:10,fontWeight:700,letterSpacing:'.8px',marginBottom:6}}>RATE CARD</div>{Object.entries(kol.rate_card).map(([p,r])=><div key={p} style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{color:C.textSub,fontSize:12}}>{p}</span><span style={{color:C.gold,fontWeight:700,fontSize:12}}>{fmtR(r)}</span></div>)}</div>}
        {kol.reasoning&&<div style={{background:C.blueLight,borderRadius:8,padding:'8px 10px',marginBottom:10,display:'flex',gap:7,alignItems:'flex-start'}}><span style={{color:C.blue,flexShrink:0,marginTop:1}}>{Ic.bulb(12)}</span><span style={{color:C.blue,fontSize:12,lineHeight:1.6}}>{kol.reasoning}</span></div>}
        {kol.llm_profile&&kol.llm_profile.summary&&<LLMProfileBadge profile={kol.llm_profile} matchScore={kol.match_score}/>}
        {kol.score_detail&&<>
          <button onClick={()=>sO(o=>!o)} style={{background:'none',border:`1px solid ${C.border}`,color:C.textSub,borderRadius:8,padding:'10px 12px',cursor:'pointer',fontSize:12,fontFamily:'inherit',width:'100%',marginBottom:open?8:0,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            {open?Ic.chevUp(11):Ic.chevDown(11)}{open?'Sembunyikan detail':'Detail scoring'}
          </button>
          {open&&<div style={{background:C.bgGray,borderRadius:8,padding:'10px 12px'}}>{Object.entries(kol.score_detail).map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}><span style={{color:C.textSub,fontSize:12}}>{k}</span><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:50,height:3,background:C.bgGray2,borderRadius:2,overflow:'hidden'}}><div style={{width:`${v}%`,height:'100%',background:v>=70?C.green:v>=40?C.gold:C.textMuted,borderRadius:2}}/></div><span style={{color:C.textSub,fontSize:12,minWidth:32,textAlign:'right'}}>{v}%</span></div></div>)}</div>}
        </>}
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
          {kol.pic_name&&<div style={{display:'flex',alignItems:'center',gap:5,color:C.textMuted,fontSize:12,marginBottom:10}}>{Ic.user(12)} PIC: <span style={{color:C.textSub,fontWeight:600}}>{kol.pic_name}</span></div>}
          {kol.contact_action?<a href={kol.contact_action.url} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:cc.bg,border:`1px solid ${cc.border}`,color:cc.text,borderRadius:10,padding:'12px 14px',fontSize:14,fontWeight:700,textDecoration:'none',fontFamily:'inherit'}}>{cc.I(14)} {kol.contact_action.label} <span style={{display:'flex',opacity:.6}}>{Ic.link(11)}</span></a>:<div style={{color:C.textMuted,fontSize:12,textAlign:'center'}}>Tidak ada kontak</div>}
        </div>
      </div>
    </div>
  );
}

const MSGS=['Memproses campaign...','HuggingFace encoding query...','Profiling KOL dengan Groq AI...','Semantic matching KOL...','Menyusun rekomendasi final...'];
function LoadingScreen({msg}){return(
  <div style={{minHeight:'100vh',background:C.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28,fontFamily:"'DM Sans','Segoe UI',sans-serif",padding:'0 20px'}}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:40,height:40,borderRadius:10,background:C.blue,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>{Ic.bolt(18)}</div><span style={{fontWeight:800,fontSize:24,color:C.text,letterSpacing:'-0.5px'}}>DANA <span style={{color:C.blue}}>AI</span></span></div>
    <div style={{position:'relative',width:48,height:48}}><div style={{position:'absolute',inset:0,borderRadius:'50%',border:`3px solid ${C.border}`}}/><div style={{position:'absolute',inset:0,borderRadius:'50%',border:'3px solid transparent',borderTopColor:C.blue,animation:'spin 0.9s linear infinite'}}/></div>
    <p style={{color:C.textSub,fontSize:15,animation:'pulse 1.5s ease infinite',margin:0,textAlign:'center',maxWidth:280}}>{msg}</p>
  </div>
);}

export default function App(){
  const isMobile=useIsMobile();const px=isMobile?16:24;
  const[page,sPage]=useState('form');const[status,sStatus]=useState(null);const[result,sResult]=useState(null);
  const[msg,sMsg]=useState(MSGS[0]);const[kolMsg,sKolMsg]=useState('');const[insMsg,sInsMsg]=useState('');const[hmMsg,sHmMsg]=useState('');
  const[training,sTrn]=useState(false);const[locs,sLocs]=useState([]);const[locLoad,sLocLoad]=useState(false);
  const[updateMode,sUpdateMode]=useState(false);
  const[shareModal,sShareModal]=useState(false);const[shareUrl,sShareUrl]=useState('');const[shareCop,sShareCop]=useState(false);
  const[form,sForm]=useState({
    campaign_name:'',campaign_description:'',goals:'',target_audience:'',
    selTopics:[],selLocs:['nasional'],
    budget_min:'5000000',budget_max:'50000000',budget_kol_pct:70,
    num_kol:5,num_media:3,content_type:'semua',
    tierMode:'single',preferred_tier:'semua',
    tier_split:{nano:0,mikro:0,makro:0,mega:0},
    zeroBudget:false,
  });
  const kolRef=useRef();const insRef=useRef();const hmRef=useRef();const midx=useRef(0);
  useEffect(()=>{checkStatus().then(sStatus).catch(()=>sStatus({error:true}));},[]);
  useEffect(()=>{if(!status||status.error)return;loadL();},[status]);
  const loadL=async()=>{sLocLoad(true);try{const d=await getLocations();sLocs(d.locations||[]);}catch{sLocs([{value:'nasional',label:'Nasional',group:'nasional'}]);}sLocLoad(false);};
  useEffect(()=>{if(page!=='loading')return;const iv=setInterval(()=>{midx.current=(midx.current+1)%MSGS.length;sMsg(MSGS[midx.current]);},1100);return()=>clearInterval(iv);},[page]);
  const hKOL=async e=>{const f=e.target.files[0];if(!f)return;sKolMsg('Uploading...');try{await uploadKOL(f);sKolMsg('Upload berhasil. Klik Latih Model.');}catch(err){sKolMsg('Error: '+err.message);}};
  const hIns=async e=>{const f=e.target.files[0];if(!f)return;sInsMsg('Uploading...');try{const r=await uploadInsight(f);sInsMsg(r.er_extracted?'Upload berhasil, ER diekstrak.':'Upload berhasil.');}catch(err){sInsMsg('Error: '+err.message);}};
  const hHM=async e=>{const f=e.target.files[0];if(!f)return;sHmMsg('Uploading...');try{const r=await uploadHomelessMedia(f);if(r.parsed&&r.homeless_media_count>0){sHmMsg(`${r.homeless_media_count} media dimuat.`);const s=await checkStatus();sStatus(s);loadL();}else{sHmMsg('Parsing gagal: '+(r.log?r.log.trim().split('\n').pop():'Error'));}}catch(err){sHmMsg('Error: '+err.message);}};
  const hTrain=async()=>{sTrn(true);sKolMsg('Training...');try{await trainModel();const s=await checkStatus();sStatus(s);const m=s.meta||{};sKolMsg(`Model siap — ${m.total_kol||0} KOL`);loadL();}catch(err){sKolMsg('Error: '+err.message);}sTrn(false);};
  const hSubmit=async()=>{
    if(!form.campaign_name)return;if(!form.zeroBudget&&!form.budget_min)return;
    sPage('loading');midx.current=0;sMsg(MSGS[0]);
    const mid=form.zeroBudget?0:Math.round((parseFloat(form.budget_min)+parseFloat(form.budget_max))/2);
    const topics=form.selTopics.join(', ');
    const splitTotal=Object.values(form.tier_split).reduce((a,b)=>a+(b||0),0);
    const tierSplit=form.tierMode==='split'&&Math.abs(splitTotal-100)<1?form.tier_split:undefined;
    const locs2=form.selLocs.length>0?form.selLocs:['nasional'];
    try{
      const d=await getRecommendations({campaign_name:form.campaign_name,campaign_description:form.campaign_description,goals:form.goals,topics,target_audience:form.target_audience,location:locs2[0],locations:locs2.length>1?locs2:undefined,budget:String(mid),budget_kol_pct:form.budget_kol_pct/100,num_kol:form.num_kol,num_media:form.num_media,content_type:form.content_type,preferred_tier:form.tierMode==='single'?form.preferred_tier:'semua',tier_budget_split:tierSplit});
      sResult(d);sPage('result');
    }catch(err){alert(err.message);sPage('form');}
  };
  const genShare=()=>{if(!result)return;const encoded=encodeShareData({...result,_sharedAt:new Date().toISOString()});if(!encoded){alert('Gagal.');return;}const base=window.location.origin+window.location.pathname;sShareUrl(`${base}?share=${encoded}`);sShareModal(true);sShareCop(false);};
  const hCopyShare=async()=>{try{await navigator.clipboard.writeText(shareUrl);}catch{const el=document.createElement('textarea');el.value=shareUrl;document.body.appendChild(el);el.select();document.execCommand('copy');document.body.removeChild(el);}sShareCop(true);setTimeout(()=>sShareCop(false),2500);};
  if(new URLSearchParams(window.location.search).has('share'))return<ShareView/>;
  if(page==='loading')return<LoadingScreen msg={msg}/>;
  const GCS=`@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}.fu{animation:fu .35s ease forwards}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}input,select,textarea{font-family:"DM Sans","Segoe UI",sans-serif;-webkit-appearance:none;appearance:none}input:focus,textarea:focus,select:focus{border-color:${C.blue}!important;outline:none;box-shadow:0 0 0 3px ${C.blue}15}select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px!important;cursor:pointer}select option{color:${C.text};background:#fff}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:2px}button{touch-action:manipulation}a{touch-action:manipulation}`;
  if(page==='result'&&result)return<ResultPage result={result} isMobile={isMobile} px={px} onNew={()=>sPage('form')} onShare={genShare} shareModal={shareModal} shareUrl={shareUrl} shareCopied={shareCop} onCopyShare={hCopyShare} onCloseShare={()=>sShareModal(false)}/>;
  const modelReady=status?.model_trained,backendErr=status?.error,hmLoaded=status?.homeless_media_loaded,hmCount=status?.homeless_media_count||0,meta=status?.meta||{};
  const canSub=!!(form.campaign_name&&(form.zeroBudget||form.budget_min)&&modelReady);
  const ssM={error:{bg:C.redBg,border:C.redBorder,color:C.red,icon:Ic.xcircle(13)},loading:{bg:C.bgGray2,border:C.border,color:C.textSub,icon:Ic.loader(13)},ok:{bg:C.greenBg,border:C.greenBorder,color:C.green,icon:Ic.check(13)},warn:{bg:C.goldBg,border:C.goldBorder,color:C.gold,icon:Ic.alert(13)}};
  const ss=ssM[backendErr?'error':status===null?'loading':modelReady?'ok':'warn'];
  const stTxt=backendErr?'Backend tidak bisa dihubungi':status===null?'Menghubungi backend...':modelReady?`Model siap — ${meta.total_kol||0} KOL, ${meta.kol_with_er||0} dengan ER nyata`:'Model belum dilatih — upload KOL.xlsx lalu klik Latih Model';
  const sf=v=>sForm(f=>({...f,...v}));
  return(
    <div style={{minHeight:'100vh',background:C.bgGray,fontFamily:"'DM Sans','Segoe UI',sans-serif",color:C.text}}>
      <style>{GCS}</style>
      <div style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:`0 ${px}px`,height:52,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:30,height:30,borderRadius:7,background:C.blue,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>{Ic.bolt(14)}</div>
          <span style={{fontWeight:800,fontSize:15,color:C.text,letterSpacing:'-0.3px'}}>DANA <span style={{color:C.blue}}>AI</span></span>
          {!isMobile&&<><div style={{width:1,height:18,background:C.border,margin:'0 6px'}}/><span style={{color:C.textMuted,fontSize:12}}>Campaign Planner v3</span></>}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {modelReady&&<Chip label={`${meta.total_kol||0} KOL`} color={C.green} bg={C.greenBg} icon={Ic.check(10)}/>}
          {hmLoaded&&!isMobile&&<Chip label={`${hmCount} Media`} color={C.teal} bg={C.tealBg} icon={Ic.news(10)}/>}
        </div>
      </div>
      <div style={{maxWidth:700,margin:'0 auto',padding:`24px ${px}px 60px`}}>
        <div className="fu" style={{textAlign:'center',marginBottom:24}}>
          <h1 style={{fontSize:isMobile?22:32,fontWeight:800,color:C.text,margin:'0 0 8px',letterSpacing:'-0.7px',lineHeight:1.2}}>KOL & Media Recommender</h1>
          <p style={{color:C.textSub,fontSize:isMobile?14:15,margin:0,lineHeight:1.6}}>Temukan KOL dan Homeless Media terbaik untuk campaign DANA Indonesia</p>
        </div>
        {/* Setup */}
        <div className="fu" style={{animationDelay:'.06s',background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:isMobile?16:22,marginBottom:12}}>
          {/* Status bar */}
          <div style={{display:'flex',alignItems:'flex-start',gap:8,background:ss.bg,border:`1px solid ${ss.border}`,borderRadius:8,padding:'10px 12px',marginBottom:16}}>
            <span style={{color:ss.color,display:'flex',alignItems:'center',marginTop:1,flexShrink:0}}>{ss.icon}</span>
            <span style={{color:ss.color,fontWeight:600,fontSize:13,lineHeight:1.4,flex:1}}>{stTxt}</span>
          </div>
          {/* Update Data Toggle */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:updateMode?16:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:13,fontWeight:700,color:C.text}}>Update Data</span>
              <span style={{fontSize:11,color:C.textMuted,background:updateMode?'#FEF3C7':'#F3F4F6',border:`1px solid ${updateMode?'#F59E0B33':'#E5E7EB'}`,borderRadius:4,padding:'1px 6px',fontWeight:600,color:updateMode?'#92400E':C.textMuted}}>{updateMode?'ON':'OFF'}</span>
            </div>
            <button
              onClick={()=>{sUpdateMode(v=>!v);if(updateMode){sKolMsg('');sInsMsg('');sHmMsg('');}}}
              disabled={!!backendErr}
              style={{
                width:44,height:24,borderRadius:12,border:'none',cursor:backendErr?'not-allowed':'pointer',
                background:updateMode?C.blue:'#D1D5DB',
                transition:'background .2s',position:'relative',flexShrink:0,opacity:backendErr?.5:1
              }}
            >
              <span style={{
                position:'absolute',top:3,left:updateMode?22:3,width:18,height:18,
                borderRadius:'50%',background:'#fff',transition:'left .2s',
                boxShadow:'0 1px 3px rgba(0,0,0,.2)',display:'block'
              }}/>
            </button>
          </div>
          {/* Upload section — hanya tampil kalau updateMode ON */}
          {updateMode&&(
            <>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:10,marginBottom:14}}>
                <div style={{background:C.bgGray,borderRadius:10,padding:12}}>
                  <div style={{color:C.textSub,fontSize:10,fontWeight:700,letterSpacing:'.5px',marginBottom:8}}>DATABASE KOL</div>
                  <input ref={kolRef} type="file" accept=".xlsx" style={{display:'none'}} onChange={hKOL}/>
                  <button onClick={()=>kolRef.current.click()} disabled={!!backendErr} style={{background:C.blueLight,border:`1px solid ${C.blue}33`,color:C.blue,borderRadius:8,padding:'11px',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:backendErr?.4:1}}>{Ic.upload(13)} KOL.xlsx</button>
                  {kolMsg&&<div style={{marginTop:7,fontSize:11,lineHeight:1.5,color:kolMsg.startsWith('Error')?C.red:C.textSub}}>{kolMsg}</div>}
                </div>
                <div style={{background:C.bgGray,borderRadius:10,padding:12}}>
                  <div style={{color:C.textSub,fontSize:10,fontWeight:700,letterSpacing:'.5px',marginBottom:8}}>INSIGHT / ER DATA</div>
                  <input ref={insRef} type="file" accept=".xlsx" style={{display:'none'}} onChange={hIns}/>
                  <button onClick={()=>insRef.current.click()} disabled={!!backendErr} style={{background:C.greenBg,border:`1px solid ${C.green}33`,color:C.green,borderRadius:8,padding:'11px',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:backendErr?.4:1}}>{Ic.chart(13)} insight.xlsx</button>
                  {insMsg&&<div style={{marginTop:7,fontSize:11,lineHeight:1.5,color:insMsg.startsWith('Error')?C.red:C.textSub}}>{insMsg}</div>}
                </div>
                <div style={{background:C.tealBg,border:`1px solid ${C.tealBorder}`,borderRadius:10,padding:12}}>
                  <div style={{color:C.teal,fontSize:10,fontWeight:700,letterSpacing:'.5px',marginBottom:8,display:'flex',alignItems:'center',gap:4}}>{Ic.news(10)} HOMELESS MEDIA</div>
                  <input ref={hmRef} type="file" accept=".xlsx" style={{display:'none'}} onChange={hHM}/>
                  <button onClick={()=>hmRef.current.click()} disabled={!!backendErr} style={{background:C.bg,border:`1px solid ${C.teal}44`,color:C.teal,borderRadius:8,padding:'11px',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:backendErr?.4:1}}>{Ic.upload(13)} HomelessMedia.xlsx</button>
                  {hmLoaded&&!hmMsg&&<div style={{marginTop:7,fontSize:11,color:C.teal}}>{hmCount} media dimuat</div>}
                  {hmMsg&&<div style={{marginTop:7,fontSize:11,lineHeight:1.5,color:hmMsg.startsWith('Error')?C.red:C.teal}}>{hmMsg}</div>}
                </div>
              </div>
              <button onClick={hTrain} disabled={training||!!backendErr} style={{background:training?C.bgGray2:C.blue,border:'none',color:training?C.textMuted:'#fff',borderRadius:10,padding:'13px',cursor:training||backendErr?'not-allowed':'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:backendErr?.4:1,transition:'background .15s'}}>
                {training?Ic.loader(15):Ic.cpu(14)} {training?'Training...':'Latih Model'}
              </button>
              {/* Zero Budget & Community pools */}
              <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
                <div style={{color:C.textSub,fontSize:10,fontWeight:700,letterSpacing:'.5px',marginBottom:10}}>DATA TANPA RATE CARD</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
                  <div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:10,padding:12}}>
                    <div style={{color:'#C2410C',fontSize:10,fontWeight:700,letterSpacing:'.5px',marginBottom:8}}>KOL HOMELESS FREE</div>
                    <div style={{color:'#9A3412',fontSize:11,marginBottom:8,lineHeight:1.4}}>KOL tanpa rate card — muncul saat budget = 0</div>
                    <input ref={kolFreeRef} type="file" accept=".xlsx" style={{display:'none'}} onChange={hKolFree}/>
                    <button onClick={()=>kolFreeRef.current.click()} disabled={!!backendErr} style={{background:'#FEF3C7',border:'1px solid #F59E0B44',color:'#92400E',borderRadius:8,padding:'11px',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:backendErr?.4:1}}>{Ic.upload(13)} KOLHomeless.xlsx</button>
                    {kolFreeMsg&&<div style={{marginTop:7,fontSize:11,lineHeight:1.5,color:kolFreeMsg.startsWith('Error')?C.red:'#92400E'}}>{kolFreeMsg}</div>}
                  </div>
                  <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,padding:12}}>
                    <div style={{color:'#15803D',fontSize:10,fontWeight:700,letterSpacing:'.5px',marginBottom:8}}>KOMUNITAS</div>
                    <div style={{color:'#166534',fontSize:11,marginBottom:8,lineHeight:1.4}}>Komunitas UMKM/fintech — section tersendiri di hasil</div>
                    <input ref={commRef} type="file" accept=".xlsx" style={{display:'none'}} onChange={hComm}/>
                    <button onClick={()=>commRef.current.click()} disabled={!!backendErr} style={{background:'#DCFCE7',border:'1px solid #4ADE8044',color:'#15803D',borderRadius:8,padding:'11px',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:backendErr?.4:1}}>{Ic.upload(13)} Community.xlsx</button>
                    {commMsg&&<div style={{marginTop:7,fontSize:11,lineHeight:1.5,color:commMsg.startsWith('Error')?C.red:'#15803D'}}>{commMsg}</div>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Main Form */}
        <div className="fu" style={{animationDelay:'.12s',background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:isMobile?16:22,display:'flex',flexDirection:'column',gap:20}}>
          {/* Info Campaign */}
          <div>
            <SL>Informasi Campaign</SL>
            <div style={{display:'grid',gap:12}}>
              <Field label="Nama Campaign *"><input style={INP} placeholder="Campaign Literasi Keuangan 2025" value={form.campaign_name} onChange={e=>sf({campaign_name:e.target.value})}/></Field>
              <Field label="Deskripsi"><textarea style={{...INP,minHeight:72,resize:'vertical'}} placeholder="Tujuan dan pesan utama campaign..." value={form.campaign_description} onChange={e=>sf({campaign_description:e.target.value})}/></Field>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12}}>
                <Field label="Goals">
                  <select style={INP} value={form.goals} onChange={e=>sf({goals:e.target.value})}>
                    <option value="">Pilih goals...</option>
                    <option value="brand awareness">Brand Awareness</option>
                    <option value="edukasi">Edukasi Audience</option>
                    <option value="product launch">Product Launch</option>
                    <option value="engagement">Engagement</option>
                    <option value="conversion">Conversion / Install</option>
                    <option value="transaksi">Dorong Transaksi</option>
                    <option value="promo">Promo / Cashback</option>
                    <option value="umkm">Akuisisi UMKM (QRIS)</option>
                    <option value="retention">Retention User Lama</option>
                  </select>
                </Field>
                {/* FIX: use actual dash characters instead of \u2013 escape in placeholder */}
                <Field label="Target Audience"><input style={INP} placeholder="Pemuda 20–30 tahun, urban" value={form.target_audience} onChange={e=>sf({target_audience:e.target.value})}/></Field>
              </div>
            </div>
          </div>
          {/* Multi-Topic */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:18}}>
            <SL>Topik / Niche KOL</SL>
            <div style={{fontSize:12,color:C.textSub,marginBottom:10}}>Pilih satu atau beberapa niche — LLM akan profiling cross-niche otomatis</div>
            <MultiTopicSelector selected={form.selTopics} onChange={v=>sf({selTopics:v})}/>
          </div>
          {/* Multi-Location */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:18}}>
            <SL>Lokasi Target</SL>
            <div style={{fontSize:12,color:C.textSub,marginBottom:10}}>Pilih satu atau beberapa kota — hasil digabung & dedupe otomatis</div>
            <MultiLocSelector selected={form.selLocs} onChange={v=>sf({selLocs:v})} locations={locs} loading={locLoad}/>
          </div>
          {/* Budget */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:18}}>
            <SL>Budget</SL>
            <ZeroBudgetBanner active={form.zeroBudget} onToggle={()=>sf({zeroBudget:!form.zeroBudget})}/>
            {!form.zeroBudget&&<div style={{marginTop:14}}><BudgetSlider budgetMin={form.budget_min} budgetMax={form.budget_max} onChangeMin={v=>sf({budget_min:v})} onChangeMax={v=>sf({budget_max:v})}/></div>}
          </div>
          {/* Budget KOL vs Media */}
          {!form.zeroBudget&&<div style={{background:C.bgGray,borderRadius:10,padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:6}}><SL>Alokasi Budget</SL><span style={{color:C.textSub,fontSize:12}}>KOL {form.budget_kol_pct}% — Media {100-form.budget_kol_pct}%</span></div>
            <div style={{display:'flex',height:5,borderRadius:3,overflow:'hidden',marginBottom:12}}><div style={{width:`${form.budget_kol_pct}%`,background:C.gold,transition:'width .2s'}}/><div style={{flex:1,background:C.teal}}/></div>
            <style>{`.spl{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:${C.border};outline:none;cursor:pointer;margin-bottom:14px}.spl::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${C.textMuted};box-shadow:0 1px 5px rgba(0,0,0,.15);cursor:pointer}.spl::-moz-range-thumb{width:24px;height:24px;border-radius:50%;border:2px solid ${C.textMuted};background:#fff;cursor:pointer}`}</style>
            <input type="range" className="spl" min={10} max={90} step={5} value={form.budget_kol_pct} onChange={e=>sf({budget_kol_pct:parseInt(e.target.value)})}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div style={{background:C.goldBg,border:`1px solid ${C.goldBorder}`,borderRadius:8,padding:'10px 12px'}}><div style={{color:C.gold,fontSize:10,fontWeight:700,marginBottom:3}}>KOL</div><div style={{color:C.text,fontWeight:700,fontSize:14}}>{fmtB(Math.round((parseFloat(form.budget_min)||0)*form.budget_kol_pct/100))}</div><div style={{color:C.textMuted,fontSize:10}}>s/d {fmtB(Math.round((parseFloat(form.budget_max)||0)*form.budget_kol_pct/100))}</div></div>
              <div style={{background:C.tealBg,border:`1px solid ${C.tealBorder}`,borderRadius:8,padding:'10px 12px'}}><div style={{color:C.teal,fontSize:10,fontWeight:700,marginBottom:3}}>Homeless Media</div><div style={{color:C.text,fontWeight:700,fontSize:14}}>{fmtB(Math.round((parseFloat(form.budget_min)||0)*(100-form.budget_kol_pct)/100))}</div><div style={{color:C.textMuted,fontSize:10}}>s/d {fmtB(Math.round((parseFloat(form.budget_max)||0)*(100-form.budget_kol_pct)/100))}</div></div>
            </div>
          </div>}
          {/* Tier */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:18}}>
            <SL>Preferensi Tier KOL</SL>
            <div style={{fontSize:12,color:C.textSub,marginBottom:10}}>{form.zeroBudget?'Mode tier-only aktif — tier bersifat mutlak (hard filter)':'Split budget antar tier atau pilih satu tier'}</div>
            <TierSplit mode={form.tierMode} split={form.tier_split} pref={form.preferred_tier} onMode={v=>sf({tierMode:v})} onSplit={v=>sf({tier_split:v})} onPref={v=>sf({preferred_tier:v})} numKol={form.num_kol}/>
          </div>
          {/* Platform + Count */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:18}}>
            <SL>Preferensi Lainnya</SL>
            <div style={{marginBottom:14}}><Field label="Platform"><select style={INP} value={form.content_type} onChange={e=>sf({content_type:e.target.value})}><option value="semua">Semua Platform</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option></select></Field></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[{label:'Jumlah KOL',key:'num_kol',max:50,color:C.blue,total:meta.total_kol||0},{label:'Jumlah Media',key:'num_media',max:20,color:C.teal,total:hmCount,hide:form.zeroBudget}].filter(x=>!x.hide).map(({label,key,max,color,total})=>(
                <div key={key}>
                  <label style={{display:'block',color:C.textSub,fontSize:12,fontWeight:600,marginBottom:8}}>{label}</label>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {/* FIX: wrap unicode minus in JS expression */}
                    <button onClick={()=>sf({[key]:Math.max(1,form[key]-1)})} style={{width:40,height:40,borderRadius:8,background:C.bgGray2,border:`1px solid ${C.border}`,color:C.textSub,fontWeight:700,fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{"\u2212"}</button>
                    <span style={{fontSize:20,fontWeight:800,minWidth:24,textAlign:'center',color}}>{form[key]}</span>
                    <button onClick={()=>sf({[key]:Math.min(max,form[key]+1)})} style={{width:40,height:40,borderRadius:8,background:C.bgGray2,border:`1px solid ${C.border}`,color:C.textSub,fontWeight:700,fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
                    <span style={{color:C.textMuted,fontSize:11}}>dari {total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Submit */}
          <button onClick={hSubmit} disabled={!canSub} style={{background:canSub?C.blue:C.bgGray2,border:'none',color:canSub?'#fff':C.textMuted,borderRadius:10,padding:'15px',fontSize:15,fontWeight:700,cursor:canSub?'pointer':'not-allowed',fontFamily:'inherit',opacity:canSub?1:.55,display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',letterSpacing:'-0.2px',transition:'background .15s'}}>
            {Ic.bolt(15)} Generate Rekomendasi {hmLoaded&&!form.zeroBudget?'KOL + Media':'KOL'}
          </button>
          {!modelReady&&<p style={{textAlign:'center',color:C.textMuted,fontSize:12,margin:0,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><span style={{display:'flex'}}>{Ic.alert(12)}</span> Aktifkan toggle Update Data → upload KOL.xlsx → Latih Model</p>}
        </div>
        {/* FIX: use actual middle dot · instead of \u00b7 escape in JSX text */}
        <p style={{textAlign:'center',color:C.textMuted,fontSize:11,marginTop:24}}>DANA AI v3 · Multi-Location · Multi-Topic · Tier Split · Groq LLM Profiling</p>
      </div>
    </div>
  );
}