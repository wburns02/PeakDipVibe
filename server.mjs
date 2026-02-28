import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = process.env.PORT || 3000;
const DIST = join(import.meta.dirname, "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

const indexHtml = readFileSync(join(DIST, "index.html"));

const server = createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"status":"ok"}');
    return;
  }

  // Try to serve static file
  const urlPath = req.url.split("?")[0];
  const filePath = join(DIST, urlPath);

  if (urlPath !== "/" && existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath);
    const contentType = MIME[ext] || "application/octet-stream";
    const file = readFileSync(filePath);

    const headers = { "Content-Type": contentType };
    // Cache hashed assets for 1 year
    if (urlPath.includes("/assets/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }

    res.writeHead(200, headers);
    res.end(file);
    return;
  }

  // SPA fallback — serve index.html
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(indexHtml);
});

server.listen(PORT, () => {
  console.log(`PeakDipVibe server listening on port ${PORT}`);
});
