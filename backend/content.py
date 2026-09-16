"""Validate the small rich-text vocabulary that Folio can safely render."""

import json

MAX_FILE_BYTES = 200_000
MAX_CONTENT_BYTES = 800_000


def validate_content(value):
    if not isinstance(value, dict):
        raise ValueError("Document content must be a rich-text document.")
    if len(json.dumps(value, ensure_ascii=False).encode("utf-8")) > MAX_CONTENT_BYTES:
        raise ValueError("Document is too large (maximum 800 KB of rich text).")
    count = 0
    blocks = {"paragraph", "heading", "bulletList", "orderedList", "blockquote", "horizontalRule"}
    children = {
        "doc": blocks,
        "paragraph": {"text", "hardBreak"},
        "heading": {"text", "hardBreak"},
        "bulletList": {"listItem"},
        "orderedList": {"listItem"},
        "listItem": blocks,
        "blockquote": blocks,
    }

    def visit(node, depth=0):
        nonlocal count
        count += 1
        if depth > 20 or count > 10_000:
            raise ValueError("Document structure is too complex.")
        if not isinstance(node, dict) or not isinstance(node.get("type"), str):
            raise ValueError("Invalid content node.")
        kind = node["type"]
        result = {"type": kind}
        if kind == "text":
            if not isinstance(node.get("text"), str) or not node["text"]:
                raise ValueError("Text nodes cannot be empty.")
            result["text"] = node["text"]
        elif kind not in children and kind not in {"hardBreak", "horizontalRule"}:
            raise ValueError("Unsupported content type.")
        attrs = node.get("attrs", {})
        if not isinstance(attrs, dict):
            raise ValueError("Invalid text attributes.")
        if kind == "heading":
            level = attrs.get("level", 1)
            if type(level) is not int or level not in (1, 2, 3):
                raise ValueError("Use heading levels 1–3.")
            result["attrs"] = {"level": level}
        if kind == "orderedList":
            start = attrs.get("start", 1)
            if type(start) is not int or not 1 <= start <= 1_000_000:
                raise ValueError("Invalid list start.")
            result["attrs"] = {"start": start}
        marks = node.get("marks", [])
        if not isinstance(marks, list) or len(marks) > 3:
            raise ValueError("Invalid text formatting.")
        if marks:
            if kind not in {"text", "hardBreak"} or any(
                not isinstance(mark, dict) or not isinstance(mark.get("type"), str)
                or mark["type"] not in {"bold", "italic", "underline"}
                for mark in marks
            ):
                raise ValueError("Unsupported text formatting.")
            result["marks"] = [{"type": name} for name in dict.fromkeys(m["type"] for m in marks)]
        nested = node.get("content", [])
        if not isinstance(nested, list):
            raise ValueError("Invalid nested content.")
        if kind not in children and nested:
            raise ValueError("This content cannot have children.")
        if any(not isinstance(child, dict) or not isinstance(child.get("type"), str)
               or child["type"] not in children.get(kind, set()) for child in nested):
            raise ValueError("Invalid document structure.")
        if kind in {"doc", "bulletList", "orderedList", "listItem", "blockquote"} and not nested:
            raise ValueError("Document blocks cannot be empty.")
        if kind == "listItem" and nested[0].get("type") != "paragraph":
            raise ValueError("List items must begin with a paragraph.")
        if nested:
            result["content"] = [visit(child, depth + 1) for child in nested]
        return result

    if value.get("type") != "doc":
        raise ValueError("Content must have a document root.")
    return visit(value)


def text_document(text):
    return {"type": "doc", "content": [
        {"type": "paragraph", **({"content": [{"type": "text", "text": line}]} if line else {})}
        for line in text.splitlines()
    ] or [{"type": "paragraph"}]}


def plain_text(content):
    if content.get("type") == "text":
        return content["text"]
    if content.get("type") == "hardBreak":
        return " "
    separator = " " if content.get("type") in {"doc", "bulletList", "orderedList", "listItem", "blockquote"} else ""
    return separator.join(plain_text(child) for child in content.get("content", []))
