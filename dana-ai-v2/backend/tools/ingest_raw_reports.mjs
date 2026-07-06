// Normalizes an arbitrary batch of DANA campaign report .xlsx files (dropped into
// ../data/raw_reports/) into the two legacy files the existing Python pipeline already
// knows how to ingest: data/KOL.xlsx (parse_data.py) and data/insight.xlsx (extract_insights.py).
//
// Handles two recurring sheet shapes, detected by header content (not fixed position,
// since column order/count varies across files):
//   - KPI-style   (has a "CPI" column): real paid-campaign performance rows.
//   - Directory-style (no "CPI", has "Followers"+"Username"): static KOL rate-card rows.
// Budget/meta/redemption sheets (no recognizable followers+username header) are skipped.
//
// Usage: node ingest_raw_reports.mjs

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '..');
const RAW_DIR      = path.join(BACKEND_DIR, 'data', 'raw_reports');
const OUT_KOL       = path.join(BACKEND_DIR, 'data', 'KOL.xlsx');
const OUT_INSIGHT   = path.join(BACKEND_DIR, 'data', 'insight.xlsx');

// ── helpers ──────────────────────────────────────────────────────────────────
function normH(v) {
  return String(v ?? '').toLowerCase().replace(/[.\s]+/g, ' ').trim();
}
function findCol(headerRow, pred) {
  for (let i = 0; i < headerRow.length; i++) {
    if (pred(normH(headerRow[i]))) return i;
  }
  return -1;
}
function toNum(v) {
  if (v == null) return null;
  if (v instanceof Date) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/,/g, '').trim();
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
function slug(s) {
  return String(s).toLowerCase().replace(/^dana\s*-\s*/, '').trim()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function platformFromSheet(name) {
  const n = name.toLowerCase();
  if (n.includes('tiktok')) return 'tiktok';
  if (n.includes('twitter') || n === 'x') return 'twitter';
  if (n.includes('live')) return 'instagram';
  if (n.includes('instagram') || n.includes('ig') || n.includes('akun')) return 'instagram';
  return null;
}
function detectContext(wb, filename) {
  for (const name of ['TOTAL', 'Sheet4', 'Sheet1']) {
    if (!wb.SheetNames.includes(name)) continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
    for (const r of rows.slice(0, 3)) {
      if (typeof r[0] === 'string' && /dana/i.test(r[0]) && r[0].length > 5) return slug(r[0]);
    }
  }
  return slug(path.basename(filename, '.xlsx'));
}

// ── registry (merged KOL master) + flat ER observations ──────────────────────
const registry     = new Map();
const observations  = [];
const contextCounts = {};
const stats = { kpiRows: 0, kpiObs: 0, dirRows: 0, dirObs: 0, anomalies: 0 };

function upsertKol(uname, { tier, followers, platform, category, location, rate }) {
  const key = uname.toLowerCase();
  if (!registry.has(key)) {
    registry.set(key, {
      username: uname, tier: '', followers: 0,
      platforms: new Set(), categories: new Set(), location: '',
      rate_ig: 0, rate_tiktok: 0,
    });
  }
  const k = registry.get(key);
  if (!k.tier && tier) k.tier = tier;
  if (followers > k.followers) k.followers = followers;
  if (platform) k.platforms.add(platform);
  if (category) category.split(',').map(s => s.trim()).filter(Boolean).forEach(c => k.categories.add(c));
  if (location && !k.location) k.location = location;
  if (rate && rate > 0 && platform === 'tiktok') k.rate_tiktok = k.rate_tiktok ? Math.min(k.rate_tiktok, rate) : rate;
  if (rate && rate > 0 && platform === 'instagram') k.rate_ig = k.rate_ig ? Math.min(k.rate_ig, rate) : rate;
  // twitter-only rates are dropped: parse_data.py's rate schema has no twitter bucket
}

function parseKpiSheet(rows, platform, context) {
  const header   = rows[0];
  const uCol     = findCol(header, h => h.includes('username'));
  const tierCol  = findCol(header, h => h === 'tier');
  const folCol   = findCol(header, h => h === 'followers');
  const erCol    = findCol(header, h => h.includes('er') && h.includes('post'));
  const reachCol = findCol(header, h => h === 'reach');
  const totCol   = findCol(header, h => h.includes('total') && h.includes('engagement'));
  const engCol   = findCol(header, h => h === 'engagement');
  if (uCol < 0 || folCol < 0) return;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const noVal = row[0];
    const n = toNum(noVal);
    if (n == null || n <= 0 || !Number.isInteger(n)) continue; // skips sub-header/blank rows
    const uname = row[uCol] != null ? String(row[uCol]).trim().replace(/^@/, '') : '';
    if (!uname) continue;

    const followers = toNum(row[folCol]) || 0;
    const tier = tierCol >= 0 && row[tierCol] != null ? String(row[tierCol]).trim() : '';
    let er = erCol >= 0 ? toNum(row[erCol]) : null;
    if (er != null && Math.abs(er) <= 1) er *= 100; // stored as fraction, not percent
    const reach  = reachCol >= 0 ? (toNum(row[reachCol]) || 0) : 0;
    const totEng = totCol >= 0 ? toNum(row[totCol]) : null;
    const eng    = engCol >= 0 ? toNum(row[engCol]) : null;
    const engagement = (totEng != null && totEng > 0) ? totEng : (eng != null ? eng : 0);

    upsertKol(uname, { tier, followers, platform, category: '' });
    stats.kpiRows++;
    if (er != null && er > 0 && er < 200) {
      observations.push({ username: uname, followers, reach, likes: engagement, comments: 0, shares: 0, saves: 0, total_eng: engagement, er_pct: er });
      stats.kpiObs++;
    }
    contextCounts[context] = (contextCounts[context] || 0) + 1;
  }
}

