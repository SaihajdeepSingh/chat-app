import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => {
  const date = new Date(d), today = new Date(), yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yest.toDateString())  return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};
const previewOf = (msg) => {
  if (!msg) return null;
  return msg.messageType === 'image' ? 'Photo' : msg.content;
};

function Avatar({ name = '?', src = null, size = 38, online = false }) {
  const [imgErr, setImgErr] = useState(false);
  const showImg = src && !imgErr;
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {showImg ? (
        <img src={src} alt={name} onError={() => setImgErr(true)}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid rgba(99,102,241,0.3)' }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.38), fontWeight: 700, color: 'white', userSelect: 'none', flexShrink: 0 }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {online && (
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: Math.round(size * 0.26), height: Math.round(size * 0.26), borderRadius: '50%', background: '#22c55e', border: '2px solid #0a0a0f' }} />
      )}
    </div>
  );
}

function ProfileAvatar({ name, src, size = 42, uploading, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>
      <Avatar name={name} src={src} size={size} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hover || uploading ? 1 : 0, transition: 'opacity 0.18s' }}>
        {uploading
          ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        }
      </div>
    </div>
  );
}

function Tick({ status }) {
  return <span style={{ fontSize: 11, marginLeft: 4, fontWeight: 600, color: status === 'read' ? '#818cf8' : '#4a4a60' }}>{status === 'sent' ? '✓' : '✓✓'}</span>;
}

function Lightbox({ src, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
      <img src={src} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 14, objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
      <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
    </div>
  );
}

