import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getRequestListener } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { db } from './db'
import { interview } from './interview'
import { handleMcpRequest } from './mcp'

// Local dev: load app/.env so the interviewer picks up ANTHROPIC_API_KEY (read
// per-request, so loading it here — after imports — is in time). On Fly the key
// is a secret already in process.env and no .env file is shipped.
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env')
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath)
  } catch (e) {
    console.warn('[env] could not load .env:', e)
  }
}

const app = new Hono()
app.route('/', interview)

app.get('/api/health', (c) => c.json({ ok: true }))
app.get('/api/timeline', (c) => c.json(db.prepare('SELECT * FROM timeline ORDER BY date').all()))
app.get('/api/signals', (c) => c.json(db.prepare('SELECT * FROM daily_signals ORDER BY date').all()))
app.get('/api/surveys', (c) => c.json(db.prepare('SELECT * FROM surveys ORDER BY date').all()))
app.get('/api/events', (c) => c.json(db.prepare('SELECT * FROM events ORDER BY date').all()))

if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('/*', serveStatic({ path: './dist/index.html' }))
}

const port = Number(process.env.PORT || 8080)

// Route /mcp to the remote MCP server (raw Node req/res — the MCP Streamable HTTP
// transport writes directly to the response); everything else goes to Hono.
const honoListener = getRequestListener(app.fetch)
const server = createServer((req, res) => {
  const path = (req.url || '').split('?')[0]
  if (path === '/mcp' || path.startsWith('/mcp/')) {
    void handleMcpRequest(req, res)
  } else {
    honoListener(req, res)
  }
})
server.listen(port, () => console.log(`[server] listening on http://localhost:${port} (MCP at /mcp)`))
