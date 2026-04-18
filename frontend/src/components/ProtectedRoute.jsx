import React, { useContext, useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from './Navbar';
import UploadZone from './UploadZone';
import { Menu, Search, Upload, X } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showUpload, setShowUpload] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setShowUpload(false);
  }, [location.pathname]);

  // Close upload if we navigate to map
  useEffect(() => {
    if (location.pathname === '/map') setShowUpload(false);
  }, [location.pathname]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

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
      {/* Mobile overlay when nav is open */}
      {mobileNavOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Navbar
        isOpen={mobileNavOpen ? true : sidebarOpen}
        isMobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className={`main-wrapper ${sidebarOpen && !mobileNavOpen ? '' : 'sidebar-collapsed'}`}>
        {/* Sticky top header */}
        <header className="top-header">
          {/* Desktop: panel toggle | Mobile: hamburger */}
          <button
            onClick={() => {
              if (window.innerWidth <= 768) {
                setMobileNavOpen(v => !v);
              } else {
                setSidebarOpen(v => !v);
              }
            }}
            className="header-icon-btn"
            title="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Search — hide label on mobile */}
            <div
              onClick={() => navigate('/search')}
              className="search-pill"
            >
              <Search size={14} />
              <span className="search-pill-label">Search</span>
              <span className="search-pill-kbd">⌘K</span>
            </div>

            {location.pathname !== '/map' && (
              <button
                onClick={() => setShowUpload(v => !v)}
                className="upload-btn"
                style={{
                  background: showUpload ? 'var(--danger-color)' : 'var(--accent-color)',
                }}
              >
                {showUpload ? <X size={14} /> : <Upload size={14} />}
                <span className="upload-btn-label">{showUpload ? 'Close' : 'Upload'}</span>
              </button>
            )}
          </div>
        </header>

        {showUpload && location.pathname !== '/map' && (
          <div style={{ padding: '16px', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)' }}>
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