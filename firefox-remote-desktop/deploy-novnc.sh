#!/usr/bin/env bash
# Deploy / refresh phone-mode Firefox on the homelab (run ON joseko).
set -euo pipefail
BASE="${HOME}/firefox-remote-desktop"
cd "$BASE"

chmod +x custom-cont-init.d/* custom-services.d/* 2>/dev/null || true

# Stop older container name if present
if docker ps -a --format '{{.Names}}' | grep -qx firefox-remote-desktop; then
  docker stop firefox-remote-desktop >/dev/null 2>&1 || true
  docker rm firefox-remote-desktop >/dev/null 2>&1 || true
fi

# Ensure local image exists (x11vnc + novnc baked in)
if ! docker image inspect firefox-novnc-phone:local >/dev/null 2>&1; then
  if docker ps -a --format '{{.Names}}' | grep -qx firefox-novnc; then
    echo "Creating firefox-novnc-phone:local from running container…"
    docker commit firefox-novnc firefox-novnc-phone:local
  else
    echo "ERROR: need firefox-novnc-phone:local (or a running firefox-novnc to commit)." >&2
    exit 1
  fi
fi

docker compose -f docker-compose.novnc.yml up -d
sleep 6

# Hard-lock iPhone viewport + copy UI in case service raced X
docker exec firefox-novnc bash -lc '
  selkies-resize 500x1086 >/dev/null 2>&1 || true
  cp -f /phone-ui/phone.html /phone-ui/phone-app.js /phone-ui/index.html /phone-ui/phone-gateway.py /usr/share/novnc/ 2>/dev/null || true
  bash /custom-cont-init.d/15-selkies-landscape.sh 2>/dev/null || true
  pgrep -a x11vnc || true
  pgrep -af "phone-gateway|websockify" || true
'

curl -s -o /dev/null -w "phone=%{http_code}\n" http://127.0.0.1:5000/phone.html || true
echo
echo "Phone UI: http://100.82.108.108:5000/"
echo "          http://100.82.108.108:5000/phone.html"
echo "Swipe scrolls · tap clicks · top bar navigates · Clear wipes history · ⌨ for typing"
