import os
from huggingface_hub import HfApi, snapshot_download

REPO_ID    = os.environ.get('HF_REPO_ID', 'Feliciaaaaaaaaae/dana-ai-models')
HF_TOKEN   = os.environ.get('HF_TOKEN', '')
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
DATA_DIR   = os.path.join(BASE_DIR, 'data')


def download_models():
    if not HF_TOKEN:
        print('[WARN] HF_TOKEN tidak di-set, skip download')
        return False

    marker = os.path.join(MODELS_DIR, 'st_model.pkl')
    if os.path.exists(marker):
        print('[OK] Models sudah ada, skip download')
        return True

    print('[HF] Downloading models dari HuggingFace Hub...')
    print('     (Butuh 3-5 menit pertama kali)')

    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

    try:
        snapshot_download(
            repo_id=REPO_ID,
            local_dir=BASE_DIR,
            allow_patterns=['models/*', 'data/*'],
            token=HF_TOKEN,
            repo_type='model',
        )
        print('[OK] Download selesai!')
        return True
    except Exception as e:
        print(f'[ERROR] Download gagal: {e}')
        return False


def upload_models():
    if not HF_TOKEN:
        print('[WARN] HF_TOKEN tidak di-set, skip upload')
        return False

    api = HfApi()

    def upload_dir(folder, prefix):
        if not os.path.exists(folder):
            return
        for fname in os.listdir(folder):
            fpath = os.path.join(folder, fname)
            if not os.path.isfile(fpath):
                continue
            try:
                api.upload_file(
                    path_or_fileobj=fpath,
                    path_in_repo=f'{prefix}/{fname}',
                    repo_id=REPO_ID,
                    repo_type='model',
                    token=HF_TOKEN,
                )
                print(f'   OK Uploaded: {fname}')
            except Exception as e:
                print(f'   GAGAL upload {fname}: {e}')

    print('[HF] Uploading models ke HuggingFace Hub...')
    upload_dir(MODELS_DIR, 'models')
    upload_dir(DATA_DIR, 'data')
    print('[OK] Upload selesai!')
    return True
