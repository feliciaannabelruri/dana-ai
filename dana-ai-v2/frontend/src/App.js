import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import SetupPanel from './components/SetupPanel';
import CampaignForm from './components/CampaignForm';
import ResultPage from './components/ResultPage';
import LoadingScreen from './components/LoadingScreen';
import ShareView, { encodeShareData } from './components/ShareView';
import {
  checkStatus, uploadKOL, uploadInsight,
  uploadHomelessMedia, trainModel, getRecommendations, getLocations,
  uploadKOLHomelessFree, uploadCommunity, suggestParams, getExchangeRates
} from './services/apiService';
import { C, Ic } from './components/common/Atoms';

const GCS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  .fu { animation: fu .4s ease-out both; }
  @keyframes fu { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  input:focus, select:focus, textarea:focus { border-color: ${C.blue} !important; box-shadow: 0 0 0 3px ${C.blue}15; }
  body { margin: 0; padding: 0; background: ${C.bgGray2}; overflow-x: hidden; }
`;

function useIsMobile(bp = 640) {
  const [m, s] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => s(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return m;
}

const MSGS = ['Memproses campaign...', 'HuggingFace encoding query...', 'Profiling KOL dengan Groq AI...', 'Semantic matching KOL...', 'Menyusun rekomendasi final...'];

export default function App() {
  const isMobile = useIsMobile();
  const px = isMobile ? 16 : 24;
  const [page, sPage] = useState('form');
  const [status, sStatus] = useState(null);
  const [result, sResult] = useState(null);
  const [msg, sMsg] = useState(MSGS[0]);
  const [kolMsg, sKolMsg] = useState('');
  const [insMsg, sInsMsg] = useState('');
  const [hmMsg, sHmMsg] = useState('');
  const [kolFreeMsg, sKolFreeMsg] = useState('');
  const [commMsg, sCommMsg] = useState('');
  const [training, sTrn] = useState(false);
  const [locs, sLocs] = useState([]);
  const [locLoad, sLocLoad] = useState(false);
  const [fxRates, sFxRates] = useState(null);
  const [fxDate, sFxDate] = useState(null);
  const [fxLoading, sFxLoading] = useState(false);
  const [updateMode, sUpdateMode] = useState(false);
  const [shareModal, sShareModal] = useState(false);
  const [shareUrl, sShareUrl] = useState('');
  const [shareCop, sShareCop] = useState(false);

  const [form, sForm] = useState({
    campaign_name: '', campaign_description: '', goals: '', target_audience: '',
    selTopics: [], selLocs: ['nasional'],
    kolGlobalActive: false, selCountries: [],
    budget_min: '5000000', budget_max: '50000000', budget_kol_pct: 60, budget_hm_pct: 30,
    num_kol: 5, num_media: 3, content_type: 'semua',
    tierMode: 'single', preferred_tier: 'semua',
    tier_split: { nano: 0, mikro: 0, makro: 0, mega: 0 },
    zeroBudget: false,
    include_kol: true, include_homeless_media: true, include_community: true,
  });

  const kolRef = useRef(); const insRef = useRef(); const hmRef = useRef(); const kolFreeRef = useRef(); const commRef = useRef();
  const midx = useRef(0);

  useEffect(() => { checkStatus().then(sStatus).catch(() => sStatus({ error: true })); }, []);
  useEffect(() => { if (!status || status.error) return; loadL(); }, [status]);
  
  const loadL = async () => {
    sLocLoad(true);
    try { const d = await getLocations(); sLocs(d.locations || []); }
    catch { sLocs([{ value: 'nasional', label: 'Nasional', group: 'nasional' }]); }
    sLocLoad(false);
  };

  useEffect(() => {
    if (!form.kolGlobalActive || fxRates || fxLoading) return;
    sFxLoading(true);
    getExchangeRates()
      .then(d => { sFxRates(d.rates || {}); sFxDate(d.date || null); })
      .catch(() => sFxRates({}))
      .finally(() => sFxLoading(false));
  }, [form.kolGlobalActive, fxRates, fxLoading]);

  useEffect(() => {
    if (page !== 'loading') return;
    const iv = setInterval(() => {
      midx.current = (midx.current + 1) % MSGS.length;
      sMsg(MSGS[midx.current]);
    }, 1100);
    return () => clearInterval(iv);
  }, [page]);

  const hKOL = async e => {
    const f = e.target.files[0]; if (!f) return;
    sKolMsg('Uploading...');
    try { await uploadKOL(f); sKolMsg('Upload berhasil. Klik Latih Model.'); }
    catch (err) { sKolMsg('Error: ' + err.message); }
  };
  const hIns = async e => {
    const f = e.target.files[0]; if (!f) return;
    sInsMsg('Uploading...');
    try { await uploadInsight(f); sInsMsg('Upload berhasil.'); }
    catch (err) { sInsMsg('Error: ' + err.message); }
  };
  const hHM = async e => {
    const f = e.target.files[0]; if (!f) return;
    sHmMsg('Uploading...');
    try { await uploadHomelessMedia(f); sHmMsg('Upload berhasil.'); checkStatus().then(sStatus); }
    catch (err) { sHmMsg('Error: ' + err.message); }
  };
  const hKolFree = async e => {
    const f = e.target.files[0]; if (!f) return;
    sKolFreeMsg('Uploading...');
    try { await uploadKOLHomelessFree(f); sKolFreeMsg('Upload berhasil.'); checkStatus().then(sStatus); }
    catch (err) { sKolFreeMsg('Error: ' + err.message); }
  };
  const hComm = async e => {
    const f = e.target.files[0]; if (!f) return;
    sCommMsg('Uploading...');
    try { await uploadCommunity(f); sCommMsg('Upload berhasil.'); checkStatus().then(sStatus); }
    catch (err) { sCommMsg('Error: ' + err.message); }
  };

  const hTrain = async () => {
    sTrn(true);
    try { await trainModel(); await checkStatus().then(sStatus); alert('Model berhasil dilatih!'); }
    catch (err) { alert('Error training: ' + err.message); }
    sTrn(false);
  };

  const hSubmit = async () => {
    sPage('loading');
    try {
      const res = await getRecommendations({
        ...form,
        location: form.selLocs.join(','),
        topics: form.selTopics.join(','),
        tier_budget_split: form.tierMode === 'split' ? form.tier_split : null
      });
      sResult(res); sPage('result');
    } catch (err) {
      alert('Error: ' + err.message); sPage('form');
    }
  };

  const hSuggest = async () => {
    if (!form.campaign_description && !form.campaign_name) return alert('Isi nama atau deskripsi campaign dulu');
    const b = document.activeElement; if (b) b.innerText = 'Suggesting...';
    try {
      const d = await suggestParams(form.campaign_name, form.campaign_description);
      if (d.status === 'ok' && d.suggestion) {
        const s = d.suggestion;
        sForm(f => ({
          ...f,
          goals: s.goals || f.goals,
          target_audience: s.target_audience || f.target_audience,
          selTopics: s.topics ? s.topics.split(',').map(x => x.trim()) : f.selTopics,
          preferred_tier: s.preferred_tier || f.preferred_tier
        }));
      }
    } catch (e) { console.error(e); }
    if (b) b.innerText = 'Auto-Suggest';
  };

  const hShare = () => {
    const data = encodeShareData(result);
    const url = `${window.location.origin}${window.location.pathname}?share=${data}`;
    sShareUrl(url); sShareModal(true);
  };

  if (page === 'loading') return <LoadingScreen msg={msg} />;

  const modelReady = status?.model_trained;
  const meta = status?.meta || {};
  const hmLoaded = status?.homeless_media_loaded;
  const hmCount = status?.homeless_media_count || 0;
  const backendErr = status?.error;
  const canSub = !!(form.campaign_name && (form.zeroBudget || form.budget_min) && modelReady);

  const sf = v => sForm(f => ({ ...f, ...v }));

  return (
    <div style={{ minHeight: '100vh', background: C.bgGray, fontFamily: "'DM Sans','Segoe UI',sans-serif", color: C.text }}>
      <style>{GCS}</style>
      <Header status={status || { status: 'loading' }} onRefresh={() => checkStatus().then(sStatus)} />

      <div style={{ maxWidth: 700, margin: '0 auto', padding: `24px ${px}px 60px` }}>

        {page === 'form' && (
          <>
            <div className="fu" style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 800, color: C.text, margin: '0 0 8px', letterSpacing: '-0.7px', lineHeight: 1.2 }}>KOL & Media Recommender</h1>
              <p style={{ color: C.textSub, fontSize: isMobile ? 14 : 15, margin: 0, lineHeight: 1.6 }}>Temukan KOL dan Homeless Media terbaik untuk campaign DANA Indonesia</p>
            </div>

            <SetupPanel
              updateMode={updateMode} setUpdateMode={sUpdateMode}
              backendErr={backendErr} status={status} modelReady={modelReady} meta={meta}
              kolMsg={kolMsg} insMsg={insMsg} hmMsg={hmMsg} hmLoaded={hmLoaded} hmCount={hmCount}
              kolFreeMsg={kolFreeMsg} commMsg={commMsg} training={training}
              onTrain={hTrain} onUploadKOL={hKOL} onUploadInsight={hIns} onUploadHM={hHM}
              onUploadKOLFree={hKolFree} onUploadComm={hComm}
              isMobile={isMobile} refs={{ kol: kolRef, ins: insRef, hm: hmRef, kolFree: kolFreeRef, comm: commRef }}
            />

            <CampaignForm
              form={form} sf={sf} allLocs={locs} isMobile={isMobile}
              hSuggest={hSuggest} hSubmit={hSubmit} canSub={canSub} loading={false}
              meta={meta} hmCount={hmCount}
              fxRates={fxRates} fxDate={fxDate} fxLoading={fxLoading}
            />

            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 11, marginTop: 24 }}>DANA AI v3 · Multi-Location · Multi-Topic · Tier Split · Groq LLM Profiling</p>
          </>
        )}

{page === 'result' && <ResultPage result={result} onNew={() => sPage('form')} onShare={hShare} />}
      </div>

      {shareModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="fu" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Bagikan Strategi</h3>
            <p style={{ color: C.textSub, fontSize: 13, marginBottom: 16 }}>Salin link di bawah untuk membagikan hasil rekomendasi ini.</p>
            <input readOnly value={shareUrl} style={{ width: '100%', padding: '12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, marginBottom: 16, background: C.bgGray }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); sShareCop(true); setTimeout(() => sShareCop(false), 2000); }} style={{ flex: 1, background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, cursor: 'pointer' }}>{shareCop ? 'Tersalin!' : 'Salin Link'}</button>
              <button onClick={() => sShareModal(false)} style={{ flex: 1, background: C.bgGray2, color: C.textSub, border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, cursor: 'pointer' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
      background: active ? C.blue : 'transparent',
      color: active ? '#fff' : C.textSub,
      transition: 'all .15s',
    }}>{label}</button>
  );
}