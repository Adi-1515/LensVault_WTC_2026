import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  getSharedAlbum,
  getPublicThumbnailUrl,
  getPublicOriginalUrl
} from '../services/api';
import {
  Play, Pause, ChevronLeft, ChevronRight, X,
  Info, Maximize, Minimize, Music, Volume2, VolumeX
} from 'lucide-react';
import './SlideshowViewer.css';

const AMBIENT_MUSIC_URL = 'https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3';

const SlideshowViewer = () => {
  const { token } = useParams();

  // Data
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Slideshow state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(4); // seconds
  const [transition, setTransition] = useState('fade'); // fade, slide, zoom
  const [direction, setDirection] = useState('next');

  // UI state
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Animation state
  const [transClass, setTransClass] = useState('');

  // Refs
  const controlsTimerRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const timerFillRef = useRef(null);
  const timerStartRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const preloadRef = useRef(null);
  const touchStartRef = useRef(null);

  // ── Fetch album data ──────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getSharedAlbum(token);
        setAlbum(res.data.album);
        setPhotos(res.data.photos || []);
        if ((res.data.photos || []).length === 0) {
          setError('This album has no photos.');
        }
      } catch (e) {
        if (e.response?.status === 404) {
          setError('This slideshow link is invalid or has been revoked.');
        } else {
          setError('Failed to load slideshow. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // ── Preload next image ────────────────────────────────────────
  useEffect(() => {
    if (photos.length === 0) return;
    const nextIdx = (currentIndex + 1) % photos.length;
    const nextPhoto = photos[nextIdx];
    if (nextPhoto && !nextPhoto.mime_type?.startsWith('video/')) {
      const img = new Image();
      img.src = getPublicOriginalUrl(nextPhoto.id, token);
      preloadRef.current = img;
    }
  }, [currentIndex, photos, token]);

  // ── Controls auto-hide ────────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    const handleMove = () => showControls();
    const handleClick = () => showControls();
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('click', handleClick);
    showControls();
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('click', handleClick);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [showControls]);

  // ── Auto-play logic ───────────────────────────────────────────
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

  useEffect(() => {
    if (!isPlaying || photos.length <= 1) return;

    // Don't auto-advance during video playback
    const currentPhoto = photos[currentIndex];
    if (currentPhoto?.mime_type?.startsWith('video/')) return;

    // Animate timer bar
    timerStartRef.current = Date.now();
    if (timerFillRef.current) {
      timerFillRef.current.style.transition = 'none';
      timerFillRef.current.style.width = '0%';
      // Force reflow
      timerFillRef.current.offsetHeight;
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

  // ── Keyboard navigation ───────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          goPrev();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;
        case 'Escape':
          if (isFullscreen) toggleFullscreen();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'i':
          setShowMetadata(m => !m);
          break;
        case 'm':
          setMusicEnabled(m => !m);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, isFullscreen]);

  // ── Touch / swipe ─────────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartRef.current = null;
  };

  // ── Fullscreen ────────────────────────────────────────────────
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

  // ── Music ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioRef.current) return;
    if (musicEnabled) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [musicEnabled]);

  // ── Disable right-click (prevent saving images) ───────────────
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  // ── Transition class helper ───────────────────────────────────
  const getTransitionClass = () => {
    if (transition === 'fade') {
      if (transClass === 'enter' || transClass === '') return 'transition-fade-enter';
      if (transClass === 'active') return 'transition-fade-active';
      if (transClass === 'exit') return 'transition-fade-exit';
    }
    if (transition === 'slide') {
      if (transClass === 'enter') return `transition-slide-enter-${direction}`;
      if (transClass === 'active') return 'transition-slide-active';
      if (transClass === 'exit') return `transition-slide-exit-${direction}`;
    }
    if (transition === 'zoom') {
      if (transClass === 'enter') return 'transition-zoom-enter';
      if (transClass === 'active') return 'transition-zoom-active';
      if (transClass === 'exit') return 'transition-zoom-exit';
    }
    return 'transition-fade-active';
  };

  // ── Initialize transition on mount ────────────────────────────
  useEffect(() => {
    if (photos.length > 0) {
      setTransClass('enter');
      setTimeout(() => setTransClass('active'), 50);
    }
  }, [photos.length]);

  // ── Progress click ────────────────────────────────────────────
  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(Math.floor(pct * photos.length), photos.length - 1);
    goToSlide(idx, idx > currentIndex ? 'next' : 'prev');
  };

  // ── Video ended handler ───────────────────────────────────────
  const handleVideoEnded = () => {
    if (isPlaying) goNext();
  };

  // ─── RENDER ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="slideshow-loading">
        <div className="slideshow-spinner" />
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading slideshow…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="slideshow-error">
        <div className="slideshow-error-icon">
          <X size={28} color="#ef4444" />
        </div>
        <h2>Slideshow Unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  const isVideo = currentPhoto.mime_type?.startsWith('video/');
  const progressPct = photos.length > 1 ? ((currentIndex) / (photos.length - 1)) * 100 : 100;
  const exif = currentPhoto.exif_json || {};

  return (
    <div
      ref={canvasRef}
      className={`slideshow-canvas ${controlsVisible ? 'controls-visible' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background music */}
      <audio ref={audioRef} src={AMBIENT_MUSIC_URL} loop preload="none" />

      {/* Background blur layer */}
      <div
        className="slideshow-bg-blur"
        style={{
          backgroundImage: `url(${getPublicThumbnailUrl(currentPhoto.id, token, 'small')})`
        }}
      />
      <div className="slideshow-bg-overlay" />

      {/* ── Top bar ── */}
      <div className="slideshow-topbar">
        <div className="slideshow-album-info">
          <span className="slideshow-album-name">{album?.name || 'Shared Album'}</span>
          <span className="slideshow-photo-counter">
            {currentIndex + 1} of {photos.length}
          </span>
        </div>
        <div className="slideshow-topbar-actions">
          <button
            className={`slideshow-icon-btn ${showMetadata ? 'active' : ''}`}
            onClick={() => setShowMetadata(m => !m)}
            title="Toggle info (I)"
          >
            <Info size={18} />
          </button>
          <button
            className={`slideshow-icon-btn ${musicEnabled ? 'active' : ''}`}
            onClick={() => setMusicEnabled(m => !m)}
            title="Toggle music (M)"
          >
            {musicEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="slideshow-icon-btn"
            onClick={toggleFullscreen}
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      {/* ── Image stage ── */}
      <div className="slideshow-stage">
        <div className={`slideshow-media-wrapper ${getTransitionClass()}`}>
          {isVideo ? (
            <video
              ref={videoRef}
              key={currentPhoto.id}
              src={getPublicOriginalUrl(currentPhoto.id, token)}
              className="slideshow-video"
              autoPlay
              controls
              onEnded={handleVideoEnded}
              playsInline
            />
          ) : (
            <img
              key={currentPhoto.id}
              src={getPublicOriginalUrl(currentPhoto.id, token)}
              alt={currentPhoto.filename || 'Photo'}
              className="slideshow-image"
              draggable={false}
              onLoad={() => setImageLoaded(true)}
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }}
            />
          )}
        </div>
      </div>

      {/* ── Navigation arrows ── */}
      <button className="slideshow-nav-btn slideshow-nav-prev" onClick={goPrev} title="Previous (←)">
        <ChevronLeft size={26} />
      </button>
      <button className="slideshow-nav-btn slideshow-nav-next" onClick={goNext} title="Next (→)">
        <ChevronRight size={26} />
      </button>

      {/* ── Metadata overlay ── */}
      <div className={`slideshow-metadata ${showMetadata ? 'visible' : ''}`}>
        {currentPhoto.filename && (
          <div className="slideshow-meta-item">
            <span className="slideshow-meta-label">Filename</span>
            <span className="slideshow-meta-value">{currentPhoto.filename}</span>
          </div>
        )}
        {currentPhoto.canonical_date && (
          <div className="slideshow-meta-item">
            <span className="slideshow-meta-label">Date</span>
            <span className="slideshow-meta-value">
              {new Date(currentPhoto.canonical_date).toLocaleString(undefined, {
                dateStyle: 'long',
                timeStyle: 'short'
              })}
            </span>
          </div>
        )}
        {currentPhoto.width && (
          <div className="slideshow-meta-item">
            <span className="slideshow-meta-label">Dimensions</span>
            <span className="slideshow-meta-value">{currentPhoto.width} × {currentPhoto.height} px</span>
          </div>
        )}
        {exif.Make && (
          <div className="slideshow-meta-item">
            <span className="slideshow-meta-label">Camera</span>
            <span className="slideshow-meta-value">{`${exif.Make} ${exif.Model || ''}`.trim()}</span>
          </div>
        )}
        {exif.FocalLength && (
          <div className="slideshow-meta-item">
            <span className="slideshow-meta-label">Focal Length</span>
            <span className="slideshow-meta-value">{exif.FocalLength}mm</span>
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="slideshow-controls">
        {/* Timer bar (shows auto-play progress) */}
        {isPlaying && !isVideo && (
          <div className="slideshow-timer-track">
            <div ref={timerFillRef} className="slideshow-timer-fill" />
          </div>
        )}

        {/* Progress bar (position in album) */}
        <div className="slideshow-progress-track" onClick={handleProgressClick}>
          <div
            className="slideshow-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Control row */}
        <div className="slideshow-control-row">
          {/* Left section: transition picker */}
          <div className="slideshow-control-left">
            <select
              className="slideshow-transition-select"
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
          <div className="slideshow-control-center">
            <button className="slideshow-icon-btn" onClick={goPrev}>
              <ChevronLeft size={20} />
            </button>
            <button
              className="slideshow-play-btn"
              onClick={() => setIsPlaying(p => !p)}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
            </button>
            <button className="slideshow-icon-btn" onClick={goNext}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Right: speed control */}
          <div className="slideshow-control-right">
            <div className="slideshow-speed-control">
              <span>{speed}s</span>
              <input
                type="range"
                className="slideshow-speed-slider"
                min={2}
                max={8}
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

export default SlideshowViewer;
