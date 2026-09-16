# Walkthrough recording script

**Status: script only; no video has been recorded.** Target length: 3–5 minutes. Record the deployed app after testing, then put the real unlisted Loom/YouTube URL in `walkthrough-url.txt` and `SUBMISSION.md`.

## 0:00–0:35 — Product and scope

“Folio is a lightweight shared document workspace built with React, Tiptap, FastAPI, and SQLite. I focused on the complete create, edit, save, and share loop. The users are intentionally simulated, so reviewers can demonstrate sharing without account setup.”

Show the document library, owned/shared filters, and demo account switcher. Mention that these demo identities are open to everyone.

## 0:35–1:30 — Create, format, persist

Create “Launch plan,” rename it, enter a heading, a paragraph, and a short list. Show bold, italic, and underline. Wait for the saved indicator, return to the library, reopen, and refresh. Demonstrate that structure and title persist.

## 1:30–2:05 — File workflow

Import a small UTF-8 `.txt` file as a new document. Explain the visible 200 KB/type restrictions and how the content becomes editable. Briefly show plain-text export and note that it intentionally omits formatting.

## 2:05–2:55 — Sharing and roles

As Alex, grant Sam edit access to “Launch plan.” Switch to Sam and use Shared with me. Edit and save. Switch back to Alex, reopen, and show the change. Change Sam to viewer and explain that the API enforces those permissions, not just the disabled UI.

## 2:55–3:35 — Implementation and tradeoffs

“SQLite stores structured editor JSON and sharing rows on a persistent Docker volume. Saves send a version; stale writes are rejected rather than overwriting someone else's work. This is asynchronous shared editing, so changes from another tab appear when reopening; there is no real-time cursor or automatic merging.”

Show a two-tab conflict if rehearsed and time permits. Explain local draft download/reload recovery. Mention Docker, `make deploy`, and Caddy HTTPS on one Lightsail VM. Only state a deployed URL once it exists.

## 3:35–4:20 — AI usage and next work

Disclose that Codex authored the initial implementation and documents, and explain the scope decisions in `AI_WORKFLOW.md`. Describe what you personally reviewed or changed and which tests/browser checks actually passed; do not claim verification that has not happened.

“The deliberate cuts were real authentication, real-time co-editing, DOCX conversion, comments, and history. Next I would harden recovery and automate the browser flows before expanding features.”

Finish on the library. Keep the final video under five minutes.
