import RFB from "./core/rfb.js";
import KeyTable from "./core/input/keysym.js";

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
rfb.qualityLevel = 6;
rfb.compressionLevel = 2;

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
  // Replace stock 1-finger-drag→mouse-drag with phone gestures below.
  try {
    rfb._gestures.detach();
  } catch (_) {
    /* ignore */
  }
  // Also stop noVNC from treating leftover mouse events as drags.
  try {
    rfb._canvas.style.pointerEvents = "auto";
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

// Higher threshold: phone jitter was flipping taps into "scroll" and killing clicks.
const MOVE_PX = 28;
const HOLD_MS = 480;
const WHEEL_LINE = 28;
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

function posFromTouch(t, canvas) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  let x = ((t.clientX - rect.left) / w) * rfb._fbWidth;
  let y = ((t.clientY - rect.top) / h) * rfb._fbHeight;
  x = Math.max(0, Math.min(rfb._fbWidth - 1, Math.round(x)));
  y = Math.max(0, Math.min(rfb._fbHeight - 1, Math.round(y)));
  return { x, y };
}

function sendMove(x, y, mask) {
  if (rfb._rfbConnectionState !== "connected") return;
  rfb._mousePos = { x, y };
  rfb._sendMouse(x, y, mask);
}

function sendClick(x, y) {
  // Brief press so Firefox registers a real click (not a zero-length flicker).
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
  // Focus Firefox URL bar (visible again), select-all, paste, go
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

  // Capture on the screen wrapper too (iOS sometimes targets the parent).
  const surface = screenEl;

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
        sendWheel(p.x, p.y, 0, step);
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
    // Prefer click when it was a short, small movement — even if we briefly
    // entered scroll from jitter.
    if (mode === "tap" || (mode === "scroll" && elapsed < TAP_MS && maxDist < MOVE_PX * 1.5)) {
      sendClick(lastX, lastY);
    }
    tracking = false;
    mode = null;
    activeId = null;
  }

  const opts = { passive: false, capture: true };
  for (const el of [canvas, surface]) {
    el.addEventListener("touchstart", onStart, opts);
    el.addEventListener("touchmove", onMove, opts);
    el.addEventListener("touchend", onEnd, opts);
    el.addEventListener("touchcancel", onEnd, opts);
  }
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

document.getElementById("kbd").addEventListener("click", () => {
  kbEl.classList.add("open");
  setTimeout(() => typebox.focus(), 50);
});
document.getElementById("kb-close").addEventListener("click", () => {
  kbEl.classList.remove("open");
});
document.getElementById("kb-send").addEventListener("click", () => sendTypedText());

setStatus("Connecting…");
