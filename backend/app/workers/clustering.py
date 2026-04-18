import logging
import numpy as np
from sklearn.cluster import DBSCAN
from app.database import SessionLocal
from app.models.face import Face
from app.models.user import User

logger = logging.getLogger(__name__)

def perform_dbscan(user_id: str, eps: float = 0.5):
    """Run DBSCAN clustering on user's faces."""
    db = SessionLocal()
    try:
        faces = db.query(Face).filter(Face.user_id == user_id).all()
        if len(faces) < 2:
            return

        embeddings = []
        face_ids = []
        existing_person_ids = []

        for f in faces:
            emb = np.frombuffer(f.embedding, dtype=np.float32)
            embeddings.append(emb)
            face_ids.append(f.id)
            existing_person_ids.append(f.person_id)

        X = np.array(embeddings)

        dbscan = DBSCAN(eps=eps, min_samples=2, metric='cosine')
        labels = dbscan.fit_predict(X)

        cluster_counts = {}
        for label in np.unique(labels):
            if label != -1:
                cluster_counts[label] = {'freq': {}}

        # Find majority person_id for each cluster
        for i, label in enumerate(labels):
            if label == -1:
                continue
            pid = existing_person_ids[i]
            if pid is not None:
                freq = cluster_counts[label]['freq']
                freq[pid] = freq.get(pid, 0) + 1

        for label, info in cluster_counts.items():
            if info['freq']:
                majority_pid = max(info['freq'], key=info['freq'].get)
                cluster_counts[label]['person_id'] = majority_pid
            else:
                cluster_counts[label]['person_id'] = None

        # Apply results back
        for i, f in enumerate(faces):
            label = int(labels[i])
            if label == -1:
                f.cluster_id = None
            else:
                f.cluster_id = label
                assigned_pid = cluster_counts[label]['person_id']
                if assigned_pid is not None:
                    # propagate majority identity
                    f.person_id = assigned_pid

        db.commit()
        num_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        logger.info(f"Clustering complete for user {user_id}. Found {num_clusters} clusters among {len(faces)} faces.")

    except Exception as e:
        logger.exception("Clustering failed")
        db.rollback()
    finally:
        db.close()
