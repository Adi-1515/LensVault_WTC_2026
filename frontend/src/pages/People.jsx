import React, { useState, useEffect } from 'react';
import { getFaceClusters, getPersons, getFaceImageUrl, assignCluster, triggerClustering, createMultiPersonAlbum } from '../services/api';
import { Users, AlertCircle, Plus, Check, Play, CheckCircle2, X, FolderPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const People = () => {
  const [clusters, setClusters] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [assignName, setAssignName] = useState('');

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [albumName, setAlbumName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [clustersRes, personsRes] = await Promise.all([
        getFaceClusters(),
        getPersons()
      ]);
      setClusters(clustersRes.data);
      setPersons(personsRes.data);
    } catch (err) {
      console.error('Failed to load faces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssign = async (clusterId) => {
    if (!assignName.trim()) return;
    try {
      await assignCluster(clusterId, assignName.trim());
      setAssigningId(null);
      setAssignName('');
      loadData();
    } catch (err) {
      alert('Failed to assign name');
    }
  };

  // Multi-select handlers
  const toggleSelect = (personId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setAlbumName('');
  };

  const getSelectedNames = () => {
    return persons
      .filter(p => selectedIds.has(p.id))
      .map(p => p.name);
  };

  const getAutoAlbumName = () => {
    const names = getSelectedNames();
    return names.join(' + ');
  };

  const handleCreateAlbum = async () => {
    if (selectedIds.size < 2) return;
    setCreating(true);
    try {
      const ids = Array.from(selectedIds);
      const name = albumName.trim() || getAutoAlbumName();
      const res = await createMultiPersonAlbum(ids, name);
      navigate(`/albums/${res.data.album_id}`);
    } catch (err) {
      console.error('Failed to create multi-person album:', err);
      alert(err.response?.data?.detail || 'Failed to create album');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: selectedIds.size >= 2 ? '140px' : '40px' }}>
      <div className="timeline-header">
        <div>
          <h1 className="timeline-title">People</h1>
          <span className="timeline-count">{persons.length} Named · {clusters.length} Unnamed</span>
        </div>
        {persons.length >= 2 && (
          <button
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className={selectMode ? 'btn-secondary' : 'btn-primary'}
            style={{ gap: '6px' }}
          >
            {selectMode ? <><X size={16} /> Cancel</> : <><CheckCircle2 size={16} /> Select People</>}
          </button>
        )}
      </div>

      {selectMode && (
        <div style={{
          background: 'var(--accent-light)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '0.85rem',
          color: 'var(--accent-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          Select 2 or more people to create a shared album of photos they appear in together.
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <>
          {persons.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h2 className="sidebar-section-title" style={{ fontSize: '1rem', marginBottom: '16px', padding: 0 }}>Named People</h2>
              <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '20px' }}>
                {persons.map(p => {
                  const isSelected = selectedIds.has(p.id);

                  const cardContent = (
                    <div
                      style={{
                        textAlign: 'center',
                        display: 'block',
                        cursor: selectMode ? 'pointer' : undefined,
                        position: 'relative'
                      }}
                      onClick={selectMode ? (e) => { e.preventDefault(); toggleSelect(p.id); } : undefined}
                    >
                      <div style={{
                        width: '120px', height: '120px', margin: '0 auto',
                        borderRadius: '50%', overflow: 'hidden', background: 'var(--border-color)',
                        boxShadow: isSelected
                          ? '0 0 0 4px var(--accent-color), 0 4px 12px rgba(99,102,241,0.3)'
                          : '0 4px 12px rgba(0,0,0,0.05)',
                        transition: 'all 0.25s ease',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        position: 'relative'
                      }}>
                        {p.sample_face_id ? (
                          <img 
                            src={getFaceImageUrl(p.sample_face_id)} 
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <Users size={32} />
                          </div>
                        )}
                      </div>

                      {/* Selection checkmark overlay */}
                      {selectMode && (
                        <div style={{
                          position: 'absolute',
                          top: '-2px',
                          right: 'calc(50% - 64px)',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isSelected ? 'var(--accent-color)' : 'rgba(255,255,255,0.85)',
                          border: isSelected ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          backdropFilter: 'blur(4px)',
                          zIndex: 5
                        }}>
                          {isSelected && <Check size={16} color="white" strokeWidth={3} />}
                        </div>
                      )}

                      <div style={{ marginTop: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{p.name}</div>
                    </div>
                  );

                  // In select mode, don't wrap in Link
                  if (selectMode) {
                    return <div key={p.id}>{cardContent}</div>;
                  }

                  return (
                    <Link to={`/person/${p.id}`} key={p.id} style={{ textDecoration: 'none' }}>
                      {cardContent}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {clusters.length > 0 && (
            <div>
              <h2 className="sidebar-section-title" style={{ fontSize: '1rem', marginBottom: '16px', padding: 0 }}>Who is this?</h2>
              <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
                {clusters.map(c => (
                  <div key={c.cluster_id} className="glass-panel" style={{ padding: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                        width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', background: 'var(--border-color)', marginBottom: '12px'
                    }}>
                      <img 
                        src={getFaceImageUrl(c.sample_face_id)} 
                        alt="Unknown"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {c.face_count} photos
                    </div>
                    
                    {assigningId === c.cluster_id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="Name..." 
                          autoFocus
                          value={assignName}
                          onChange={e => setAssignName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAssign(c.cluster_id)}
                          style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-primary" onClick={() => handleAssign(c.cluster_id)} style={{ flex: 1, padding: '4px', justifyContent: 'center' }}><Check size={14} /></button>
                          <button className="btn-secondary" onClick={() => { setAssigningId(null); setAssignName(''); }} style={{ flex: 1, padding: '4px', justifyContent: 'center' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-secondary" onClick={() => setAssigningId(c.cluster_id)} style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '6px' }}>
                        <Plus size={14} /> Add Name
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {persons.length === 0 && clusters.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
              <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '8px' }}>No people found yet</h3>
              <p>Upload more photos with faces, then run the clustering task from Settings.</p>
            </div>
          )}
        </>
      )}

      {/* Floating action bar when ≥2 people selected */}
      {selectedIds.size >= 2 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          zIndex: 100,
          maxWidth: '600px',
          width: 'calc(100% - 48px)',
          animation: 'floatUp 0.3s ease'
        }}>
          <style>{`
            @keyframes floatUp {
              from { opacity: 0; transform: translateX(-50%) translateY(20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>

          <div style={{ flex: '0 0 auto', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            <strong style={{ color: 'var(--accent-color)' }}>{selectedIds.size}</strong> people selected
          </div>

          <input
            type="text"
            className="input-field"
            placeholder={getAutoAlbumName()}
            value={albumName}
            onChange={e => setAlbumName(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', minWidth: '0' }}
          />

          <button
            onClick={handleCreateAlbum}
            disabled={creating}
            className="btn-primary"
            style={{ whiteSpace: 'nowrap', padding: '10px 18px', gap: '6px', flexShrink: 0 }}
          >
            <FolderPlus size={16} />
            {creating ? 'Creating...' : 'Create Album'}
          </button>
        </div>
      )}
    </div>
  );
};

export default People;
