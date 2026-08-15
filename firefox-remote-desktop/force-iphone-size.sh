#!/bin/bash
# Re-apply iPhone 17 Pro Max display size (440x956) after container start.
set -euo pipefail
for i in $(seq 1 60); do
  if docker exec -u abc -e DISPLAY=:1 firefox-remote-desktop xrandr >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec -u abc -e DISPLAY=:1 firefox-remote-desktop /lsiopy/bin/selkies-resize 440x956
docker exec -u abc -e DISPLAY=:1 firefox-remote-desktop xrandr | head -8
