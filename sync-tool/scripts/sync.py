#!/usr/bin/env python3
import argparse
import base64
import hashlib
import json
import os
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer


STATE_DIR_NAME = ".sync-tool"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ignored(rel):
    return rel == STATE_DIR_NAME or rel.startswith(STATE_DIR_NAME + "/")


class Client:
    def __init__(self, local, url, user, password):
        self.local = os.path.abspath(local)
        self.url = url.rstrip("/")
        self.state_dir = os.path.join(self.local, STATE_DIR_NAME)
        self.state_path = os.path.join(self.state_dir, "state.json")
        self.conflict_path = os.path.join(self.state_dir, "conflicts.log")
        token = base64.b64encode(f"{user}:{password}".encode()).decode()
        self.headers = {"Authorization": f"Basic {token}"}
        os.makedirs(self.state_dir, exist_ok=True)

    def load_state(self):
        if not os.path.isfile(self.state_path):
            return {}
        with open(self.state_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_state(self, state):
        fd, tmp = tempfile.mkstemp(prefix=".state-", dir=self.state_dir)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, self.state_path)

    def local_full(self, rel):
        path = os.path.abspath(os.path.join(self.local, rel))
        if path != self.local and not path.startswith(self.local + os.sep):
            raise ValueError("invalid local path")
        return path

    def api(self, path):
        return self.url + path

    def request(self, url, method="GET", data=None):
        req = urllib.request.Request(url, data=data, headers=self.headers, method=method)
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()

    def scan_local(self):
        result = {}
        for base, _, files in os.walk(self.local):
            for name in files:
                full = os.path.join(base, name)
                rel = os.path.relpath(full, self.local).replace(os.sep, "/")
                if ignored(rel):
                    continue
                st = os.stat(full)
                result[rel] = {"hash": sha256(full), "mtime": st.st_mtime, "size": st.st_size}
        return result

    def scan_remote(self):
        data = self.request(self.api("/__api__/files"))
        return json.loads(data.decode())

    def download(self, rel):
        url = self.api("/__api__/file?path=" + urllib.parse.quote(rel))
        data = self.request(url)
        full = self.local_full(rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        fd, tmp = tempfile.mkstemp(prefix=".tmp-", dir=os.path.dirname(full) or self.local)
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        os.replace(tmp, full)

    def upload(self, rel):
        full = self.local_full(rel)
        with open(full, "rb") as f:
            data = f.read()
        url = self.api("/__api__/file?path=" + urllib.parse.quote(rel))
        self.request(url, method="PUT", data=data)

    def delete_remote(self, rel):
        url = self.api("/__api__/file?path=" + urllib.parse.quote(rel))
        self.request(url, method="DELETE")

    def delete_local(self, rel):
        full = self.local_full(rel)
        if os.path.isfile(full):
            os.remove(full)

    def report_conflict(self, rel):
        line = f"{datetime.now().isoformat(timespec='seconds')} conflict: {rel}\n"
        with open(self.conflict_path, "a", encoding="utf-8") as f:
            f.write(line)
        print("CONFLICT", rel, flush=True)

    def once(self):
        local = self.scan_local()
        try:
            remote = self.scan_remote()
        except urllib.error.URLError as e:
            print("remote unavailable:", e, flush=True)
            return

        old = self.load_state()
        new_state = {}

        for rel in sorted(set(local) | set(remote) | set(old)):
            l = local.get(rel)
            r = remote.get(rel)
            o = old.get(rel, {})
            old_l = o.get("local_hash")
            old_r = o.get("remote_hash")

            l_changed = (l is None and old_l is not None) or (l is not None and l["hash"] != old_l)
            r_changed = (r is None and old_r is not None) or (r is not None and r["hash"] != old_r)

            if l_changed and r_changed:
                if l is not None and r is not None and l["hash"] == r["hash"]:
                    new_state[rel] = {"local_hash": l["hash"], "remote_hash": r["hash"]}
                else:
                    self.report_conflict(rel)
                    if l is not None:
                        new_state[rel] = {
                            "local_hash": l["hash"],
                            "remote_hash": r["hash"] if r else None,
                        }
                continue

            if l_changed:
                if l is None:
                    self.delete_remote(rel)
                else:
                    self.upload(rel)
            elif r_changed:
                if r is None:
                    self.delete_local(rel)
                else:
                    self.download(rel)

            current_local = self.scan_local().get(rel)
            current_remote = self.scan_remote().get(rel)
            if current_local or current_remote:
                new_state[rel] = {
                    "local_hash": current_local["hash"] if current_local else None,
                    "remote_hash": current_remote["hash"] if current_remote else None,
                }

        self.save_state(new_state)

    def watch_forever(self, interval):
        trigger = {"flag": True}

        class Handler(FileSystemEventHandler):
            def handle(self, event):
                if not event.is_directory:
                    trigger["flag"] = True

            on_created = handle
            on_modified = handle
            on_deleted = handle
            on_moved = handle

        observer = Observer()
        observer.schedule(Handler(), self.local, recursive=True)
        observer.start()

        while True:
            if trigger["flag"]:
                trigger["flag"] = False
                time.sleep(0.5)
                self.once()
            time.sleep(interval)
            trigger["flag"] = True


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--local", required=True)
    p.add_argument("--url", required=True)
    p.add_argument("--user", default="sync")
    p.add_argument("--password", default="changeme")
    p.add_argument("--interval", type=float, default=2.0)
    p.add_argument("--once", action="store_true")
    a = p.parse_args()

    c = Client(a.local, a.url, a.user, a.password)
    if a.once:
        c.once()
    else:
        c.watch_forever(a.interval)
