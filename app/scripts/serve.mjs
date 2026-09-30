// Zero-dependency static server for dist/ (default http://localhost:4173, override with PORT).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '..', 'dist');
const port = Number(process.env.PORT || 4173);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(dist, rel));
    if (!file.startsWith(dist + path.sep) && file !== dist) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(400).end('Bad request');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`SCS-C03 trainer served from ${dist}`);
  console.log(`  http://localhost:${port}`);
});
