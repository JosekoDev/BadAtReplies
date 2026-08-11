"use strict";

const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");
const statusEl = document.getElementById("uv-status");

let connection;

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

function showError(title, err) {
  error.textContent = title;
  errorCode.textContent = err ? String(err) : "";
  console.error(title, err);
}

function wispUrl() {
  const mode = document.getElementById("uv-wisp")?.value || "local";
  if (mode === "public") {
    return "wss://wisp.mercurywork.shop/";
  }
  return (
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/"
  );
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label + " timed out after " + ms + "ms")), ms)
    ),
  ]);
}

async function getConnection() {
  if (!connection) {
    connection = new BareMux.BareMuxConnection("/baremux/worker.js");
  }
  return connection;
}

async function ensureTransport() {
  const conn = await getConnection();
  const transport = document.getElementById("uv-transport")?.value || "epoxy";
  const url = wispUrl();

  if (transport === "libcurl") {
    await withTimeout(
      conn.setTransport("/libcurl/index.mjs", [{ wisp: url }]),
      15000,
      "libcurl transport"
    );
  } else {
    await withTimeout(
      conn.setTransport("/epoxy/index.mjs", [{ wisp: url }]),
      15000,
      "epoxy transport"
    );
  }
}

async function navigateTo(input) {
  error.textContent = "";
  errorCode.textContent = "";

  if (!input || !String(input).trim()) {
    showError("Enter a URL or domain.");
    return;
  }

  setStatus("Setting up transport…");

  try {
    // CRITICAL: transport before SW handles navigations
    await ensureTransport();
    setStatus("Registering service worker…");
    await registerSW();
  } catch (err) {
    setStatus("");
    showError("Proxy setup failed. Try switching transport or Wisp endpoint.", err);
    throw err;
  }

  const url = search(input, searchEngine.value);
  const frame = document.getElementById("uv-frame");
  frame.style.display = "block";
  document.body.classList.add("proxy-active");
  setStatus("Loading " + url);
  frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);

  frame.addEventListener(
    "load",
    () => {
      setStatus("Loaded (proxied)");
    },
    { once: true }
  );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await navigateTo(address.value);
  } catch (_) {
    /* shown already */
  }
});

document.querySelectorAll(".quick-link").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const url = btn.dataset.url;
    address.value = url;
    try {
      await navigateTo(url);
    } catch (_) {
      /* shown already */
    }
  });
});

document.getElementById("uv-home")?.addEventListener("click", () => {
  const frame = document.getElementById("uv-frame");
  frame.src = "about:blank";
  frame.style.display = "none";
  document.body.classList.remove("proxy-active");
  setStatus("Ready — enter a URL");
  error.textContent = "";
  errorCode.textContent = "";
});

// Warm connection in background; never block the UI
setStatus("Ready — enter a URL");
getConnection()
  .then(() => ensureTransport())
  .then(() => registerSW())
  .then(() => setStatus("Ready — enter a URL"))
  .catch((err) => {
    console.warn("Background init warning:", err);
    setStatus("Ready (transport will connect on Go)");
  });

const params = new URLSearchParams(location.search);
const initialUrl = params.get("url");
if (initialUrl) {
  address.value = initialUrl;
  // Wait a tick so deferred scripts / DOM are settled
  setTimeout(() => {
    navigateTo(initialUrl).catch(() => {});
  }, 50);
}
