import React, { useState } from 'react';

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  border: '1.5px solid rgba(255,255,255,0.09)',
  borderRadius: 12, padding: '12px 16px',
  color: '#e2e2ed', fontFamily: 'Inter, sans-serif',
  fontSize: 14, outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};
const onFocus = e => {
  e.target.style.borderColor = '#6366f1';
  e.target.style.boxShadow   = '0 0 0 3px rgba(99,102,241,0.14)';
};
const onBlur = e => {
  e.target.style.borderColor = 'rgba(255,255,255,0.09)';
  e.target.style.boxShadow   = 'none';
};

function PasswordField({ placeholder, value, onChange, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        required
        style={{ ...inputStyle, paddingRight: 46 }}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 14, top: '50%',
          transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#4a4a60', padding: 2, display: 'flex',
          alignItems: 'center', transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#8b8ba8'}
        onMouseLeave={e => e.currentTarget.style.color = '#4a4a60'}
        tabIndex={-1}
      >
        {show ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export default function AuthPage({ apiUrl, onAuth }) {
  const [mode,            setMode]            = useState('login');
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  const switchMode = (m) => {
    setMode(m); setError('');
    setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body     = mode === 'login' ? { email, password } : { name, email, password };
      const res      = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Something went wrong'); return; }
      onAuth(data);
    } catch {
      setError('Cannot reach the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />

      <div className="animate-fadeUp" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 50, height: 50, borderRadius: 15, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#e2e2ed', letterSpacing: '-0.02em' }}>Chat App</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#4a4a60' }}>Real-time private messaging</p>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#0d0d16', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 30px 24px', boxShadow: '0 20px 70px rgba(0,0,0,0.55)' }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, marginBottom: 22 }}>
            {[{ k: 'login', l: 'Sign in' }, { k: 'register', l: 'Register' }].map(({ k, l }) => (
              <button key={k} onClick={() => switchMode(k)} style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode === k ? '#1c1c28' : 'transparent',
                color: mode === k ? '#e2e2ed' : '#4a4a60',
                fontFamily: 'Inter, sans-serif', fontSize: 14,
                fontWeight: mode === k ? 600 : 400, transition: 'all 0.2s',
              }}>{l}</button>
            ))}
          </div>

          {/* Fields */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>

            {mode === 'register' && (
              <input
                placeholder="Full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required autoFocus
                style={inputStyle}
                onFocus={onFocus} onBlur={onBlur}
              />
            )}

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus={mode === 'login'}
              style={inputStyle}
              onFocus={onFocus} onBlur={onBlur}
            />

            <PasswordField
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            {mode === 'register' && (
              <PasswordField
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            )}

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171', fontSize: 13, fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4, height: 48,
                background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#6366f1,#7c3aed)',
                color: loading ? '#4a4a60' : 'white',
                border: 'none', borderRadius: 12,
                fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.38)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 20px rgba(99,102,241,0.28)'; }}
            >
              {loading ? (
                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Please wait</>
              ) : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>
          </form>

          <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 13, color: '#4a4a60', fontFamily: 'Inter, sans-serif' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0, fontFamily: 'Inter, sans-serif' }}>
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}