import React, { useState, useContext } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Camera, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const { register, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/timeline" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setErr("Passwords don't match");
    if (password.length < 6) return setErr("Password must be at least 6 characters");
    setLoading(true); setErr('');
    try {
      await register(email, password);
      navigate('/login', { state: { registered: true } });
    } catch (error) {
      setErr(error.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '30%', right: '25%', width: '400px', height: '400px', background: 'var(--accent-color)', opacity: 0.1, borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '30%', left: '25%', width: '400px', height: '400px', background: '#10b981', opacity: 0.1, borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Start building your private gallery</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger-color)', padding: '16px', borderRadius: '12px', fontSize: '0.9rem', backdropFilter: 'blur(10px)' }}>{err}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input required type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="••••••••" style={{ paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input required type={showConfirm ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" placeholder="••••••••" style={{ paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }} aria-label="Toggle confirm password visibility">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <button disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '32px', padding: '16px', fontSize: '1rem', justifyContent: 'center' }}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '32px' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;