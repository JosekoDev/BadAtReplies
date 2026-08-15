#!/bin/bash
# Lock phone display size after container start.
# Use 500×1086: Firefox refuses windows narrower than ~500px, so 440×956
# clipped the right edge. 500×1086 preserves the same tall aspect ratio.
set -euo pipefail
NAME="${1:-firefox-novnc}"
W="${2:-500}"
H="${3:-1086}"
for i in $(seq 1 60); do
  if docker exec -u abc -e DISPLAY=:1 "$NAME" xrandr >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec -u abc -e DISPLAY=:1 "$NAME" /lsiopy/bin/selkies-resize "${W}x${H}"
docker exec -u abc -e DISPLAY=:1 "$NAME" xrandr | head -8
