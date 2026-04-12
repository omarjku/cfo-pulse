import { useState } from 'react';
import { motion } from 'framer-motion';
import { login } from '../../lib/auth';
import { T } from '../../lib/tokens';

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Brief artificial delay so the button state is visible
    await new Promise((r) => setTimeout(r, 300));
    if (login(username.trim(), password)) {
      onLogin(username.trim());
    } else {
      setError('Invalid credentials.');
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(10,11,26,0.8)',
    border: `1px solid ${T.BORDER}`,
    borderRadius: 8,
    padding: '10px 14px',
    color: T.TEXT1,
    fontSize: 13,
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      height: '100vh', background: T.BG, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Subtle background glow */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 340,
          background: T.SURFACE,
          border: `1px solid ${T.BORDER}`,
          borderRadius: 14,
          padding: '32px 28px',
          boxShadow: '0 0 40px rgba(245,158,11,0.08), 0 8px 32px rgba(0,0,0,0.4)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${T.AMBER}, rgba(245,158,11,0.3), transparent)`,
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: T.GRAD_AMBER,
            boxShadow: T.SHADOW_AMBER,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 900, color: '#05060f', fontFamily: 'monospace',
          }}>CF</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.AMBER, fontFamily: 'monospace', letterSpacing: '1px' }}>
              CFO-PULSE
            </div>
            <div style={{ fontSize: 10, color: T.TEXT3, fontFamily: 'monospace' }}>
              Financial Intelligence
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.TEXT3, fontFamily: 'monospace', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
              required
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = T.BORDER_A2}
              onBlur={(e) => e.target.style.borderColor = T.BORDER}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.TEXT3, fontFamily: 'monospace', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
              required
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = T.BORDER_A2}
              onBlur={(e) => e.target.style.borderColor = T.BORDER}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 12, color: T.DANGER, margin: 0, fontFamily: 'monospace' }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            style={{
              width: '100%',
              background: loading ? 'rgba(245,158,11,0.4)' : T.GRAD_AMBER,
              border: 'none',
              borderRadius: 8,
              padding: '11px 0',
              color: '#05060f',
              fontSize: 12,
              fontWeight: 800,
              fontFamily: 'monospace',
              letterSpacing: '1px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
              boxShadow: loading ? 'none' : T.SHADOW_AMBER,
            }}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
