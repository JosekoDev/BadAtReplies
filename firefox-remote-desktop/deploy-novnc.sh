#!/usr/bin/env bash
# Deploy Firefox + noVNC on the homelab (run ON the server as joseko).
set -euo pipefail
BASE="${HOME}/firefox-remote-desktop"
mkdir -p "$BASE/novnc-config"
cd "$BASE"

# Stop old Selkies stack if present
if docker ps -a --format '{{.Names}}' | grep -qx firefox-remote-desktop; then
  docker stop firefox-remote-desktop >/dev/null 2>&1 || true
  docker rm firefox-remote-desktop >/dev/null 2>&1 || true
fi

# Prefer compose file from this folder
if [ ! -f docker-compose.novnc.yml ]; then
  cat > docker-compose.novnc.yml << 'EOF'
services:
  firefox:
    image: jlesage/firefox:latest
    container_name: firefox-novnc
    environment:
      - TZ=Etc/UTC
      - DISPLAY_WIDTH=440
      - DISPLAY_HEIGHT=956
      - DARK_MODE=0
      - KEEP_APP_RUNNING=1
      - WEB_AUDIO=1
    volumes:
      - ./novnc-config:/config:rw
    ports:
      - "5800:5800"
      - "5900:5900"
    shm_size: "1gb"
    restart: unless-stopped
EOF
fi

docker compose -f docker-compose.novnc.yml pull
docker compose -f docker-compose.novnc.yml up -d
sleep 5
docker compose -f docker-compose.novnc.yml ps
curl -s -o /dev/null -w "novnc_http=%{http_code}\n" http://127.0.0.1:5800/ || true
echo
echo "Open on your phone (Tailscale): http://100.82.108.108:5800"
echo "Use the noVNC fullscreen control for best mobile fit."
