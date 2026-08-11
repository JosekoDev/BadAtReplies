"use strict";

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
const form = document.getElementById("browse-form");
const address = document.getElementById("browse-address");
const statusEl = document.getElementById("browse-status");

let img = new Image();
let ws;
let scaleX = 1;
let scaleY = 1;

function setStatus(msg) {
  statusEl.textContent = msg ? " — " + msg : "";
}

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(proto + "://" + location.host + "/browse-ws");

  ws.addEventListener("open", () => setStatus("connected"));
  ws.addEventListener("close", () => setStatus("disconnected — refresh"));
  ws.addEventListener("error", () => setStatus("socket error"));

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "frame") {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = "data:image/jpeg;base64," + msg.data;
    } else if (msg.type === "status") {
      setStatus(msg.message);
      if (msg.url) address.value = msg.url;
    } else if (msg.type === "error") {
      setStatus("error: " + msg.message);
    } else if (msg.type === "ready") {
      setStatus("ready");
      const params = new URLSearchParams(location.search);
      const url = params.get("url") || address.value || "https://www.redgifs.com";
      address.value = url;
      navigate(url);
    }
  });
}

function navigate(url) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "navigate", url }));
}

function coords(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

canvas.addEventListener("mousedown", (ev) => {
  ev.preventDefault();
  const { x, y } = coords(ev);
  ws?.send(
    JSON.stringify({
      type: "click",
      x,
      y,
      button: ev.button === 2 ? "right" : "left",
      clickCount: ev.detail || 1,
    })
  );
  canvas.focus();
});

canvas.addEventListener("mousemove", (ev) => {
  const { x, y } = coords(ev);
  ws?.send(JSON.stringify({ type: "move", x, y }));
});

canvas.addEventListener(
  "wheel",
  (ev) => {
    ev.preventDefault();
    ws?.send(
      JSON.stringify({
        type: "wheel",
        deltaX: ev.deltaX,
        deltaY: ev.deltaY,
      })
    );
  },
  { passive: false }
);

window.addEventListener("keydown", (ev) => {
  if (ev.target === address) return;
  ev.preventDefault();
  if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) {
    ws?.send(JSON.stringify({ type: "type", text: ev.key }));
  } else {
    ws?.send(JSON.stringify({ type: "press", key: ev.key }));
  }
});

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  navigate(address.value);
});

canvas.tabIndex = 0;
connect();
