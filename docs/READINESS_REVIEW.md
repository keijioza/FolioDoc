# Assignment and deployment readiness review

## Verdict

**Follow-up source fixes:** findings 1–3 below have now been patched: a final draft flush before creation/import replaces the editor, explicit node/mark type validation, and a 15-second request timeout. A malformed-input regression test was added. The redundant code in finding 6 was removed, search scope was clarified, and interactive API docs were disabled. These changes have not been rebuilt or tested. The original findings below are retained as the review record; dependency locking and submission/deployment work remain outstanding.

Core required features are implemented in source. The user's supplied Docker output confirms the patched production frontend build completed and the local app container became healthy. This is ready for continued local acceptance testing, not an assertion that all user flows work or that the assignment is complete. Address the save/navigation issue below before reviewer-facing deployment.

This review used the assignment, source, configuration, documentation, and the user's build output. No tests, browser sessions, external link checks, containers, or cloud services were run/accessed during this review. Findings are source-derived, not runtime reproductions.

## Requirements matrix

| Requirement | Evidence / status |
| --- | --- |
| Create, rename, edit, save, reopen | Implemented in React editor/library and FastAPI document routes; browser verification pending |
| Bold, italic, underline, headings, lists | Tiptap extensions and toolbar implemented; persisted as validated JSON |
| Relevant file upload | `.txt` import to a new editable document; restrictions stated in UI and README |
| Owner, grant access, owned/shared distinction | Backend permission checks, sharing dialog, filters and badges implemented |
| Persist documents, structure, shares | SQLite with a persistent Docker volume; restart behavior has automated-test source but no supplied passing result |
| Setup and run instructions | README and Make targets included; `make up` succeeded per user output |
| Working reviewer-accessible deployment | Missing: no verified public deployment or actual URL |
| Validation and error handling | Implemented, with malformed-content gaps described below |
| Meaningful automated test | Four HTTP/SQLite test methods included; execution result not provided |
| Architecture note and prioritization | Included in `docs/ARCHITECTURE.md` |
| AI workflow note | Included; must record actual human/browser/test verification before submission |
| 3–5 minute walkthrough | Missing recording; only a script and placeholder file exist |
| Google Drive folder with materials | Missing folder/upload/link |
| SUBMISSION.md and review accounts | Included; actual submission links remain PENDING |
| Screenshots or GIF | Absent; conditional requirement if setup needs extra explanation |
| Partial features and next 2–4 hours | Documented |
| No paid dependency for reviewers | No paid application API required; hosting is the deployer's responsibility |

Real-time collaboration, DOCX import, comments, and version history are not required. Mock authentication and `.txt` import are explicitly allowed by the assignment. Viewer/editor roles already cover one optional enhancement.

## Findings, ordered by importance

### 1. Unsaved edits can be lost during asynchronous navigation — fix before reviewer deployment

`src/App.jsx` calls the editor's save guard before `create()` starts its POST request. The current editor stays editable while that request runs. If the user types after the guard finishes but before the response arrives, `setActive(document)` replaces the editor. Its cleanup cancels the autosave timer, so these later edits can be discarded. The disabled sidebar buttons do not freeze the editor.

The same general gap exists wherever a successful guard precedes a delayed operation that replaces the document. Freeze editing for the whole transition or perform a final flush before replacement, with a deliberate policy for failure. Exercise this with a throttled network and typing during New document.

### 2. Malformed rich-text node/mark types can cause HTTP 500 — validation gap

`backend/content.py` uses caller-provided child `type` and mark `type` values in set membership before checking they are strings. A child such as `{"type": []}` or a mark with an object-valued type can raise Python `TypeError` instead of the intended `ValueError`/422. Normal Tiptap output is unaffected, but arbitrary API input should fail predictably. Validate scalar types before membership tests and add focused malformed-input cases.

### 3. A hanging request can leave saving/navigation blocked

`src/api.js` has no application timeout. Save and share calls do not receive an abort signal. A stalled connection can leave the UI saving or busy until the network stack gives up, with navigation waiting for the same request. Add a bounded timeout and preserve draft recovery; a timed-out write may still have committed, so retain version-conflict handling.

### 4. Dependency installs are not fully reproducible

The Tiptap mismatch was corrected, and the user subsequently built successfully. However, no source lockfile is supplied and Docker uses `npm install`; other transitive dependencies can still change between builds. Generate/commit a lockfile through an authorized install and use `npm ci`. Python transitive dependencies and container image digests are also not fully locked.

### 5. Search covers a preview, not the full document

`backend/store.py` truncates previews to 180 characters; `src/App.jsx` searches title plus preview. Text farther into a reopened document is not searchable. This is not a required assignment feature, but README/manual-check wording implies broader body search. Clarify the scope or implement full-content search.

### 6. Small redundant code exists

- `ShareDialog` calls `onChange()`, but its only caller passes `() => {}`. This is a no-op callback, not a broken sharing operation; the dialog updates its own sharing state.
- `App.action(callback, flush = true)` has a bypass parameter, but no caller uses `false`. Remove the unused option unless a concrete use is needed.
- Selection changes can trigger both `onSelectionUpdate` and `onTransaction` state bumps. This is redundant rendering work, not an unreachable feature.

No missing first-party module or unmatched UI-to-API endpoint was identified in this source review. That does not establish the absence of every dead code path or CSS rule; no static-analysis tools were run.

## Links and paths

- Reviewed Markdown links point to files present in this source package.
- Live app, Drive folder, and video links are placeholders, not completed deliverables. `walkthrough-url.txt` is not a video URL.
- `docs.example.com`, `docs.your-domain.com`, and `YOUR_DOMAIN` are configuration examples. Replace them for actual deployment.
- Frontend requests map to the implemented `/api/users`, `/api/documents`, `/api/import`, and document/share routes. Docker's `/app/dist` path matches the backend's static mount.
- There are no document-specific browser routes or shareable document URLs. Refresh returns to the library as Alex because identity and active-document state are not persisted. Reopen through the library; deep linking is not an assignment requirement.
- `npm run preview` does not configure an API proxy. It is a static bundle preview, not a supported standalone full-stack run path; use `make up` or `make dev-web` as documented.
- FastAPI exposes default `/docs` and `/redoc` pages, but the production Caddy CSP disallows their default external scripts and inline bootstrapping. Those developer pages are expected to fail under this CSP. Disable them in production or deliberately configure self-hosted assets if they should be supported. The React product UI does not depend on them.
- No external URL was contacted, so public reachability/TLS is unverified.

## Before deployment testing and final submission

1. Fix the navigation/save race and malformed-input handling; address request timeouts.
2. Run `make test` and the browser acceptance checklist, particularly saves under slow/offline networking, two-tab conflicts, and revoked permissions.
3. Capture a dependency lockfile and rebuild after source changes.
4. Deploy to the configured Lightsail instance with `make deploy`; verify public HTTPS, persistence across restart, and sharing with sample data.
5. Record the walkthrough and assemble the Drive folder. Fill in all real links and update the inventory/AI note with actual verification results.

Mock identities are suitable for this explicitly labeled assignment demo. They are not authentication for a production service storing private user documents.
