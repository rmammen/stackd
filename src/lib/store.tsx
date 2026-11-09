import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import data from '../data/tools.json'
import { buildStack, rank, recommendSpend, type Profile, type Scored, type SpendAdvice, type Tool } from './engine'
import { userCount, usageLevel } from './questions'

export const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
export const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

// Keys are versioned so data saved by older builds is ignored.
export const K = { profile: 'stackd1.profile', drafts: 'stackd1.drafts', compare: 'stackd1.compare', priorities: 'stackd1.priorities', pilot: 'stackd1.pilot', lab: 'stackd1.lab' }

export type User = { id: string; email: string; company: string; createdAt: string }
// Uploaded files live in memory only. They are cleared when the tab closes and are never saved in the browser or on our server.
export type Upload = { name: string; size: number; text: string }
export type Priority = { id: string; label: string }

type Store = {
  profile: Profile | null; setProfile: (p: Profile | null) => void
  tools: Tool[]; drafts: Tool[]; addDraft: (t: Tool) => void; removeDraft: (id: string) => void
  ranked: Scored[]; spend: SpendAdvice | null
  compare: string[]; toggleCompare: (id: string) => void; setCompare: (ids: string[]) => void
  priorities: Priority[]; setPriorities: (p: Priority[]) => void
  files: Upload[]; setFiles: (f: Upload[]) => void
  user: User | null; setUser: (u: User | null) => void; authReady: boolean
  saveVersion: (kind: 'assessment' | 'comparison', data: unknown) => Promise<boolean>
}
const Ctx = createContext<Store>(null!)
export const useStore = () => useContext(Ctx)

export const DEFAULT_PRIORITIES: Priority[] = [
  { id: 'cost', label: 'Cost' }, { id: 'ease', label: 'Ease of use' }, { id: 'integrations', label: 'Integrations' }, { id: 'support', label: 'Support and reliability' },
]

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => load(K.profile, null))
  const [drafts, setDrafts] = useState<Tool[]>(() => load(K.drafts, []))
  const [compare, setCompare] = useState<string[]>(() => load(K.compare, []))
  const [priorities, setPriorities] = useState<Priority[]>(() => load(K.priorities, DEFAULT_PRIORITIES))
  const [files, setFiles] = useState<Upload[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  useEffect(() => save(K.profile, profile), [profile])
  useEffect(() => save(K.drafts, drafts), [drafts])
  useEffect(() => save(K.compare, compare), [compare])
  useEffect(() => save(K.priorities, priorities), [priorities])
  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(j => setUser(j.user ?? null)).catch(() => {}).finally(() => setAuthReady(true)) }, [])

  const tools = useMemo(() => [...(data.tools as Tool[]), ...drafts], [drafts])
  // When the owner is unsure of a budget, rank once with no budget limit, recommend an amount from expected use, then rank against that amount.
  const { ranked, spend } = useMemo(() => {
    if (!profile) return { ranked: [], spend: null }
    const a = profile.answers
    const level = a ? usageLevel(a) : 'light'
    const users = a ? userCount(a) : 1
    if (profile.budgetKnown !== false) {
      const r = rank(tools, profile)
      return { ranked: r, spend: recommendSpend(buildStack(r, profile), level, users) }
    }
    const open = { ...profile, budget: 100_000 }
    const rec = recommendSpend(buildStack(rank(tools, open), open), level, users)
    return { ranked: rank(tools, { ...profile, budget: rec.amount }), spend: rec }
  }, [tools, profile])

  const saveVersion = useCallback(async (kind: 'assessment' | 'comparison', body: unknown) => {
    if (!user) return false
    try { const r = await fetch('/api/history', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, data: body }) }); return r.ok } catch { return false }
  }, [user])

  const value: Store = {
    profile, setProfile, tools, drafts, ranked, spend, compare, setCompare, priorities, setPriorities, files, setFiles, user, setUser, authReady, saveVersion,
    addDraft: t => setDrafts(d => [...d.filter(x => x.id !== t.id), t]),
    removeDraft: id => { setDrafts(d => d.filter(x => x.id !== id)); setCompare(c => c.filter(x => x !== id)) },
    toggleCompare: id => setCompare(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id])),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Snapshot of what the owner saw: answers plus the top recommendations at that moment.
export function assessmentSnapshot(profile: Profile, ranked: Scored[]) {
  const stack = buildStack(ranked, profile)
  return {
    profile,
    top: ranked.slice(0, 8).map(r => ({ id: r.tool.id, name: r.tool.name, score: r.score })),
    stack: stack.picks.map(p => ({ problem: p.problem, id: p.scored.tool.id, name: p.scored.tool.name, score: p.scored.score })),
  }
}
