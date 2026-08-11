"use strict";

const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");
const statusEl = document.getElementById("uv-status");

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

function wispUrl() {
  return (
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/"
  );
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

async function ensureTransport() {
  const transport = document.getElementById("uv-transport")?.value || "libcurl";
  const url = wispUrl();

  if (transport === "libcurl") {
    await connection.setTransport("/libcurl/index.mjs", [{ wisp: url }]);
  } else {
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: url }]);
  }
}

async function boot() {
  setStatus("Connecting proxy transport…");
  try {
    // Transport MUST be set before the service worker handles requests
    await ensureTransport();
    await registerSW();
    setStatus("Ready — enter a URL");
  } catch (err) {
    setStatus("");
    error.textContent = "Failed to initialize proxy.";
    errorCode.textContent = err.toString();
    console.error(err);
  }
}

async function navigateTo(input) {
  error.textContent = "";
  errorCode.textContent = "";

  if (!input || !String(input).trim()) {
    error.textContent = "Enter a URL or domain.";
    return;
  }

  setStatus("Loading…");

  try {
    await ensureTransport();
    await registerSW();
  } catch (err) {
    setStatus("");
    error.textContent = "Failed to register service worker / transport.";
    errorCode.textContent = err.toString();
    throw err;
  }

  const url = search(input, searchEngine.value);
  const frame = document.getElementById("uv-frame");
  frame.style.display = "block";
  document.body.classList.add("proxy-active");
  frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
  setStatus("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await navigateTo(address.value);
});

document.querySelectorAll(".quick-link").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const url = btn.dataset.url;
    address.value = url;
    await navigateTo(url);
  });
});

document.getElementById("uv-transport")?.addEventListener("change", () => {
  ensureTransport().catch(console.error);
});

document.getElementById("uv-home")?.addEventListener("click", () => {
  const frame = document.getElementById("uv-frame");
  frame.src = "about:blank";
  frame.style.display = "none";
  document.body.classList.remove("proxy-active");
  setStatus("Ready — enter a URL");
});

boot().then(() => {
  const params = new URLSearchParams(location.search);
  const initialUrl = params.get("url");
  if (initialUrl) {
    address.value = initialUrl;
    navigateTo(initialUrl);
  }
});
