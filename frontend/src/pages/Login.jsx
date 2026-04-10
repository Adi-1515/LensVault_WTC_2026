import React, { useState, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Camera } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/timeline" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      await login(email, password);
    } catch (error) {
      setErr(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '25%', left: '25%', width: '400px', height: '400px', background: 'var(--accent-color)', opacity: 0.1, borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '25%', right: '25%', width: '400px', height: '400px', background: 'purple', opacity: 0.1, borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'var(--bg-surface-hover)', boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.05)', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
            <Camera size={32} color="var(--accent-color)" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Access your private photo vault</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger-color)', padding: '16px', borderRadius: '12px', fontSize: '0.9rem', backdropFilter: 'blur(10px)' }}>{err}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>Password</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="••••••••" />
          </div>
          
          <button disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '32px', padding: '16px', fontSize: '1rem', justifyContent: 'center' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '32px' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-color)', fontWeight: 500, textDecoration: 'none' }}>Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;