#!/usr/bin/env python3
import base64
import hashlib
import json
import os
import tempfile
from urllib.parse import parse_qs, unquote, urlparse

from cheroot import wsgi
from wsgidav.wsgidav_app import WsgiDAVApp


def safe_rel(raw):
    rel = unquote(raw or "")
    rel = rel.replace("\\", "/").lstrip("/")
    parts = []
    for part in rel.split("/"):
        if part in ("", "."):
            continue
        if part == ".." or os.path.isabs(part):
            raise ValueError("invalid path")
        parts.append(part)
    return "/".join(parts)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


class Hub:
    def __init__(self, root, user, password):
        self.root = os.path.abspath(root)
        self.user = user
        self.password = password
        os.makedirs(self.root, exist_ok=True)

        config = {
            "provider_mapping": {"/": self.root},
            "http_authenticator": {
                "domain_controller": None,
                "accept_basic": True,
                "default_to_digest": False,
            },
            "simple_dc": {
                "user_mapping": {
                    "*": {
                        user: {"password": password},
                    }
                }
            },
            "property_manager": True,
            "lock_storage": True,
            "verbose": 1,
        }
        self.dav = WsgiDAVApp(config)

    def full_path(self, rel):
        path = os.path.abspath(os.path.join(self.root, rel))
        if path != self.root and not path.startswith(self.root + os.sep):
            raise ValueError("invalid path")
        return path

    def authorized(self, environ):
        expected = base64.b64encode(f"{self.user}:{self.password}".encode()).decode()
        return environ.get("HTTP_AUTHORIZATION") == f"Basic {expected}"

    def deny(self, start_response):
        start_response(
            "401 Unauthorized",
            [("WWW-Authenticate", 'Basic realm="sync-tool"'), ("Content-Type", "text/plain")],
        )
        return [b"unauthorized"]

    def json(self, data, start_response, status="200 OK"):
        body = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
        start_response(status, [("Content-Type", "application/json"), ("Content-Length", str(len(body)))])
        return [body]

    def scan(self):
        items = {}
        for base, _, files in os.walk(self.root):
            for name in files:
                full = os.path.join(base, name)
                rel = os.path.relpath(full, self.root).replace(os.sep, "/")
                st = os.stat(full)
                items[rel] = {
                    "hash": sha256(full),
                    "mtime": st.st_mtime,
                    "size": st.st_size,
                }
        return items

    def __call__(self, environ, start_response):
        if not self.authorized(environ):
            return self.deny(start_response)

        path = environ.get("PATH_INFO", "")
        if not path.startswith("/__api__"):
            return self.dav(environ, start_response)

        try:
            if path == "/__api__/files" and environ["REQUEST_METHOD"] == "GET":
                return self.json(self.scan(), start_response)

            if path == "/__api__/file":
                query = parse_qs(environ.get("QUERY_STRING", ""))
                rel = safe_rel(query.get("path", [""])[0])
                full = self.full_path(rel)

                if environ["REQUEST_METHOD"] == "GET":
                    if not os.path.isfile(full):
                        return self.json({"error": "missing"}, start_response, "404 Not Found")
                    st = os.stat(full)
                    headers = [
                        ("Content-Type", "application/octet-stream"),
                        ("Content-Length", str(st.st_size)),
                    ]
                    start_response("200 OK", headers)

                    def stream():
                        with open(full, "rb") as f:
                            while True:
                                chunk = f.read(1024 * 1024)
                                if not chunk:
                                    break
                                yield chunk

                    return stream()

                if environ["REQUEST_METHOD"] == "PUT":
                    os.makedirs(os.path.dirname(full), exist_ok=True)
                    fd, tmp = tempfile.mkstemp(prefix=".tmp-", dir=os.path.dirname(full) or self.root)
                    with os.fdopen(fd, "wb") as out:
                        while True:
                            chunk = environ["wsgi.input"].read(1024 * 1024)
                            if not chunk:
                                break
                            out.write(chunk)
                    os.replace(tmp, full)
                    return self.json({"ok": True}, start_response)

                if environ["REQUEST_METHOD"] == "DELETE":
                    if os.path.isfile(full):
                        os.remove(full)
                    return self.json({"ok": True}, start_response)

            return self.json({"error": "not found"}, start_response, "404 Not Found")
        except ValueError:
            return self.json({"error": "bad path"}, start_response, "400 Bad Request")
        except BrokenPipeError:
            return []


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--root", default="./vault")
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8080)
    p.add_argument("--user", default="sync")
    p.add_argument("--password", default="changeme")
    a = p.parse_args()

    hub = Hub(a.root, a.user, a.password)
    server = wsgi.Server((a.host, a.port), hub)
    try:
        server.start()
    except KeyboardInterrupt:
        server.stop()
