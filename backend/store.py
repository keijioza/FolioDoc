"""SQLite persistence and document permissions, independent of HTTP."""

from contextlib import contextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
from uuid import uuid4

from .content import plain_text, text_document, validate_content

USERS = [
    {"id": "alex", "name": "Alex Morgan", "email": "alex@folio.demo", "initials": "AM"},
    {"id": "jamie", "name": "Jamie Chen", "email": "jamie@folio.demo", "initials": "JC"},
    {"id": "sam", "name": "Sam Rivera", "email": "sam@folio.demo", "initials": "SR"},
]


class StoreError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def clean_title(title):
    if not isinstance(title, str) or not title.strip() or len(title.strip()) > 120:
        raise StoreError(422, "Use a title between 1 and 120 characters.")
    return title.strip()


class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, initials TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
                    content TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS shares (
                    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL CHECK(role IN ('viewer', 'editor')),
                    PRIMARY KEY(document_id, user_id)
                );
                CREATE INDEX IF NOT EXISTS shares_by_user ON shares(user_id);
                CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY);
            """)
            db.execute("BEGIN IMMEDIATE")
            db.executemany("INSERT OR IGNORE INTO users VALUES (:id, :name, :email, :initials)", USERS)
            if not db.execute("SELECT 1 FROM metadata WHERE key = 'seeded'").fetchone():
                content = {"type": "doc", "content": [
                    {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Good ideas start here."}]},
                    {"type": "paragraph", "content": [{"type": "text", "text": "A little space for your team's next big thing. Write, shape your ideas, and invite someone to make them better."}]},
                    {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Make yourself at home"}]},
                    {"type": "bulletList", "content": [
                        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}
                        for text in ["Give this document a name of your own.", "Try a heading, a list, or a little bold emphasis.", "Share with Jamie, then switch demo users to see it together."]
                    ]},
                    {"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "italic"}], "text": "Your changes save automatically. You bring the ideas; we'll keep the page."}]},
                ]}
                now = timestamp()
                db.execute("INSERT INTO documents VALUES (?, ?, ?, ?, 1, ?, ?)",
                           ("welcome", "alex", "Welcome to Folio", json.dumps(content), now, now))
                db.execute("INSERT INTO shares VALUES ('welcome', 'jamie', 'editor')")
                db.execute("INSERT INTO documents VALUES (?, ?, ?, ?, 1, ?, ?)",
                           ("team-notes", "jamie", "A place for team notes", json.dumps(text_document("Team notes\nUse this page for decisions, open questions, and what comes next.\nAlex has view access. Jamie owns this document and can change access from Share.")), now, now))
                db.execute("INSERT INTO shares VALUES ('team-notes', 'alex', 'viewer')")
                db.execute("INSERT INTO metadata VALUES ('seeded')")

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=5)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def user(self, user_id):
        user = next((user for user in USERS if user["id"] == user_id), None)
        if user is None:
            raise StoreError(401, "Choose a demo user to continue.")
        return user

    def accessible(self, db, document_id, user_id, write=False, owner=False):
        self.user(user_id)
        row = db.execute("""
            SELECT d.*, u.name AS owner_name,
                CASE WHEN d.owner_id = ? THEN 'owner' ELSE s.role END AS role
            FROM documents d JOIN users u ON u.id = d.owner_id
            LEFT JOIN shares s ON s.document_id = d.id AND s.user_id = ?
            WHERE d.id = ? AND (d.owner_id = ? OR s.user_id IS NOT NULL)
        """, (user_id, user_id, document_id, user_id)).fetchone()
        if row is None:
            raise StoreError(404, "Document not found or access has been removed.")
        if owner and row["role"] != "owner":
            raise StoreError(403, "Only the owner can manage sharing.")
        if write and row["role"] not in {"owner", "editor"}:
            raise StoreError(403, "You have view-only access to this document.")
        return row

    def serialize(self, row, full=True):
        result = dict(row)
        content = json.loads(result.pop("content"))
        result["preview"] = plain_text(content)[:180]
        if full:
            result["content"] = content
        return result

    def list_documents(self, user_id):
        self.user(user_id)
        with self.connection() as db:
            rows = db.execute("""
                SELECT d.*, u.name AS owner_name,
                    CASE WHEN d.owner_id = ? THEN 'owner' ELSE s.role END AS role
                FROM documents d JOIN users u ON u.id = d.owner_id
                LEFT JOIN shares s ON s.document_id = d.id AND s.user_id = ?
                WHERE d.owner_id = ? OR s.user_id IS NOT NULL ORDER BY d.updated_at DESC, d.id
            """, (user_id, user_id, user_id)).fetchall()
            return [self.serialize(row, full=False) for row in rows]

    def get(self, document_id, user_id):
        with self.connection() as db:
            return self.serialize(self.accessible(db, document_id, user_id))

    def create(self, user_id, title, content):
        self.user(user_id)
        title = clean_title(title)
        content = validate_content(content)
        document_id, now = uuid4().hex, timestamp()
        with self.connection() as db:
            db.execute("INSERT INTO documents VALUES (?, ?, ?, ?, 1, ?, ?)",
                       (document_id, user_id, title, json.dumps(content), now, now))
        return self.get(document_id, user_id)

    def update(self, document_id, user_id, title, content, version):
        title = clean_title(title)
        content = validate_content(content)
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            row = self.accessible(db, document_id, user_id, write=True)
            if row["version"] != version:
                raise StoreError(409, "A newer version was saved by another editor. Download your draft, then load the latest version.")
            db.execute("UPDATE documents SET title = ?, content = ?, version = version + 1, updated_at = ? WHERE id = ?",
                       (title, json.dumps(content), timestamp(), document_id))
            return self.serialize(self.accessible(db, document_id, user_id))

    def sharing(self, document_id, user_id):
        with self.connection() as db:
            row = self.accessible(db, document_id, user_id, owner=True)
            shares = [dict(item) for item in db.execute("""
                SELECT u.id, u.name, u.email, s.role FROM shares s
                JOIN users u ON u.id = s.user_id WHERE s.document_id = ? ORDER BY u.name
            """, (document_id,))]
            return {"owner": self.user(row["owner_id"]), "shares": shares}

    def share(self, document_id, user_id, target_id, role):
        self.user(target_id)
        if role not in {"viewer", "editor", None}:
            raise StoreError(422, "Choose viewer or editor access.")
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            row = self.accessible(db, document_id, user_id, owner=True)
            if target_id == row["owner_id"]:
                raise StoreError(422, "The owner already has full access.")
            if role is None:
                db.execute("DELETE FROM shares WHERE document_id = ? AND user_id = ?", (document_id, target_id))
            else:
                db.execute("INSERT INTO shares VALUES (?, ?, ?) ON CONFLICT(document_id, user_id) DO UPDATE SET role = excluded.role",
                           (document_id, target_id, role))
        return self.sharing(document_id, user_id)