export default function ChatPage({ user, token, apiUrl, onLogout, onUpdateUser }) {
  const [users,           setUsers]           = useState([]);
  const [selectedUser,    setSelectedUser]    = useState(null);

  // conversations map:
  //   undefined  → never fetched
  //   null       → currently fetching (shows spinner)
  //   []         → fetched, empty
  //   [...]      → fetched, has messages
  const [conversations,   setConversations]   = useState({});

  const [onlineUserIds,   setOnlineUserIds]   = useState([]);
  const [unreadCounts,    setUnreadCounts]    = useState({});
  const [lastMessages,    setLastMessages]    = useState({});
  const [input,           setInput]           = useState('');
  const [search,          setSearch]          = useState('');
  const [imageFile,       setImageFile]       = useState(null);
  const [imagePreview,    setImagePreview]    = useState(null);
  const [uploading,       setUploading]       = useState(false);
  const [uploadErr,       setUploadErr]       = useState('');
  const [lightboxSrc,     setLightboxSrc]     = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const socketRef       = useRef(null);
  const bottomRef       = useRef(null);
  const inputRef        = useRef(null);
  const fileInputRef    = useRef(null);
  const avatarInputRef  = useRef(null);
  const selectedUserRef = useRef(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  // ── Fetch sidebar users ───────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${apiUrl}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.status === 401) { onLogout(); return null; } return r.json(); })
      .then(d => { if (d && Array.isArray(d)) setUsers(d); })
      .catch(() => {});
  }, []);

  // ── Socket.io ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(apiUrl, { reconnectionAttempts: 5 });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('user-online', { userId: user.id }));
    socket.on('online-users', ids => setOnlineUserIds(ids));

    socket.on('new-message', msg => {
      const sid = msg.sender;
      setConversations(p => ({
        ...p,
        // only append if conversation was already loaded (not undefined/null)
        [sid]: Array.isArray(p[sid]) ? [...p[sid], msg] : p[sid],
      }));
      setLastMessages(p => ({ ...p, [sid]: msg }));
      if (selectedUserRef.current?._id !== sid) {
        setUnreadCounts(p => ({ ...p, [sid]: (p[sid] || 0) + 1 }));
      } else {
        socket.emit('messages-read', { senderId: sid, token });
      }
    });

    socket.on('message-sent', msg => {
      const rid = msg.receiver;
      setConversations(p => ({
        ...p,
        [rid]: Array.isArray(p[rid]) ? [...p[rid], msg] : p[rid],
      }));
      setLastMessages(p => ({ ...p, [rid]: msg }));
    });

    socket.on('messages-read', ({ byUserId }) => {
      setConversations(p => {
        const msgs = p[byUserId];
        if (!Array.isArray(msgs)) return p;
        return { ...p, [byUserId]: msgs.map(m => m.sender === user.id && m.status !== 'read' ? { ...m, status: 'read' } : m) };
      });
    });

    return () => socket.disconnect();
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedUser]);


  // ── Fetch history with retry (handles Render cold start) ──────────────────
  const fetchHistory = (userId, attempt = 1) => {
    setConversations(p => ({ ...p, [userId]: 'loading' }));

    // Abort after 12s so we always retry instead of hanging forever
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);

    fetch(`${apiUrl}/api/messages/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    })
      .then(r => { clearTimeout(timer); if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(data => {
        const msgs = Array.isArray(data) ? data : [];
        setConversations(p => {
          const live = Array.isArray(p[userId]) ? p[userId] : [];
          const map = new Map();
          [...msgs, ...live].forEach(m => map.set(String(m._id), m));
          const sorted = [...map.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          return { ...p, [userId]: sorted };
        });
        if (msgs.length > 0) setLastMessages(p => ({ ...p, [userId]: msgs[msgs.length - 1] }));
      })
      .catch(() => {
        clearTimeout(timer);
        if (attempt < 4) {
          // Retry: attempt 1→6s, 2→12s, 3→18s gap
          setTimeout(() => fetchHistory(userId, attempt + 1), 6000 * attempt);
        } else {
          // Give up — show empty state so UI doesn't stay stuck
          setConversations(p => ({ ...p, [userId]: [] }));
        }
      });
  };

  // ── Select a conversation ─────────────────────────────────────────────────
  const selectUser = (u) => {
    setSelectedUser(u);
    setUnreadCounts(p => ({ ...p, [u._id]: 0 }));
    socketRef.current?.emit('messages-read', { senderId: u._id, token });
    setTimeout(() => inputRef.current?.focus(), 80);
    const cur = conversations[u._id];
    if (cur === 'loading') return;
    if (cur !== undefined) return;
    fetchHistory(u._id);
  };

  // ── Image handlers ────────────────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadErr('');
    if (!file.type.startsWith('image/')) { setUploadErr('Only image files allowed'); return; }
    if (file.size > 5 * 1024 * 1024)    { setUploadErr('Image must be under 5MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const cancelImage = () => { setImageFile(null); setImagePreview(null); setUploadErr(''); };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedUser || !socketRef.current) return;
    setUploadErr('');

    if (imageFile) {
      setUploading(true);
      try {
        const form = new FormData();
        form.append('image', imageFile);
        const res  = await fetch(`${apiUrl}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        socketRef.current.emit('send-message', { content: input.trim(), token, receiverId: selectedUser._id, messageType: 'image', imageUrl: data.imageUrl });
        cancelImage(); setInput('');
      } catch (err) { setUploadErr(err.message); }
      finally { setUploading(false); }
      return;
    }

    const text = input.trim(); if (!text) return;
    socketRef.current.emit('send-message', { content: text, token, receiverId: selectedUser._id, messageType: 'text' });
    setInput('');
  };

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarSelect = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Only image files allowed'); return; }
    if (file.size > 3 * 1024 * 1024)    { alert('Avatar must be under 3MB'); return; }
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res  = await fetch(`${apiUrl}/api/profile/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onUpdateUser({ avatar: data.user.avatar });
    } catch (err) { alert('Avatar upload failed: ' + err.message); }
    finally { setAvatarUploading(false); e.target.value = ''; }
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const sortedUsers = [...users]
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(lastMessages[b._id]?.createdAt || 0) - new Date(lastMessages[a._id]?.createdAt || 0));


  const convoData   = selectedUser ? conversations[selectedUser._id] : undefined;
  const isLoading   = convoData === 'loading';
  const currentMsgs = Array.isArray(convoData) ? convoData : [];
  const isOwnMsg      = msg => msg.sender?.toString() === user.id?.toString();
  const isOnline      = id => onlineUserIds.includes(id);

  const buildItems = (msgs) => {
    const items = []; let lastDate = null, lastSender = null;
    msgs.forEach((msg, i) => {
      const label = fmtDate(msg.createdAt);
      if (label !== lastDate) {
        items.push({ type: 'date', label, key: `d${i}` });
        lastDate = label; lastSender = null;
      }
      const grouped = lastSender === msg.sender;
      items.push({ type: 'msg', msg, key: msg._id || i, grouped });
      lastSender = msg.sender;
    });
    return items;
  };

  const items = buildItems(currentMsgs);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <input ref={fileInputRef}   type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />

      {/* ══ SIDEBAR ══ */}
      <aside style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#0d0d16', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <ProfileAvatar name={user.name} src={user.avatar} size={44} uploading={avatarUploading} onClick={() => avatarInputRef.current?.click()} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e2ed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#22c55e', marginTop: 1 }}>● Active now</div>
          </div>
          <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4a60', padding: 6, borderRadius: 8, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.color = '#4a4a60'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

        <div style={{ padding: '10px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 12px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a4a60" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
              style={{ background: 'none', border: 'none', outline: 'none', color: '#e2e2ed', fontSize: 13, fontFamily: 'Inter, sans-serif', width: '100%' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sortedUsers.length === 0 && <p style={{ padding: '24px 16px', fontSize: 13, color: '#4a4a60', textAlign: 'center' }}>No users found</p>}
          {sortedUsers.map(u => {
            const last     = lastMessages[u._id];
            const unread   = unreadCounts[u._id] || 0;
            const selected = selectedUser?._id === u._id;
            return (
              <div key={u._id} onClick={() => selectUser(u)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', cursor: 'pointer', background: selected ? 'rgba(99,102,241,0.1)' : 'transparent', borderLeft: `3px solid ${selected ? '#6366f1' : 'transparent'}`, transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
                <Avatar name={u.name} src={u.avatar} size={46} online={isOnline(u._id)} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: unread > 0 ? 600 : 500, color: '#e2e2ed' }}>{u.name}</span>
                    {last && <span style={{ fontSize: 11, color: unread > 0 ? '#6366f1' : '#4a4a60', flexShrink: 0 }}>{fmtTime(last.createdAt)}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: unread > 0 ? '#8b8ba8' : '#4a4a60', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: unread > 0 ? 170 : 220 }}>
                      {last ? (last.sender === user.id ? `You: ${previewOf(last)}` : previewOf(last)) : (isOnline(u._id) ? '● Online' : 'Start a conversation')}
                    </span>
                    {unread > 0 && (
                      <div style={{ minWidth: 20, height: 20, borderRadius: 10, padding: '0 5px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0, marginLeft: 6 }}>
                        {unread > 99 ? '99+' : unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ══ CHAT AREA ══ */}
      {!selectedUser ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg-base)' }}>
          <div style={{ width: 80, height: 80, borderRadius: 28, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#4a4a60', margin: '0 0 6px' }}>Your messages</p>
            <p style={{ fontSize: 13, color: '#2e2e3e', margin: 0 }}>Select a person to start chatting</p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 62, background: '#0d0d16', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <Avatar name={selectedUser.name} src={selectedUser.avatar} size={40} online={isOnline(selectedUser._id)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e2ed' }}>{selectedUser.name}</div>
              <div style={{ fontSize: 12, color: isOnline(selectedUser._id) ? '#22c55e' : '#4a4a60', marginTop: 1 }}>
                {isOnline(selectedUser._id) ? '● Online' : 'Offline'}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px', display: 'flex', flexDirection: 'column' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14 }}>
                <div className="spinner" />
                <p style={{ fontSize: 13, color: '#4a4a60', margin: 0 }}>Loading messages...</p>
              </div>
            ) : currentMsgs.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Avatar name={selectedUser.name} src={selectedUser.avatar} size={60} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e2ed', margin: '0 0 4px' }}>{selectedUser.name}</p>
                  <p style={{ fontSize: 13, color: '#4a4a60', margin: 0 }}>Start the conversation by sending a message</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {items.map(item => {
                  if (item.type === 'date') return (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 10px' }}>
                      <span style={{ fontSize: 11, color: '#4a4a60', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '3px 14px' }}>{item.label}</span>
                    </div>
                  );

                  const { msg, grouped } = item;
                  const own   = isOwnMsg(msg);
                  const isImg = msg.messageType === 'image';

                  return (
                    <div key={item.key} className="msg-pop" style={{ display: 'flex', flexDirection: own ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: grouped ? 2 : 10 }}>
                      {!own && (
                        <div style={{ width: 30, flexShrink: 0 }}>
                          {!grouped && <Avatar name={msg.senderName} src={msg.senderAvatar} size={30} />}
                        </div>
                      )}
                      <div style={{ maxWidth: '62%', display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
                        {!own && !grouped && (
                          <span style={{ fontSize: 11, color: '#6366f1', marginBottom: 4, marginLeft: 4, fontWeight: 500 }}>{msg.senderName}</span>
                        )}
                        <div style={{ padding: isImg ? 4 : '9px 14px', borderRadius: own ? (grouped ? '14px 4px 4px 14px' : '18px 18px 4px 18px') : (grouped ? '4px 14px 14px 4px' : '18px 18px 18px 4px'), background: own ? 'linear-gradient(135deg,#6366f1,#7c3aed)' : 'rgba(255,255,255,0.06)', color: '#e2e2ed', fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word', boxShadow: own ? '0 2px 10px rgba(99,102,241,0.2)' : 'none', border: own ? 'none' : '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          {isImg ? (
                            <>
                              <img src={msg.imageUrl} alt="img" onClick={() => setLightboxSrc(msg.imageUrl)}
                                style={{ display: 'block', width: '100%', maxHeight: 280, objectFit: 'cover', cursor: 'zoom-in', borderRadius: own ? '14px 14px 0 14px' : '14px 14px 14px 0' }} />
                              {msg.content && <div style={{ padding: '6px 10px 2px', fontSize: 13 }}>{msg.content}</div>}
                            </>
                          ) : msg.content}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
                          <span style={{ fontSize: 10, color: '#2e2e3e' }}>{fmtTime(msg.createdAt)}</span>
                          {own && <Tick status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {imagePreview && (
            <div style={{ padding: '10px 20px 0', background: '#0d0d16', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={imagePreview} alt="preview" style={{ maxHeight: 100, maxWidth: 160, borderRadius: 10, display: 'block', objectFit: 'cover' }} />
                <button onClick={cancelImage} style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', background: '#f87171', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
              </div>
              {uploadErr && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#f87171' }}>{uploadErr}</p>}
            </div>
          )}

          <div style={{ padding: '12px 20px', background: '#0d0d16', borderTop: imagePreview ? 'none' : '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            {!imagePreview && uploadErr && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#f87171' }}>{uploadErr}</p>}
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} title="Send photo"
                style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a60', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#4a4a60'; }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                placeholder={imageFile ? 'Add a caption…' : `Message ${selectedUser.name}…`}
                maxLength={500}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '11px 16px', color: '#e2e2ed', fontFamily: 'Inter, sans-serif', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="submit" disabled={(!input.trim() && !imageFile) || uploading}
                style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', border: 'none', cursor: (!input.trim() && !imageFile) || uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!input.trim() && !imageFile) || uploading ? 0.35 : 1, transition: 'opacity 0.2s, transform 0.15s', boxShadow: (!input.trim() && !imageFile) ? 'none' : '0 2px 14px rgba(99,102,241,0.35)' }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                {uploading
                  ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}