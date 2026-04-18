import React, { useState, useEffect } from 'react';
import { getStats, triggerClustering } from '../services/api';
import {
  Image, Video, Heart, MapPin, FolderOpen, HardDrive,
  User, Shield, Cpu, Database, Users
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  }}>
    <div style={{
      width: '52px', height: '52px',
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: '14px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
    </div>
  </div>
);

const Settings = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clusteringRunning, setClusteringRunning] = useState(false);

  useEffect(() => {
    getStats()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleTriggerClustering = async () => {
    setClusteringRunning(true);
    try {
      await triggerClustering();
      alert('Face clustering task has been started in the background!');
    } catch (err) {
      console.error(err);
      alert('Failed to trigger face clustering');
    }
    setClusteringRunning(false);
  };

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '900px', margin: '0 auto' }}>
      <div className="timeline-header">
        <div>
          <h1 className="timeline-title">Settings</h1>
          <span className="timeline-count">Library overview & configuration</span>
        </div>
      </div>

      {/* Background Tasks */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Background Tasks
        </h2>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--accent-color)" /> Re-run Face Clustering
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Manually trigger DBSCAN algorithm to group new faces. This runs automatically on new uploads but this helps force a full library re-scan.
            </div>
          </div>
          <button onClick={handleTriggerClustering} disabled={clusteringRunning} className="btn-secondary">
            {clusteringRunning ? 'Triggering...' : 'Run Clustering'}
          </button>
        </div>
      </section>

      {/* Storage Stats */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Library Statistics
        </h2>
        
        {loading ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Loading stats...</div>
        ) : stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            <StatCard icon={Image} label="Total Photos" value={stats.total_photos.toLocaleString()} color="#2563eb" />
            <StatCard icon={Video} label="Videos" value={stats.total_videos.toLocaleString()} color="#7c3aed" />
            <StatCard icon={Heart} label="Favourites" value={stats.total_favourites.toLocaleString()} color="#ef4444" />
            <StatCard icon={MapPin} label="Geotagged" value={stats.geotagged_count.toLocaleString()} color="#10b981" />
            <StatCard icon={FolderOpen} label="Albums" value={stats.total_albums.toLocaleString()} color="#f59e0b" />
            <StatCard icon={HardDrive} label="Storage Used" value={formatBytes(stats.total_size_bytes)} color="#6b7280" />
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>Could not load stats.</div>
        )}
      </section>

      {/* About */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          About LensVault
        </h2>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--accent-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>LensVault v2.0</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Self-hosted, privacy-first photo library</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              ['Storage Backend', 'Local filesystem (/vault)'],
              ['Database', 'PostgreSQL 15'],
              ['Background Jobs', 'Celery + Redis'],
              ['AI Processing', 'InsightFace (buffalo_l)'],
              ['Thumbnail Engine', 'Pillow (WebP)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{k}</span>
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Status */}
      <section>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Feature Status
        </h2>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
          {[
            { feature: 'Photo & Video Upload', status: 'active', note: 'With deduplication' },
            { feature: 'EXIF Metadata Extraction', status: 'active', note: 'Date, GPS, Camera, Dimensions' },
            { feature: 'Thumbnail Generation', status: 'active', note: 'Small / Medium / Large (WebP)' },
            { feature: 'Timeline View', status: 'active', note: 'Virtualized, grouped by month' },
            { feature: 'Albums Management', status: 'active', note: 'Create, edit, share, delete' },
            { feature: 'Smart Categories', status: 'active', note: 'Favourites, Videos, Screenshots' },
            { feature: 'Full-Text Search', status: 'active', note: 'Filename, title, tags, camera' },
            { feature: 'Map View', status: 'active', note: 'Leaflet.js with GPS data' },
            { feature: 'Album Sharing', status: 'active', note: 'Public share links' },
            { feature: 'AI Face Grouping', status: 'active', note: 'InsightFace (buffalo) + DBSCAN' },
            { feature: 'OCR Text Search', status: 'planned', note: 'Tesseract, requires GPU/CPU time' },
            { feature: 'Semantic Search (CLIP)', status: 'planned', note: 'Optional AI module' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: i < 11 ? '1px solid var(--border-color)' : 'none'
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.feature}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>{item.note}</div>
              </div>
              <span style={{
                fontSize: '0.75rem', fontWeight: 600,
                padding: '3px 10px', borderRadius: '99px',
                background: item.status === 'active' ? '#dcfce7' : '#fef9c3',
                color: item.status === 'active' ? '#16a34a' : '#92400e'
              }}>
                {item.status === 'active' ? '✓ Active' : 'Planned'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Settings;
