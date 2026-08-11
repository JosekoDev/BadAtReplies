# Live test access

These URLs are active while the cloud agent session is running.

## Primary (localtunnel)

- **Homepage:** https://fruity-brooms-hope.loca.lt/
- **RedGIFs (Browser mode):** https://fruity-brooms-hope.loca.lt/browse?url=https://www.redgifs.com
- **Any URL (UV):** https://fruity-brooms-hope.loca.lt/?url=https://example.com

### First visit note

localtunnel may show a one-time **“Click to Continue”** / tunnel reminder page. Click through it, then reload if needed.

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
