# Homelab Remote Web Workspace

Host a containerized Firefox “web desktop” on your homelab and stream it into any local browser over your Tailscale mesh. Browsing stays isolated in the container; access stays private to devices on your Tailscale network.

## Architecture

```
┌─────────────────┐     Tailscale      ┌──────────────────────────────┐
│ Client browser  │ ─────────────────► │ Homelab host :3000           │
│ (any OS)        │   HTTP / KasmVNC   │  docker: firefox-remote-desktop│
└─────────────────┘                    │  lscr.io/linuxserver/firefox │
                                       └──────────────────────────────┘
```

## 1. Docker environment setup

On the Debian/Ubuntu host, install Docker with the official convenience script:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

Optional: allow your user to run Docker without `sudo` (log out/in after):

```bash
sudo usermod -aG docker "$USER"
```

Confirm Compose is available (`docker compose` is included with current Docker Engine installs):

```bash
docker compose version
```

## 2. Deploy Firefox remote desktop

From this directory:

```bash
cd firefox-remote-desktop
cp .env.example .env   # optional; edit PUID/PGID/TZ/ports
docker compose up -d
```

### Container specifications

| Setting | Value |
| --- | --- |
| Image | `lscr.io/linuxserver/firefox:latest` |
| Container name | `firefox-remote-desktop` |
| HTTP port | Host `3000` → container `3000` |
| HTTPS port | Host `3001` → container `3001` (optional) |
| Shared memory | `1gb` (`shm_size`) — required for stable rendering of heavy pages |
| Restart policy | `unless-stopped` |
| Config volume | `./config` → `/config` (profile persistence) |

### Equivalent `docker run`

If you prefer not to use Compose:

```bash
sudo docker run -d \
  --name=firefox-remote-desktop \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=Etc/UTC \
  -p 3000:3000 \
  -p 3001:3001 \
  -v "$PWD/config:/config" \
  --shm-size="1gb" \
  --restart unless-stopped \
  lscr.io/linuxserver/firefox:latest
```

### Useful commands

```bash
docker compose ps
docker compose logs -f firefox
docker compose pull && docker compose up -d
docker compose down
```

## Mobile-friendly mode

The Compose stack includes Selkies mobile tweaks:

- Dynamic scaling (`SELKIES_USE_CSS_SCALING`) so the stream fits the phone viewport
- Injected `mobile/mobile-enhancements.js` that:
  - Fills the screen (`viewport-fit=cover`)
  - Auto-opens the **native** phone keyboard when you tap the stream (`Type: On`)
  - Adds floating **Keyboard** / **Type: On|Off** controls
- Optional Firefox `user.js` (see `config/user.js.example`) with a mobile user-agent so websites render in mobile layout

Hard refresh the page after updates. Use HTTPS: `https://<tailscale-ip>:3001`.

## 3. Client access (Tailscale)

1. Ensure the **homelab host** and the **client device** are authenticated and connected to the same Tailscale mesh (`tailscale status` on both).
2. On the client, note the host’s Tailscale IP (e.g. `100.x.y.z`) from the Tailscale admin console or `tailscale ip -4` on the host.
3. Open any local web browser.
4. Navigate to:

   ```
   http://100.x.y.z:3000
   ```

5. The remote Firefox desktop loads and streams into the local browser tab (KasmVNC).

HTTPS is also available at `https://100.x.y.z:3001` (self-signed cert by default). Prefer HTTP over Tailscale unless you terminate TLS elsewhere.

### Security notes

- Bind this service to your Tailscale interface only if the host also has a public LAN/WAN exposure you do not want serving port 3000. Example Compose override:

  ```yaml
  ports:
    - "100.x.y.z:3000:3000"
  ```

- Do not publish port 3000 to the public internet without additional auth (reverse proxy + SSO, or Tailscale ACLs / Funnel policies as appropriate).
- Treat the container like a real browser: persist `./config` for bookmarks, and wipe it when you want a clean profile.

## 4. Homelab checklist

- [ ] Docker installed on the host
- [ ] Tailscale installed and logged in on host and clients
- [ ] `docker compose up -d` succeeded (`docker compose ps` shows healthy/running)
- [ ] Client can open `http://<tailscale-ip>:3000`
- [ ] Optional: pin `PUID`/`PGID` so `./config` ownership stays correct
