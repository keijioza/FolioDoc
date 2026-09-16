"""Exercise real HTTP endpoints and SQLite state, not mocked permission helpers."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from fastapi.testclient import TestClient

from backend.app import create_app
from backend.content import text_document


class DocumentWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.database = Path(self.temp.name) / "test.sqlite3"
        self.client = TestClient(create_app(self.database, Path(self.temp.name) / "no-static"))
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.temp.cleanup()

    def request(self, method, path, user="alex", **kwargs):
        return self.client.request(method, f"/api{path}", headers={"X-Demo-User": user}, **kwargs)

    def create(self):
        response = self.request("POST", "/documents", json={"title": "Planning", "content": text_document("First draft")})
        self.assertEqual(response.status_code, 201)
        return response.json()

    def test_sharing_permissions_revocation_and_stale_writes(self):
        doc = self.create()
        path = f"/documents/{doc['id']}"
        self.assertEqual(self.request("GET", path, "sam").status_code, 404)
        self.assertNotIn(doc["id"], [item["id"] for item in self.request("GET", "/documents", "sam").json()])
        shared = self.request("PUT", path + "/shares", json={"user_id": "sam", "role": "viewer"})
        self.assertEqual(shared.status_code, 200)
        self.assertEqual(self.request("GET", path, "sam").json()["role"], "viewer")
        payload = {"title": "Renamed", "content": text_document("Updated"), "version": doc["version"]}
        self.assertEqual(self.request("PUT", path, "sam", json=payload).status_code, 403)
        self.assertEqual(self.request("PUT", path + "/shares", "sam", json={"user_id": "jamie", "role": "editor"}).status_code, 403)
        self.request("PUT", path + "/shares", json={"user_id": "sam", "role": "editor"})
        saved = self.request("PUT", path, "sam", json=payload)
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["version"], 2)
        self.assertEqual(self.request("PUT", path, json=payload).status_code, 409)
        self.assertEqual(self.request("GET", path).json()["title"], "Renamed")
        self.request("PUT", path + "/shares", json={"user_id": "sam", "role": None})
        self.assertEqual(self.request("GET", path, "sam").status_code, 404)
        self.assertEqual(self.request("PUT", path, "sam", json={**payload, "version": 2}).status_code, 404)

    def test_formatting_and_sharing_survive_application_restart(self):
        content = {"type": "doc", "content": [
            {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Plan"}]},
            {"type": "paragraph", "content": [{"type": "text", "text": "Formatted", "marks": [{"type": "bold"}, {"type": "italic"}, {"type": "underline"}]}]},
            {"type": "orderedList", "attrs": {"start": 1}, "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "First"}]}]}]},
        ]}
        response = self.request("POST", "/documents", json={"title": "Rich text", "content": content})
        self.assertEqual(response.status_code, 201)
        path = f"/documents/{response.json()['id']}"
        self.request("PUT", path + "/shares", json={"user_id": "sam", "role": "editor"})
        with TestClient(create_app(self.database, Path(self.temp.name) / "no-static")) as restarted:
            reopened = restarted.get("/api" + path, headers={"X-Demo-User": "sam"})
            self.assertEqual(reopened.status_code, 200)
            self.assertEqual(reopened.json()["content"], content)
            self.assertEqual(reopened.json()["role"], "editor")

    def test_import_validates_type_size_encoding_and_preserves_plain_text(self):
        raw = "Hello <script>alert('text only')</script>\nA second line".encode()
        response = self.request("POST", "/import?filename=Notes.txt", content=raw)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["title"], "Notes")
        self.assertEqual(response.json()["content"], text_document(raw.decode()))
        for filename, content, status in [("bad.docx", b"hello", 422), ("bad.txt", b"\xff", 422), ("empty.txt", b" ", 422), ("huge.txt", b"a" * 200_001, 413), ("binary.txt", b"a\x00b", 422)]:
            with self.subTest(filename=filename):
                self.assertEqual(self.request("POST", f"/import?filename={filename}", content=content).status_code, status)

    def test_malformed_node_and_mark_types_return_validation_errors(self):
        for invalid_type in ([], {}, None, 42):
            malformed_documents = [
                {"type": "doc", "content": [{"type": invalid_type}]},
                {"type": "doc", "content": [{"type": "paragraph", "content": [
                    {"type": "text", "text": "Hello", "marks": [{"type": invalid_type}]}
                ]}]},
            ]
            for content in malformed_documents:
                with self.subTest(content=content):
                    response = self.request("POST", "/documents", json={"title": "Malformed", "content": content})
                    self.assertEqual(response.status_code, 422)

    def test_invalid_identity_and_unsafe_content_are_rejected(self):
        self.assertEqual(self.client.get("/api/documents").status_code, 401)
        self.assertEqual(self.request("GET", "/documents", "unknown").status_code, 401)
        response = self.request("POST", "/documents", json={"title": "Invalid", "content": {"type": "doc", "content": [{"type": "script", "text": "alert(1)"}]}})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.request("POST", "/documents", json={"title": "   ", "content": text_document("Text")}).status_code, 422)
        doc = self.create()
        response = self.request("PUT", f"/documents/{doc['id']}", json={"title": "Bad version", "content": text_document("Text"), "version": True})
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
