# Acceptance checks — not yet executed

Use this checklist after starting the app. No item below has been marked as passed during source-only implementation.

## Automated

Run `make test`. Confirm the HTTP/SQLite suite passes; keep the actual output with your review notes. `make up` builds the React production bundle as well as the API image.

## Main flow

- [ ] Open the app as Alex, create a document, rename it, and enter multiple paragraphs.
- [ ] Apply bold, italic, underline, all heading levels, ordered/unordered lists, and a quote. Undo and redo edits.
- [ ] Wait for **All changes saved**. Reopen and refresh; formatting and title should remain.
- [ ] Type while a save is in flight, then immediately return to the library or switch identities. All generations should be saved before navigation.
- [ ] Search title and the first 180 characters of body text; confirm owned/shared filters and empty states. Full-document search is outside the implemented scope.
- [ ] Throttle the network, choose New document, and continue typing in the old document while creation is pending. Confirm those edits save before the new document opens; if saving fails, the old draft must remain open.
- [ ] Export `.txt`; check text order and acknowledge that formatting is intentionally omitted.

## Import

- [ ] Import UTF-8 `.txt`, including emoji and multiple paragraphs. Check the filename-derived title.
- [ ] Import literal `<script>` text and confirm it appears as text, never executes.
- [ ] Try `.docx`, invalid UTF-8, empty text, and a file exceeding 200,000 bytes; confirm clear errors and no document creation.

## Sharing

- [ ] Share Alex's new document with Sam as editor; switch to Sam and verify the shared badge and saved edits.
- [ ] Change Sam to viewer; reopen as Sam and confirm editing/renaming are disabled.
- [ ] Confirm Sam cannot manage sharing of Alex's document.
- [ ] Remove Sam's access; refresh Sam's library and verify it disappears.
- [ ] Revoke access while Sam has an edited draft open. The save must fail and retain the draft, with working download/discard controls.

## Conflict and failure recovery

- [ ] Open the same document in two tabs before editing either. Save in tab A, then edit tab B. Tab B must reject its stale save and retain its own content.
- [ ] Download tab B's draft, choose **Load latest**, and explicitly confirm replacement. Tab A's saved content should appear.
- [ ] Simulate offline mode in browser developer tools. Change content; confirm a failed-save message without a false success state. Reconnect and retry.
- [ ] Attempt to close a tab with unsaved work; confirm the browser's unsaved-changes warning. A forced close is outside offline recovery scope.
- [ ] Blank the title; verify save fails clearly and resumes after entering a valid title.

## UX and deployment

- [ ] Check desktop and narrow mobile layouts, horizontal formatting-toolbar scroll, long titles, large content, and native dialog overflow.
- [ ] Use keyboard-only navigation, bold/italic/underline shortcuts, Ctrl/⌘ S, and Escape to close sharing. Check visible focus and screen reader labels/status announcements.
- [ ] Check layout and editing in a current Chrome, Safari, and Firefox; no browser compatibility results are asserted yet.
- [ ] Restart containers without deleting volumes; documents, roles, and formatting must remain.
- [ ] On Lightsail, verify HTTPS from outside the server, HTTP redirect, seeded flow, persistent data, and error logs.
- [ ] Run `make backup`; confirm the snapshot can be restored on a disposable instance before relying on the backup process.

Record actual outcomes, browser versions, and fixes before replacing this document's unverified status with a completion claim.
