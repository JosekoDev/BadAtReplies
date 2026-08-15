# Homelab web tooling

Self-hosted browsing utilities for a private homelab network.

## Projects

| Path | Description |
| --- | --- |
| [`firefox-remote-desktop/`](./firefox-remote-desktop/) | Containerized Firefox web desktop (LinuxServer) streamed over HTTP — intended for Tailscale access on port 3000 |
| [`uv-proxy/`](./uv-proxy/) | Ultraviolet web proxy for browsing arbitrary URLs through a service worker |

## Quick start: remote Firefox desktop

```bash
cd firefox-remote-desktop
docker compose up -d
```

On a Tailscale-connected client, open `http://<homelab-tailscale-ip>:3000`.

See [firefox-remote-desktop/README.md](./firefox-remote-desktop/README.md) for Docker install, Compose options, and client access details.
