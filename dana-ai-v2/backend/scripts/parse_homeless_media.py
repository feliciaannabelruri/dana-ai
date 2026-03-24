"""
parse_homeless_media.py
FIXED: Format baru — Sheet1, kolom berbeda dari versi lama.

Struktur kolom Sheet1:
  0: No
  1: Username
  2: Social Media
  3: Followers
  4: General Brief (= Category)
  5: PIC name
  6: No PIC (= PIC contact)
  7: Tier (= Location, misal 'Nasional', 'Jakarta', dll)
  8: Rate Card (platform name)
  9: Rate value (sudah dalam rupiah penuh)
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
    """Rate di sheet baru sudah rupiah penuh — tinggal ambil angkanya."""
    if val is None: return 0
    if isinstance(val, (int, float)):
        try: return int(val)
        except: return 0
    s = str(val).strip()
    if s in ('', '-', 'nan', 'None', '#DIV/0!'): return 0
    try:
        return int(re.sub(r'[^0-9]', '', s))
    except:
        return 0


def parse_contact(val):
    """Normalisasi nomor HP jadi string bersih."""
    if val is None: return ''
    if isinstance(val, (int, float)):
        try: return str(int(val)).strip()
        except: return ''
    return str(val).strip()


def normalize_location(loc):
    if not loc or str(loc).strip().lower() in ('nan', ''):
        return "nasional"
    loc_lower = str(loc).lower().strip()
    for group, keywords in LOCATION_GROUPS.items():
        if any(kw in loc_lower for kw in keywords):
            return group
    return "other"


def build_contact_action(contact_raw, username, social_media):
    contact = contact_raw.replace('+', '').replace(' ', '').replace('.0', '').strip()
    if contact and contact.isdigit() and len(contact) >= 8:
        if contact.startswith('0'):
            contact = '62' + contact[1:]
        elif not contact.startswith('62'):
            contact = '62' + contact
        return {
            'type': 'whatsapp',
            'url': f'https://wa.me/{contact}',
            'label': f'WA {contact}',
        }
    uname = username.lstrip('@')
    sm = str(social_media).lower()
    if 'tiktok' in sm:
        return {'type': 'tiktok', 'url': f'https://tiktok.com/@{uname}', 'label': f'DM @{uname}'}
    return {'type': 'instagram', 'url': f'https://instagram.com/{uname}', 'label': f'DM @{uname}'}


def parse_sheet1(filepath):
    """
    Parse Sheet1 dengan struktur baru:
    col 0: No | 1: Username | 2: Social Media | 3: Followers
    col 4: General Brief (category) | 5: PIC name | 6: No PIC (contact)
    col 7: Tier (location) | 8: Rate Card platform | 9: Rate value
    """
    import openpyxl
    wb = openpyxl.load_workbook(filepath, read_only=True)

    # Coba Sheet1 dulu, fallback ke sheet pertama
    sheet_name = 'Sheet1' if 'Sheet1' in wb.sheetnames else wb.sheetnames[0]
    ws = wb[sheet_name]
    print(f"[*] Membaca sheet: '{sheet_name}'")

    records = []
    current = None

    for row in ws.iter_rows(min_row=2, values_only=True):
        # Pastikan row punya cukup kolom
        row = list(row) + [None] * max(0, 10 - len(row))

        no_val = row[0]
        try:
            has_id = no_val is not None and str(no_val).replace('.0', '').strip().isdigit()
        except:
            has_id = False

        if has_id:
            # Simpan record sebelumnya
            if current and current.get('username', '').strip():
                records.append(current)

            rate_platform = str(row[8]).strip() if row[8] is not None else ''
            rate_value    = parse_rate(row[9])
            contact_raw   = parse_contact(row[6])

            current = {
                'id':            int(float(no_val)),
                'username':      str(row[1]).strip() if row[1] is not None else '',
                'social_media':  str(row[2]).strip() if row[2] is not None else 'Instagram',
                'followers_raw': row[3],
                'category':      str(row[4]).strip() if row[4] is not None else 'Media',
                'pic_name':      str(row[5]).strip() if row[5] is not None else '',
                'pic_contact':   contact_raw,
                'location_raw':  str(row[7]).strip() if row[7] is not None else 'Nasional',
                'rate_card':     {},
            }
            if rate_platform and rate_value > 0:
                current['rate_card'][rate_platform] = rate_value

        elif current is not None:
            # Baris lanjutan — tambah rate card
            rate_platform = str(row[8]).strip() if row[8] is not None else ''
            rate_value    = parse_rate(row[9])
            if rate_platform and rate_value > 0:
                current['rate_card'][rate_platform] = rate_value

    # Jangan lupa record terakhir
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
        contact_action = build_contact_action(r['pic_contact'], r['username'], r['social_media'])

        result.append({
            'id':              r['id'],
            'username':        r['username'],
            'social_media':    r['social_media'],
            'followers_raw':   str(r['followers_raw']) if r['followers_raw'] else '0',
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


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    if not os.path.exists(HOMELESS_MEDIA_PATH):
        print(f"[ERROR] File tidak ditemukan: {HOMELESS_MEDIA_PATH}")
        sys.exit(1)

    print(f"[*] Parsing: {HOMELESS_MEDIA_PATH}")
    records = parse_sheet1(HOMELESS_MEDIA_PATH)
    enriched = enrich(records)
    print(f"[OK] {len(enriched)} Homeless Media accounts parsed")

    # Debug: sample lokasi
    print("\n  Sample location_norm:")
    seen = set()
    for r in enriched:
        key = (r['location_raw'], r['location_norm'])
        if key not in seen:
            print(f"    '{r['location_raw']}' → '{r['location_norm']}'")
            seen.add(key)
            if len(seen) >= 20: break

    # Debug: sample rate
    print("\n  Sample rate card:")
    for r in enriched[:5]:
        print(f"    @{r['username']}: {r['rate_card']} | min={r['rate_min']} max={r['rate_max']}")

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)
    print(f"\n[OK] Saved → {OUT_PATH}")

    # Summary
    cats = {}
    locs = {}
    for r in enriched:
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