import React, { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import Icon from './Icons.jsx';
import DocumentEditor from './DocumentEditor.jsx';

const emptyContent = { type: 'doc', content: [{ type: 'paragraph' }] };
const views = { all: ['Your workspace', 'A little space for your next big thing.'], owned: ['Made by you', 'From a first thought to the final word.'], shared: ['Shared with you', 'Good work gets better together.'] };

function modifiedAt(value) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('alex');
  const [documents, setDocuments] = useState([]);
  const [active, setActive] = useState(null);
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const guardRef = useRef(null);
  const operation = useRef(false);
  const uploadRef = useRef(null);
  const user = users.find(user => user.id === userId);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([api(userId, '/users', { signal: controller.signal }), api(userId, '/documents', { signal: controller.signal })])
      .then(([people, documents]) => { setUsers(people); setDocuments(documents); })
      .catch(error => { if (error.name !== 'AbortError') setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId, reload]);

  async function action(callback) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      if (guardRef.current && !await guardRef.current()) {
        setError('Save your changes before leaving. Use the document’s recovery options if saving is blocked.');
        return;
      }
      await callback();
    } catch (error) { setError(error.message); }
    finally { operation.current = false; setBusy(false); }
  }

  function remember(document) {
    setDocuments(current => [document, ...current.filter(item => item.id !== document.id)]);
    // Keep current permissions synchronized after an explicit reload.
    setActive(current => current?.id === document.id ? { ...current, role: document.role } : current);
  }

  function navigate(next) {
    action(async () => { setActive(null); setView(next); setSearch(''); setReload(value => value + 1); });
  }

  async function openCreated(document) {
    remember(document);
    // Users can keep typing while creation/import is in flight. Flush those
    // later edits too before unmounting their current editor.
    if (guardRef.current && !await guardRef.current()) {
      throw new Error('The new document is in your library. Save or recover your current draft before opening it.');
    }
    setActive(document);
  }

  function create() {
    action(async () => {
      const document = await api(userId, '/documents', { method: 'POST', body: { title: 'Untitled document', content: emptyContent } });
      await openCreated(document);
    });
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    action(async () => {
      if (!file.name.toLowerCase().endsWith('.txt')) throw new Error('Choose a UTF-8 .txt file. Other formats are not supported.');
      if (file.size > 200_000) throw new Error('This file is too large. Choose a .txt file up to 200 KB.');
      const document = await api(userId, `/import?filename=${encodeURIComponent(file.name)}`, { method: 'POST', body: file, raw: true });
      await openCreated(document);
    });
  }

  const owned = documents.filter(document => document.role === 'owner').length;
  const filtered = documents.filter(document => (view === 'all' || (view === 'owned' ? document.role === 'owner' : document.role !== 'owner')) && `${document.title} ${document.preview}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('all')} disabled={busy} aria-label="Folio home"><span className="brand-mark">f</span><span>folio<span className="brand-period">.</span></span></button>
      <div className="workspace-label"><span className="workspace-symbol">✳</span><div>Team workspace<small>A home for good ideas</small></div></div>
      <button className="button primary new-button" onClick={create} disabled={busy || !user}><Icon name="plus" size={18} />New document</button>
      <nav aria-label="Document library">
        <span className="nav-label">LIBRARY</span>
        {[['all', 'grid', 'All documents', documents.length], ['owned', 'document', 'Owned by me', owned], ['shared', 'users', 'Shared with me', documents.length - owned]].map(([key, icon, label, count]) => <button key={key} className={`nav-item ${view === key && !active ? 'selected' : ''}`} onClick={() => navigate(key)} disabled={busy} aria-current={view === key && !active ? 'page' : undefined}><Icon name={icon} size={18} /><span>{label}</span><span className="nav-count">{count}</span></button>)}
      </nav>
      <div className="sidebar-bottom"><div className="demo-card"><span className="demo-tag">DEMO WORKSPACE</span><p>Try a different perspective.</p><small>Switch users to explore sharing. These accounts are open to everyone.</small></div>
        <label className="profile" htmlFor="demo-user"><span className={`avatar avatar-${userId}`}>{user?.initials || '…'}</span><div><span className="sr-only">Demo user</span><select id="demo-user" value={userId} disabled={busy || !users.length} onChange={event => { const id = event.target.value; action(async () => { setActive(null); setDocuments([]); setUserId(id); setView('all'); setSearch(''); }); }}>{users.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select><small>Switch demo user</small></div></label>
      </div>
    </aside>
    <main className="main-content" aria-busy={busy || loading}>
      {error && <div className="app-error" role="alert"><span>{error}</span><button className="button small-button" onClick={() => { setError(''); if (!active) setReload(value => value + 1); }}>{active ? 'Dismiss' : 'Retry'}</button></div>}
      {active && user ? <DocumentEditor key={`${userId}:${active.id}`} document={active} user={user} users={users} onBack={() => navigate(view)} onSaved={remember} onDiscard={() => { guardRef.current = null; setActive(null); setReload(value => value + 1); }} guardRef={guardRef} /> : <>
        <header className="workspace-topbar"><span>Workspace <span className="breadcrumb-slash">/</span> <strong>{view === 'all' ? 'All documents' : view === 'owned' ? 'Owned by me' : 'Shared with me'}</strong></span><span className="workspace-pill"><span /> Your team's thinking space</span></header>
        <div className="library-content">
          <div className="library-heading"><div><span className="eyebrow">A FRESH PAGE, A NEW POSSIBILITY</span><h1>{views[view][0]}<span className="heading-dot">.</span></h1><p>{views[view][1]}</p></div><button className="button import-button" onClick={() => uploadRef.current.click()} disabled={busy || !user}><Icon name="upload" size={17} />Import .txt file</button></div>
          <section className="welcome-banner"><div className="banner-copy"><span className="eyebrow">THINK IT. WRITE IT. SHARE IT.</span><h2>Great things begin<br />with a blank page.</h2><p>A thought, a plan, a work in progress.<br />Give it a place to grow.</p><button className="banner-link" onClick={create} disabled={busy || !user}>Start writing <span>↗</span></button></div><div className="banner-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✦</span><div className="art-paper paper-back" /><div className="art-paper paper-front"><span className="art-tag">THE NEXT BIG IDEA</span><span className="art-heading">What if…</span><span className="art-line" /><span className="art-line line-short" /><span className="art-highlight" /><span className="art-line" /><span className="art-line line-short" /><span className="art-signature">let's make it happen.</span></div><span className="art-note">a little possibility ↗</span></div></section>
          <div className="document-controls"><div><h2>{view === 'shared' ? 'Shared documents' : 'Your documents'} <span className="count-pill">{filtered.length}</span></h2><p>Pick up where you left off.</p></div><label className="search"><Icon name="search" size={17} /><input type="search" placeholder="Search documents…" aria-label="Search documents" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
          {loading ? <div className="loading-state" role="status"><span className="loading-dot" />Gathering your ideas…</div> : filtered.length ? <div className="document-grid">
            {filtered.map((document, index) => <button className="document-card" key={document.id} onClick={() => action(async () => setActive(await api(userId, `/documents/${document.id}`)))} disabled={busy}>
              <div className={`card-preview preview-${index % 3}`}><div className="mini-page"><span className="mini-page-title">{document.title}</span><p>{document.preview || 'Every idea starts somewhere. This page is ready for yours.'}</p><span className="mini-line" /><span className="mini-line short" /></div><span className={`document-badge ${document.role !== 'owner' ? 'shared-badge' : ''}`}><Icon name={document.role === 'owner' ? 'document' : 'users'} size={12} />{document.role === 'owner' ? 'Owned by you' : document.role === 'editor' ? 'Shared · Can edit' : 'Shared · View only'}</span></div>
              <div className="card-details"><div className="card-title"><Icon name="document" size={18} /><h3>{document.title}</h3></div><div className="card-meta"><span>{document.role === 'owner' ? 'You' : document.owner_name.split(' ')[0]} <span>·</span> {modifiedAt(document.updated_at)}</span><span className={`tiny-avatar avatar-${document.owner_id}`}>{users.find(user => user.id === document.owner_id)?.initials}</span></div></div>
            </button>)}
            {!search && view !== 'shared' && <button className="new-card" onClick={create} disabled={busy || !user}><span><Icon name="plus" size={25} /></span><strong>A new beginning</strong><small>Create a blank document</small></button>}
          </div> : <div className="empty-state"><span className="empty-icon"><Icon name={search ? 'search' : 'document'} size={28} /></span><h3>{search ? 'No matching documents' : view === 'shared' ? 'Room for a shared idea' : 'Your next idea belongs here'}</h3><p>{search ? 'Try a different title or a few words from your document.' : view === 'shared' ? 'Switch to another demo user and share a document with this account.' : 'Start with a blank page, or bring a text file along.'}</p>{!search && view !== 'shared' && <button className="button primary" onClick={create} disabled={busy || !user}>Create your first document</button>}</div>}
          <footer className="library-footer"><span><Icon name="lock" size={13} /> Documents persist in your workspace</span><span>Import UTF-8 .txt files · up to 200 KB</span></footer>
        </div>
      </>}
    </main>
    <input ref={uploadRef} type="file" accept=".txt,text/plain" className="sr-only" tabIndex={-1} aria-label="Import text file" onChange={importFile} />
  </div>;
}
