import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { discover } from './discover.js'
import { openDb, RETENTION_DAYS, SESSION_DAYS } from './db.js'
import { analyze, claudeEnabled, explain, rehearse } from './claude.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const PORT = Number(process.env.PORT) || 8787
const db = openDb(process.env.STACKD_DB || join(root, 'server/data/db.json'))
const tools = JSON.parse(await readFile(join(root, 'src/data/tools.json'), 'utf8'))
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' }

const send = (res, code, body, headers = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(body)) }
const body = (req, limit = 50_000) => new Promise((ok, fail) => {
  let d = ''
  req.on('data', c => { d += c; if (d.length > limit) { fail(new Error('Request too large')); req.destroy() } })
  req.on('end', () => { try { ok(JSON.parse(d || '{}')) } catch (e) { fail(e) } })
})
const cookie = (req, name) => (req.headers.cookie || '').split(/;\s*/).map(c => c.split('=')).find(([k]) => k === name)?.[1]
const sessionCookie = (token, maxAge) => `stackd_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`

// Very small per-IP limiter for sign-in attempts.
const attempts = new Map()
const limited = ip => { const now = Date.now(), a = (attempts.get(ip) || []).filter(t => now - t < 600_000); a.push(now); attempts.set(ip, a); return a.length > 20 }

function templateExplain({ profile, tool, breakdown, score }) {
  const top = [...breakdown].sort((a, b) => b.points / b.max - a.points / a.max)
  return `${tool.name} scores ${score}/100 for ${profile.businessName || 'your business'}. Its strongest area is ${top[0].label.toLowerCase()} (${top[0].reason}). The weakest is ${top.at(-1).label.toLowerCase()} (${top.at(-1).reason}). Start with a free or trial plan, test it on one workflow for two weeks, and confirm pricing and data terms on the vendor's site before committing.`
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  const p = url.pathname
  try {
    if (p === '/api/health') return send(res, 200, { ok: true, claude: claudeEnabled, retentionDays: RETENTION_DAYS })
    if (p === '/api/tools') return send(res, 200, tools)
    if (p === '/api/explain' && req.method === 'POST') {
      const input = await body(req)
      if (!input.tool || !input.breakdown) return send(res, 400, { error: 'tool and breakdown required' })
      if (claudeEnabled) { try { return send(res, 200, { source: 'claude', text: await explain(input) }) } catch (e) { console.error('explain:', e.message) } }
      return send(res, 200, { source: 'template', text: templateExplain(input) })
    }
    if (p === '/api/analyze' && req.method === 'POST') {
      if (!claudeEnabled) return send(res, 503, { error: 'Claude analysis is not set up on this server' })
      const input = await body(req, 400_000) // file text is used for this request only and never written to disk
      const catalog = tools.tools.map(t => ({ id: t.id, name: t.name, category: t.category, solves: t.solves, startingMonthly: t.pricing.startingMonthly, paidMonthly: t.pricing.paidMonthly, pricing: t.pricing.display }))
      try { return send(res, 200, await analyze({ ...input, catalog })) } catch (e) { console.error('analyze:', e.message); return send(res, 502, { error: 'Claude could not complete the analysis' }) }
    }
    if (p === '/api/rehearse' && req.method === 'POST') {
      if (!claudeEnabled) return send(res, 503, { error: 'Claude rehearsal is not set up on this server' })
      try { return send(res, 200, await rehearse(await body(req, 100_000))) } catch (e) { console.error('rehearse:', e.message); return send(res, 502, { error: 'Claude could not complete the rehearsal' }) }
    }
    if (p === '/api/discover' && req.method === 'POST') {
      const { url: target } = await body(req)
      try { return send(res, 200, await discover(String(target))) } catch (e) { return send(res, 422, { error: e.message }) }
    }

    // Accounts
    const token = cookie(req, 'stackd_session')
    const user = db.userForToken(token)
    if (p === '/api/auth/me') return send(res, 200, { user })
    if ((p === '/api/auth/signup' || p === '/api/auth/login') && req.method === 'POST') {
      if (limited(req.socket.remoteAddress)) return send(res, 429, { error: 'Too many attempts. Wait a few minutes and try again.' })
      const { email, password, company } = await body(req)
      try {
        const u = p.endsWith('signup') ? db.signup(email, password, company) : db.login(email, password)
        return send(res, 200, { user: u }, { 'set-cookie': sessionCookie(db.createSession(u.id), SESSION_DAYS * 86400) })
      } catch (e) { return send(res, 400, { error: e.message }) }
    }
    if (p === '/api/auth/logout' && req.method === 'POST') { if (token) db.endSession(token); return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0) }) }

    // Everything below needs a signed-in user, and only ever touches that user's data.
    if (p === '/api/auth/account' || p.startsWith('/api/history')) {
      if (!user) return send(res, 401, { error: 'Sign in to use saved versions' })
      if (p === '/api/auth/account' && req.method === 'DELETE') { db.deleteUser(user.id); return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0) }) }
      if (p === '/api/history' && req.method === 'GET') return send(res, 200, { versions: db.listSnapshots(user.id), retentionDays: RETENTION_DAYS })
      if (p === '/api/history' && req.method === 'POST') {
        const { kind, data } = await body(req, 200_000)
        try { return send(res, 200, { version: db.addSnapshot(user.id, kind, data) }) } catch (e) { return send(res, 400, { error: e.message }) }
      }
      const m = p.match(/^\/api\/history\/([\w-]+)$/)
      if (m && req.method === 'DELETE') return db.deleteSnapshot(user.id, m[1]) ? send(res, 200, { ok: true }) : send(res, 404, { error: 'Version not found' })
    }
    if (p.startsWith('/api/')) return send(res, 404, { error: 'Not found' })

    // Static files (production build) with SPA fallback
    const dist = join(root, 'dist')
    const file = normalize(join(dist, p))
    if (!file.startsWith(dist)) return send(res, 403, { error: 'Forbidden' })
    const data = await readFile(extname(file) ? file : join(dist, 'index.html')).catch(() => readFile(join(dist, 'index.html')))
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'text/html' }); res.end(data)
  } catch (e) {
    console.error(e.message); send(res, 500, { error: 'Server error' })
  }
})
server.listen(PORT, () => console.log(`Stackd API on http://localhost:${PORT} (Claude ${claudeEnabled ? 'enabled' : 'off, using built-in results'})`))
