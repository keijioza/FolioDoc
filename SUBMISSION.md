# Folio — submission inventory

## Status

**Source package prepared; final assignment submission is incomplete.** User-provided output confirms a successful local Docker build and healthy container after the Tiptap fix. Subsequent review fixes have not been rebuilt/tested. Test results and browser checks remain unconfirmed; the public deployment, recorded walkthrough, and Google Drive folder are pending.

| Required item | Included material | Status |
| --- | --- | --- |
| Source code | `src/`, `backend/`, `index.html`, `package.json`, `vite.config.js`, `requirements.txt` | Authored, unverified |
| Setup/run instructions | `README.md` | Included |
| Architecture note | `docs/ARCHITECTURE.md` | Included |
| AI workflow disclosure | `docs/AI_WORKFLOW.md` | Included; verification honestly pending |
| Automated test | `tests/test_api.py`, `requirements-dev.txt`, `make test` | Included, not run |
| Submission inventory | This file | Included |
| Summary | `SUMMARY.md` | Included |
| Deployment configuration | `Dockerfile`, `.dockerignore`, `compose.yaml`, `compose.lightsail.yaml`, `deploy/Caddyfile`, `.env.example`, `Makefile` | Included, not deployed |
| Acceptance guide | `docs/ACCEPTANCE.md` | Included, not executed |
| Walkthrough | `docs/WALKTHROUGH.md`, `walkthrough-url.txt` | Script and explicit placeholder only |
| Screenshots / GIF | None | Not captured |
| Google Drive folder | None | Not created or uploaded |

Additional source hygiene: `.gitignore`, `backend/__init__.py`. No installed dependencies, real environment secrets, generated lockfile, database, recorded media, or built frontend artifacts are included.

## Reviewer links — replace before submitting

- **Google Drive folder:** PENDING
- **Live product:** PENDING
- **Walkthrough video:** PENDING — see `walkthrough-url.txt`

These labels are status markers, not working links. Do not submit this as a completed deployment.

## Review accounts

No credentials are needed. Select **Alex Morgan**, **Jamie Chen**, or **Sam Rivera** in the demo user switcher. Alex and Jamie start with a shared editing example and a view-only example. Sam starts empty, making it easy to demonstrate newly granted access.

For local review, install Docker with Compose v2 and Make, then run `make up` and open `http://localhost:8000`. Follow the sharing walkthrough in `README.md`.

## Remaining submission work

1. Run `make test`, build/start with `make up`, and perform the browser acceptance guide; fix issues found.
2. Generate and commit the dependency lockfile after successful installation; update the Docker install to `npm ci`.
3. Configure the Lightsail instance/domain, run `make deploy` there, and verify the public URL and persistence.
4. Record the 3–5 minute walkthrough; replace `walkthrough-url.txt` with the real link. Capture screenshots if helpful.
5. Copy the source, notes, and media/links into a Google Drive folder, excluding `.env`, dependency folders, databases, backups, and other local artifacts. Ensure reviewers can access the folder.
6. Replace all pending links above and update the summary with actual validation/deployment outcomes.

With another 2–4 hours, prioritize those delivery and reliability steps before new product features.