function parseDirectorySheet(rows, platform, context) {
  const header = rows[0];
  const uCol         = findCol(header, h => h.includes('username'));
  const tierCol       = findCol(header, h => h === 'tier');
  const folCol        = findCol(header, h => h === 'followers');
  const followingCol  = findCol(header, h => h === 'following');
  const avgLikesCol   = findCol(header, h => h.includes('avg') && h.includes('like'));
  const avgCommentsCol= findCol(header, h => h.includes('avg') && h.includes('comment'));
  const avgEngCol     = findCol(header, h => h.includes('avg') && h.includes('engagement'));
  const estErCol      = findCol(header, h => h.includes('est') && h.includes('er'));
  const kategoriCol    = findCol(header, h => h === 'kategori');
  const negaraCol      = findCol(header, h => h === 'negara');
  const likesTotalCol  = findCol(header, h => h === 'likes');
  if (uCol < 0 || folCol < 0) return;

  const claimed = new Set([0, uCol, tierCol, folCol, followingCol, avgLikesCol, avgCommentsCol,
    avgEngCol, estErCol, kategoriCol, negaraCol, likesTotalCol].filter(i => i >= 0));
  const rateCols = [];
  for (let i = 0; i < header.length; i++) {
    if (claimed.has(i)) continue;
    const h = normH(header[i]);
    if (h && /(feed|reel|story|tiktok|tweet|bundl|content|live)/.test(h)) rateCols.push(i);
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const uname = row[uCol] != null ? String(row[uCol]).trim().replace(/^@/, '') : '';
    if (!uname) continue;
    const followers = toNum(row[folCol]) || 0;
    if (followers <= 0) { stats.anomalies++; continue; }

    const tier    = tierCol >= 0 && row[tierCol] != null ? String(row[tierCol]).trim() : '';
    const avgLikes    = avgLikesCol >= 0 ? toNum(row[avgLikesCol]) : null;
    const avgComments = avgCommentsCol >= 0 ? toNum(row[avgCommentsCol]) : null;
    let avgEng = avgEngCol >= 0 ? toNum(row[avgEngCol]) : null;
    if (avgEng == null && (avgLikes != null || avgComments != null)) avgEng = (avgLikes || 0) + (avgComments || 0);
    const likesTotal = likesTotalCol >= 0 ? toNum(row[likesTotalCol]) : null;
    const estEr = estErCol >= 0 ? toNum(row[estErCol]) : null;
    const kategori = kategoriCol >= 0 && row[kategoriCol] != null ? String(row[kategoriCol]).trim() : '';
    const negara   = negaraCol >= 0 && row[negaraCol] != null ? String(row[negaraCol]).trim() : '';

    let rate = 0;
    for (const c of rateCols) {
      const v = toNum(row[c]);
      if (v != null && v > 0) rate = rate === 0 ? v : Math.min(rate, v);
    }

    upsertKol(uname, { tier, followers, platform, category: kategori, location: negara, rate });
    stats.dirRows++;
    if (estEr != null && estEr > 0 && estEr < 200) {
      observations.push({
        username: uname, followers, reach: 0,
        likes: avgLikes || likesTotal || 0, comments: avgComments || 0,
        shares: 0, saves: 0, total_eng: avgEng || likesTotal || 0, er_pct: estEr,
      });
      stats.dirObs++;
    }
    contextCounts[context] = (contextCounts[context] || 0) + 1;
  }
}

// ── 1. dedupe raw files by content hash ───────────────────────────────────────
const files = fs.readdirSync(RAW_DIR).filter(f => f.toLowerCase().endsWith('.xlsx'));
const hashGroups = new Map();
for (const f of files) {
  const hash = crypto.createHash('sha1').update(fs.readFileSync(path.join(RAW_DIR, f))).digest('hex');
  if (!hashGroups.has(hash)) hashGroups.set(hash, []);
  hashGroups.get(hash).push(f);
}
const canonicalFiles = [];
console.log(`[dedupe] ${files.length} files -> ${hashGroups.size} unique workbooks`);
for (const group of hashGroups.values()) {
  canonicalFiles.push(group[0]);
  if (group.length > 1) console.log(`   "${group[0]}" == ${group.slice(1).map(g => `"${g}"`).join(', ')}`);
}

