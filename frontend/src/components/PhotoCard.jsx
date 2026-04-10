import React, { useState } from 'react';
import { getThumbnailUrl, getOriginalUrl } from '../services/api';
import { Heart, Play } from 'lucide-react';

const PhotoCard = ({ photo, onClick, onFavouriteToggle }) => {
  const [imgError, setImgError] = useState(false);
  const isVideo = photo.mime_type?.startsWith('video/');

  return (
    <div className="photo-card" onClick={() => onClick(photo)}>
      {isVideo ? (
        // For videos: use a <video> element so browser renders the first frame
        <>
          <video
            src={getOriginalUrl(photo.id)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
            preload="metadata"
            playsInline
            // seek to 1s so we get a real frame, not a black first frame
            onLoadedMetadata={e => { e.target.currentTime = 1; }}
          />
          {/* Play button overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.18)',
            pointerEvents: 'none'
          }}>
            <div style={{
              width: '40px', height: '40px',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Play size={18} fill="white" color="white" style={{ marginLeft: '2px' }} />
            </div>
          </div>
        </>
      ) : imgError ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--border-color)', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '2rem', opacity: 0.5 }}>📸</span>
        </div>
      ) : (
        <img
          src={getThumbnailUrl(photo.id, 'medium')}
          alt={photo.filename}
          className="photo-img"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      )}

      <div className="photo-overlay" />

      <button
        onClick={(e) => { e.stopPropagation(); onFavouriteToggle(photo.id); }}
        className={`photo-fav-btn ${photo.is_favourite ? 'active' : ''}`}
      >
        <Heart size={16} fill={photo.is_favourite ? "var(--danger-color)" : "transparent"} color={photo.is_favourite ? "var(--danger-color)" : "white"} />
      </button>
    </div>
  );
};

export default PhotoCard;