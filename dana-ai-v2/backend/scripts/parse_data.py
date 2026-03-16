import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import pandas as pd
import numpy as np
import re, joblib, os, json

DATA_PATH    = os.path.join(os.path.dirname(__file__), '..', 'data', 'KOL.xlsx')
INSIGHT_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'insight.xlsx')
OUT_PATH     = os.path.join(os.path.dirname(__file__), '..', 'data', 'kol_clean.pkl')
ER_PATH      = os.path.join(os.path.dirname(__file__), '..', 'data', 'er_data.json')

TIER_MAP = {"nano":1,"mikro":2,"micro":2,"makro":3,"macro":3,"mega":4,"celeb":5}

# ── FIXED: Setiap kota/wilayah ke grup yang tepat ───────────────
LOCATION_GROUPS = {
    "jakarta":      ["jakarta","jaksel","jakpus","jakbar","jaktim","jakut",
                     "gading serpong","tangerang","depok","bekasi","bogor","bsd",
                     "serpong","cibubur","cikarang"],
    "bandung":      ["bandung","cimahi"],
    "cirebon":      ["cirebon"],
    "surabaya":     ["surabaya","sidoarjo","pasuruan","kediri","gresik"],
    "malang":       ["malang","batu"],
    "jawa_timur":   ["jawa timur","jatim","banyuwangi","jember","madiun",
                     "lumajang","blitar","mojokerto","probolinggo","lamongan",
                     "tuban","bojonegoro"],
    "yogyakarta":   ["yogyakarta","jogja","sleman","bantul","gunung kidul","kulon progo"],
    "solo":         ["solo","surakarta","karanganyar","wonogiri","klaten","boyolali","sragen"],
    "semarang":     ["semarang","salatiga","kendal","demak","ungaran"],
    "jawa_tengah":  ["jawa tengah","jateng","magelang","purwokerto","cilacap",
                     "banyumas","kebumen","wonosobo","temanggung","kudus",
                     "pati","jepara","rembang","blora","batang","pemalang",
                     "tegal","brebes","pekalongan","purbalingga","banjarnegara","grobogan"],
    "bali":         ["bali","denpasar","badung","gianyar","tabanan","buleleng",
                     "karangasem","klungkung","bangli","jembrana"],
    "sumatra":      ["medan","palembang","pekanbaru","pekan baru","batam","lampung",
                     "padang","aceh","jambi","bengkulu","banda aceh","langsa",
                     "lhokseumawe","binjai","pematangsiantar","lubuklinggau",
                     "prabumulih","dumai","padang sidempuan"],
    "kalimantan":   ["kalimantan","banjarmasin","samarinda","pontianak","balikpapan",
                     "palangkaraya","banjarbaru","tarakan","singkawang","kotabaru"],
    "sulawesi":     ["sulawesi","makassar","manado","gowa","palu","kendari",
                     "gorontalo","mamuju","palopo"],
    "nasional":     ["nasional","national","indonesia"],
}

def parse_followers(val):
    if val is None or (isinstance(val, float) and np.isnan(val)): return 0
    s = str(val).strip().upper().replace(',','.')
    try:
        if 'M' in s: return int(float(re.sub(r'[^0-9.]','',s))*1_000_000)
        if 'K' in s: return int(float(re.sub(r'[^0-9.]','',s))*1_000)
        return int(float(re.sub(r'[^0-9.]','',s)))
    except: return 0

def parse_rate(val):
    if val is None or str(val).strip() in ('','-','nan','None'): return 0
    try: return int(re.sub(r'[^0-9]','',str(val)))
    except: return 0

def parse_contact(val):
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return ''
    if isinstance(val, (int, float)):
        try:
            return str(int(val)).strip()
        except:
            return ''
    return str(val).strip()

def normalize_location(loc):
    if not loc: return "unknown"
    loc_lower = str(loc).lower().strip()
    for group, keywords in LOCATION_GROUPS.items():
        if any(kw in loc_lower for kw in keywords): return group
    return "other"

def normalize_type(t):
    if not t: return "unknown"
    t_lower = str(t).lower().strip()
    for key in TIER_MAP:
        if key in t_lower: return key
    return "unknown"