// ── 2. parse every unique workbook ─────────────────────────────────────────
for (const f of canonicalFiles) {
  const wb = XLSX.readFile(path.join(RAW_DIR, f), { cellDates: true });
  const context = detectContext(wb, f);
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null, raw: true });
    if (rows.length < 2) continue;
    const header = rows[0];
    const hasFollowers = findCol(header, h => h === 'followers') >= 0;
    const hasUsername  = findCol(header, h => h.includes('username')) >= 0;
    if (!hasFollowers || !hasUsername) continue; // budget/meta/redemption sheets

    const isKpi = findCol(header, h => h === 'cpi') >= 0;
    let platform = platformFromSheet(sheetName);
    if (!platform) {
      const uHeader = normH(header[findCol(header, h => h.includes('username'))]);
      platform = uHeader.includes('tiktok') ? 'tiktok' : 'instagram';
    }
    if (isKpi) parseKpiSheet(rows, platform, context);
    else parseDirectorySheet(rows, platform, context);
  }
}

// ── 3. write KOL.xlsx (parse_data.py's exact positional legacy layout) ───────
const kolHeader = ['No', 'Username', 'Type', 'TierRaw', 'Location', 'SocialMedia', 'Followers',
  'Category', 'PICName', 'PICContact', 'RatePlatform', 'RateValue', 'Extra'];
const kolRows = [];
let id = 1;
let twitterOnlyNoRate = 0;
for (const k of registry.values()) {
  const socialMedia = Array.from(k.platforms).join(', ');
  const category    = Array.from(k.categories).join(', ');
  const rates = [];
  if (k.rate_ig > 0) rates.push(['IG', k.rate_ig]);
  if (k.rate_tiktok > 0) rates.push(['Tiktok', k.rate_tiktok]);
  if (rates.length === 0 && k.platforms.has('twitter') && !k.platforms.has('instagram') && !k.platforms.has('tiktok')) {
    twitterOnlyNoRate++;
  }
  const [firstLabel, firstVal] = rates[0] || [null, null];
  kolRows.push([id, k.username, k.tier, null, k.location, socialMedia, k.followers, category, '', '', firstLabel, firstVal, null]);
  for (let i = 1; i < rates.length; i++) {
    kolRows.push([null, null, null, null, null, null, null, null, null, null, rates[i][0], rates[i][1], null]);
  }
  id++;
}
const kolWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(kolWb, XLSX.utils.aoa_to_sheet([kolHeader, ...kolRows]), 'KOL');
XLSX.writeFile(kolWb, OUT_KOL);

// ── 4. write insight.xlsx Sheet3 (extract_insights.py's exact positional layout) ─
const insightHeader = ['No', 'AccountUsername', 'Followers', '_', 'Reach', 'Likes', 'Comments',
  'Shares', 'Saves', '_', '_', '_', 'TotalEngagement', 'ER%'];
const insightRows = observations.map((o, idx) => [idx + 1, o.username, o.followers, null, o.reach,
  o.likes, o.comments, o.shares, o.saves, null, null, null, o.total_eng, o.er_pct]);
const insightWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(insightWb, XLSX.utils.aoa_to_sheet([insightHeader, ...insightRows]), 'Sheet3');
XLSX.writeFile(insightWb, OUT_INSIGHT);

// ── 5. summary ─────────────────────────────────────────────────────────────
console.log(`\n[summary]`);
console.log(`  Unique KOL usernames merged : ${registry.size}`);
console.log(`  KPI-style rows / ER obs     : ${stats.kpiRows} / ${stats.kpiObs}`);
console.log(`  Directory-style rows / ER obs: ${stats.dirRows} / ${stats.dirObs}`);
console.log(`  Total ER observations       : ${observations.length}`);
console.log(`  Twitter-only KOL w/o rate   : ${twitterOnlyNoRate} (no twitter bucket in legacy schema)`);
console.log(`  Anomalous rows skipped      : ${stats.anomalies}`);
console.log(`  Campaign contexts seen      : ${Object.keys(contextCounts).length}`);
for (const [ctx, n] of Object.entries(contextCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${ctx.padEnd(28)}: ${n} rows`);
}
console.log(`\n  Sample KOL rows:`);
for (const row of kolRows.filter(r => r[0] != null).slice(0, 5)) console.log('   ', JSON.stringify(row));
console.log(`\n  Sample ER observations:`);
for (const o of observations.slice(0, 5)) console.log('   ', JSON.stringify(o));
console.log(`\n[OK] Wrote ${OUT_KOL}`);
console.log(`[OK] Wrote ${OUT_INSIGHT}`);
