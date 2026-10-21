import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import next from "next";

/**
 * Startup file: Plesk (Phusion Passenger) and the Docker images.
 *
 * Plesk's Node.js extension runs an "Application Startup File" and expects a
 * process that calls `.listen()`; `next start` is a CLI, not that. This is the
 * programmatic equivalent, straight from the Next 16 custom-server guide
 * (node_modules/next/dist/docs/01-app/02-guides/custom-server.md).
 *
 * Passenger supplies PORT. HOSTNAME is left unset on purpose so the server
 * binds all interfaces, which is what Passenger's reverse proxy expects.
 *
 * Do NOT add `output: "standalone"` to next.config.ts while this file is the
 * entry point: that mode emits its own minimal server.js and, per the same
 * guide, "these cannot be used together".
 *
 * MYPAGE_ROLE splits the app across two servers (DEPLOY.md, lib/data.ts):
 *   all (default)  everything here, as on Plesk.
 *   api            the backend: only /api/*; pages answer 404.
 *   web            the frontend: pages here; every /api/* request is streamed
 *                  to the backend at API_URL, so the browser keeps talking to
 *                  one origin and cookies, uploads and downloads pass through
 *                  untouched. /api/internal/* is the backend's private door
 *                  for this server and is never forwarded from outside.
 */

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const role = process.env.MYPAGE_ROLE === "web" || process.env.MYPAGE_ROLE === "api" ? process.env.MYPAGE_ROLE : "all";

if (role === "web" && !process.env.API_URL) {
  console.error("MYPAGE_ROLE=web precisa de API_URL (o endereço do servidor da API).");
  process.exit(1);
}

const app = next({ dev });
const handle = app.getRequestHandler();

const isApi = (url = "") => url === "/api" || url.startsWith("/api/") || url.startsWith("/api?");
const isInternal = (url = "") => url.startsWith("/api/internal/") || url === "/api/internal";

function notFound(res) {
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

/** Streams one request to the API server and its answer back. */
function forward(req, res) {
  const target = new URL(req.url, process.env.API_URL);
  const send = target.protocol === "https:" ? httpsRequest : httpRequest;
  const forwardedFor = [req.headers["x-forwarded-for"], req.socket.remoteAddress].filter(Boolean).join(", ");

  const upstream = send(
    target,
    {
      method: req.method,
      headers: {
        ...req.headers,
        // Keep the public host: the API builds absolute URLs and cookies from it.
        host: req.headers.host,
        "x-forwarded-for": forwardedFor,
        "x-forwarded-host": req.headers["x-forwarded-host"] ?? req.headers.host,
        "x-forwarded-proto": req.headers["x-forwarded-proto"] ?? "http",
      },
    },
    (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.rawHeaders);
      answer.pipe(res);
    },
  );
  upstream.on("error", (error) => {
    console.error(`[api proxy] ${req.method} ${req.url}:`, error.message);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end("API indisponível");
    } else {
      res.destroy(error);
    }
  });
  req.pipe(upstream);
}

app.prepare().then(() => {
  createServer((req, res) => {
    if (role === "web" && isApi(req.url)) return isInternal(req.url) ? notFound(res) : forward(req, res);
    if (role === "api" && !isApi(req.url)) return notFound(res);
    handle(req, res);
  }).listen(port);

  console.log(`> My Page a escutar na porta ${port} (${dev ? "development" : "production"}, papel: ${role})`);
});
