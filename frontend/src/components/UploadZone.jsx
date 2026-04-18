import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadPhoto, triggerClustering } from '../services/api';
import { UploadCloud, CheckCircle2, AlertCircle, Image, Video } from 'lucide-react';

// mode: 'photos' | 'videos' | 'all'
const UploadZone = ({ onUploadComplete, mode = 'all' }) => {
  const [uploads, setUploads] = useState({});

  const accept = mode === 'videos'
    ? { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'] }
    : mode === 'photos'
    ? { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif', '.tiff'] }
    : { 'image/*': [], 'video/*': [] };

  const label = mode === 'videos'
    ? 'Upload Videos'
    : mode === 'photos'
    ? 'Upload Photos'
    : 'Upload Photos & Videos';

  const hint = mode === 'videos'
    ? 'MP4, MOV, AVI, MKV, WEBM'
    : mode === 'photos'
    ? 'JPEG, PNG, WEBP, HEIC, GIF'
    : 'Photos and videos';

  const Icon = mode === 'videos' ? Video : mode === 'photos' ? Image : UploadCloud;

  const onDrop = useCallback(async (acceptedFiles) => {
    let hasSuccess = false;
    for (const file of acceptedFiles) {
      const id = Math.random().toString(36).substr(2, 9);
      setUploads(prev => ({ ...prev, [id]: { file, progress: 0, status: 'uploading' } }));

      try {
        const res = await uploadPhoto(file, (e) => {
          const p = Math.round((100 * e.loaded) / e.total);
          setUploads(prev => ({ ...prev, [id]: { ...prev[id], progress: p } }));
        });
        setUploads(prev => ({ ...prev, [id]: { ...prev[id], status: 'success' } }));
        onUploadComplete(res.data);
        hasSuccess = true;
      } catch (err) {
        setUploads(prev => ({ ...prev, [id]: { ...prev[id], status: 'error' } }));
      }
    }
    // Auto-trigger face clustering after successful uploads
    if (hasSuccess) {
      try {
        await triggerClustering();
      } catch (err) {
        console.error('Auto-clustering failed:', err);
      }
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept });

  return (
    <div className="animate-fade-in">
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
          background: isDragActive ? 'rgba(0,112,243,0.05)' : 'var(--bg-surface)',
          transform: isDragActive ? 'scale(1.02)' : 'none',
          padding: '40px 48px',
          borderRadius: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isDragActive ? '0 10px 40px rgba(0,112,243,0.1)' : 'none'
        }}
      >
        <input {...getInputProps()} />
        <div style={{
          width: '56px', height: '56px', margin: '0 auto 14px',
          background: isDragActive ? 'rgba(37,99,235,0.1)' : 'var(--bg-surface-hover)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDragActive ? 'var(--accent-color)' : 'var(--text-muted)',
          transition: 'all 0.2s ease'
        }}>
          <Icon size={26} />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>{label}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '4px' }}>
          Drag & drop here, or click to browse
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{hint}</p>
      </div>

      {Object.keys(uploads).length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
          {Object.entries(uploads).map(([id, u]) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', fontWeight: 500 }}>{u.file.name}</div>

              <div style={{ width: '140px', background: 'var(--border-color)', height: '6px', borderRadius: '99px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{
                  height: '100%',
                  width: `${u.progress}%`,
                  background: u.status === 'error' ? 'var(--danger-color)' : u.status === 'success' ? '#10b981' : 'var(--accent-color)',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              <div style={{ width: '32px', display: 'flex', justifyContent: 'flex-end', color: u.status === 'error' ? 'var(--danger-color)' : u.status === 'success' ? '#10b981' : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}>
                {u.status === 'error' ? <AlertCircle size={15} /> : u.status === 'success' ? <CheckCircle2 size={15} /> : `${u.progress}%`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadZone;