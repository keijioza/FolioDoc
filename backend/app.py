from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import sqlite3

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .content import MAX_FILE_BYTES, text_document
from .store import Store, StoreError, USERS


class DocumentInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    title: str = Field(min_length=1, max_length=120)
    content: dict


class UpdateInput(DocumentInput):
    version: int = Field(ge=1)


class ShareInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    user_id: str
    role: str | None


async def read_body(request, limit=1_000_000):
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > limit:
            raise StoreError(413, "File or document is too large.")
    return bytes(body)


async def read_json(request, model):
    try:
        return model.model_validate_json(await read_body(request))
    except ValidationError:
        raise StoreError(422, "Invalid request. Check the title, content, version, and sharing fields.")


def create_app(database_path=None, static_path=None):
    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(database_path or os.environ.get("DATABASE_PATH", "data/folio.sqlite3"))
        yield

    # The public app needs no interactive API docs; their CDN scripts would also
    # conflict with the production same-origin Content Security Policy.
    app = FastAPI(title="Folio", lifespan=lifespan, docs_url=None, redoc_url=None)

    @app.middleware("http")
    async def headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["X-Frame-Options"] = "DENY"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(StoreError)
    async def domain_error(request, exc):
        return JSONResponse({"detail": exc.message}, status_code=exc.status)

    @app.exception_handler(ValueError)
    async def invalid_content(request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=422)

    @app.exception_handler(sqlite3.Error)
    async def storage_error(request, exc):
        logging.exception("Database operation failed")
        return JSONResponse({"detail": "Storage is temporarily unavailable. Your draft has not been saved; please retry."}, status_code=503)

    def user_id(request):
        value = request.headers.get("X-Demo-User")
        request.app.state.store.user(value)
        return value

    @app.get("/api/health")
    def health(request: Request):
        with request.app.state.store.connection() as db:
            db.execute("SELECT 1").fetchone()
        return {"status": "ok"}

    @app.get("/api/users")
    def users():
        return USERS

    @app.get("/api/documents")
    def documents(request: Request):
        return request.app.state.store.list_documents(user_id(request))

    @app.post("/api/documents", status_code=201)
    async def create(request: Request):
        actor = user_id(request)
        data = await read_json(request, DocumentInput)
        return request.app.state.store.create(actor, data.title, data.content)

    @app.post("/api/import", status_code=201)
    async def import_file(request: Request, filename: str):
        actor = user_id(request)
        filename = filename.replace("\\", "/").rsplit("/", 1)[-1]
        if not filename.lower().endswith(".txt"):
            raise StoreError(422, "Import supports UTF-8 .txt files only (up to 200 KB).")
        raw = await read_body(request, MAX_FILE_BYTES)
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise StoreError(422, "This file is not UTF-8 text. Save it as UTF-8 and try again.")
        if not text.strip() or any(ord(char) < 32 and char not in "\n\r\t" for char in text):
            raise StoreError(422, "Choose a non-empty text file without binary control characters.")
        return request.app.state.store.create(actor, filename[:-4][:120].strip() or "Imported document", text_document(text))

    @app.get("/api/documents/{document_id}")
    def get(document_id: str, request: Request):
        return request.app.state.store.get(document_id, user_id(request))

    @app.put("/api/documents/{document_id}")
    async def update(document_id: str, request: Request):
        actor = user_id(request)
        data = await read_json(request, UpdateInput)
        return request.app.state.store.update(document_id, actor, data.title, data.content, data.version)

    @app.get("/api/documents/{document_id}/shares")
    def sharing(document_id: str, request: Request):
        return request.app.state.store.sharing(document_id, user_id(request))

    @app.put("/api/documents/{document_id}/shares")
    async def share(document_id: str, request: Request):
        actor = user_id(request)
        data = await read_json(request, ShareInput)
        return request.app.state.store.share(document_id, actor, data.user_id, data.role)

    # Unknown API routes must not fall through to the frontend.
    @app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    def missing_api(path: str):
        raise StoreError(404, "API endpoint not found.")

    assets = Path(static_path or Path(__file__).resolve().parent.parent / "dist")
    if assets.is_dir():
        app.mount("/", StaticFiles(directory=assets, html=True), name="frontend")
    return app


app = create_app()
