# Firefox phone mode (noVNC)

Real Firefox on the homelab, streamed to your phone with **native-feeling touch**:

- one-finger swipe → scroll (not cursor drag)
- tap → click
- hold → right-click / context menu
- top bar → back + URL (paste into Firefox)
- ⌨ → type via paste

Selkies (`:3001`) stays available as a fallback, but phones should use **phone.html**.

## Size

Locked to **iPhone 17 Pro Max** CSS viewport: **440 × 956**.

## Open on your phone (Tailscale)

```text
http://100.82.108.108:5800/
```

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
| `custom-cont-init.d/10-phone-ui` | Install UI into `/usr/share/novnc` on boot |
| `custom-services.d/novnc` | Keep x11vnc + websockify on `:5800` (must be a file) |
