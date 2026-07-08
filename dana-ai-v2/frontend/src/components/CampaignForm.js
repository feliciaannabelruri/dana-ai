import React from 'react';
import LocationDropdown from './LocationDropdown';
import MultiTopicSelector from './MultiTopicSelector';
import ZeroBudgetBanner from './ZeroBudgetBanner';
import BudgetSlider from './BudgetSlider';
import TierSplit from './TierSplit';
import GlobalKolBanner from './GlobalKolBanner';
import CountryDropdown from './CountryDropdown';

const C = {
  blue: '#1A6FE8', blueDark: '#1259C4', blueLight: '#EBF2FD',
  text: '#111827', textSub: '#6B7280', textMuted: '#9CA3AF',
  border: '#E5E7EB', bg: '#FFFFFF', bgGray: '#F9FAFB', bgGray2: '#F3F4F6',
  gold: '#D97706', goldBg: '#FFFBEB', goldBorder: '#FCD34D',
  teal: '#0891B2', tealBg: '#ECFEFF', tealBorder: '#A5F3FC',
  purple: '#7C3AED', purpleBg: '#F5F3FF', purpleBorder: '#C4B5FD',
};

const INP = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 14,
  fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s',
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

const TYPE_CFG = {
  include_kol:            { label: 'KOL Commercial', color: C.gold,   bg: C.goldBg,   border: C.goldBorder,   icon: (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  include_homeless_media: { label: 'Homeless Media', color: C.teal,   bg: C.tealBg,   border: C.tealBorder,   icon: (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg> },
  include_community:      { label: 'Community',      color: C.purple, bg: C.purpleBg, border: C.purpleBorder, icon: (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
};

const BudgetSplit = ({ form, sf, budget }) => {
  const hasKOL = form.include_kol;
  const hasHM  = form.include_homeless_media;
  const hasCom = form.include_community;
  const count  = [hasKOL, hasHM, hasCom].filter(Boolean).length;

  if (count < 2) return null;

  // Determine active types and their percentages
  const kolPct = hasKOL ? (form.budget_kol_pct || 60) : 0;
  const hmPct  = hasHM  ? (form.budget_hm_pct  || (hasKOL ? 100 - kolPct : 50)) : 0;
  const comPct = hasCom ? Math.max(0, 100 - kolPct - hmPct) : 0;

  const activeTypes = [
    hasKOL && { key: 'kol',  label: 'KOL',            pct: kolPct, cfg: TYPE_CFG.include_kol },
    hasHM  && { key: 'hm',   label: 'Homeless Media',  pct: hmPct,  cfg: TYPE_CFG.include_homeless_media },
    hasCom && { key: 'com',  label: 'Community',       pct: comPct, cfg: TYPE_CFG.include_community },
  ].filter(Boolean);

  const setKolPct = v => {
    const newKol = Math.min(v, hasHM && hasCom ? 80 : 90);
    if (hasHM && hasCom) {
      const remaining = 100 - newKol;
      const hmShare = Math.round(remaining * (hmPct / Math.max(hmPct + comPct, 1)));
      sf({ budget_kol_pct: newKol, budget_hm_pct: hmShare });
    } else if (hasHM) {
      sf({ budget_kol_pct: newKol, budget_hm_pct: 100 - newKol });
    } else {
      sf({ budget_kol_pct: newKol });
    }
  };

  const setHmPct = v => {
    const maxHm = 100 - (hasKOL ? kolPct : 0) - (hasCom ? 10 : 0);
    sf({ budget_hm_pct: Math.min(v, maxHm) });
  };

  return (
    <div style={{ background: C.bgGray, borderRadius: 10, padding: 14, marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, marginBottom: 10 }}>ALOKASI BUDGET</div>

      {/* Visual bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
        {activeTypes.map(t => (
          <div key={t.key} style={{ width: `${t.pct}%`, background: t.cfg.color, transition: 'width .2s' }} />
        ))}
      </div>

      {/* KOL slider (if KOL selected + at least 1 other) */}
      {hasKOL && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>KOL</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.text }}>{kolPct}%</span>
          </div>
          <input type="range" min={10} max={hasHM && hasCom ? 80 : 90} step={5}
            value={kolPct} onChange={e => setKolPct(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: C.gold }} />
        </div>
      )}

      {/* HM slider (if HM + Community both selected) */}
      {hasHM && hasCom && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.teal, fontWeight: 700 }}>Homeless Media</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.text }}>{hmPct}%</span>
          </div>
          <input type="range" min={5} max={100 - (hasKOL ? kolPct : 0) - 5} step={5}
            value={hmPct} onChange={e => setHmPct(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: C.teal }} />
        </div>
      )}

      {/* Budget boxes per type */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeTypes.length}, 1fr)`, gap: 8 }}>
        {activeTypes.map(t => (
          <div key={t.key} style={{ background: t.cfg.bg, border: `1px solid ${t.cfg.border}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ color: t.cfg.color, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{t.label} · {t.pct}%</div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{fmtB(Math.round(budget * t.pct / 100))}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CampaignForm = ({ form, sf, allLocs, isMobile, hSuggest, hSubmit, canSub, loading, meta, hmCount }) => {
  const Ic = {
    bolt: (s = 10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22L20.09 11.03H13Z" /></svg>,
  };

  const selectedCount = [form.include_kol, form.include_homeless_media, form.include_community].filter(Boolean).length;
  const budget = form.zeroBudget ? 0 : (parseFloat(form.budget_min) || 0);

  const toggleType = key => {
    const next = !form[key];
    const afterCount = [
      key === 'include_kol'            ? next : form.include_kol,
      key === 'include_homeless_media'  ? next : form.include_homeless_media,
      key === 'include_community'       ? next : form.include_community,
    ].filter(Boolean).length;
    if (afterCount < 1) return; // min 1 selected
    sf({ [key]: next });
  };

  return (
    <div className="fu" style={{ animationDelay: '.12s', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: isMobile ? 16 : 22, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Informasi Campaign */}
      <div>
        <SL>Informasi Campaign</SL>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Nama Campaign *">
            <input style={INP} placeholder="Campaign Literasi Keuangan 2025" value={form.campaign_name} onChange={e => sf({ campaign_name: e.target.value })} />
          </Field>
          <div style={{ position: 'relative' }}>
            <Field label="Deskripsi">
              <textarea style={{ ...INP, minHeight: 72, resize: 'vertical' }} placeholder="Tujuan dan pesan utama campaign..." value={form.campaign_description} onChange={e => sf({ campaign_description: e.target.value })} />
            </Field>
            <button onClick={hSuggest} style={{ position: 'absolute', right: 10, top: 32, background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              {Ic.bolt(10)} Auto-Suggest
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <Field label="Goals">
              <select style={INP} value={form.goals} onChange={e => sf({ goals: e.target.value })}>
                <option value="">Pilih goals...</option>
                {['brand awareness', 'edukasi', 'engagement', 'conversion', 'transaksi', 'promo', 'umkm', 'literasi keuangan', 'esg campaign', 'csr campaign'].map(g => <option key={g} value={g}>{g.toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label="Target Audience">
              <input style={INP} placeholder="Urban Millennial, Ibu RT" value={form.target_audience} onChange={e => sf({ target_audience: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>

      {/* Topik */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>Topik / Niche</SL>
        <MultiTopicSelector selected={form.selTopics} onChange={v => sf({ selTopics: v })} />
      </div>

      {/* Lokasi */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>Lokasi Target</SL>
        <LocationDropdown options={allLocs} selected={form.selLocs} onChange={v => sf({ selLocs: v })} loading={false} />
      </div>

      {/* KOL Global */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <GlobalKolBanner active={form.kolGlobalActive} onToggle={() => sf({ kolGlobalActive: !form.kolGlobalActive })} />
        {form.kolGlobalActive && (
          <div style={{ marginTop: 12 }}>
            <Field label="Negara Target">
              <CountryDropdown selected={form.selCountries} onChange={v => sf({ selCountries: v })} />
            </Field>
          </div>
        )}
      </div>

      {/* STEP 1: Jenis Rekomendasi */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>
          <span style={{ background: C.blue, color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>1</span>
          Pilih Jenis Rekomendasi
        </SL>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, marginTop: -6 }}>Pilih minimal 1. Bisa kombinasi.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {Object.entries(TYPE_CFG).map(([key, cfg]) => {
            const on = form[key];
            return (
              <div key={key} onClick={() => toggleType(key)} style={{
                cursor: 'pointer',
                background: on ? cfg.bg : C.bgGray2,
                border: `2px solid ${on ? cfg.border : C.border}`,
                borderRadius: 12, padding: '14px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all .15s',
              }}>
                <span style={{ color: on ? cfg.color : C.textMuted, display: 'flex' }}>{cfg.icon(20)}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: on ? cfg.color : C.textSub, textAlign: 'center', lineHeight: 1.3 }}>{cfg.label}</span>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: on ? cfg.color : 'transparent', border: `2px solid ${on ? cfg.color : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                  {on && <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Budget */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>
          <span style={{ background: C.blue, color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>2</span>
          Budget {selectedCount === 1 && (() => {
            const k = Object.keys(TYPE_CFG).find(k => form[k]);
            return k ? <span style={{ color: TYPE_CFG[k].color, fontWeight: 700, fontSize: 12 }}>· {TYPE_CFG[k].label}</span> : null;
          })()}
        </SL>
        <ZeroBudgetBanner active={form.zeroBudget} onToggle={() => sf({ zeroBudget: !form.zeroBudget })} />
        {!form.zeroBudget && (
          <div style={{ marginTop: 14 }}>
            <BudgetSlider budgetMin={form.budget_min} budgetMax={form.budget_max} onChangeMin={v => sf({ budget_min: v })} onChangeMax={v => sf({ budget_max: v })} />
            <BudgetSplit form={form} sf={sf} budget={budget} />
          </div>
        )}
      </div>

      {/* Tier (only if KOL selected) */}
      {form.include_kol && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
          <SL>Preferensi Tier KOL</SL>
          <TierSplit mode={form.tierMode} split={form.tier_split} pref={form.preferred_tier} onMode={v => sf({ tierMode: v })} onSplit={v => sf({ tier_split: v })} onPref={v => sf({ preferred_tier: v })} numKol={form.num_kol} />
        </div>
      )}

      {/* Preferensi Lainnya */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
        <SL>Preferensi Lainnya</SL>
        <div style={{ marginBottom: 14 }}>
          <Field label="Platform">
            <select style={INP} value={form.content_type} onChange={e => sf({ content_type: e.target.value })}>
              <option value="semua">Semua Platform</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">X / Twitter</option>
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            form.include_kol            && { label: 'Jumlah KOL',   key: 'num_kol',   max: 50, color: C.gold,   total: meta.total_kol || 0 },
            form.include_homeless_media  && { label: 'Jumlah Media', key: 'num_media', max: 20, color: C.teal,  total: hmCount },
          ].filter(Boolean).map(({ label, key, max, color, total }) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textSub }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color }}>{form[key]}</span>
              </div>
              <input type="range" style={{ width: '100%', accentColor: color }} min="1" max={Math.min(max, total || max)} value={form[key]} onChange={e => sf({ [key]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div style={{ marginTop: 10 }}>
        <button onClick={hSubmit} disabled={!canSub || loading} style={{ width: '100%', background: canSub ? C.blueDark : C.bgGray2, border: 'none', color: canSub ? '#fff' : C.textMuted, borderRadius: 12, padding: '16px', fontSize: 16, fontWeight: 800, cursor: canSub && !loading ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all .2s', boxShadow: canSub ? '0 10px 25px rgba(26,111,232,.25)' : 'none' }}>
          {loading ? 'Generasi...' : <>{Ic.bolt(16)} GENERATE REKOMENDASI</>}
        </button>
      </div>
    </div>
  );
};

export default CampaignForm;
