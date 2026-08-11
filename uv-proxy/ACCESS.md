# Live test access

These URLs are active while the cloud agent session is running.

## Primary (Cloudflare — recommended)

- **Homepage:** https://shall-photographers-census-viewer.trycloudflare.com/
- **RedGIFs (Browser mode):** https://shall-photographers-census-viewer.trycloudflare.com/browse?url=https://www.redgifs.com
- **Any URL (UV):** https://shall-photographers-census-viewer.trycloudflare.com/?url=https://example.com

## Backup (localtunnel)

- **Homepage:** https://petite-views-rest.loca.lt/
- **RedGIFs (Browser mode):** https://petite-views-rest.loca.lt/browse?url=https://www.redgifs.com

localtunnel may show a one-time **“Click to Continue”** page on first visit.

## Quick test checklist

1. Open the Browser mode RedGIFs link above
2. Wait ~5–15s for the Chromium stream to connect
3. Click on the stream to dismiss age/cookie prompts
4. For normal sites, use the homepage and enter any URL (example.com works with UV)

## Modes

| Use case | Link |
|----------|------|
| RedGIFs / heavy SPAs | `/browse?url=...` (Browser mode) |
| General sites | Homepage URL bar (Ultraviolet) |

## Restart locally

```bash
cd uv-proxy && npm install && npm start
npx localtunnel --port 8080
```
