# Folio

A small collaborative document workspace built with **React, Tiptap, FastAPI, and SQLite**. Create a page, give it a name, format your ideas, and share it with a teammate.

**Delivery status:** your supplied `make up` output confirms a successful Docker/frontend build and healthy local app container after the Tiptap dependency fix. Subsequent source fixes described below have not been rebuilt or tested. Automated-test results, browser acceptance, and public deployment remain unconfirmed. No live URL, recording, screenshots, or Drive upload is included yet. See [SUMMARY.md](SUMMARY.md) for the full handoff.

## Latest fixes and remaining checks

- Creation/import now flushes edits made during the network request before replacing the current editor. If saving fails, the draft remains open and the newly created document stays in the library.
- Malformed rich-text node/mark types now return validation errors; a regression test was added but not run.
- API requests time out after 15 seconds, including response-body reads, so stalled requests can enter recovery instead of waiting indefinitely. Timed-out writes may already have committed; version conflicts still protect saved content.
- Removed an unused sharing callback, an unused navigation option, and a redundant editor selection handler.
- Disabled unused interactive API documentation pages (`/docs`, `/redoc`) that conflicted with production CSP. `/openapi.json` remains available.
- Search matches document titles and the first 180 characters of body text; full-document search is not implemented.

Rebuild with `make up`, run `make test`, and follow [the acceptance checklist](docs/ACCEPTANCE.md), especially typing during slow document creation, imports, conflicts, and revoked access. These fixes are source changes, not a claim of passing runtime verification. A committed dependency lockfile, public deployment, video, and Drive folder remain outstanding.

## What is included

- Create, rename, save, reopen, and search accessible documents.
- Bold, italic, underline, three heading levels, bullet/numbered lists, quotes, undo/redo.
- Autosave after 800 ms of inactivity, visible save state, and Ctrl/⌘ S.
- UTF-8 **`.txt` import only**, up to **200,000 bytes**; each import becomes a new editable document. `.md`, `.docx`, images, and attachments are not supported.
- Owner-managed editor/viewer access and revocation, with separate owned/shared library views.
- Three seeded users with an explicit demo identity switcher.
- SQLite persistence for document structure and sharing; optimistic version checks prevent stale writes.
- Plain-text export, draft recovery controls, responsive layouts, labeled controls, native sharing dialog.
- Containerized FastAPI and production React assets; Caddy container for Lightsail HTTPS.

## Quick start: everything in containers

Prerequisites: Docker Engine/Desktop with Compose v2 supporting `up --wait`, and Make. No local Python, database, or Node installation is required for this path.

```sh
make up
```

Open **http://localhost:8000**. The first start builds the React bundle, installs backend dependencies into the image, creates the database, and inserts demo users/documents.

```sh
make logs       # Follow service logs
make status     # Inspect container state
make down       # Stop; preserve documents
make up         # Rebuild/restart; reuse persisted documents
make help       # List all commands
```

If port 8000 is occupied, copy `.env.example` to `.env` and change `PORT`. The app binds only to the host loopback interface in local mode.

## Demo accounts and sharing walkthrough

No passwords are required. Every account is available in the sidebar switcher.

| User | ID | Email | Seeded access |
| --- | --- | --- | --- |
| Alex Morgan | `alex` | `alex@folio.demo` | Owns **Welcome to Folio**; views **A place for team notes** |
| Jamie Chen | `jamie` | `jamie@folio.demo` | Owns **A place for team notes**; edits **Welcome to Folio** |
| Sam Rivera | `sam` | `sam@folio.demo` | Starts with an empty library |

1. Start as Alex. Create a document, rename it, add a heading/list and bold text.
2. Wait for **All changes saved**, then return to the library and reopen it.
3. Choose **Share**, set Sam to **Can edit**, and close the dialog.
4. Switch to Sam. Find the document under **Shared with me** and edit it.
5. Switch to Alex, reopen it, and see Sam's saved changes.
6. Change Sam to **Can view**; switch back to Sam and reopen to see disabled editing.
7. As Alex, set Sam to **No access**; it disappears from Sam's refreshed library.
8. Use **Import a file** with a UTF-8 `.txt` file. Imported markup remains literal text.

This is deliberately **mock authentication**, not secure account sign-in. The API trusts `X-Demo-User` to choose among fixed seeded users and then enforces document permissions for that identity. Anyone who can reach the demo can act as any seeded user. Use sample content only; public deployment does not make demo identities private.

## Frontend development

Keep FastAPI containerized:

```sh
make up
npm install
make dev-web
```

Open **http://localhost:5173**. Vite proxies `/api` to the container at `127.0.0.1:8000`. If you changed `PORT`, adjust `vite.config.js` to match. Frontend edits hot-reload; backend edits require another `make up` to rebuild the image.

