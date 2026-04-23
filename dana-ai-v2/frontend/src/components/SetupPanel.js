import React from 'react';

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
  red: '#DC2626',
  teal: '#0891B2',
  tealBg: '#ECFEFF',
  tealBorder: '#A5F3FC',
};

const SetupPanel = ({
  updateMode,
  setUpdateMode,
  backendErr,
  status,
  modelReady,
  meta,
  kolMsg,
  insMsg,
  hmMsg,
  hmLoaded,
  hmCount,
  kolFreeMsg,
  commMsg,
  training,
  onTrain,
  onUploadKOL,
  onUploadInsight,
  onUploadHM,
  onUploadKOLFree,
  onUploadComm,
  isMobile,
  refs
}) => {
  const ssM = {
    error: { bg: '#FEF2F2', border: '#FCA5A5', color: '#DC2626' },
    loading: { bg: C.bgGray2, border: C.border, color: C.textSub },
    ok: { bg: C.greenBg, border: C.greenBorder, color: C.green },
    warn: { bg: '#FFFBEB', border: '#FCD34D', color: '#D97706' }
  };
  
  const ss = ssM[backendErr ? 'error' : status === null ? 'loading' : modelReady ? 'ok' : 'warn'];
  const stTxt = backendErr ? 'Backend tidak bisa dihubungi' : status === null ? 'Menghubungi backend...' : modelReady ? `Model siap — ${meta.total_kol || 0} KOL, ${meta.kol_with_er || 0} dengan ER nyata` : 'Model belum dilatih — upload KOL.xlsx lalu klik Latih Model';

  return (
    <div className="fu" style={{ animationDelay: '.06s', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: isMobile ? 16 : 22, marginBottom: 12 }}>
      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: ss.bg, border: `1px solid ${ss.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
        <span style={{ color: ss.color, fontWeight: 600, fontSize: 13, lineHeight: 1.4, flex: 1 }}>{stTxt}</span>
      </div>

      {/* Update Data Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', marginBottom: updateMode ? 16 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Update Data</span>
          <span style={{ fontSize: 11, background: updateMode ? '#FEF3C7' : '#F3F4F6', border: `1px solid ${updateMode ? '#F59E0B33' : '#E5E7EB'}`, borderRadius: 4, padding: '1px 6px', fontWeight: 600, color: updateMode ? '#92400E' : C.textMuted }}>{updateMode ? 'ON' : 'OFF'}</span>
        </div>
        <button
          onClick={() => setUpdateMode(!updateMode)}
          disabled={!!backendErr}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: backendErr ? 'not-allowed' : 'pointer',
            background: updateMode ? C.blue : '#D1D5DB',
            transition: 'background .2s', position: 'relative', flexShrink: 0, opacity: backendErr ? .5 : 1
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: updateMode ? 22 : 3, width: 18, height: 18,
            borderRadius: '50%', background: '#fff', transition: 'left .2s',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)', display: 'block'
          }} />
        </button>
      </div>

      {updateMode && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: C.bgGray, borderRadius: 10, padding: 12 }}>
              <div style={{ color: C.textSub, fontSize: 10, fontWeight: 700, letterSpacing: '.5px', marginBottom: 8 }}>DATABASE KOL</div>
              <input ref={refs.kol} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={onUploadKOL} />
              <button onClick={() => refs.kol.current.click()} disabled={!!backendErr} style={{ background: C.blueLight, border: `1px solid ${C.blue}33`, color: C.blue, borderRadius: 8, padding: '11px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', width: '100%', opacity: backendErr ? .4 : 1 }}>Upload KOL.xlsx</button>
              {kolMsg && <div style={{ marginTop: 7, fontSize: 11, lineHeight: 1.5, color: kolMsg.startsWith('Error') ? C.red : C.textSub }}>{kolMsg}</div>}
            </div>
            <div style={{ background: C.bgGray, borderRadius: 10, padding: 12 }}>
              <div style={{ color: C.textSub, fontSize: 10, fontWeight: 700, letterSpacing: '.5px', marginBottom: 8 }}>INSIGHT / ER DATA</div>
              <input ref={refs.ins} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={onUploadInsight} />
              <button onClick={() => refs.ins.current.click()} disabled={!!backendErr} style={{ background: C.greenBg, border: `1px solid ${C.green}33`, color: C.green, borderRadius: 8, padding: '11px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', width: '100%', opacity: backendErr ? .4 : 1 }}>Upload insight.xlsx</button>
              {insMsg && <div style={{ marginTop: 7, fontSize: 11, lineHeight: 1.5, color: insMsg.startsWith('Error') ? C.red : C.textSub }}>{insMsg}</div>}
            </div>
            <div style={{ background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: 10, padding: 12 }}>
              <div style={{ color: C.teal, fontSize: 10, fontWeight: 700, letterSpacing: '.5px', marginBottom: 8 }}>HOMELESS MEDIA</div>
              <input ref={refs.hm} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={onUploadHM} />
              <button onClick={() => refs.hm.current.click()} disabled={!!backendErr} style={{ background: C.bg, border: `1px solid ${C.teal}44`, color: C.teal, borderRadius: 8, padding: '11px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', width: '100%', opacity: backendErr ? .4 : 1 }}>Upload HomelessMedia.xlsx</button>
              {hmLoaded && !hmMsg && <div style={{ marginTop: 7, fontSize: 11, color: C.teal }}>{hmCount} media dimuat</div>}
              {hmMsg && <div style={{ marginTop: 7, fontSize: 11, lineHeight: 1.5, color: hmMsg.startsWith('Error') ? C.red : C.teal }}>{hmMsg}</div>}
            </div>
          </div>
          <button onClick={onTrain} disabled={training || !!backendErr} style={{ background: training ? C.bgGray2 : C.blue, border: 'none', color: training ? C.textMuted : '#fff', borderRadius: 10, padding: '13px', cursor: training || backendErr ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', width: '100%', opacity: backendErr ? .4 : 1, transition: 'background .15s' }}>
            {training ? 'Training...' : 'Latih Model'}
          </button>
          
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ color: C.textSub, fontSize: 10, fontWeight: 700, letterSpacing: '.5px', marginBottom: 10 }}>DATA TANPA RATE CARD</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: 12 }}>
                <div style={{ color: '#C2410C', fontSize: 10, fontWeight: 700, letterSpacing: '.5px', marginBottom: 8 }}>KOL HOMELESS FREE</div>
                <input ref={refs.kolFree} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={onUploadKOLFree} />
                <button onClick={() => refs.kolFree.current.click()} disabled={!!backendErr} style={{ background: '#FEF3C7', border: '1px solid #F59E0B44', color: '#92400E', borderRadius: 8, padding: '11px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', width: '100%', opacity: backendErr ? .4 : 1 }}>Upload KOLHomeless.xlsx</button>
                {kolFreeMsg && <div style={{ marginTop: 7, fontSize: 11, lineHeight: 1.5, color: kolFreeMsg.startsWith('Error') ? C.red : '#92400E' }}>{kolFreeMsg}</div>}
              </div>
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 12 }}>
                <div style={{ color: '#15803D', fontSize: 10, fontWeight: 700, letterSpacing: '.5px', marginBottom: 8 }}>KOMUNITAS</div>
                <input ref={refs.comm} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={onUploadComm} />
                <button onClick={() => refs.comm.current.click()} disabled={!!backendErr} style={{ background: '#DCFCE7', border: '1px solid #4ADE8044', color: '#15803D', borderRadius: 8, padding: '11px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', width: '100%', opacity: backendErr ? .4 : 1 }}>Upload Community.xlsx</button>
                {commMsg && <div style={{ marginTop: 7, fontSize: 11, lineHeight: 1.5, color: commMsg.startsWith('Error') ? C.red : '#15803D' }}>{commMsg}</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SetupPanel;