def _set_rate(current, platform, value):
    p = str(platform).lower()
    r = parse_rate(value)
    if 'tiktok' in p: current['rate_tiktok'] = r
    elif 'ig' in p or 'instagram' in p or 'reels' in p: current['rate_ig'] = r
    elif 'bundl' in p or 'mirror' in p: current['rate_bundling'] = r

def load_er_data():
    if os.path.exists(ER_PATH):
        with open(ER_PATH) as f:
            return json.load(f)
    return {}

def parse_kol():
    wb = pd.read_excel(DATA_PATH, header=0)
    wb.columns = ['no','username','type','tier_raw','location','social_media',
                  'followers','category','pic_name','pic_contact','rate_platform','rate_value']

    records = []
    current = {}
    for _, row in wb.iterrows():
        no_val = row.get('no')
        try: has_id = pd.notna(no_val) and str(no_val).replace('.0','').strip().isdigit()
        except: has_id = False

        if has_id:
            if current and current.get('username','').strip():
                records.append(current)
            current = {
                'id':           int(float(no_val)),
                'username':     str(row.get('username','')).strip() if pd.notna(row.get('username')) else '',
                'type_raw':     str(row.get('type','')).strip() if pd.notna(row.get('type')) else '',
                'location_raw': str(row.get('location','')).strip() if pd.notna(row.get('location')) else '',
                'social_media': str(row.get('social_media','')).strip() if pd.notna(row.get('social_media')) else '',
                'followers_raw':row.get('followers'),
                'category':     str(row.get('category','')).strip() if pd.notna(row.get('category')) else '',
                'pic_name':     str(row.get('pic_name','')).strip() if pd.notna(row.get('pic_name')) else '',
                'pic_contact':  parse_contact(row.get('pic_contact')),
                'rate_tiktok':0, 'rate_ig':0, 'rate_bundling':0,
            }
            if pd.notna(row.get('rate_platform')) and pd.notna(row.get('rate_value')):
                _set_rate(current, str(row['rate_platform']), row['rate_value'])
        elif current and pd.notna(row.get('rate_platform')):
            _set_rate(current, str(row['rate_platform']), row.get('rate_value'))

    if current and current.get('username','').strip():
        records.append(current)

    df = pd.DataFrame(records)

    df['followers_num'] = df['followers_raw'].apply(parse_followers)
    df['type_norm']     = df['type_raw'].apply(normalize_type)
    df['tier_score']    = df['type_norm'].map(TIER_MAP).fillna(2)
    df['location_norm'] = df['location_raw'].apply(normalize_location)
    df['rate_min']      = df[['rate_tiktok','rate_ig','rate_bundling']].apply(
                            lambda r: min(v for v in r if v>0) if any(v>0 for v in r) else 0, axis=1)
    df['rate_max']      = df[['rate_tiktok','rate_ig','rate_bundling']].max(axis=1)
    df['followers_log'] = np.log1p(df['followers_num'])

    er_data = load_er_data()
    df['has_er_data']  = False
    df['avg_er_pct']   = np.nan
    df['avg_reach_actual'] = np.nan
    df['post_count']   = 0

    for idx, row in df.iterrows():
        uname = row['username'].lower().strip()
        if uname in er_data:
            d = er_data[uname]
            df.at[idx, 'has_er_data']       = True
            df.at[idx, 'avg_er_pct']        = d.get('avg_er_pct') or np.nan
            df.at[idx, 'avg_reach_actual']  = d.get('avg_reach') or np.nan
            df.at[idx, 'post_count']        = d.get('post_count', 0)

    enriched = df['has_er_data'].sum()
    print(f"  Total KOL: {len(df)}")
    print(f"  KOL dengan real ER data: {enriched}")

    # Debug: tampilkan sample location normalization
    print("\n  Sample location normalization:")
    for _, r in df[['location_raw','location_norm']].drop_duplicates().head(20).iterrows():
        print(f"    '{r['location_raw']}' → '{r['location_norm']}'")

    return df

if __name__ == '__main__':
    print("[*] Parsing KOL.xlsx + insight.xlsx...")
    df = parse_kol()
    joblib.dump(df, OUT_PATH)
    print(f"[OK] Saved {len(df)} KOL -> {OUT_PATH}")
    print(df[['username','type_norm','location_norm','followers_num','rate_min','has_er_data','avg_er_pct']].head(15).to_string())