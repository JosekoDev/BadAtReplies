# Firefox via noVNC (mobile)

Selkies’ web client is awkward on phones. This stack uses **jlesage/firefox**, which serves Firefox through **nginx + noVNC** in the browser.

## Size

Locked to **iPhone 17 Pro Max** viewport: **440 × 956**.

## Deploy on the homelab

```bash
cd ~/firefox-remote-desktop
# If you have the latest repo branch:
git fetch origin && git checkout cursor/firefox-remote-desktop-b3c2 && git pull

chmod +x deploy-novnc.sh
./deploy-novnc.sh
```

Or:

```bash
cd ~/firefox-remote-desktop
docker compose -f docker-compose.novnc.yml up -d
```

## Open on your phone

```text
http://100.82.108.108:5800
```

Tips:
- In noVNC, use **fullscreen** / stretch for best fit
- Old Selkies URL (`:3001`) is stopped by `deploy-novnc.sh`
