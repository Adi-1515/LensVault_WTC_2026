import React, { useEffect, useState } from 'react';
import { getOriginalUrl, updatePhotoMetadata } from '../services/api';
import { Download, Heart, Trash2, X, ChevronLeft, ChevronRight, ZoomIn, Tag, Edit3, Check, MapPin } from 'lucide-react';

const MetaRow = ({ label, value }) => value ? (
  <div style={{ paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{value}</div>
  </div>
) : null;

const Lightbox = ({ photo, photos, onClose, onFavouriteToggle, onDelete }) => {
  const [current, setCurrent] = useState(photo);
  const [zoom, setZoom] = useState(1);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current, photos]);

  useEffect(() => {
    setCurrent(photo);
    setZoom(1);
    setEditingTitle(false);
    setTitleInput(photo.title || '');
    const existingTags = photo.exif_json?._tags || [];
    setTags(Array.isArray(existingTags) ? existingTags : existingTags.split(',').filter(Boolean));
  }, [photo]);

  const currentIndex = photos.findIndex(p => p.id === current.id);
  const nextPhoto = () => { if (currentIndex < photos.length - 1) { setCurrent(photos[currentIndex + 1]); } };
  const prevPhoto = () => { if (currentIndex > 0) { setCurrent(photos[currentIndex - 1]); } };
  const toggleZoom = () => setZoom(prev => prev === 1 ? 2 : 1);

  const saveTitle = async () => {
    try {
      const res = await updatePhotoMetadata(current.id, { title: titleInput });
      setCurrent(res.data);
    } catch (e) { console.error(e); }
    setEditingTitle(false);
  };

  const addTag = async (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTags = [...new Set([...tags, tagInput.trim()])];
      setTags(newTags);
      setTagInput('');
      try {
        await updatePhotoMetadata(current.id, { tags: newTags });
      } catch (e) { console.error(e); }
    }
  };

  const removeTag = async (tag) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    try {
      await updatePhotoMetadata(current.id, { tags: newTags });
    } catch (e) { console.error(e); }
  };

  const exif = current.exif_json || {};

  return (
    <div className="lightbox-overlay">
      <button onClick={onClose} className="lightbox-close">
        <X size={20} />
      </button>

      <div className="lightbox-main">
        {currentIndex > 0 && (
          <button onClick={prevPhoto} style={{ position: 'absolute', left: '20px', zIndex: 50, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            <ChevronLeft size={28} />
          </button>
        )}

        {current.mime_type?.startsWith('video/') ? (
          <video
            src={getOriginalUrl(current.id)}
            controls
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
          />
        ) : (
          <img
            src={getOriginalUrl(current.id)}
            alt={current.filename}
            className="lightbox-img"
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)', cursor: zoom === 1 ? 'zoom-in' : 'zoom-out' }}
            onClick={toggleZoom}
          />
        )}

        {currentIndex < photos.length - 1 && (
          <button onClick={nextPhoto} style={{ position: 'absolute', right: '360px', zIndex: 50, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      <div className="lightbox-sidebar">
        {/* Title + Favourite */}
        <div style={{ marginBottom: '20px' }}>
          {editingTitle ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                autoFocus
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                className="input-field"
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.95rem' }}
                placeholder="Add a title..."
              />
              <button onClick={saveTitle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-color)' }}>
                <Check size={18} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setEditingTitle(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 0', borderRadius: '8px' }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 600, flex: 1, color: current.title ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {current.title || 'Add a title...'}
              </h3>
              <Edit3 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            onClick={() => { onFavouriteToggle(current.id); setCurrent(prev => ({...prev, is_favourite: !prev.is_favourite})) }}
            className="btn-secondary"
            style={{ flex: 1, padding: '10px', display: 'flex', justifyContent: 'center', borderColor: current.is_favourite ? 'var(--danger-color)' : 'var(--border-color)', background: current.is_favourite ? 'rgba(239,68,68,0.08)' : 'var(--bg-surface)' }}
          >
            <Heart size={18} fill={current.is_favourite ? "var(--danger-color)" : "transparent"} color={current.is_favourite ? "var(--danger-color)" : "var(--text-primary)"} />
          </button>

          <a
            href={getOriginalUrl(current.id)}
            download
            className="btn-secondary"
            style={{ flex: 1, padding: '10px', display: 'flex', justifyContent: 'center', textDecoration: 'none' }}
          >
            <Download size={18} />
          </a>

          {onDelete && (
            <button
              onClick={() => onDelete(current.id)}
              className="btn-secondary"
              style={{ flex: 1, padding: '10px', display: 'flex', justifyContent: 'center', color: 'var(--danger-color)', borderColor: 'rgba(239,68,68,0.2)' }}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        {/* Tags */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.05em' }}>
            Tags
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {tags.map(tag => (
              <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent-light)', color: 'var(--accent-color)', borderRadius: '99px', padding: '3px 10px', fontSize: '0.8rem', fontWeight: 500 }}>
                {tag}
                <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-color)', display: 'flex', padding: 0 }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder="Add tag… (press Enter)"
            className="input-field"
            style={{ padding: '7px 12px', fontSize: '0.85rem' }}
          />
        </div>

        {/* Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          <MetaRow label="Filename" value={current.filename} />
          <MetaRow label="Date Taken" value={new Date(current.canonical_date).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })} />
          <MetaRow label="Camera" value={exif.Make ? `${exif.Make} ${exif.Model || ''}`.trim() : null} />
          <MetaRow label="Dimensions" value={current.width ? `${current.width} × ${current.height} px` : null} />
          <MetaRow label="File Size" value={`${(current.file_size / 1024 / 1024).toFixed(2)} MB`} />
          <MetaRow label="Format" value={current.mime_type} />
          {exif.FocalLength && <MetaRow label="Focal Length" value={`${exif.FocalLength} mm`} />}
          {exif.ExposureTime && <MetaRow label="Exposure" value={`1/${Math.round(1 / exif.ExposureTime)}s`} />}
          {exif.FNumber && <MetaRow label="Aperture" value={`f/${exif.FNumber}`} />}
          {exif.ISOSpeedRatings && <MetaRow label="ISO" value={exif.ISOSpeedRatings} />}
          {current.latitude && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <MapPin size={14} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>GPS</div>
                <a
                  href={`https://maps.google.com/?q=${current.latitude},${current.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none' }}
                >
                  {current.latitude.toFixed(5)}, {current.longitude.toFixed(5)}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
