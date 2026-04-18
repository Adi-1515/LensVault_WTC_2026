import React, { useState } from 'react';
import { getThumbnailUrl, getOriginalUrl } from '../services/api';
import { Heart, Play, Loader } from 'lucide-react';

const PhotoCard = ({ photo, onClick, onFavouriteToggle }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isVideo = photo.mime_type?.startsWith('video/');
  const isPending = photo.thumbnail_status === 'pending';

  // For videos with a generated WebP thumbnail, show the image
  // For videos still processing, show the native <video> element for preview
  const thumbUrl = getThumbnailUrl(photo.id, 'medium');

  return (
    <div className="photo-card" onClick={() => onClick(photo)}>

      {isVideo ? (
        <>
          {/* Try the WebP thumbnail first; fall back to native video preview */}
          {!imgError ? (
            <img
              src={thumbUrl}
              alt={photo.filename}
              className="photo-img"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              loading="lazy"
              style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />
          ) : (
            // WebP not ready — use native browser video preview
            <video
              src={getOriginalUrl(photo.id)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted
              preload="metadata"
              playsInline
              onLoadedMetadata={e => { e.target.currentTime = 1; }}
            />
          )}

          {/* Loading placeholder while thumbnail generates */}
          {!imgLoaded && !imgError && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'var(--bg-surface-hover)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Loader size={20} style={{ opacity: 0.4, animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {/* Play button overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.12)',
            pointerEvents: 'none'
          }}>
            <div style={{
              width: '38px', height: '38px',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Play size={16} fill="white" color="white" style={{ marginLeft: '2px' }} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Photo */}
          {!imgError ? (
            <img
              src={thumbUrl}
              alt={photo.filename}
              className="photo-img"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              loading="lazy"
              style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--border-color)', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '2rem', opacity: 0.4 }}>📸</span>
            </div>
          )}
          {/* Skeleton while loading */}
          {!imgLoaded && !imgError && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, var(--bg-surface-hover) 25%, var(--bg-surface) 50%, var(--bg-surface-hover) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite'
            }} />
          )}
        </>
      )}

      {/* Pending indicator */}
      {isPending && (
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          background: 'rgba(0,0,0,0.5)', borderRadius: '99px',
          padding: '2px 8px', fontSize: '0.65rem', color: 'white',
          backdropFilter: 'blur(4px)'
        }}>
          …
        </div>
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