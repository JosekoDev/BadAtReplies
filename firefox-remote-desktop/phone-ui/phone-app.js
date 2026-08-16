import RFB from "./core/rfb.js";
import KeyTable from "./core/input/keysym.js";
import { clientToElement } from "./core/util/element.js";

const statusEl = document.getElementById("status");
const screenEl = document.getElementById("screen");
const hintEl = document.getElementById("hint");
const urlEl = document.getElementById("url");
const kbEl = document.getElementById("kb");
const typebox = document.getElementById("typebox");
const params = new URLSearchParams(location.search);

function setStatus(text, { clickable = false } = {}) {
  statusEl.textContent = text;
  statusEl.classList.toggle("hidden", !text);
  statusEl.classList.toggle("clickable", clickable);
}

function hideChromeHints() {
  setTimeout(() => hintEl.classList.add("hidden"), 2800);
}

function target() {
  if (params.get("path")) return params.get("path");
  const p = location.pathname;
  if (p.endsWith(".html")) return p.replace(/[^/]+$/, "websockify");
  return (p.endsWith("/") ? p : p + "/") + "websockify";
}

const rfb = new RFB(screenEl, target(), {
  shared: true,
  wsProtocols: ["binary"],
});
rfb.scaleViewport = true;
rfb.resizeSession = false;
rfb.clipViewport = false;
rfb.showDotCursor = false;
rfb.focusOnClick = true;
rfb.dragViewport = false;
rfb.qualityLevel = 5; // slightly smaller frames → steadier update rate
rfb.compressionLevel = 0; // least CPU on encode/decode

function ensureContainFit() {
  rfb.scaleViewport = true;
  rfb.clipViewport = false;
  try {
    rfb._updateScale();
  } catch (_) {
    /* ignore */
  }
}

rfb.addEventListener("connect", () => {
  // Stock noVNC: 1-finger drag = mouse drag. We replace that with phone gestures.
  try {
    rfb._gestures.detach();
  } catch (_) {
    /* ignore */
  }
  ensureContainFit();
  requestAnimationFrame(ensureContainFit);
  setStatus("");
  hideChromeHints();
});
window.addEventListener("resize", ensureContainFit);

rfb.addEventListener("disconnect", (e) => {
  setStatus(e.detail.clean ? "Disconnected — tap to reload" : "Lost connection — tap to reload", {
    clickable: true,
  });
  statusEl.onclick = () => location.reload();
});
rfb.addEventListener("credentialsrequired", () => {
  rfb.sendCredentials({ password: params.get("password") || "" });
});

function waitCanvas() {
  return new Promise((resolve) => {
    const tick = () => {
      if (rfb._canvas) resolve(rfb._canvas);
      else requestAnimationFrame(tick);
    };
    tick();
  });
}

// Thresholds are in *canvas CSS pixels* (same space as clientToElement).
const MOVE_PX = 24;
const HOLD_MS = 480;
const WHEEL_LINE = 24;
const TAP_MS = 350;

let tracking = false;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let accumY = 0;
let accumX = 0;
let mode = null;
let holdTimer = null;
let activeId = null;
let startTs = 0;
let maxDist = 0;

function clearHold() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
}

// IMPORTANT: _sendMouse expects canvas-element CSS pixels, then applies absX/Y
// (divides by display scale). Do NOT pre-convert to framebuffer coords.
function posFromTouch(t, canvas) {
  return clientToElement(t.clientX, t.clientY, canvas);
}

function sendMove(x, y, mask) {
  if (rfb._rfbConnectionState !== "connected") return;
  rfb._mousePos = { x, y };
  rfb._sendMouse(x, y, mask);
}

function sendClick(x, y) {
  sendMove(x, y, 0);
  sendMove(x, y, 1 << 0);
  setTimeout(() => sendMove(x, y, 0), 40);
}

function sendWheel(x, y, dx, dy) {
  let mask = 0;
  if (dy < 0) mask |= 1 << 3;
  if (dy > 0) mask |= 1 << 4;
  if (dx < 0) mask |= 1 << 5;
  if (dx > 0) mask |= 1 << 6;
  if (!mask) return;
  rfb._mousePos = { x, y };
  rfb._sendMouse(x, y, mask);
  rfb._sendMouse(x, y, 0);
}

function chord(keys) {
  for (const k of keys) rfb.sendKey(k[0], k[1], true);
  for (let i = keys.length - 1; i >= 0; i--) rfb.sendKey(keys[i][0], keys[i][1], false);
}

function keyOnce(keysym, code) {
  rfb.sendKey(keysym, code, true);
  rfb.sendKey(keysym, code, false);
}

async function navigateTo(raw) {
  let dest = (raw || "").trim();
  if (!dest) return;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(dest) && !dest.includes(" ")) {
    dest = "https://" + dest;
  } else if (dest.includes(" ") || !dest.includes(".")) {
    dest = "https://www.google.com/search?q=" + encodeURIComponent(dest);
  }
  rfb.focus();
  chord([
    [KeyTable.XK_Control_L, "ControlLeft"],
    [KeyTable.XK_l, "KeyL"],
  ]);
  await new Promise((r) => setTimeout(r, 160));
  chord([
    [KeyTable.XK_Control_L, "ControlLeft"],
    [KeyTable.XK_a, "KeyA"],
  ]);
  await new Promise((r) => setTimeout(r, 60));
  rfb.clipboardPasteFrom(dest);
  await new Promise((r) => setTimeout(r, 80));
  chord([
    [KeyTable.XK_Control_L, "ControlLeft"],
    [KeyTable.XK_v, "KeyV"],
  ]);
  await new Promise((r) => setTimeout(r, 100));
  keyOnce(KeyTable.XK_Return, "Enter");
}

