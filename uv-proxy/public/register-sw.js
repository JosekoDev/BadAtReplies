"use strict";

const stockSW = "/uv/sw.js";
const swAllowedHostnames = ["localhost", "127.0.0.1"];

async function registerSW() {
  if (!navigator.serviceWorker) {
    if (
      location.protocol !== "https:" &&
      !swAllowedHostnames.includes(location.hostname)
    ) {
      throw new Error("Service workers cannot be registered without https.");
    }
    throw new Error("Your browser doesn't support service workers.");
  }

  // Scope is /uv/ (script directory). Do NOT await navigator.serviceWorker.ready
  // on the top-level "/" page — that promise never resolves when the SW scope
  // does not control the current page.
  const registration = await navigator.serviceWorker.register(stockSW, {
    scope: "/uv/",
    updateViaCache: "none",
  });

  // Wait until this registration has an active worker (or becomes active)
  if (registration.active) return registration;

  const worker = registration.installing || registration.waiting;
  if (!worker) return registration;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Service worker activation timed out"));
    }, 10000);

    worker.addEventListener("statechange", () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  return registration;
}
