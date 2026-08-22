#!/usr/bin/with-contenv bash
# Inject landscape fullscreen fix into Selkies web UI (:3001 / :3000).
set -euo pipefail

PHONE_SRC="${PHONE_SRC:-/phone-ui}"
MARKER="selkies-landscape.js"

install_into() {
  local web_root="$1"
  local index="$web_root/index.html"
  [[ -f "$index" ]] || return 0

  cp -f "$PHONE_SRC/selkies-landscape.css" "$PHONE_SRC/selkies-landscape.js" "$web_root/" 2>/dev/null || true

  if grep -q "$MARKER" "$index" 2>/dev/null; then
    echo "[selkies-landscape] already patched $index"
    return 0
  fi

  sed -i "s|</head>|<link rel=\"stylesheet\" href=\"selkies-landscape.css\">\n<script src=\"selkies-landscape.js\" defer></script>\n</head>|" "$index"
  echo "[selkies-landscape] patched $index"
}

for web_root in \
  /usr/share/selkies/web \
  /usr/share/selkies-dashboard-wish \
  /usr/share/selkies-dashboard-zinc \
  /usr/share/selkies-dashboard; do
  [[ -d "$web_root" ]] || continue
  install_into "$web_root"
done
