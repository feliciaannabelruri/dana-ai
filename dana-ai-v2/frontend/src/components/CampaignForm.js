import React from 'react';
import LocationDropdown from './LocationDropdown';
import MultiTopicSelector from './MultiTopicSelector';
import ZeroBudgetBanner from './ZeroBudgetBanner';
import BudgetSlider from './BudgetSlider';
import TierSplit from './TierSplit';

const C = {
  blue: '#1A6FE8',
  blueDark: '#1259C4',
  blueLight: '#EBF2FD',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  bg: '#FFFFFF',
  bgGray: '#F9FAFB',
  bgGray2: '#F3F4F6',
  gold: '#D97706',
  goldBg: '#FFFBEB',
  goldBorder: '#FCD34D',
  teal: '#0891B2',
  tealBg: '#ECFEFF',
  tealBorder: '#A5F3FC',
  red: '#DC2626',
};

const INP = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color .15s'
};

const fmtB = n => {
  if (!n || isNaN(n)) return 'Rp 0';
  const v = Math.round(n);
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(2).replace(/\.?0+$/, '')} M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(1).replace(/\.0$/, '')} juta`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

const SL = ({ children }) => (
  <div style={{ color: C.text, fontSize: 13, fontWeight: 800, letterSpacing: '.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 0 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, marginBottom: 6, letterSpacing: '.3px' }}>{label}</div>
    {children}
  </div>
);

const CampaignForm = ({
  form,
  sf,
  allLocs,
  isMobile,
  hSuggest,
  hSubmit,
  canSub,
  loading,
  meta,
  hmCount
}) => {
  const Ic = {
    bolt: (s = 10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z" /></svg>,
    user: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    news: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" /></svg>,
    check: (s = 10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  };

  return (
    <div className="fu" style={{ animationDelay: '.12s', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: isMobile ? 16 : 22, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Info Campaign */}
      <div>
        <SL>Informasi Campaign</SL>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Nama Campaign *"><input style={INP} placeholder="Campaign Literasi Keuangan 2025" value={form.campaign_name} onChange={e => sf({ campaign_name: e.target.value })} /></Field>
          <div style={{ position: 'relative' }}>
            <Field label="Deskripsi"><textarea style={{ ...INP, minHeight: 72, resize: 'vertical' }} placeholder="Tujuan dan pesan utama campaign..." value={form.campaign_description} onChange={e => sf({ campaign_description: e.target.value })} /></Field>
            <button onClick={hSuggest} style={{ position: 'absolute', right: 10, top: 32, background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>{Ic.bolt(10)} Auto-Suggest</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <Field label="Goals">
              <select style={INP} value={form.goals} onChange={e => sf({ goals: e.target.value })}>
                <option value="">Pilih goals...</option>
                {['brand awareness', 'edukasi', 'engagement', 'conversion', 'transaksi', 'promo', 'umkm', 'literasi keuangan', 'esg campaign', 'csr campaign'].map(g => <option key={g} value={g}>{g.toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label="Target Audience"><input style={INP} placeholder="Urban Millennial, Ibu RT" value={form.target_audience} onChange={e => sf({ target_audience: e.target.value })} /></Field>
          </div>
        </div>
      </div>

      {/* Multi-Topic */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>Topik / Niche KOL</SL>
        <MultiTopicSelector selected={form.selTopics} onChange={v => sf({ selTopics: v })} />
      </div>

      {/* Multi-Location */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>Lokasi Target</SL>
        <LocationDropdown options={allLocs} selected={form.selLocs} onChange={v => sf({ selLocs: v })} loading={false} />
      </div>

      {/* Budgeting */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>Budget</SL>
        <ZeroBudgetBanner active={form.zeroBudget} onToggle={() => sf({ zeroBudget: !form.zeroBudget })} />
        {!form.zeroBudget && (
          <div style={{ marginTop: 14 }}>
            <BudgetSlider budgetMin={form.budget_min} budgetMax={form.budget_max} onChangeMin={v => sf({ budget_min: v })} onChangeMax={v => sf({ budget_max: v })} />
            
            {/* Split KOL vs Media visualization */}
            <div style={{ background: C.bgGray, borderRadius: 10, padding: 14, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textSub }}>ALOKASI BUDGET</span>
                <span style={{ color: C.textSub, fontSize: 12 }}>KOL {form.budget_kol_pct}% — Media {100 - form.budget_kol_pct}%</span>
              </div>
              <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ width: `${form.budget_kol_pct}%`, background: C.gold, transition: 'width .2s' }} />
                <div style={{ flex: 1, background: C.teal }} />
              </div>
              <input type="range" className="spl" min={10} max={90} step={5} value={form.budget_kol_pct} onChange={e => sf({ budget_kol_pct: parseInt(e.target.value) })} style={{ width: '100%', marginBottom: 14 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ color: C.gold, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>KOL</div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{fmtB(Math.round((parseFloat(form.budget_min) || 0) * form.budget_kol_pct / 100))}</div>
                </div>
                <div style={{ background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ color: C.teal, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>Homeless Media</div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{fmtB(Math.round((parseFloat(form.budget_min) || 0) * (100 - form.budget_kol_pct) / 100))}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tiering */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>Preferensi Tier KOL</SL>
        <TierSplit mode={form.tierMode} split={form.tier_split} pref={form.preferred_tier} onMode={v => sf({ tierMode: v })} onSplit={v => sf({ tier_split: v })} onPref={v => sf({ preferred_tier: v })} numKol={form.num_kol} />
      </div>

      {/* Mix */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>Bauran Rekomendasi (Mix)</SL>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[{ k: 'include_kol', l: 'KOL Commercial', i: Ic.user(12) }, { k: 'include_homeless_media', l: 'Homeless Media', i: Ic.news(12) }, { k: 'include_community', l: 'Community', i: Ic.bolt(12) }].map(p => (
            <div key={p.k} onClick={() => sf({ [p.k]: !form[p.k] })} style={{ cursor: 'pointer', background: form[p.k] ? C.blueLight : C.bgGray, border: `1.5px solid ${form[p.k] ? C.blue : C.border}`, borderRadius: 10, padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
              <span style={{ color: form[p.k] ? C.blue : C.textMuted }}>{p.i}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: form[p.k] ? C.blue : C.textSub, textAlign: 'center' }}>{p.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Other Preferences */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>Preferensi Lainnya</SL>
        <div style={{ marginBottom: 14 }}><Field label="Platform"><select style={INP} value={form.content_type} onChange={e => sf({ content_type: e.target.value })}><option value="semua">Semua Platform</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="twitter">X / Twitter</option></select></Field></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[{ label: 'Jumlah KOL', key: 'num_kol', max: 50, color: C.blue, total: meta.total_kol || 0 }, { label: 'Jumlah Media', key: 'num_media', max: 20, color: C.teal, total: hmCount, hide: form.zeroBudget }].filter(x => !x.hide).map(({ label, key, max, color, total }) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textSub }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color }}>{form[key]}</span>
              </div>
              <input type="range" style={{ width: '100%' }} min="1" max={Math.min(max, total || max)} value={form[key]} onChange={e => sf({ [key]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div style={{ marginTop: 10 }}>
        <button onClick={hSubmit} disabled={!canSub || loading} style={{ width: '100%', background: canSub ? C.blueDark : C.bgGray2, border: 'none', color: canSub ? '#fff' : C.textMuted, borderRadius: 12, padding: '16px', fontSize: 16, fontWeight: 800, cursor: canSub && !loading ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all .2s', boxShadow: canSub ? '0 10px 25px rgba(26,111,232,.25)' : 'none' }}>
          {loading ? 'Generasi...' : (
            <>
              {Ic.bolt(16)} GENERATE REKOMENDASI
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CampaignForm;
