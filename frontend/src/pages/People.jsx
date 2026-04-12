import React, { useState, useEffect } from 'react';
import { getFaceClusters, getPersons, getFaceImageUrl, assignCluster, triggerClustering } from '../services/api';
import { Users, AlertCircle, Plus, Check, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const People = () => {
  const [clusters, setClusters] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [assignName, setAssignName] = useState('');

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

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div className="timeline-header">
        <div>
          <h1 className="timeline-title">People</h1>
          <span className="timeline-count">{persons.length} Named · {clusters.length} Unnamed</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <>
          {persons.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h2 className="sidebar-section-title" style={{ fontSize: '1rem', marginBottom: '16px', padding: 0 }}>Named People</h2>
              <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '20px' }}>
                {persons.map(p => (
                  <Link to={`/person/${p.id}`} key={p.id} style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                    <div style={{
                      width: '120px', height: '120px', margin: '0 auto',
                      borderRadius: '50%', overflow: 'hidden', background: 'var(--border-color)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease', ':hover': { transform: 'scale(1.05)' }
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
                    <div style={{ marginTop: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{p.name}</div>
                  </Link>
                ))}
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
    </div>
  );
};

export default People;
