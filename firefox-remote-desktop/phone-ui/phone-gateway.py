#!/usr/bin/env python3
"""Phone gateway: websockify on :5000 plus POST /api/clear-history."""
from __future__ import annotations

import glob
import json
import logging
import os
import shutil
import subprocess
import sys
import time

from websockify.websocketproxy import ProxyRequestHandler, WebSocketProxy

PROFILE_GLOB = "/config/.config/mozilla/firefox/*.default*"
DISPLAY = os.environ.get("DISPLAY", ":1")


def _rm_glob(pattern: str) -> int:
    n = 0
    for path in glob.glob(pattern):
        try:
            if os.path.isdir(path) and not os.path.islink(path):
                shutil.rmtree(path, ignore_errors=True)
            else:
                os.remove(path)
            n += 1
        except OSError:
            pass
    return n


def clear_history() -> dict:
    """Wipe history/cookies/cache and relaunch Firefox."""
    subprocess.run(
        ["pkill", "-f", "/usr/lib/firefox/firefox"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1.5)
    subprocess.run(
        ["pkill", "-9", "-f", "/usr/lib/firefox/firefox"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(0.5)

    profiles = [p for p in glob.glob(PROFILE_GLOB) if os.path.isdir(p)]
    removed = 0
    for profile in profiles:
        for pat in (
            "places.sqlite*",
            "cookies.sqlite*",
            "webappsstore.sqlite*",
            "favicons.sqlite*",
            "formhistory.sqlite*",
            "permissions.sqlite*",
            "sessionstore.jsonlz4",
            "sessionCheckpoints.json",
        ):
            removed += _rm_glob(os.path.join(profile, pat))
        for folder in (
            "cache2",
            "startupCache",
            "thumbnails",
            "sessionstore-backups",
            "storage/default",
            "storage/temporary",
            "shader-cache",
        ):
            path = os.path.join(profile, folder)
            if os.path.isdir(path):
                shutil.rmtree(path, ignore_errors=True)
                try:
                    os.makedirs(path, exist_ok=True)
                except OSError:
                    pass
                removed += 1

    subprocess.Popen(
        [
            "su",
            "-s",
            "/bin/bash",
            "abc",
            "-c",
            f"DISPLAY={DISPLAY} /usr/bin/firefox >/tmp/firefox-relaunch.log 2>&1",
        ],
        start_new_session=True,
    )
    return {"removed": removed, "profiles": len(profiles)}


class PhoneRequestHandler(ProxyRequestHandler):
    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        if path == "/api/clear-history":
            try:
                result = clear_history()
                body = json.dumps({"ok": True, **result}).encode("utf-8")
                self.send_response(200)
            except Exception as exc:  # noqa: BLE001
                body = json.dumps({"ok": False, "error": str(exc)}).encode("utf-8")
                self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404)


def parse_listen(value: str) -> tuple[str, int]:
    if ":" in value:
        host, port_s = value.rsplit(":", 1)
        return host.strip("[]") or "0.0.0.0", int(port_s)
    return "0.0.0.0", int(value)


def parse_target(value: str) -> tuple[str, int]:
    host, port_s = value.rsplit(":", 1)
    return host.strip("[]"), int(port_s)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    web = os.environ.get("NOVNC_WEB", "/usr/share/novnc")
    listen = os.environ.get("PHONE_LISTEN", "0.0.0.0:5000")
    target = os.environ.get("VNC_TARGET", "127.0.0.1:5900")
    listen_host, listen_port = parse_listen(listen)
    target_host, target_port = parse_target(target)

    server = WebSocketProxy(
        RequestHandlerClass=PhoneRequestHandler,
        listen_host=listen_host,
        listen_port=listen_port,
        target_host=target_host,
        target_port=target_port,
        web=web,
        file_only=True,
    )
    logging.info("Phone gateway on %s:%s → %s:%s (web=%s)", listen_host, listen_port, target_host, target_port, web)
    server.start_server()


if __name__ == "__main__":
    main()
