import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { api, downloadDraft } from './api.js';
import Icon from './Icons.jsx';
import ShareDialog from './ShareDialog.jsx';

export default function DocumentEditor({ document: initial, user, users, onBack, onSaved, onDiscard, guardRef }) {
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState('saved');
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [words, setWords] = useState(0);
  const [version, setVersion] = useState(initial.version);
  const [, setSelection] = useState(0);
  const editable = initial.role !== 'viewer';
  const state = useRef({ title: initial.title, version: initial.version, generation: 0, saved: 0, timer: null, pending: null, conflict: false, mounted: true, paused: false });
  const saveRef = useRef(null);

  function changed() {
    const current = state.current;
    current.generation += 1;
    setStatus(current.conflict ? 'conflict' : 'unsaved');
    clearTimeout(current.timer);
    if (!current.conflict && !current.paused) current.timer = setTimeout(() => saveRef.current(), 800);
  }

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, code: false, codeBlock: false, strike: false }), Underline],
    content: initial.content,
    editable,
    editorProps: { attributes: { 'aria-label': 'Document content', role: 'textbox', 'aria-multiline': 'true', spellcheck: 'true' } },
    onUpdate: ({ editor }) => { setWords(editor.getText().trim().split(/\s+/u).filter(Boolean).length); changed(); },
    onTransaction: () => setSelection(value => value + 1),
  });

  async function save() {
    const current = state.current;
    clearTimeout(current.timer);
    if (!editor || !editable || current.generation === current.saved) return true;
    if (current.conflict || current.paused) return false;
    if (current.pending) {
      const ok = await current.pending;
      return ok ? save() : false;
    }
    if (!current.title.trim()) {
      setError('Give your document a title before saving.');
      setStatus('error');
      return false;
    }
    const generation = current.generation;
    const payload = { title: current.title, content: editor.getJSON(), version: current.version };
    setStatus('saving');
    setError('');
    current.pending = (async () => {
      try {
        const result = await api(user.id, `/documents/${initial.id}`, { method: 'PUT', body: payload });
        current.version = result.version;
        current.saved = generation;
        if (current.mounted) {
          setVersion(result.version);
          setStatus(current.generation === current.saved ? 'saved' : 'unsaved');
          onSaved(result);
        }
        return true;
      } catch (error) {
        current.conflict = error.status === 409;
        if (current.mounted) { setStatus(current.conflict ? 'conflict' : 'error'); setError(error.message); }
        return false;
      } finally { current.pending = null; }
    })();
    return current.pending;
  }
  saveRef.current = save;

  useEffect(() => {
    if (editor) setWords(editor.getText().trim().split(/\s+/u).filter(Boolean).length);
  }, [editor]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    state.current.mounted = true;
    guardRef.current = async () => {
      // Flush every generation, including text typed while a request was in flight.
      while (state.current.generation !== state.current.saved) {
        if (!await saveRef.current()) return false;
      }
      return true;
    };
    const beforeUnload = event => {
      if (state.current.generation !== state.current.saved) { event.preventDefault(); event.returnValue = ''; }
    };
    const keyboard = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveRef.current(); }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('keydown', keyboard);
    return () => {
      state.current.mounted = false;
      clearTimeout(state.current.timer);
      guardRef.current = null;
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('keydown', keyboard);
    };
  }, [guardRef]);

  async function loadLatest() {
    if (state.current.paused) return;
    if (state.current.generation !== state.current.saved && !window.confirm('Replace this local draft with the latest saved version? Download your draft first if you need to keep it.')) return;
    state.current.paused = true;
    clearTimeout(state.current.timer);
    editor.setEditable(false);
    setStatus('loading');
    try {
      if (state.current.pending) await state.current.pending;
      const result = await api(user.id, `/documents/${initial.id}`);
      editor.commands.setContent(result.content, false);
      state.current.title = result.title;
      state.current.version = result.version;
      state.current.saved = state.current.generation;
      state.current.conflict = false;
      setTitle(result.title);
      setVersion(result.version);
      setWords(editor.getText().trim().split(/\s+/u).filter(Boolean).length);
      setStatus('saved');
      setError('');
      onSaved(result);
      editor.setEditable(result.role !== 'viewer');
    } catch (error) {
      setError(error.message);
      setStatus('error');
      editor.setEditable(editable);
    } finally { state.current.paused = false; }
  }

  function tool(label, command, active, children, disabled = false) {
    return <button type="button" className={`tool ${active ? 'active' : ''}`} title={label} aria-label={label} aria-pressed={Boolean(active)} disabled={!editable || disabled || status === 'loading'} onMouseDown={event => event.preventDefault()} onClick={() => command(editor.chain().focus()).run()}>{children}</button>;
  }

  if (!editor) return <div className="loading-state">Opening your page…</div>;
  const heading = [1, 2, 3].find(level => editor.isActive('heading', { level })) || 0;
  const statusText = { saved: 'All changes saved', saving: 'Saving changes…', unsaved: 'Unsaved changes', error: 'Not saved', conflict: 'Newer version available', loading: 'Loading latest…' }[status];

  return <div className="editor-view">
    <div className="editor-topbar">
      <button className="icon-button" onClick={onBack} aria-label="Back to documents"><Icon name="arrow" /></button>
      <div className="editor-title-wrap"><label className="sr-only" htmlFor="document-title">Document title</label><input id="document-title" className="document-title" maxLength={120} value={title} disabled={!editable || status === 'loading'} onChange={event => { setTitle(event.target.value); state.current.title = event.target.value; changed(); }} /><div className={`save-status status-${status}`} role="status"><Icon name={status === 'saved' ? 'check' : 'clock'} size={13} />{editable ? statusText : 'View only'}<span className="status-dot">·</span><span>{initial.owner_name}</span></div></div>
      <button className="button quiet export-button" title="Export as plain text" onClick={() => downloadDraft(title, editor.getText())}><Icon name="download" size={17} /><span>Export .txt</span></button>
      {initial.role === 'owner' ? <button className="button primary" onClick={() => setSharing(true)}><Icon name="users" size={17} />Share</button> : <span className="access-badge"><Icon name="users" size={15} />{editable ? 'Can edit' : 'Can view'}</span>}
    </div>
    <div className="toolbar" role="toolbar" aria-label="Text formatting">
      {tool('Undo', chain => chain.undo(), false, <Icon name="undo" size={17} />, !editor.can().undo())}
      {tool('Redo', chain => chain.redo(), false, <Icon name="redo" size={17} />, !editor.can().redo())}
      <span className="toolbar-divider" />
      <select aria-label="Text style" disabled={!editable || status === 'loading'} value={heading} onChange={event => { const level = Number(event.target.value); const chain = editor.chain().focus(); (level ? chain.setHeading({ level }) : chain.setParagraph()).run(); }}><option value="0">Normal text</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option></select>
      <span className="toolbar-divider" />
      {tool('Bold (Ctrl/⌘ B)', chain => chain.toggleBold(), editor.isActive('bold'), <b>B</b>)}
      {tool('Italic (Ctrl/⌘ I)', chain => chain.toggleItalic(), editor.isActive('italic'), <i>I</i>)}
      {tool('Underline (Ctrl/⌘ U)', chain => chain.toggleUnderline(), editor.isActive('underline'), <u>U</u>)}
      <span className="toolbar-divider" />
      {tool('Bulleted list', chain => chain.toggleBulletList(), editor.isActive('bulletList'), <span>• ≡</span>)}
      {tool('Numbered list', chain => chain.toggleOrderedList(), editor.isActive('orderedList'), <span>1. ≡</span>)}
      {tool('Block quote', chain => chain.toggleBlockquote(), editor.isActive('blockquote'), <span className="quote-icon">“</span>)}
      <span className="toolbar-spacer" />
      <span className="toolbar-hint">{editable ? 'Make room for your ideas' : 'A shared perspective'}</span>
    </div>
    {error && <div className="save-error" role="alert"><div><strong>Your draft is still on this page.</strong><p>{error}</p></div><div className="error-actions"><button className="button" onClick={() => downloadDraft(title, editor.getText())}>Download draft (.txt)</button>{status !== 'conflict' && <button className="button" onClick={save}>Retry save</button>}<button className="button" onClick={loadLatest}>Load latest</button><button className="button" onClick={() => { if (window.confirm('Discard unsaved changes and return to your library? Download your draft first if you need it.')) onDiscard(); }}>Discard draft &amp; leave</button></div></div>}
    {!editable && <div className="viewer-note"><Icon name="lock" size={14} /> You can read and export this document. Ask {initial.owner_name.split(' ')[0]} for editing access.</div>}
    <div className="paper-area"><div className="paper"><div className="paper-meta">FOLIO <span>/</span> {editable ? 'YOUR IDEAS, TAKING SHAPE' : 'SHARED WITH YOU'}</div><EditorContent editor={editor} /><div className="paper-bottom">A little space. A lot of possibility.</div></div></div>
    <footer className="editor-footer"><span>{words.toLocaleString()} {words === 1 ? 'word' : 'words'}</span><span>Version {version}<span className="status-dot">·</span>{editable ? 'Autosaves as you write' : 'Read-only document'}</span></footer>
    {sharing && <ShareDialog document={{ ...initial, title }} user={user} users={users} onClose={() => setSharing(false)} />}
  </div>;
}
