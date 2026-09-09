import http from 'node:http';
import { readFile } from 'node:fs/promises';

// Intentionally small test target, not an authentication service.
const page = await readFile(new URL('./login.html', import.meta.url));
const port = Number(process.env.DEMO_PORT || 4173);
const server = http.createServer(async (request, response) => {
  const json = (status, message) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ message }));
  };
  if (request.method === 'GET' && request.url === '/health') return json(200, 'ready');
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return response.end(page);
  }
  if (request.method !== 'POST' || request.url !== '/api/login') return json(404, 'Not found');
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 8192) return json(413, 'Request too large');
    }
    const data = JSON.parse(body);
    if (!data || typeof data.username !== 'string' || typeof data.password !== 'string' || !data.username.trim() || !data.password.trim()) return json(400, 'Username and password are required');
    if (data.username === 'locked.user' && data.password === 'DemoPass123!') {
      // Opt-in reproducible defect for demonstrating real report triage.
      if (process.env.DEMO_BUG === 'locked-login') return json(200, 'Welcome, locked.user!');
      return json(423, 'Account is locked');
    }
    if (data.username === 'qa.user' && data.password === 'DemoPass123!') return json(200, 'Welcome, qa.user!');
    return json(401, 'Invalid credentials');
  } catch { return json(400, 'Invalid JSON'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Demo login: http://127.0.0.1:${port}`));
