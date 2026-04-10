import React, { useState, useEffect } from 'react';
import { getTimeline, toggleFavourite } from '../services/api';
import PhotoGrid from '../components/PhotoGrid';
import Lightbox from '../components/Lightbox';
import { Video } from 'lucide-react';

const Videos = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxData, setLightboxData] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getTimeline(1, 200, 'videos');
        setPhotos(res.data.photos);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleFav = async (id) => {
    try {
      const res = await toggleFavourite(id);
      setPhotos(prev => prev.map(p => p.id === id ? res.data : p));
      if (lightboxData?.id === id) setLightboxData(res.data);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading videos...</div>;

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="timeline-header">
        <div>
          <h1 className="timeline-title">Videos</h1>
          <span className="timeline-count">{photos.length} videos</span>
        </div>
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', marginTop: '40px', background: 'var(--bg-surface-hover)', borderRadius: '16px' }}>
          <Video size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '10px' }}>No videos yet</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Upload MP4, MOV, or AVI files to see them here.</p>
        </div>
      ) : (
        <PhotoGrid photos={photos} onPhotoClick={setLightboxData} onFavouriteToggle={handleFav} />
      )}

      {lightboxData && (
        <Lightbox
          photo={lightboxData}
          photos={photos}
          onClose={() => setLightboxData(null)}
          onFavouriteToggle={handleFav}
        />
      )}
    </div>
  );
};

export default Videos;
