const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf"
};

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url || "/");
    let pathname = decodeURIComponent(parsed.pathname || "/");

    if (pathname === "/health") {
      res.writeHead(200, {"Content-Type": "text/plain; charset=utf-8"});
      return res.end("OK");
    }

    if (pathname === "/") pathname = "/index.html";

    const filePath = path.resolve(ROOT, "." + pathname);
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
        return res.end("Not found");
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-cache"
      });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (e) {
    res.writeHead(500, {"Content-Type": "text/plain; charset=utf-8"});
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
