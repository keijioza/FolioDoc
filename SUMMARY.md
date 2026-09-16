# Folio — complete work summary

## Outcome

**Latest fixes:** patched the creation/import navigation race with a second draft flush; malformed node/mark types now produce validation errors; requests have a 15-second timeout. Added regression-test source, removed redundant callbacks/options, disabled CSP-incompatible interactive API docs, and updated README/search scope. These newer changes have not been rebuilt or tested. Dependency locking and the live deployment/video/Drive submission are still pending.

**Latest review:** the user subsequently supplied a successful `make up` log: the frontend/image build completed and `folio-app-1` became healthy. Automated-test results, browser acceptance, and public deployment remain unconfirmed. See [the readiness review](docs/READINESS_REVIEW.md) for the requirements matrix, source findings, missing submission materials, and link/path assessment. Earlier unverified statements below describe the initial handoff.

Authored a standalone collaborative document app in this initially empty workspace using **React + FastAPI**, with SQLite persistence and **containerized backend services**. Included Make commands for local operation and later deployment to an **AWS Lightsail Linux instance**.

The source implements the core assignment flows. **It is not yet a verified, deployed submission.** No installs, tests, builds, servers, browser checks, cloud operations, recording, or Drive upload were performed under the repository's source-only instructions.

## Product behavior implemented

- Create and rename documents; reopen them from a searchable library.
- Tiptap rich-text editing: bold, italic, underline, headings, bullets, numbering, quotes, undo/redo.
- Debounced autosave and a manual save shortcut, with visible saved/error/conflict states.
- Structured JSON content in SQLite, preserving supported formatting and structure.
- Import UTF-8 `.txt` files up to 200,000 bytes into new editable documents.
- Three seeded demo users, with owned/shared filters and access badges.
- Owner-only sharing management, editor/viewer permissions, and access removal enforced by the API.
- Optimistic versions and atomic SQLite transactions to reject stale saves.
- Plain-text export and explicit draft recovery/discard controls.
- Responsive library/editor, search/empty states, labeled controls, keyboard shortcuts, and a native sharing dialog.

## Infrastructure and commands

| Command | Purpose |
| --- | --- |
| `make up` | Build/start the complete app locally at `http://localhost:8000` |
| `make down` | Stop local containers while retaining data |
| `make logs` / `make status` | Inspect local services |
| `make build` | Build the multi-stage React/FastAPI image |
| `make dev-web` | Run React hot reload against the containerized API; requires `npm install` first |
| `make test` | Execute API/SQLite tests in a disposable backend container |
| `make deploy` | Build/start on a configured Lightsail VM with Caddy HTTPS |
| `make deploy-down` | Stop production services while retaining data and certificates |
| `make deploy-logs` / `make deploy-status` | Inspect production services |
| `make backup` | Create a consistent SQLite snapshot and copy it to the host |
| `make help` | List targets |

The app runs as a non-root container user. Production uses a Caddy container for TLS, internal service networking, and named volumes for database/certificates. SQLite is embedded in FastAPI, so no separate host database is needed. Lightsail account, VM, domain/DNS, Docker installation, and deployment remain future setup work.

## Engineering deliverables

- [README.md](README.md): setup, accounts, review flow, Make usage, deployment, backup, limitations.
- [Architecture](docs/ARCHITECTURE.md): component boundaries, persistence, permissions, save/conflict decisions, scope cuts.
- [AI workflow](docs/AI_WORKFLOW.md): tools used, changes in direction, AI authorship, verification disclosure.
- [Automated tests](tests/test_api.py): real HTTP/SQLite coverage for access, revocation, stale writes, restart persistence, formatting, imports, identity/content validation.
- [Acceptance guide](docs/ACCEPTANCE.md): browser and deployment checks for the reviewer/engineer to perform.
- [Walkthrough script](docs/WALKTHROUGH.md): a 3–5 minute recording plan.
- [Submission inventory](SUBMISSION.md): included files, pending assets, and final packaging steps.

## Known limitations

### Build issue reported after the initial handoff

The user's first `make up` reached the React build but failed because a newer transitive Tiptap horizontal-rule extension imported `canInsertNode`, which the pinned `@tiptap/core` 2.11.5 does not export. `package.json` now overrides the StarterKit and React transitive Tiptap extensions to 2.11.5 and forces nested core/ProseMirror wrappers to use the direct dependency versions. This addresses the version mismatch across the editor packages. The patched build has not been rerun; retry `make up`. The changed package manifest invalidates Docker's dependency-install cache automatically.

### Remaining limits

- Demo identities are caller-selected and publicly switchable; this is not real authentication.
- Collaboration is asynchronous. No real-time merge, cursor presence, comments, or document history.
- Formatting is preserved in saved documents, but plain-text export/recovery omits it.
- Unsaved drafts exist in browser memory only. A forced close can lose them; no offline recovery queue exists.
- Access changes take effect at the next API call; open tabs do not receive push notifications.
- Imports support `.txt` only. Rich-text complexity limits can reject very line-heavy files below the byte limit.
- Single-instance SQLite deployment; no autoscaling, migration framework, rate limits, or scheduled off-instance backups.
- No npm lockfile was fabricated without an install. Dependency resolution and image compatibility are unverified.

## What remains before submission

1. **Validate:** run tests/build, exercise desktop/mobile/browser flows, and resolve any findings.
2. **Deploy:** configure Lightsail and a domain, run `make deploy` on the instance, and verify the public application.
3. **Record:** follow the walkthrough script and add the actual video URL to `walkthrough-url.txt`.
4. **Package:** place source and required materials in a reviewer-accessible Google Drive folder; fill actual URLs into `SUBMISSION.md`.
5. **Update claims:** record actual results in the AI note and summary before presenting the work as verified.

No live URL, Drive URL, video URL, screenshots, successful test results, or completed deployment is claimed in this handoff.
