import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import numpy as np
import pandas as pd
import joblib, os, json
from sklearn.preprocessing import MinMaxScaler
from sklearn.neighbors import NearestNeighbors

DATA_PATH  = os.path.join(os.path.dirname(__file__), '..', 'data', 'kol_clean.pkl')
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

# ── HuggingFace model ─────────────────────────────────────────
# paraphrase-multilingual-MiniLM-L12-v2:
#   - Support Bahasa Indonesia + English sekaligus
#   - Ringan ~100MB, bisa CPU
#   - Bagus untuk semantic similarity
HF_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

LOCATION_LIST = ['jakarta','bandung','surabaya','yogyakarta','bali',
                 'sumatra','kalimantan','sulawesi','nasional','other','unknown']


def load_sentence_transformer():
    print(f"[HF] Loading HuggingFace model: {HF_MODEL_NAME}")
    print("   (Download ~100MB pertama kali, cached setelahnya)")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(HF_MODEL_NAME)
    print("   [OK] Model loaded!")
    return model


def build_category_embeddings(df, st_model):
    """
    Encode setiap kategori KOL jadi dense embedding vector (384 dim)
    menggunakan sentence-transformers.
    
    Jauh lebih akurat dari TF-IDF karena:
    - "Career & Self Development" ≈ "keuangan karir" (semantically similar)
    - "Entertainment" ≠ "Finance" (clearly different)
    - Paham konteks Bahasa Indonesia + English
    """
    categories = df['category'].fillna('konten umum').tolist()
    print(f"   Encoding {len(categories)} kategori KOL...")
    embeddings = st_model.encode(categories, show_progress_bar=True, batch_size=32)
    print(f"   Embedding shape: {embeddings.shape}")
    return embeddings


def build_numeric_features(df):
    """Numeric features: followers, tier, rate — dinormalisasi 0-1"""
    loc_onehot = pd.get_dummies(
        df['location_norm'].apply(lambda x: x if x in LOCATION_LIST else 'other')
    ).reindex(columns=LOCATION_LIST, fill_value=0).values.astype(float)

    numeric = df[['followers_log','tier_score','rate_min','rate_max']].fillna(0)
    scaler  = MinMaxScaler()
    num_scaled = scaler.fit_transform(numeric)

    # ER score: kalau ada data nyata, pakai; kalau tidak, estimasi dari followers
    er_scores = []
    for _, row in df.iterrows():
        if row['has_er_data'] and not np.isnan(row['avg_er_pct']):
            # Normalize ER% ke 0-1 (cap di 50%)
            er_scores.append(min(row['avg_er_pct'] / 50.0, 1.0))
        else:
            # Estimasi: KOL kecil cenderung ER lebih tinggi
            followers = row['followers_num']
            if followers < 10000:   er_scores.append(0.7)
            elif followers < 50000:  er_scores.append(0.55)
            elif followers < 200000: er_scores.append(0.4)
            elif followers < 1000000:er_scores.append(0.25)
            else:                    er_scores.append(0.15)

    er_array = np.array(er_scores).reshape(-1, 1)
    return np.hstack([loc_onehot, num_scaled, er_array]), scaler


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    print("--- Loading cleaned KOL data...")
    df = joblib.load(DATA_PATH)
    print(f"   {len(df)} KOL | {df['has_er_data'].sum()} dengan real ER data")

    # Step 1: Load HuggingFace model
    st_model = load_sentence_transformer()

    # Step 2: Encode semua kategori KOL → dense embeddings
    print("\n[NLP] Building semantic embeddings (HuggingFace)...")
    cat_embeddings = build_category_embeddings(df, st_model)

    # Step 3: Build numeric features
    print("\n[*] Building numeric features...")
    numeric_features, scaler = build_numeric_features(df)
    print(f"   Numeric shape: {numeric_features.shape}")

    # Step 4: Gabungkan — semantic (384) + numeric (16)
    # Beri bobot lebih ke semantic karena ini yang paling informatif
    SEMANTIC_WEIGHT = 2.0  # semantic 2x lebih berpengaruh
    X = np.hstack([cat_embeddings * SEMANTIC_WEIGHT, numeric_features])
    print(f"   Final feature matrix: {X.shape}")

    # Step 5: Train KNN
    print("\n[ML] Training KNN recommender...")
    k = min(30, len(X))
    knn = NearestNeighbors(n_neighbors=k, metric='cosine', algorithm='brute')
    knn.fit(X)

    # Step 6: Save semua artifacts
    joblib.dump(df,             os.path.join(MODELS_DIR, 'kol_df.pkl'))
    joblib.dump(X,              os.path.join(MODELS_DIR, 'feature_matrix.pkl'))
    joblib.dump(cat_embeddings, os.path.join(MODELS_DIR, 'cat_embeddings.pkl'))
    joblib.dump(numeric_features, os.path.join(MODELS_DIR, 'numeric_features.pkl'))
    joblib.dump(scaler,         os.path.join(MODELS_DIR, 'scaler.pkl'))
    joblib.dump(knn,            os.path.join(MODELS_DIR, 'knn.pkl'))
    joblib.dump(st_model,       os.path.join(MODELS_DIR, 'st_model.pkl'))

    meta = {
        'total_kol':       int(len(df)),
        'kol_with_er':     int(df['has_er_data'].sum()),
        'hf_model':        HF_MODEL_NAME,
        'embedding_dim':   int(cat_embeddings.shape[1]),
        'feature_shape':   list(X.shape),
        'location_dist':   df['location_norm'].value_counts().to_dict(),
        'type_dist':       df['type_norm'].value_counts().to_dict(),
        'semantic_weight': SEMANTIC_WEIGHT,
    }
    with open(os.path.join(MODELS_DIR, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\n[OK] Semua artifacts saved ke: {MODELS_DIR}/")
    print(f"\n--- Summary:")
    print(f"   - HuggingFace model  : {HF_MODEL_NAME}")
    print(f"   - Embedding dims     : {cat_embeddings.shape[1]} (semantic)")
    print(f"   - Total feature dims : {X.shape[1]}")
    print(f"   - KOL dengan ER nyata: {df['has_er_data'].sum()}/{len(df)}")
    print(f"\n[>] Jalankan: uvicorn main:app --reload --port 8000")


if __name__ == '__main__':
    main()
