# AI workflow disclosure

## Tools actually used

- OpenAI Codex authored the React/FastAPI source, CSS, Docker/Make configuration, automated-test source, and documentation.
- Local file reads and patch tools were used to read the assignment and workspace instructions and write source files.
- The installed graphify skill was consulted for repository navigation. This directory was empty and had no existing graph, so no graph query or graph rebuild was performed.
- No external AI image generation, browser automation, cloud service, or delegated coding agent was used.

## Where AI sped up the work

AI accelerated the initial full-stack scaffold, connected UI/HTTP/storage behavior, CSS layout, permission and conflict-test authoring, and the deployment/submission documentation. These are useful drafting gains; they are not evidence that the delivered code passes runtime checks.

## Judgment and changes

- The user specified React and FastAPI and requested containerized backend services plus Make commands for later Lightsail deployment. Those instructions shaped the final stack and deployment layout.
- The initial frontend direction was plain browser JavaScript; it was changed to React before delivery.
- Real-time collaboration was excluded in favor of explicit sharing and optimistic conflict detection.
- `.txt` import was selected instead of speculative DOCX/Markdown conversion to keep format handling explicit and safe.
- Error handling was expanded to allow a user to download or discard a blocked draft, including when access has been revoked.
- No generated deployment URL, successful test output, screenshot, or video link was invented.

This implementation was AI-authored during this session. It has not yet been independently reviewed by the submitting engineer; do not present it as independently verified human work.

## Verification performed and outstanding

**Subsequent user evidence:** the user supplied a successful `make up` log after the Tiptap version alignment: the frontend/image built and the local container became healthy. Later source-review fixes (navigation flushing, malformed input handling, request timeouts, and cleanup) have not been rebuilt or tested. The statements below about no execution refer to the agent's own actions and the initial handoff; no passing automated-test or browser results have been supplied.

The repository's instructions explicitly prohibited running installs, tests, builds, servers, or other verification without a separate request. Consequently, **no automated or runtime verification was performed**. Source authoring included validation rules and recovery logic, but that does not establish correctness or UX quality in a running browser.

The included API tests are intended to exercise actual HTTP requests and SQLite transactions. `docs/ACCEPTANCE.md` specifies browser checks for editing, saving, sharing, import, conflicts, responsiveness, and keyboard use. Docker build, dependency resolution, test outcomes, production TLS, and actual browser behavior remain unverified.

Before submission, the engineer should run `make test` and `make up`, execute the acceptance steps, record actual findings/fixes here, deploy with `make deploy` on the configured instance, and review every claim in the final materials.
