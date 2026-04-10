import React, { useContext, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from './Navbar';
import UploadZone from './UploadZone';
import { PanelLeft, Search, Upload, X } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showUpload, setShowUpload] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Determine upload mode from current route
  const uploadMode = location.pathname === '/videos'
    ? 'videos'
    : location.pathname === '/timeline'
    ? 'photos'
    : 'all';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
        Loading LensVault...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Navbar isOpen={sidebarOpen} />

      <div className={`main-wrapper ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        {/* Sticky top header */}
        <header className="top-header">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              background: 'transparent', border: 'none',
              color: sidebarOpen ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              padding: '6px', borderRadius: '8px', transition: 'all 0.2s ease'
            }}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <PanelLeft size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              onClick={() => navigate('/search')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer',
                padding: '6px 14px', borderRadius: '20px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface-hover)',
                transition: 'all 0.2s ease'
              }}
            >
              <Search size={14} />
              <span>Search</span>
              <span style={{ fontSize: '0.7rem', background: 'var(--border-color)', padding: '1px 6px', borderRadius: '5px', color: 'var(--text-muted)' }}>⌘K</span>
            </div>

            {location.pathname !== '/map' && (
              <button
                onClick={() => setShowUpload(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px',
                  background: showUpload ? 'var(--danger-color)' : 'var(--accent-color)',
                  color: 'white', border: 'none', borderRadius: '20px',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                {showUpload ? <X size={14} /> : <Upload size={14} />}
                {showUpload ? 'Close' : 'Upload'}
              </button>
            )}
          </div>
        </header>

        {showUpload && location.pathname !== '/map' && (
          <div style={{ padding: '16px 32px', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)' }}>
            <UploadZone
              mode={uploadMode}
              onUploadComplete={(photo) => {
                setShowUpload(false);
                window.dispatchEvent(new CustomEvent('photo-uploaded', { detail: photo }));
              }}
            />
          </div>
        )}

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ProtectedRoute;