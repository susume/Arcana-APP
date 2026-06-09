import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createServer } from 'node:http';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
  const safePath = url.pathname.replace(/^\/+/, '').replace(/\.\./g, '');
  let filePath = join(root, safePath || 'index.html');

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(root, 'index.html');
  }

  response.setHeader('Content-Type', types[extname(filePath)] || 'application/octet-stream');
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Arcana preview running at http://127.0.0.1:${port}/`);
});
