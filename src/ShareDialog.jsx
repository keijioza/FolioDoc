import React, { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import Icon from './Icons.jsx';

export default function ShareDialog({ document, user, users, onClose }) {
  const dialog = useRef(null);
  const [sharing, setSharing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    dialog.current.showModal();
    const controller = new AbortController();
    api(user.id, `/documents/${document.id}/shares`, { signal: controller.signal }).then(setSharing).catch(error => {
      if (error.name !== 'AbortError') setError(error.message);
    });
    return () => controller.abort();
  }, [document.id, user.id]);

  async function update(target, role) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api(user.id, `/documents/${document.id}/shares`, { method: 'PUT', body: { user_id: target.id, role: role || null } });
      setSharing(result);
      setNotice(`${target.name.split(' ')[0]}'s access updated.`);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="share-dialog" aria-labelledby="share-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} onClick={event => { if (event.target === dialog.current && !busy) onClose(); }}>
    <div className="dialog-heading"><div><span className="eyebrow">BETTER TOGETHER</span><h2 id="share-title">Share this document</h2></div><button className="icon-button" aria-label="Close sharing" onClick={onClose} disabled={busy}><Icon name="close" /></button></div>
    <p className="dialog-description">Invite a fresh perspective to <strong>{document.title}</strong>.</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    {!sharing && !error && <p className="muted">Loading access…</p>}
    {sharing && <div className="people-list">
      <div className="person-row"><span className="avatar">{user.initials}</span><div><strong>{user.name} <span className="muted">(you)</span></strong><small>{user.email}</small></div><span className="role-label">Owner</span></div>
      {users.filter(person => person.id !== user.id).map(person => <div className="person-row" key={person.id}>
        <span className={`avatar avatar-${person.id}`}>{person.initials}</span><div><strong>{person.name}</strong><small>{person.email}</small></div>
        <select aria-label={`Access for ${person.name}`} disabled={busy} value={sharing.shares.find(share => share.id === person.id)?.role || ''} onChange={event => update(person, event.target.value)}>
          <option value="">No access</option><option value="viewer">Can view</option><option value="editor">Can edit</option>
        </select>
      </div>)}
    </div>}
    <p className="share-note"><Icon name="lock" size={16} /> Only people you add can access this document as their selected demo identity.</p>
    <p className="muted small">This is a demo workspace. Anyone can switch between the seeded users.</p>
    <div className="dialog-footer"><span role="status" className="success-text">{notice}</span><button className="button primary" disabled={busy} onClick={onClose}>Done</button></div>
  </dialog>;
}
