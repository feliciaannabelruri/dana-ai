import os, sys
from huggingface_hub import HfApi

token = os.environ.get("HF_TOKEN", "")
if not token:
    print("ERROR: HF_TOKEN secret is not set!")
    print("Go to: GitHub repo -> Settings -> Secrets -> Actions -> New repository secret")
    print("Name: HF_TOKEN  |  Value: your token from https://huggingface.co/settings/tokens")
    sys.exit(1)

print(f"HF_TOKEN OK (length={len(token)})")
print("Uploading dana-ai-v2/backend/ -> Feliciaaaaaaaaae/dana-ai-backend ...")

api = HfApi(token=token)
api.upload_folder(
    folder_path="dana-ai-v2/backend",
    repo_id="Feliciaaaaaaaaae/dana-ai-backend",
    repo_type="space",
    commit_message="chore: auto-deploy from GitHub Actions",
    ignore_patterns=[
        "models/*",
        "data/*.pkl",
        "data/KOL.xlsx",
        "data/insight.xlsx",
        "__pycache__/**",
        "**/__pycache__/**",
        "*.pyc",
        ".env",
        ".env.*",
        "*.egg-info/**",
        ".DS_Store",
        "profile_cache/**",
    ],
)
print("Done! HuggingFace Space will restart automatically in ~1 minute.")
