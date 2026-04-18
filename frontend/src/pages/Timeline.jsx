import React, { useState, useEffect } from 'react';
import { getTimeline, toggleFavourite, deletePhoto, getMemories } from '../services/api';
import PhotoGrid from '../components/PhotoGrid';
import Lightbox from '../components/Lightbox';
import { getThumbnailUrl } from '../services/api';
import { Cake } from 'lucide-react';

const Timeline = () => {
  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lightboxData, setLightboxData] = useState(null);
  const [memories, setMemories] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPhotos = async (p = 1) => {
    try {
      const res = await getTimeline(p);
      if (p === 1) setPhotos(res.data.photos);
      else setPhotos(prev => [...prev, ...res.data.photos]);
      setHasMore(p < res.data.pages);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchPhotos();
    
    // Load "This Day" memories
    getMemories().then(res => setMemories(res.data.photos)).catch(() => {});
    
    // Listen for uploads from the global panel
    const handleUpload = (e) => {
      setPhotos(prev => [e.detail, ...prev]);
    };
    window.addEventListener('photo-uploaded', handleUpload);
    return () => window.removeEventListener('photo-uploaded', handleUpload);
  }, []);

  const handleFav = async (id) => {
    try {
      const res = await toggleFavourite(id);
      setPhotos(prev => prev.map(p => p.id === id ? res.data : p));
      if (lightboxData?.id === id) setLightboxData(res.data);
    } catch (e) { console.error(e); }
  };

  const confirmDeletePhoto = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await deletePhoto(deleteConfirmId);
      setPhotos(prev => prev.filter(p => p.id !== deleteConfirmId));
      setLightboxData(null);
      setDeleteConfirmId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete photo.");
    }
    setIsDeleting(false);
  };

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="timeline-header">
        <div>
          <h1 className="timeline-title">Timeline</h1>
          <span className="timeline-count">{photos.length} photos</span>
        </div>
      </div>

      {/* This Day / Memories Strip */}
      {memories.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Cake size={16} color="var(--accent-color)" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Memories — On This Day</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({memories.length})</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {memories.map(photo => (
              <div
                key={photo.id}
                onClick={() => setLightboxData(photo)}
                style={{
                  flexShrink: 0, width: '120px', height: '120px',
                  borderRadius: '16px', overflow: 'hidden', cursor: 'pointer',
                  background: 'var(--border-hover)', position: 'relative'
                }}
              >
                <img
                  src={getThumbnailUrl(photo.id, 'small')}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  padding: '10px 8px 6px',
                  fontSize: '0.65rem', color: 'white', fontWeight: 600
                }}>
                  {new Date(photo.canonical_date).getFullYear()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', marginTop: '40px', background: 'var(--bg-surface-hover)', borderRadius: '16px' }}>
          <div style={{ fontSize: '4rem', opacity: 0.5, marginBottom: '20px' }}>🖼️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '10px' }}>Your vault is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Use the Upload button in the top bar to add your first photos.</p>
        </div>
      ) : (
        <PhotoGrid photos={photos} onPhotoClick={setLightboxData} onFavouriteToggle={handleFav} />
      )}

      {hasMore && photos.length > 0 && (
        <div style={{ marginTop: '50px', textAlign: 'center' }}>
          <button
            onClick={() => { const next = page + 1; setPage(next); fetchPhotos(next); }}
            className="btn-secondary"
          >
            Load More Photos
          </button>
        </div>
      )}

      {lightboxData && (
        <Lightbox
          photo={lightboxData}
          photos={photos}
          onClose={() => setLightboxData(null)}
          onFavouriteToggle={handleFav}
          onDelete={setDeleteConfirmId}
        />
      )}

      {deleteConfirmId && (
        <div className="lightbox-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span style={{ fontSize: '24px' }}>🗑️</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>Delete Photo?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>This action cannot be undone. It will also be removed from any albums.</p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary" style={{ flex: 1 }} disabled={isDeleting}>Cancel</button>
              <button onClick={confirmDeletePhoto} className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--danger-color)' }} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
