// Two local origins, one authoritative mock store. No external dependencies.
const http = require('node:http');
const net = require('node:net');
const { spawn } = require('node:child_process');
const path = require('node:path');
const production = process.argv.includes('--production');
const root = path.resolve(__dirname, '..');
let child;
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  server.close();
  if (child && !child.killed) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500).unref();
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost:2001');
  if (url.pathname === '/') url.pathname = '/platform';
  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      method: request.method,
      path: url.pathname + url.search,
      headers: { ...request.headers, host: 'localhost:3000' },
    },
    (incoming) => {
      response.writeHead(incoming.statusCode, incoming.headers);
      incoming.pipe(response);
    },
  );
  upstream.on('error', () => {
    if (!response.headersSent)
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '2' });
    response.end('The local demo is starting. Refresh in a moment.');
  });
  request.on('aborted', () => upstream.destroy());
  request.pipe(upstream);
});

server.on('upgrade', (request, socket, head) => {
  const upstream = net.connect(3000, '127.0.0.1', () => {
    const headers = { ...request.headers, host: 'localhost:3000' };
    upstream.write(
      `${request.method} ${request.url} HTTP/1.1\r\n${Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\r\n')}\r\n\r\n`,
    );
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  socket.on('close', () => upstream.destroy());
});

server.on('error', (error) => {
  console.error('Platform server:', error.message);
  stop(1);
});
server.listen(2001, '127.0.0.1', () => {
  child = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules/next/dist/bin/next'),
      production ? 'start' : 'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3000',
    ],
    { cwd: root, stdio: 'inherit', windowsHide: true },
  );
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => stop(code || 0));
  console.log('\nDevice:   http://localhost:3000\nPlatform: http://localhost:2001\n');
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
