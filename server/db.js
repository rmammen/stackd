// Small JSON file store for accounts and saved versions. No external database.
// Passwords are hashed with scrypt and never stored or logged in plain text.
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export const RETENTION_DAYS = 365 // saved versions are deleted automatically after this many days
export const SESSION_DAYS = 30
const DAY = 86_400_000

export function openDb(file) {
  let db = { users: [], sessions: [], snapshots: [] }
  try { db = { ...db, ...JSON.parse(readFileSync(file, 'utf8')) } } catch { /* first run */ }
  const persist = () => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file + '.tmp', JSON.stringify(db))
    renameSync(file + '.tmp', file) // atomic replace
  }
  const prune = () => {
    const now = Date.now()
    const before = db.snapshots.length + db.sessions.length
    db.snapshots = db.snapshots.filter(s => now - Date.parse(s.createdAt) < RETENTION_DAYS * DAY)
    db.sessions = db.sessions.filter(s => s.expires > now)
    if (db.snapshots.length + db.sessions.length !== before) persist()
  }
  prune()

  const hash = (password, salt) => scryptSync(password, salt, 64).toString('hex')
  const publicUser = u => ({ id: u.id, email: u.email, company: u.company, createdAt: u.createdAt })

  return {
    prune,
    signup(email, password, company) {
      email = String(email || '').trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address')
      if (String(password || '').length < 8) throw new Error('Use a password with at least 8 characters')
      if (db.users.some(u => u.email === email)) throw new Error('An account with that email already exists. Try signing in.')
      const salt = randomBytes(16).toString('hex')
      const user = { id: randomUUID(), email, company: String(company || '').trim().slice(0, 120), salt, hash: hash(password, salt), createdAt: new Date().toISOString() }
      db.users.push(user); persist()
      return publicUser(user)
    },
    login(email, password) {
      const u = db.users.find(x => x.email === String(email || '').trim().toLowerCase())
      const ok = u && timingSafeEqual(Buffer.from(hash(String(password || ''), u.salt), 'hex'), Buffer.from(u.hash, 'hex'))
      if (!ok) throw new Error('That email and password do not match an account')
      return publicUser(u)
    },
    createSession(userId) {
      const token = randomBytes(32).toString('hex')
      db.sessions.push({ token, userId, expires: Date.now() + SESSION_DAYS * DAY }); persist()
      return token
    },
    userForToken(token) {
      const s = token && db.sessions.find(x => x.token === token && x.expires > Date.now())
      const u = s && db.users.find(x => x.id === s.userId)
      return u ? publicUser(u) : null
    },
    endSession(token) { db.sessions = db.sessions.filter(s => s.token !== token); persist() },
    deleteUser(userId) {
      db.users = db.users.filter(u => u.id !== userId)
      db.sessions = db.sessions.filter(s => s.userId !== userId)
      db.snapshots = db.snapshots.filter(s => s.userId !== userId)
      persist()
    },
    // Each snapshot belongs to one user and is only ever returned to that user.
    listSnapshots(userId) { prune(); return db.snapshots.filter(s => s.userId === userId).map(({ userId: _, ...s }) => s).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) },
    addSnapshot(userId, kind, data) {
      if (!['assessment', 'comparison'].includes(kind)) throw new Error('Unknown version type')
      const snap = { id: randomUUID(), userId, kind, createdAt: new Date().toISOString(), data }
      db.snapshots.push(snap); persist()
      const { userId: _, ...rest } = snap
      return rest
    },
    deleteSnapshot(userId, id) {
      const n = db.snapshots.length
      db.snapshots = db.snapshots.filter(s => !(s.userId === userId && s.id === id))
      persist()
      return db.snapshots.length < n
    },
  }
}