async function sendTypedText() {
  const text = typebox.value;
  if (!text) return;
  rfb.focus();
  rfb.clipboardPasteFrom(text);
  await new Promise((r) => setTimeout(r, 60));
  chord([
    [KeyTable.XK_Control_L, "ControlLeft"],
    [KeyTable.XK_v, "KeyV"],
  ]);
  typebox.value = "";
  kbEl.classList.remove("open");
}

waitCanvas().then((canvas) => {
  canvas.style.touchAction = "none";
  canvas.style.cursor = "none";

  function onStart(e) {
    if (rfb._rfbConnectionState !== "connected") return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    e.preventDefault();
    tracking = true;
    activeId = t.identifier;
    mode = "tap";
    accumY = 0;
    accumX = 0;
    maxDist = 0;
    startTs = Date.now();
    const p = posFromTouch(t, canvas);
    startX = lastX = p.x;
    startY = lastY = p.y;
    sendMove(p.x, p.y, 0);

    clearHold();
    holdTimer = setTimeout(() => {
      if (tracking && mode === "tap" && maxDist < MOVE_PX) {
        mode = "right";
        sendMove(lastX, lastY, 1 << 2);
        setTimeout(() => sendMove(lastX, lastY, 0), 40);
        if (navigator.vibrate) navigator.vibrate(16);
      }
    }, HOLD_MS);
  }

  function onMove(e) {
    if (!tracking) return;
    const t = [...e.touches].find((x) => x.identifier === activeId);
    if (!t) return;
    e.preventDefault();
    const p = posFromTouch(t, canvas);
    const dx = p.x - startX;
    const dy = p.y - startY;
    maxDist = Math.max(maxDist, Math.hypot(dx, dy));

    if (mode === "tap" && maxDist > MOVE_PX) {
      clearHold();
      mode = "scroll";
    }

    if (mode === "scroll") {
      accumY += p.y - lastY;
      accumX += p.x - lastX;
      while (Math.abs(accumY) >= WHEEL_LINE) {
        const step = accumY > 0 ? WHEEL_LINE : -WHEEL_LINE;
        // Invert vertical only: finger down → content down (natural phone scroll)
        sendWheel(p.x, p.y, 0, -step);
        accumY -= step;
      }
      while (Math.abs(accumX) >= WHEEL_LINE) {
        const step = accumX > 0 ? WHEEL_LINE : -WHEEL_LINE;
        sendWheel(p.x, p.y, step, 0);
        accumX -= step;
      }
      lastX = p.x;
      lastY = p.y;
      return;
    }

    if (mode === "tap") {
      lastX = p.x;
      lastY = p.y;
      sendMove(p.x, p.y, 0);
    }
  }

  function onEnd(e) {
    if (!tracking) return;
    if ([...e.touches].some((x) => x.identifier === activeId)) return;
    e.preventDefault();
    clearHold();
    const elapsed = Date.now() - startTs;
    if (mode === "tap" || (mode === "scroll" && elapsed < TAP_MS && maxDist < MOVE_PX * 1.5)) {
      sendClick(lastX, lastY);
    }
    tracking = false;
    mode = null;
    activeId = null;
  }

  // Only listen on the canvas (the scaled framebuffer). Listening on the
  // letterboxed parent made edge touches clamp and feel like "only edges work".
  const opts = { passive: false, capture: true };
  canvas.addEventListener("touchstart", onStart, opts);
  canvas.addEventListener("touchmove", onMove, opts);
  canvas.addEventListener("touchend", onEnd, opts);
  canvas.addEventListener("touchcancel", onEnd, opts);
});

document.getElementById("back").addEventListener("click", () => {
  rfb.focus();
  chord([
    [KeyTable.XK_Alt_L, "AltLeft"],
    [KeyTable.XK_Left, "ArrowLeft"],
  ]);
});

document.getElementById("go").addEventListener("click", () => navigateTo(urlEl.value));
urlEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    navigateTo(urlEl.value);
  }
});

async function clearBrowsingHistory() {
  if (!confirm("Clear all browsing history, cookies, and cache?")) return;
  setStatus("Clearing…");
  try {
    const res = await fetch("/api/clear-history", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    setStatus("Cleared — reconnecting…");
    setTimeout(() => location.reload(), 1200);
  } catch (err) {
    setStatus("Clear failed — tap to dismiss", { clickable: true });
    statusEl.onclick = () => setStatus("");
    console.error(err);
  }
}

document.getElementById("clear").addEventListener("click", () => clearBrowsingHistory());

document.getElementById("kbd").addEventListener("click", () => {
  kbEl.classList.add("open");
  setTimeout(() => typebox.focus(), 50);
});
document.getElementById("kb-close").addEventListener("click", () => {
  kbEl.classList.remove("open");
});
document.getElementById("kb-send").addEventListener("click", () => sendTypedText());

setStatus("Connecting…");
