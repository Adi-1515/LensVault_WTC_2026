import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPersonPhotos, toggleFavourite } from '../services/api';
import Lightbox from '../components/Lightbox';
import PhotoGrid from '../components/PhotoGrid';
import { Users } from 'lucide-react';

const PersonDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
  }, [id]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const res = await getPersonPhotos(id);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFav = async (photoId) => {
    try {
      const res = await toggleFavourite(photoId);
      setData(prev => ({
        ...prev,
        photos: prev.photos.map(p => p.id === photoId ? res.data : p)
      }));
      if (lightbox?.id === photoId) setLightbox(res.data);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!data) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Person not found.</div>;

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <div style={{ padding: '24px 28px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-light)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
          <Users size={32} />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>{data.person.name}</h1>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{data.total} photos</span>
        </div>
      </div>

      {data.photos.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '80px 20px', borderStyle: 'dashed' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>No photos found</p>
        </div>
      ) : (
        <PhotoGrid photos={data.photos} groupByMonth={true} onPhotoClick={setLightbox} onFavouriteToggle={handleFav} />
      )}

      {lightbox && <Lightbox photo={lightbox} photos={data.photos} onClose={() => setLightbox(null)} onFavouriteToggle={handleFav} />}
    </div>
  );
};

export default PersonDetail;
