import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".wav": "audio/wav", ".mp4": "video/mp4", ".m4a": "audio/mp4",
  ".ttf": "font/ttf", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

export function createPreviewServer(directory) {
  const root = resolve(directory);
  return createServer((request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
    catch { response.writeHead(400).end(); return; }
    // Decode before checking containment, including Windows path separators.
    const file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!file.startsWith(root + sep) || pathname.includes("\0") || pathname.includes("\\")) {
      response.writeHead(403).end(); return;
    }
    let info;
    try { info = statSync(file); }
    catch { response.writeHead(404).end(); return; }
    if (!info.isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "Content-Length": info.size,
    });
    if (request.method === "HEAD") { response.end(); return; }
    const stream = createReadStream(file);
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.argv[2] ?? fileURLToPath(new URL("../dist-web/", import.meta.url));
  const port = Number(process.env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("PORT must be between 1 and 65535."); process.exit(1);
  }
  if (!existsSync(resolve(root, "index.html"))) {
    console.error("Web build missing. Run npm run export:web first."); process.exit(1);
  }
  const server = createPreviewServer(root);
  server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log(`DeskGuard: http://127.0.0.1:${port}\nPress Ctrl+C to stop.`));
}
