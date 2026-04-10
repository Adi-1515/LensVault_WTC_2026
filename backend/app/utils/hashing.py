import hashlib
import imagehash
from PIL import Image

from typing import Optional

def compute_sha256(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

def compute_phash(image_path: str) -> Optional[str]:
    try:
        img = Image.open(image_path)
        return str(imagehash.phash(img))
    except Exception:
        return None
