import { chromium } from "playwright-core";
import { WebSocketServer } from "ws";

const CHROME_PATH =
  process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";

/** @type {import('playwright-core').Browser | null} */
let browser = null;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1280,800",
    ],
  });
  return browser;
}

/**
 * Create the browse WebSocketServer (caller wires upgrade handling).
 */
export function attachBrowserProxy() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    handleSession(ws).catch((err) => {
      console.error("browser session error", err);
      try {
        ws.close();
      } catch {}
    });
  });

  return wss;
}

async function handleSession(ws) {
  const b = await getBrowser();
  const context = await b.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  let closed = false;
  const cleanup = async () => {
    if (closed) return;
    closed = true;
    try {
      await cdp.send("Page.stopScreencast").catch(() => {});
    } catch {}
    try {
      await context.close();
    } catch {}
  };

  ws.on("close", cleanup);
  ws.on("error", cleanup);

  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 55,
    maxWidth: 1280,
    maxHeight: 800,
    everyNthFrame: 1,
  });

  cdp.on("Page.screencastFrame", async (frame) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: "frame",
          data: frame.data,
          sessionId: frame.sessionId,
        })
      );
    }
    try {
      await cdp.send("Page.screencastFrameAck", {
        sessionId: frame.sessionId,
      });
    } catch {}
  });

  ws.send(JSON.stringify({ type: "ready" }));

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    try {
      if (msg.type === "navigate") {
        const url = normalizeUrl(msg.url);
        ws.send(JSON.stringify({ type: "status", message: "Loading " + url }));
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        ws.send(
          JSON.stringify({
            type: "status",
            message: "Loaded " + page.url(),
            url: page.url(),
          })
        );
      } else if (msg.type === "click") {
        await page.mouse.click(msg.x, msg.y, {
          button: msg.button || "left",
          clickCount: msg.clickCount || 1,
        });
      } else if (msg.type === "move") {
        await page.mouse.move(msg.x, msg.y);
      } else if (msg.type === "wheel") {
        await page.mouse.wheel(msg.deltaX || 0, msg.deltaY || 0);
      } else if (msg.type === "type") {
        await page.keyboard.type(msg.text, { delay: 5 });
      } else if (msg.type === "press") {
        await page.keyboard.press(msg.key);
      }
    } catch (err) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: err.message || String(err),
        })
      );
    }
  });
}

function normalizeUrl(input) {
  try {
    return new URL(input).toString();
  } catch {
    return new URL("https://" + input).toString();
  }
}
