# Firefox phone mode (noVNC)

Real Firefox on the homelab, streamed to your phone with **native-feeling touch**:

- one-finger swipe → scroll (not cursor drag)
- tap → click
- hold → right-click / context menu
- top bar → back + URL (paste into Firefox)
- ⌨ → type via paste

Selkies (`:3001`) stays available as a fallback, but phones should use **phone.html**.

## Size

Locked to **500 × 1086** (same tall aspect as iPhone 17 Pro Max’s 440×956).

Firefox refuses windows narrower than ~500px, so a 440-wide display clipped the right edge. The phone UI scales this to fit your screen with nothing cut off.

## Open on your phone (Tailscale)

```text
http://100.82.108.108:5000/
```

Hard-refresh after updates. Use **Clear** in the top bar to wipe history/cookies/cache.

Add to Home Screen for an app-like shell.

## Deploy / refresh on the homelab

```bash
cd ~/firefox-remote-desktop
chmod +x deploy-novnc.sh
./deploy-novnc.sh
```

Uses local image `firefox-novnc-phone:local` (linuxserver Firefox + x11vnc/websockify).
First-time bake from a working container:

```bash
docker commit firefox-novnc firefox-novnc-phone:local
```

## Files

| Path | Role |
| --- | --- |
| `phone-ui/phone.html` + `phone-app.js` | Phone shell + gesture mapping |
| `phone-ui/user.js` / `chrome/userChrome.css` | Mobile UA + hide desktop Firefox chrome |
| `phone-ui/phone-gateway.py` | Port 5000 websockify + `POST /api/clear-history` |
| `custom-cont-init.d/10-phone-ui` | Install UI into `/usr/share/novnc` on boot |
| `custom-services.d/novnc` | Keep x11vnc + phone gateway on `:5000` (must be a file) |
