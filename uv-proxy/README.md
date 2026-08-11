# Ultraviolet Web Proxy

A self-hosted [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) web proxy. Enter any URL (e.g. `redgifs.com`) to browse through the proxy.

## Quick start

```bash
cd uv-proxy
npm install
npm start
```

Open http://localhost:8080 and enter a URL, or use `?url=https://www.redgifs.com`.

## Public access (Cloudflare Tunnel)

```bash
/tmp/cloudflared tunnel --url http://localhost:8080
```

Use the generated `*.trycloudflare.com` URL (HTTPS required for service workers).

## How it works

- **Ultraviolet** rewrites pages client-side via a service worker
- **Wisp + Epoxy** transport handles proxied HTTP/WebSocket traffic on the server
- Works best over HTTPS (Cloudflare tunnel, Replit, etc.)
