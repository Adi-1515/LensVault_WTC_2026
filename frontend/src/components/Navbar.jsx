import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Clock, Folder, Heart, Video, Sparkles, Users, Map,
  Settings, Hexagon, LogOut, X
} from 'lucide-react';

const Navbar = ({ isOpen = true, isMobileOpen = false, onClose }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const NavLink = ({ to, icon: Icon, label, comingSoon = false }) => (
    <Link
      to={comingSoon ? '#' : to}
      className={`nav-link ${isActive(to) ? 'active' : ''}`}
      style={{
        opacity: comingSoon ? 0.45 : 1,
        cursor: comingSoon ? 'default' : 'pointer',
        justifyContent: isOpen ? 'flex-start' : 'center'
      }}
      title={!isOpen ? label : undefined}
      onClick={() => isMobileOpen && onClose?.()}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      {isOpen && label}
      {isOpen && comingSoon && (
        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: 'var(--border-color)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
          Soon
        </span>
      )}
    </Link>
  );

  return (
    <aside className={`sidebar ${isOpen ? '' : 'sidebar-is-collapsed'} ${isMobileOpen ? 'sidebar-mobile-open' : ''}`}>
      {/* Logo + mobile close */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Link to="/timeline" className="sidebar-logo" style={{ justifyContent: isOpen ? 'flex-start' : 'center', margin: 0 }}
          onClick={() => isMobileOpen && onClose?.()}>
          <div style={{ background: 'var(--accent-color)', borderRadius: '8px', padding: '6px', color: 'white', display: 'flex', flexShrink: 0 }}>
            <Hexagon size={18} fill="currentColor" />
          </div>
          {isOpen && <span>LensVault</span>}
        </Link>
        {isMobileOpen && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {isOpen && <div className="sidebar-section-title">Library</div>}
        <NavLink to="/timeline" icon={Clock} label="Timeline" />
        <NavLink to="/albums" icon={Folder} label="Albums" />
        <NavLink to="/favourites" icon={Heart} label="Favourites" />
        <NavLink to="/videos" icon={Video} label="Videos" />

        {isOpen && <div className="sidebar-section-title" style={{ marginTop: '16px' }}>Smart</div>}
        <NavLink to="#" icon={Sparkles} label="AI Tags" comingSoon />
        <NavLink to="/people" icon={Users} label="People" />
        <NavLink to="/map" icon={Map} label="Map" />
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <NavLink to="/settings" icon={Settings} label="Settings" />
        <button
          onClick={handleLogout}
          className="nav-link"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)', opacity: 0.8, justifyContent: isOpen ? 'flex-start' : 'center' }}
          title={!isOpen ? 'Sign Out' : undefined}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {isOpen && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
};

export default Navbar;