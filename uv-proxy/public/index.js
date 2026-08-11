"use strict";

const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

async function navigateTo(input) {
  error.textContent = "";
  errorCode.textContent = "";

  try {
    await registerSW();
  } catch (err) {
    error.textContent = "Failed to register service worker.";
    errorCode.textContent = err.toString();
    throw err;
  }

  const url = search(input, searchEngine.value);

  let frame = document.getElementById("uv-frame");
  frame.style.display = "block";
  const wispUrl =
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/";
  if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
  }
  frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
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

const params = new URLSearchParams(location.search);
const initialUrl = params.get("url");
if (initialUrl) {
  address.value = initialUrl;
  navigateTo(initialUrl);
}
