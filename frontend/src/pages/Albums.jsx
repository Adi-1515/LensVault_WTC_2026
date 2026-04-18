import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlbums, createAlbum } from '../services/api';
import { FolderPlus, Folder, Globe } from 'lucide-react';

// Helper: append token to any relative /api/ URL so <img> can authenticate
const withToken = (url) => {
  if (!url) return null;
  const token = localStorage.getItem('token');
  return `${url}?token=${token}`;
};

const Albums = () => {
  const [albums, setAlbums] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const navigate = useNavigate();

  const loadAlbums = () => {
    getAlbums().then(res => setAlbums(res.data)).catch(console.error);
  };

  useEffect(() => { loadAlbums(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createAlbum(name, desc);
      loadAlbums();
      setShowModal(false);
      setName(''); setDesc('');
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <div className="timeline-header">
        <div>
          <h1 className="timeline-title">Albums</h1>
          <span className="timeline-count">{albums.length} collections</span>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <FolderPlus size={16} /> New Album
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
        {albums.map(a => (
          <div
            key={a.id}
            onClick={() => navigate(`/albums/${a.id}`)}
            style={{
              borderRadius: '20px', overflow: 'hidden', cursor: 'pointer',
              background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            {/* Cover thumbnail */}
            <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-surface-hover)', position: 'relative', overflow: 'hidden' }}>
              {a.cover_url ? (
                <img
                  src={withToken(a.cover_url)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  alt={a.name}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Folder size={48} opacity={0.3} />
                </div>
              )}
              {a.is_public && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: '99px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'white' }}>
                  <Globe size={10} /> Shared
                </div>
              )}
              {a.album_type === 'people_intersection' && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(99,102,241,0.85)', backdropFilter: 'blur(8px)', borderRadius: '99px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'white' }}>
                  👥 People
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ padding: '14px 16px' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>
                {a.name}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {a.photo_count} photo{a.photo_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        ))}

        {albums.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', background: 'var(--bg-surface-hover)', borderRadius: '16px' }}>
            <Folder size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>No albums yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Group your photos into beautiful collections.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <FolderPlus size={16} /> Create First Album
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="lightbox-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleCreate} className="glass-panel" style={{ padding: '32px', width: '100%', maxWidth: '440px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>New Album</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. Summer Vacation 2024" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Description</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} className="input-field" style={{ minHeight: '80px', resize: 'none' }} placeholder="Optional description..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Albums;