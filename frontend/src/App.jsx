import React, { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('chat_token');
    const savedUser  = localStorage.getItem('chat_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_user');
      }
    }
    setLoading(false);
  }, []);

  const handleAuth = ({ token, user }) => {
    localStorage.setItem('chat_token', token);
    localStorage.setItem('chat_user',  JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
    setToken(null);
    setUser(null);
  };

  // Called after avatar upload — updates user state + localStorage
  const handleUpdateUser = (updates) => {
    const newUser = { ...user, ...updates };
    setUser(newUser);
    localStorage.setItem('chat_user', JSON.stringify(newUser));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (user && token) {
    return <ChatPage user={user} token={token} apiUrl={API_URL} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
  }
  return <AuthPage apiUrl={API_URL} onAuth={handleAuth} />;
}