import { createServer } from "node:http";
import next from "next";

/**
 * Startup file for Plesk (Phusion Passenger).
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
 */

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port);

  console.log(`> My Page a escutar na porta ${port} (${dev ? "development" : "production"})`);
});
