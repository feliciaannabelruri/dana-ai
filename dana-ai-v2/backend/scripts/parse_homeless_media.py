"""
parse_homeless_media.py
FIXED: Location normalization — setiap kota ke grup yang benar.
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import pandas as pd
import numpy as np
import re, json, os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
OUT_PATH = os.path.join(DATA_DIR, 'homeless_media.json')

HOMELESS_MEDIA_PATH = os.environ.get(
    'HOMELESS_MEDIA_PATH',
    os.path.join(DATA_DIR, 'HomelessMedia.xlsx')
)
KOL_PATH = os.path.join(DATA_DIR, 'KOL.xlsx')

# ── FIXED: Location groups ───────────────────────────────────────
LOCATION_GROUPS = {
    "jakarta":      ["jakarta","jaksel","jakpus","jakbar","jaktim","jakut","jkt",
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
    s = str(val).strip().upper().replace(',', '.').replace(' ', '')
    try:
        if 'M' in s: return int(float(re.sub(r'[^0-9.]', '', s)) * 1_000_000)
        if 'K' in s: return int(float(re.sub(r'[^0-9.]', '', s)) * 1_000)
        cleaned = re.sub(r'[^0-9.]', '', s)
        if not cleaned: return 0
        return int(float(cleaned))
    except:
        return 0


def parse_rate(val):
    if val is None or str(val).strip() in ('', '-', 'nan', 'None', '#DIV/0!'): return 0
    try:
        return int(re.sub(r'[^0-9]', '', str(val).replace('.0', '')))
    except:
        return 0


def normalize_location(loc):
    """Normalisasi lokasi ke grup yang benar. Semarang → semarang, bukan yogyakarta."""
    if not loc or str(loc).strip().lower() in ('nan', ''):
        return "nasional"
    loc_lower = str(loc).lower().strip()
    for group, keywords in LOCATION_GROUPS.items():
        if any(kw in loc_lower for kw in keywords):
            return group
    return "other"


def parse_sheet(df):
    records = []
    current = {}

    for _, row in df.iterrows():
        no_val = row.iloc[0]
        try:
            has_id = pd.notna(no_val) and str(no_val).replace('.0', '').strip().isdigit()
        except:
            has_id = False

        if has_id:
            if current and current.get('username', '').strip():
                records.append(current)

            rate_platform = str(row.iloc[8]).strip() if pd.notna(row.iloc[8]) else ''
            rate_value    = parse_rate(row.iloc[9]) if len(row) > 9 else 0

            contact_raw = str(row.iloc[6]).strip() if pd.notna(row.iloc[6]) else ''
            contact_raw = contact_raw.replace('+', '').replace(' ', '').replace('.0', '').strip()

            current = {
                'id':            int(float(no_val)),
                'username':      str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else '',
                'social_media':  str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else 'Instagram',
                'followers_raw': row.iloc[3],
                'category':      str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else 'Media',
                'pic_name':      str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else '',
                'pic_contact':   contact_raw,
                'location_raw':  str(row.iloc[7]).strip() if pd.notna(row.iloc[7]) else 'Nasional',
                'rate_card':     {},
            }
            if rate_platform and rate_value > 0:
                current['rate_card'][rate_platform] = rate_value

        elif current:
            if len(row) > 9:
                rp = str(row.iloc[8]).strip() if pd.notna(row.iloc[8]) else ''
                rv = parse_rate(row.iloc[9]) if pd.notna(row.iloc[9]) else 0
                if rp and rv > 0:
                    current['rate_card'][rp] = rv

    if current and current.get('username', '').strip():
        records.append(current)

    return records


def enrich(records):
    result = []
    for r in records:
        followers_num = parse_followers(r['followers_raw'])
        rates = [v for v in r['rate_card'].values() if v > 0]
        rate_min = min(rates) if rates else 0
        rate_max = max(rates) if rates else 0

        loc_norm = normalize_location(r['location_raw'])

        contact = r['pic_contact']
        if contact and contact.isdigit() and len(contact) >= 8:
            if contact.startswith('0'):
                contact = '62' + contact[1:]
            elif not contact.startswith('62'):
                contact = '62' + contact
            contact_action = {
                'type': 'whatsapp',
                'url': f'https://wa.me/{contact}',
                'label': f'WA {contact}',
            }
        else:
            uname = r['username'].lstrip('@')
            contact_action = {
                'type': 'instagram',
                'url': f'https://instagram.com/{uname}',
                'label': f'DM @{uname}',
            }

        result.append({
            'id':              r['id'],
            'username':        r['username'],
            'social_media':    r['social_media'],
            'followers_raw':   str(r['followers_raw']),
            'followers_num':   followers_num,
            'category':        r['category'],
            'pic_name':        r['pic_name'],
            'pic_contact':     r['pic_contact'],
            'location_raw':    r['location_raw'],
            'location_norm':   loc_norm,
            'rate_card':       r['rate_card'],
            'rate_min':        rate_min,
            'rate_max':        rate_max,
            'contact_action':  contact_action,
        })

    return result


def load_and_parse(filepath, sheet_name='Sheet2'):
    df = pd.read_excel(filepath, sheet_name=sheet_name, header=None)
    df = df.iloc[1:].reset_index(drop=True)
    records = parse_sheet(df)
    return enrich(records)


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    source = None
    if os.path.exists(HOMELESS_MEDIA_PATH):
        source = HOMELESS_MEDIA_PATH
    elif os.path.exists(KOL_PATH):
        xl = pd.ExcelFile(KOL_PATH)
        if 'Sheet2' in xl.sheet_names:
            source = KOL_PATH
        else:
            print(f"[WARN] Tidak ada Sheet2 di KOL.xlsx dan HomelessMedia.xlsx tidak ditemukan")
            return

    print(f"[*] Parsing Homeless Media dari: {source}")
    records = load_and_parse(source, 'Sheet2')
    print(f"[OK] {len(records)} Homeless Media accounts parsed")

    # Debug: tampilkan sample normalisasi lokasi
    print("\n  Sample location_norm:")
    seen = set()
    for r in records:
        key = (r['location_raw'], r['location_norm'])
        if key not in seen:
            print(f"    '{r['location_raw']}' → '{r['location_norm']}'")
            seen.add(key)
            if len(seen) >= 25: break

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"\n[OK] Saved -> {OUT_PATH}")

    cats = {}
    locs = {}
    for r in records:
        cats[r['category']] = cats.get(r['category'], 0) + 1
        locs[r['location_norm']] = locs.get(r['location_norm'], 0) + 1

    print("\nKategori:")
    for cat, cnt in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {cnt}")

    print("\nLokasi (normalized):")
    for loc, cnt in sorted(locs.items(), key=lambda x: -x[1]):
        print(f"  {loc}: {cnt}")


if __name__ == '__main__':
    main()