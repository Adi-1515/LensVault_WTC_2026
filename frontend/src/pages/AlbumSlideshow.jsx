import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAlbums,
  getAlbum,
  getThumbnailUrl,
  getOriginalUrl
} from '../services/api';
import {
  Play, Pause, ChevronLeft, ChevronRight, X,
  Info, Maximize, Minimize, RefreshCw, Image,
  ArrowLeft, FolderOpen
} from 'lucide-react';
import './AlbumSlideshow.css';

const SYNC_INTERVAL_MS = 8000; // Re-fetch album every 8 seconds

/*──────────────────────────────────────────────────────────
 * AlbumSlideshow — Full-screen cinematic slideshow with
 *  live-sync.  When accessed at /slideshow it shows a
 *  picker; at /slideshow/:albumId it jumps straight in.
 *─────────────────────────────────────────────────────────*/
const AlbumSlideshow = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();

  /* ── album picker state ── */
  const [albums, setAlbums] = useState([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState(albumId || null);

  /* ── slideshow data ── */
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ── slideshow playback ── */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [transition, setTransition] = useState('fade');
  const [direction, setDirection] = useState('next');

  /* ── UI ── */
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [transClass, setTransClass] = useState('');

  /* ── sync ── */
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced
  const [newPhotoToast, setNewPhotoToast] = useState(null);

  /* ── refs ── */
  const controlsTimerRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const timerFillRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const preloadRef = useRef(null);
  const touchStartRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const photosRef = useRef(photos);

  // keep ref in sync
  useEffect(() => { photosRef.current = photos; }, [photos]);

  /* ══════════════════════════════════════════════════════════
   * PHASE 1 — Album Picker (only when no albumId)
   * ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (selectedAlbumId) return;
    const fetchAlbums = async () => {
      try {
        const res = await getAlbums();
        setAlbums(res.data);
      } catch (e) {
        console.error('Failed to load albums', e);
      } finally {
        setAlbumsLoading(false);
      }
    };
    fetchAlbums();
  }, [selectedAlbumId]);

  /* ══════════════════════════════════════════════════════════
   * PHASE 2 — Load album + start live sync
   * ════════════════════════════════════════════════════════ */
  const fetchAlbumData = useCallback(async (isInitial = false) => {
    if (!selectedAlbumId) return;
    if (isInitial) setLoading(true);
    setSyncStatus('syncing');
    try {
      const res = await getAlbum(selectedAlbumId);
      const newPhotos = res.data.photos || [];

      if (!isInitial && newPhotos.length > photosRef.current.length) {
        const diff = newPhotos.length - photosRef.current.length;
        setNewPhotoToast(`${diff} new photo${diff > 1 ? 's' : ''} added`);
        setTimeout(() => setNewPhotoToast(null), 3500);
      }

      setAlbum(res.data);
      setPhotos(newPhotos);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (e) {
      console.error('Sync fetch error', e);
      setSyncStatus('idle');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [selectedAlbumId]);

  // Initial load
  useEffect(() => {
    if (selectedAlbumId) fetchAlbumData(true);
  }, [selectedAlbumId, fetchAlbumData]);

  // Live sync interval
  useEffect(() => {
    if (!selectedAlbumId) return;
    syncIntervalRef.current = setInterval(() => fetchAlbumData(false), SYNC_INTERVAL_MS);
    return () => clearInterval(syncIntervalRef.current);
  }, [selectedAlbumId, fetchAlbumData]);

  /* ══════════════════════════════════════════════════════════
   * Preload next image
   * ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (photos.length === 0) return;
    const nextIdx = (currentIndex + 1) % photos.length;
    const nextPhoto = photos[nextIdx];
    if (nextPhoto && !nextPhoto.mime_type?.startsWith('video/')) {
      const img = new Image();
      img.src = getOriginalUrl(nextPhoto.id);
      preloadRef.current = img;
    }
  }, [currentIndex, photos]);

  /* ══════════════════════════════════════════════════════════
   * Controls auto-hide
   * ════════════════════════════════════════════════════════ */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    if (!selectedAlbumId) return;
    const handleMouse = () => showControls();
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('click', handleMouse);
    showControls();
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('click', handleMouse);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [showControls, selectedAlbumId]);

  /* ══════════════════════════════════════════════════════════
   * Slide navigation
   * ════════════════════════════════════════════════════════ */
  const goToSlide = useCallback((newIndex, dir = 'next') => {
    if (photos.length === 0) return;
    setDirection(dir);
    setTransClass('exit');
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setImageLoaded(false);
      setTransClass('enter');
      setTimeout(() => setTransClass('active'), 30);
    }, transition === 'fade' ? 500 : 400);
  }, [photos.length, transition]);

  const goNext = useCallback(() => {
    const nextIdx = (currentIndex + 1) % photos.length;
    goToSlide(nextIdx, 'next');
  }, [currentIndex, photos.length, goToSlide]);

  const goPrev = useCallback(() => {
    const prevIdx = (currentIndex - 1 + photos.length) % photos.length;
    goToSlide(prevIdx, 'prev');
  }, [currentIndex, photos.length, goToSlide]);

  /* ══════════════════════════════════════════════════════════
   * Auto-play
   * ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isPlaying || photos.length <= 1) return;
    const currentPhoto = photos[currentIndex];
    if (currentPhoto?.mime_type?.startsWith('video/')) return;

    if (timerFillRef.current) {
      timerFillRef.current.style.transition = 'none';
      timerFillRef.current.style.width = '0%';
      timerFillRef.current.offsetHeight; // force reflow
      timerFillRef.current.classList.add('animating');
      timerFillRef.current.style.transitionDuration = `${speed}s`;
      timerFillRef.current.style.width = '100%';
    }

    autoPlayTimerRef.current = setTimeout(goNext, speed * 1000);

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      if (timerFillRef.current) {
        timerFillRef.current.classList.remove('animating');
      }
    };
  }, [isPlaying, currentIndex, speed, photos, goNext]);

  /* ══════════════════════════════════════════════════════════
   * Keyboard shortcuts
   * ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!selectedAlbumId) return;
    const handleKey = (e) => {
      switch (e.key) {
        case 'ArrowRight': case 'l': e.preventDefault(); goNext(); break;
        case 'ArrowLeft':  case 'j': e.preventDefault(); goPrev(); break;
        case ' ':  e.preventDefault(); setIsPlaying(p => !p); break;
        case 'Escape':
          if (isFullscreen) toggleFullscreen();
          else handleExitSlideshow();
          break;
        case 'f': toggleFullscreen(); break;
        case 'i': setShowMetadata(m => !m); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, isFullscreen, selectedAlbumId]);

  /* ══════════════════════════════════════════════════════════
   * Touch / swipe
   * ════════════════════════════════════════════════════════ */
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext(); else goPrev();
    }
    touchStartRef.current = null;
  };

  /* ══════════════════════════════════════════════════════════
   * Fullscreen
   * ════════════════════════════════════════════════════════ */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* ══════════════════════════════════════════════════════════
   * Transition class helper
   * ════════════════════════════════════════════════════════ */
  const getTransitionClass = () => {
    if (transition === 'fade') {
      if (transClass === 'enter' || transClass === '') return 'as-fade-enter';
      if (transClass === 'active') return 'as-fade-active';
      if (transClass === 'exit') return 'as-fade-exit';
    }
    if (transition === 'slide') {
      if (transClass === 'enter') return `as-slide-enter-${direction}`;
      if (transClass === 'active') return 'as-slide-active';
      if (transClass === 'exit') return `as-slide-exit-${direction}`;
    }
    if (transition === 'zoom') {
      if (transClass === 'enter') return 'as-zoom-enter';
      if (transClass === 'active') return 'as-zoom-active';
      if (transClass === 'exit') return 'as-zoom-exit';
    }
    return 'as-fade-active';
  };

  // Init transition on mount
  useEffect(() => {
    if (photos.length > 0) {
      setTransClass('enter');
      setTimeout(() => setTransClass('active'), 50);
    }
  }, [photos.length]);

  /* ══════════════════════════════════════════════════════════
   * Progress click
   * ════════════════════════════════════════════════════════ */
  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(Math.floor(pct * photos.length), photos.length - 1);
    goToSlide(idx, idx > currentIndex ? 'next' : 'prev');
  };

  const handleVideoEnded = () => { if (isPlaying) goNext(); };

  const handleExitSlideshow = () => {
    clearInterval(syncIntervalRef.current);
    if (document.fullscreenElement) document.exitFullscreen?.();
    setSelectedAlbumId(null);
    setAlbum(null);
    setPhotos([]);
    setCurrentIndex(0);
    navigate('/slideshow');
  };

  /* ══════════════════════════════════════════════════════════
   * Scroll active thumb into view
   * ════════════════════════════════════════════════════════ */
  const thumbStripRef = useRef(null);
  useEffect(() => {
    if (!thumbStripRef.current) return;
    const activeEl = thumbStripRef.current.children[currentIndex];
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentIndex]);

  /* ══════════════════════════════════════════════════════════
   * RENDER: Album Picker
   * ════════════════════════════════════════════════════════ */
  if (!selectedAlbumId) {
    return (
      <div className="album-picker">
        <div className="album-picker-bg" />
        <div className="album-picker-content">
          <button className="album-picker-back-btn" onClick={() => navigate('/albums')}>
            <ArrowLeft size={16} /> Back to Albums
          </button>

          <div className="album-picker-header">
            <h1>Start a Slideshow</h1>
            <p>Choose an album to begin a full-screen cinematic experience with live sync</p>
          </div>

          {albumsLoading ? (
            <div className="as-loading" style={{ position: 'relative', minHeight: '200px', background: 'transparent' }}>
              <div className="as-spinner" />
              <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Loading albums…</span>
            </div>
          ) : albums.length === 0 ? (
            <div className="album-picker-empty">
              <div className="album-picker-empty-icon">
                <FolderOpen size={36} color="rgba(148, 163, 184, 0.4)" />
              </div>
              <h2>No Albums Yet</h2>
              <p>Create an album and add photos to start a slideshow.</p>
            </div>
          ) : (
            <div className="album-picker-grid">
              {albums.map(a => (
                <div
                  key={a.id}
                  className="album-picker-card"
                  onClick={() => {
                    setSelectedAlbumId(a.id);
                    navigate(`/slideshow/${a.id}`);
                  }}
                >
                  <div className="album-picker-card-cover">
                    {a.cover_url ? (
                      <img src={a.cover_url} alt={a.name} loading="lazy" />
                    ) : (
                      <div className="empty-cover">
                        <Image size={40} color="rgba(148, 163, 184, 0.25)" />
                      </div>
                    )}
                    <div className="album-picker-play-overlay">
                      <div className="album-picker-play-btn">
                        <Play size={28} style={{ marginLeft: 3 }} />
                      </div>
                    </div>
                  </div>
                  <div className="album-picker-card-info">
                    <h3>{a.name}</h3>
                    <span>{a.photo_count} photo{a.photo_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
   * RENDER: Loading slideshow data
   * ════════════════════════════════════════════════════════ */
  if (loading || !album) {
    return (
      <div className="as-loading">
        <div className="as-spinner" />
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Preparing slideshow…</span>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="as-loading" style={{ gap: '24px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FolderOpen size={32} color="rgba(148,163,184,0.5)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#f1f5f9', margin: '0 0 8px', fontWeight: 700, fontSize: '1.4rem' }}>Album is Empty</h2>
          <p style={{ color: 'rgba(148,163,184,0.6)', margin: 0, fontSize: '0.9rem' }}>
            Add photos to <strong>"{album.name}"</strong> to start the slideshow.
          </p>
        </div>
        <button onClick={handleExitSlideshow} className="album-picker-back-btn" style={{ marginBottom: 0, marginTop: '16px' }}>
          <ArrowLeft size={16} /> Choose another album
        </button>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
   * RENDER: Slideshow
   * ════════════════════════════════════════════════════════ */
  const currentPhoto = photos[currentIndex] || photos[0];
  if (!currentPhoto) return null;

  const isVideo = currentPhoto.mime_type?.startsWith('video/');
  const progressPct = photos.length > 1 ? (currentIndex / (photos.length - 1)) * 100 : 100;
  const exif = currentPhoto.exif_json || {};

  return (
    <div
      ref={canvasRef}
      className={`as-canvas ${controlsVisible ? 'controls-visible' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background blur */}
      <div
        className="as-bg-blur"
        style={{ backgroundImage: `url(${getThumbnailUrl(currentPhoto.id, 'small')})` }}
      />
      <div className="as-bg-overlay" />

      {/* ── New photo toast ── */}
      <div className={`as-new-photo-toast ${newPhotoToast ? 'visible' : ''}`}>
        <RefreshCw size={14} />
        {newPhotoToast}
      </div>

      {/* ── Top bar ── */}
      <div className="as-topbar">
        <div className="as-album-info">
          <span className="as-album-name">{album.name}</span>
          <span className="as-photo-counter">
            {currentIndex + 1} of {photos.length}
          </span>
        </div>
        <div className="as-topbar-actions">
          {/* Sync indicator */}
          <div className={`as-sync-indicator ${syncStatus}`}>
            <span className="as-sync-dot" />
            {syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'synced' ? 'Synced' : 'Live'}
          </div>

          <button
            className={`as-icon-btn ${showMetadata ? 'active' : ''}`}
            onClick={() => setShowMetadata(m => !m)}
            title="Toggle info (I)"
          >
            <Info size={18} />
          </button>
          <button
            className="as-icon-btn"
            onClick={toggleFullscreen}
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      {/* ── Exit button ── */}
      <button className="as-exit-btn" onClick={handleExitSlideshow} title="Exit (Esc)">
        <X size={20} />
      </button>

      {/* ── Image stage ── */}
      <div className="as-stage">
        <div className={`as-media-wrapper ${getTransitionClass()}`}>
          {isVideo ? (
            <video
              ref={videoRef}
              key={currentPhoto.id}
              src={getOriginalUrl(currentPhoto.id)}
              className="as-video"
              autoPlay
              controls
              onEnded={handleVideoEnded}
              playsInline
            />
          ) : (
            <img
              key={currentPhoto.id}
              src={getOriginalUrl(currentPhoto.id)}
              alt={currentPhoto.filename || 'Photo'}
              className="as-image"
              draggable={false}
              onLoad={() => setImageLoaded(true)}
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.35s ease'
              }}
            />
          )}
        </div>
      </div>

      {/* ── Nav arrows ── */}
      <button className="as-nav-btn as-nav-prev" onClick={goPrev} title="Previous (←)">
        <ChevronLeft size={28} />
      </button>
      <button className="as-nav-btn as-nav-next" onClick={goNext} title="Next (→)">
        <ChevronRight size={28} />
      </button>

      {/* ── Metadata overlay ── */}
      <div className={`as-metadata ${showMetadata ? 'visible' : ''}`}>
        {currentPhoto.filename && (
          <div className="as-meta-item">
            <span className="as-meta-label">Filename</span>
            <span className="as-meta-value">{currentPhoto.filename}</span>
          </div>
        )}
        {currentPhoto.canonical_date && (
          <div className="as-meta-item">
            <span className="as-meta-label">Date</span>
            <span className="as-meta-value">
              {new Date(currentPhoto.canonical_date).toLocaleString(undefined, {
                dateStyle: 'long',
                timeStyle: 'short'
              })}
            </span>
          </div>
        )}
        {currentPhoto.width && (
          <div className="as-meta-item">
            <span className="as-meta-label">Dimensions</span>
            <span className="as-meta-value">{currentPhoto.width} × {currentPhoto.height} px</span>
          </div>
        )}
        {exif.Make && (
          <div className="as-meta-item">
            <span className="as-meta-label">Camera</span>
            <span className="as-meta-value">{`${exif.Make} ${exif.Model || ''}`.trim()}</span>
          </div>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {photos.length > 1 && photos.length <= 30 && (
        <div className="as-thumb-strip-wrapper">
          <div className="as-thumb-strip" ref={thumbStripRef}>
            {photos.map((p, i) => (
              <div
                key={p.id}
                className={`as-thumb-item ${i === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(i, i > currentIndex ? 'next' : 'prev')}
              >
                <img src={getThumbnailUrl(p.id, 'small')} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom controls ── */}
      <div className="as-controls">
        {/* Timer bar */}
        {isPlaying && !isVideo && (
          <div className="as-timer-track">
            <div ref={timerFillRef} className="as-timer-fill" />
          </div>
        )}

        {/* Progress bar */}
        <div className="as-progress-track" onClick={handleProgressClick}>
          <div className="as-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Control row */}
        <div className="as-control-row">
          {/* Left: transition picker */}
          <div className="as-control-left">
            <select
              className="as-transition-select"
              value={transition}
              onChange={(e) => setTransition(e.target.value)}
              title="Transition style"
            >
              <option value="fade">✦ Fade</option>
              <option value="slide">⇄ Slide</option>
              <option value="zoom">⊕ Zoom</option>
            </select>
          </div>

          {/* Center: play/pause + nav */}
          <div className="as-control-center">
            <button className="as-icon-btn" onClick={goPrev}>
              <ChevronLeft size={20} />
            </button>
            <button
              className="as-play-btn"
              onClick={() => setIsPlaying(p => !p)}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 2 }} />}
            </button>
            <button className="as-icon-btn" onClick={goNext}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Right: speed control */}
          <div className="as-control-right">
            <div className="as-speed-control">
              <span>{speed}s</span>
              <input
                type="range"
                className="as-speed-slider"
                min={2}
                max={10}
                step={1}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                title="Slide duration"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumSlideshow;
