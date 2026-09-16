# Architecture and product decisions

## Product slice

Folio prioritizes a complete asynchronous collaboration loop: create → write → save → share → switch identity → read/edit → reopen. A rich editor and coherent access model matter more here than recreating every Google Docs feature.

The implementation uses React and FastAPI as requested. It was written under a source-only constraint; the flows below describe intended implemented behavior, not a claim that runtime verification has passed.

## Components

```text
Browser: React + Tiptap
          │ same-origin HTTP /api
          ▼
Lightsail: Caddy container (TLS) ──► FastAPI container
                                      │ serves bundled React assets
                                      │ document/permission logic
                                      ▼
                                  SQLite volume
```

- `src/App.jsx`: library, seeded user selection, imports, and guarded navigation.
- `src/DocumentEditor.jsx`: Tiptap integration, save states, request serialization, revision handling, draft recovery.
- `src/ShareDialog.jsx`: owner-only access management through a native dialog.
- `src/api.js`: HTTP errors and plain-text downloads.
- `backend/app.py`: FastAPI routes, limited request-body reading, input models, error responses, static assets.
- `backend/store.py`: schema, seed data, persistence, authorization, atomic save and sharing transactions.
- `backend/content.py`: constrained rich-text structure, text imports, text previews.

Tiptap supplies a structured editor, selection-aware commands, history, and input/paste handling. The frontend does not render raw stored HTML. Custom CSS and inline SVG/CSS illustrations avoid third-party font and image services.

## Data and access

`users` has three fixed demo identities. `documents` stores owner, title, structured JSON, version, and timestamps. `shares` has one row per `(document_id, user_id)` with `viewer` or `editor` access. Ownership is immutable; only the owner may grant, change, or remove access.

All document reads, lists, writes, and share mutations enforce the selected identity's permissions in the backend. Unknown identities return 401, inaccessible documents 404, and prohibited actions on accessible documents 403. This demonstrates authorization while deliberately mocking authentication. The identity header is caller-controlled and is not a security credential.

## Saving and conflicts

The editor debounces changes for 800 ms, keeps a generation counter, and serializes save requests. Title and document content save together. In-app navigation waits until all unsaved generations are flushed. A tab-close warning is registered while work is unsaved.

Each update sends the loaded `version`. A SQLite `BEGIN IMMEDIATE` transaction checks current permission and version, then writes and increments the version. A stale update receives 409. The UI retains the local draft and offers plain-text download and explicit reload/discard actions. It never automatically replaces a conflicting draft.

This avoids silent lost updates without introducing a WebSocket/CRDT system in the assignment scope. It does not merge edits. Even if two clients use the same mocked user, the document version prevents stale overwrites. An ambiguous network failure after a successful commit can surface as a conflict on retry; reopening safely recovers the saved version.

Permission changes do not push to open tabs. The next API call enforces the current permission; reopening updates the UI. Previously delivered content cannot be removed from an already open browser by access revocation.

## Import and validation

Only UTF-8 `.txt` is imported, with a 200,000-byte limit. Filenames become titles; lines become paragraphs; uploaded HTML remains text. There are no original file objects or arbitrary file paths stored on the server.

Mutating JSON requests are limited to 1 MB. Rich-text JSON is limited to 800 KB, 20 nesting levels, and 10,000 nodes. The server validates block/inline relationships, supported marks, heading levels, and list starts, and canonicalizes attributes. Titles must contain 1–120 characters after trimming. It never interprets arbitrary rich-text attributes as markup.

## Deployment judgment

The Node Docker stage builds static React assets. A non-root Python runtime contains FastAPI and the bundle; no Node server or database service is required in production. SQLite is embedded in the backend and persists through a named volume. Caddy is a separate container for automatic TLS.

One FastAPI worker and a single Lightsail instance match the SQLite and assignment scope. No paid API is required by the application. Docker images are version-tagged but not digest-pinned, and there is no generated npm lockfile yet. Those are reproducibility follow-ups after authorized installation and testing.

## Deliberate scope cuts

Real authentication, live co-editing, comment threads, version history, arbitrary file types, and background collaboration notifications were excluded. Plain-text export is the one small convenience enhancement. Viewer/editor permissions make the basic sharing story clearer without requiring another service.

With another 2–4 hours, first run the supplied tests/build and browser acceptance flow, fix demonstrated issues, deploy the demo, record the walkthrough, and assemble the Drive folder. After that, improve browser automation for autosave conflicts and keyboard flows, add local recovery of rich drafts, and lock dependencies. Real authentication comes before any use outside a clearly labeled demo.