Top-level npm dependency versions are specified. A lockfile has **not** been generated because installs were not authorized. Commit the generated `package-lock.json` after the first successful install and switch the Docker frontend install to `npm ci` for reproducible transitive resolution. Backend direct dependencies are pinned; transitive dependencies are not fully locked.

## Automated tests

The meaningful API suite uses a real temporary SQLite database and FastAPI's HTTP test client. It covers access isolation, sharing/role changes/revocation, stale saves, persistence across app instances, formatting round-trips, upload type/size/encoding validation, and invalid identities/content.

```sh
make test
```

This builds the image and runs tests inside a disposable backend container, with separate temporary databases. Test dependencies install only in that disposable container. It does not modify the application's persisted documents. **Tests are provided but have not been executed.**

Manual browser acceptance steps are in [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md).

## Deploy to AWS Lightsail later

Use a **Lightsail Linux virtual server** with Docker Compose, rather than Lightsail Container Service; this configuration relies on a persistent local SQLite volume. A 2 GB RAM instance is a practical starting point for building the frontend on the server; smaller instances may need more memory or a separately built image.

1. Create an Ubuntu Lightsail instance, attach a static IP, and point a domain's A record to that IP. Remove any stale AAAA record unless IPv6 is configured for this server.
2. Install Docker Engine, Docker Compose v2, and Make on the server using the platform's supported installation instructions. Use an account permitted to run Docker.
3. In the Lightsail firewall, allow TCP **80** and **443** from reviewers; optionally allow UDP **443** for HTTP/3. Keep SSH (**22**) restricted to your administrative IP. Do not expose **8000**.
4. Copy this source directory to the instance (for example with Git or SCP), excluding local dependencies, data, and `.env`.
5. In that directory, create configuration:

   ```sh
   cp .env.example .env
   ```

   Set `APP_DOMAIN` to your actual hostname, such as `docs.your-domain.com` (without `https://`), and `ACME_EMAIL` to your email address.

6. Run on the instance:

   ```sh
   make deploy
   make deploy-status
   make deploy-logs
   ```

7. Open `https://YOUR_DOMAIN`, verify the demo flow, and put the actual URL in [SUBMISSION.md](SUBMISSION.md).

Caddy obtains and renews TLS certificates, redirects HTTP to HTTPS, and forwards requests to the FastAPI container over the internal Docker network. FastAPI serves both the built React app and API from one origin. Certificate data and SQLite data use persistent named volumes. The app container runs as a non-root user. A database-aware health check gates proxy startup; `make deploy` does not prove public DNS or TLS works, so check the public URL afterward.

For subsequent deployments, update the source on the server and run `make deploy` again. This is a single-instance deployment with brief restart downtime, not rolling or zero-downtime infrastructure. `make deploy-down` stops production services while preserving volumes. AWS hosting/domain costs are paid by the deployer; reviewers need only a browser.

## Persistence and backups

SQLite lives at `/data/folio.sqlite3` in the named `folio_folio-data` volume. It uses foreign keys, transactions, WAL mode, and a five-second busy timeout. Do not delete Docker volumes if you want to keep documents. `make down` and `make deploy-down` never include `--volumes`.

```sh
make backup
```

This uses SQLite's online backup API and copies a consistent snapshot into `backups/folio-TIMESTAMP.sqlite3` on the host. It works with the same Compose project locally or on Lightsail. Copy backups off-instance separately; a Docker volume alone does not survive instance deletion. Restore by stopping the app, replacing the database in its volume with a backup while removing old `-wal`/`-shm` files, preserving UID 10001 ownership, and restarting. Restoration has not been rehearsed.

## Intentional limits

- Shared asynchronous editing, not simultaneous live collaboration or cursor presence. Reopen to fetch another editor's changes. A stale save returns HTTP 409 instead of overwriting them.
- Draft recovery downloads plain text, so exported formatting is not preserved. Saved rich text stays structured in SQLite. There is no persistent offline draft queue; a forced tab close can lose unsaved work despite the leave warning.
- Import of very line-heavy `.txt` files may hit the 10,000-node rich-text complexity limit before 200 KB; the app displays the resulting validation error.
- No real authentication, email invitations, comments, deletion, version history, attachments, document links, or full-text database indexing.
- No horizontal replicas, migration framework, quotas/rate limits, monitoring, or scheduled off-instance backups yet. Do not use this public demo to store sensitive information.
- No verified live deployment or walkthrough recording is included yet.

More detail: [Architecture](docs/ARCHITECTURE.md), [AI workflow](docs/AI_WORKFLOW.md), [Walkthrough script](docs/WALKTHROUGH.md), [Submission inventory](SUBMISSION.md).
