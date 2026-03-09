/**
 * MCP-CRM Static Frontend Server
 *
 * Serves all static files (demo.html, lib/, js/, resourses/, simulator/)
 * with no-cache headers to always deliver the latest build.
 *
 * Uses __dirname so the path is portable across environments (Windows, Docker, Linux).
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = process.env.APP_ROOT || __dirname;
const PORT = process.env.FRONTEND_PORT || 8080;

const MIME = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.ico':  'image/x-icon',
    '.json': 'application/json'
};

http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];

    // Redirect root and /demo to the main demo page
    if (urlPath === '/' || urlPath === '/demo') urlPath = '/demo.html';

    // Silently ignore favicon requests (favicon is embedded as data URI in demo.html)
    if (urlPath === '/favicon.ico') { res.writeHead(204); res.end(); return; }

    const fp = path.join(ROOT, urlPath);

    try {
        const data = fs.readFileSync(fp);
        res.writeHead(200, {
            'Content-Type':  MIME[path.extname(fp)] || 'text/plain',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma':        'no-cache'
        });
        res.end(data);
    } catch (e) {
        res.writeHead(404);
        res.end('Not found: ' + urlPath);
    }

}).listen(PORT, () => console.log(`[frontend] Static server on http://localhost:${PORT}`));
