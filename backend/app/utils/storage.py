import os
import uuid

def save_original(file_bytes: bytes, filename: str, canonical_date, storage_base_path: str) -> str:
    year = str(canonical_date.year)
    month = f"{canonical_date.month:02d}"
    
    dir_path = os.path.join(storage_base_path, "originals", year, month)
    os.makedirs(dir_path, exist_ok=True)
    
    ext = os.path.splitext(filename)[1]
    new_filename = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(dir_path, new_filename)
    
    with open(full_path, "wb") as f:
        f.write(file_bytes)
        
    return full_path
