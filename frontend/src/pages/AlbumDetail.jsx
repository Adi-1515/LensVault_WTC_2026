import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAlbum, removePhotoFromAlbum, toggleFavourite, deleteAlbum, getTimeline, addPhotosToAlbum, shareAlbum, getThumbnailUrl } from '../services/api';
import Lightbox from '../components/Lightbox';
import PhotoGrid from '../components/PhotoGrid';
import { Plus, Trash2, FolderOpen, ShieldAlert, Check, Share2, Copy, X, Globe, Lock } from 'lucide-react';

const AlbumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [availablePhotos, setAvailablePhotos] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [shareInfo, setShareInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchAlbum(); }, [id]);

  const fetchAlbum = async () => {
    try {
      const res = await getAlbum(id);
      setAlbum(res.data);
    } catch (e) { console.error(e); }
  };

  const handleFav = async (photoId) => {
    try {
      const res = await toggleFavourite(photoId);
      setAlbum(prev => ({...prev, photos: prev.photos.map(p => p.id === photoId ? res.data : p)}));
      if (lightbox?.id === photoId) setLightbox(res.data);
    } catch (e) { console.error(e); }
  };

  const confirmDeleteAlbum = async () => {
    setIsDeleting(true);
    try {
      await deleteAlbum(id);
      navigate('/albums');
    } catch (e) { 
      console.error(e);
      alert("Failed to delete album.");
    }
    setIsDeleting(false);
  };

  const openAddModal = async () => {
    try {
      const res = await getTimeline(1, 100);
      const existingIds = new Set(album.photos.map(p => p.id));
      setAvailablePhotos(res.data.photos.filter(p => !existingIds.has(p.id)));
      setSelectedIds([]);
      setShowAddModal(true);
    } catch (e) { console.error(e); }
  };

  const submitAddPhotos = async () => {
    setIsAdding(true);
    try {
      await addPhotosToAlbum(id, selectedIds);
      setShowAddModal(false);
      fetchAlbum();
    } catch (e) { console.error(e); }
    setIsAdding(false);
  };

  const handleShare = async () => {
    try {
      const res = await shareAlbum(id);
      setShareInfo(res.data);
      setAlbum(prev => ({ ...prev, is_public: res.data.is_public, share_token: res.data.share_token }));
    } catch (e) { console.error(e); }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}${shareInfo?.share_url}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSelect = (pid) => setSelectedIds(prev => prev.includes(pid) ? prev.filter(i => i !== pid) : [...prev, pid]);

  if (!album) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading album...</div>;

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <div style={{ padding: '24px 28px', marginBottom: '32px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>{album.name}</h1>
          {album.description && <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>{album.description}</p>}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{album.photos.length} photos</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={openAddModal} className="btn-primary"><Plus size={16} /> Add Photos</button>
          <button onClick={handleShare} className="btn-secondary" style={{ color: album.is_public ? 'var(--accent-color)' : 'var(--text-primary)' }}>
            {album.is_public ? <><Globe size={16} /> Shared</> : <><Share2 size={16} /> Share</>}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-secondary" style={{ color: 'var(--danger-color)', borderColor: 'rgba(239,68,68,0.3)' }}><Trash2 size={16} /></button>
        </div>
      </div>

      {/* Share link display */}
      {shareInfo?.share_url && (
        <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-color)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Globe size={16} color="var(--accent-color)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 500 }}>{window.location.origin}{shareInfo.share_url}</span>
          <button onClick={copyShareLink} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Copy size={12} />{copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={() => setShareInfo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-color)' }}><X size={14} /></button>
        </div>
      )}

      {album.photos.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '80px 20px', borderStyle: 'dashed' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', opacity: 0.5 }}>
            <FolderOpen size={64} />
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>This album is empty</p>
          <button onClick={openAddModal} className="btn-primary">Add your first photos</button>
        </div>
      ) : (
        <PhotoGrid photos={album.photos} groupByMonth={false} onPhotoClick={setLightbox} onFavouriteToggle={handleFav} />
      )}

      {lightbox && <Lightbox photo={lightbox} photos={album.photos} onClose={() => setLightbox(null)} onFavouriteToggle={handleFav} />}

      {showDeleteConfirm && (
        <div className="lightbox-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <ShieldAlert size={32} color="var(--danger-color)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Delete Album?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Your photos are safe and will stay in your timeline, but this album grouping will be permanently removed.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary" style={{ flex: 1 }} disabled={isDeleting}>Cancel</button>
              <button onClick={confirmDeleteAlbum} className="btn-primary" style={{ flex: 1, background: 'var(--danger-color)' }} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="lightbox-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Select Photos</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Plus style={{ transform: 'rotate(45deg)' }} size={24} /></button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {availablePhotos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>No available photos to add. Upload to your timeline first!</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                  {availablePhotos.map(p => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => toggleSelect(p.id)}
                        style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease', border: `3px solid ${isSelected ? 'var(--accent-color)' : 'transparent'}`, transform: isSelected ? 'scale(0.95)' : 'none' }}
                      >
                        <img src={getThumbnailUrl(p.id, 'small')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {isSelected && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,112,243,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={32} color="white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{selectedIds.length} selected</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={submitAddPhotos} disabled={selectedIds.length === 0 || isAdding} className="btn-primary">
                  {isAdding ? 'Adding...' : 'Add Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumDetail;