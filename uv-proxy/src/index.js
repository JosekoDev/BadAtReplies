import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { hostname } from "node:os";
import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicPath = join(__dirname, "..", "public");
const libcurlPath = join(
  __dirname,
  "..",
  "node_modules",
  "@mercuryworkshop",
  "libcurl-transport",
  "dist"
);
const libcurlWasmPath = join(__dirname, "..", "node_modules", "libcurl.js");

wisp.options.allow_udp_streams = true;
wisp.options.allow_tcp_streams = true;
wisp.options.allow_direct_ip = true;
wisp.options.stream_limit_total = -1;
wisp.options.stream_limit_per_host = -1;
wisp.options.parse_real_ip = true;
wisp.options.parse_real_ip_from = ["127.0.0.1", "::1"];

const bare = createBareServer("/bare/");
const app = express();

app.use(express.static(publicPath));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/libcurl/", express.static(libcurlPath));
app.use("/libcurl/", express.static(libcurlWasmPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/baremod/", express.static(bareModulePath));

app.use((req, res) => {
  res.status(404);
  res.sendFile(join(publicPath, "404.html"));
});

const server = createServer();

server.on("request", (req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
    return;
  }
  app(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
    return;
  }

  const pathname = (req.url || "").split("?")[0];
  if (pathname === "/wisp/" || pathname.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
    return;
  }
  socket.end();
});

const port = parseInt(process.env.PORT || "8080", 10);

server.on("listening", () => {
  const address = server.address();
  console.log("Ultraviolet proxy listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log("\tTransports: epoxy/libcurl (wisp) + bare (/bare/)");
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("Shutting down...");
  bare.close();
  server.close();
  process.exit(0);
}

server.listen({ port, host: "0.0.0.0" });
