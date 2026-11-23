// 試験用の静的サーバ
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
export function serve(port = 0) {
  const srv = http.createServer(async (req, res) => {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (p.endsWith('/')) p += 'index.html';
    try { const body = await readFile(join(ROOT, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(body); }
    catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise(ok => srv.listen(port, () => ok({ url: `http://localhost:${srv.address().port}`, close: () => srv.close() })));
}
if (import.meta.url === `file://${process.argv[1]}`) serve(8080).then(s => console.log(s.url));
