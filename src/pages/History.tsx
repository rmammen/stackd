import { useEffect, useState } from 'react'
import type { Profile } from '../lib/engine'
import { describe } from '../lib/questions'
import { useStore, type Priority } from '../lib/store'
import { RETENTION_MONTHS } from '../lib/privacy'
import { EmptyState, PageHeader, Wrap } from '../components/ui'

type Rec = { id: string; name: string; score: number; fit?: number }
type Version =
  | { id: string; kind: 'assessment'; createdAt: string; data: { profile: Profile; top: Rec[]; stack: (Rec & { problem: string })[] } }
  | { id: string; kind: 'comparison'; createdAt: string; data: { priorities: Priority[]; tools: Rec[]; businessName: string } }

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function Changes({ older, newer }: { older: Version; newer: Version }) {
  if (older.kind !== 'assessment' || newer.kind !== 'assessment') return <p className="text-sm text-slate-600">Pick two assessments to see what changed.</p>
  const a = older.data.profile.answers ? describe(older.data.profile.answers) : {}
  const b = newer.data.profile.answers ? describe(newer.data.profile.answers) : {}
  const fields = Object.keys(b).filter(k => a[k] !== b[k])
  const ids = [...new Set([...older.data.top.map(t => t.id), ...newer.data.top.map(t => t.id)])]
  const recs = ids.map(id => ({ id, o: older.data.top.find(t => t.id === id), n: newer.data.top.find(t => t.id === id) }))
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div>
        <h3 className="font-semibold text-navy-900 text-sm">Answers that changed</h3>
        {fields.length === 0 ? <p className="mt-2 text-sm text-slate-600">No answers changed.</p> : (
          <table className="mt-2 w-full text-sm"><tbody>{fields.map(k => <tr key={k} className="border-t border-slate-200 align-top"><th className="py-2 pr-3 text-left font-medium text-slate-900 w-36">{k}</th><td className="py-2 pr-3 text-slate-500 line-through decoration-slate-300">{a[k] ?? 'Not given'}</td><td className="py-2 text-slate-900">{b[k]}</td></tr>)}</tbody></table>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-navy-900 text-sm">How recommendations changed</h3>
        <table className="mt-2 w-full text-sm">
          <thead className="text-xs text-slate-500 text-left"><tr><th className="py-1 font-medium">Tool</th><th className="py-1 font-medium">Before</th><th className="py-1 font-medium">After</th><th className="py-1 font-medium">Change</th></tr></thead>
          <tbody>{recs.map(r => { const d = r.o && r.n ? r.n.score - r.o.score : null; return (
            <tr key={r.id} className="border-t border-slate-200"><td className="py-2 text-slate-900">{(r.n ?? r.o)!.name}</td><td className="py-2 tabular-nums">{r.o?.score ?? 'Not in top 8'}</td><td className="py-2 tabular-nums">{r.n?.score ?? 'Not in top 8'}</td>
              <td className={`py-2 tabular-nums ${d === null ? 'text-slate-500' : d > 0 ? 'text-brand-700' : d < 0 ? 'text-red-700' : 'text-slate-500'}`}>{d === null ? (r.n ? 'New' : 'Dropped') : d > 0 ? `+${d}` : d}</td></tr>
          ) })}</tbody>
        </table>
      </div>
    </div>
  )
}

export default function History() {
  const { user, setUser, authReady, setProfile, setCompare, setPriorities, ranked } = useStore()
  const [versions, setVersions] = useState<Version[] | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<string | null>(null)
  const [pair, setPair] = useState<string[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user) return
    fetch('/api/history').then(r => r.json().then(j => { if (!r.ok) throw new Error(j.error); setVersions(j.versions) })).catch(e => setError(e.message || 'Could not load your history'))
  }, [user])

  if (!authReady) return <Wrap><p className="text-sm text-slate-500">Loading...</p></Wrap>
  if (!user) return (
    <Wrap className="py-16"><EmptyState title="Sign in to see your history" text="Version history is tied to your account so each company's answers stay private. Create a free account, then every finished assessment and saved comparison appears here with its date." action={<><a href="#/signup" className="btn-primary">Create a free account</a><a href="#/signin" className="btn-ghost">Sign in</a></>} /></Wrap>
  )

  const remove = async (id: string) => {
    if (!confirm('Delete this saved version? This cannot be undone.')) return
    const r = await fetch(`/api/history/${id}`, { method: 'DELETE' })
    if (r.ok) { setVersions(v => v!.filter(x => x.id !== id)); setPair(p => p.filter(x => x !== id)); if (view === id) setView(null) }
  }
  const restore = (v: Version) => {
    if (v.kind === 'assessment') { setProfile(v.data.profile); setMsg(`Restored your answers from ${when(v.createdAt)}. Your recommendations now use them.`) }
    else { const ids = v.data.tools.map(t => t.id).filter(id => ranked.some(r => r.tool.id === id)); setCompare(ids); setPriorities(v.data.priorities); setMsg(`Restored the comparison from ${when(v.createdAt)}.`) }
  }
  const signOut = async () => { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null) }
  const deleteAccount = async () => {
    if (!confirm('Delete your account and every saved version? This cannot be undone. Answers saved in this browser are not affected.')) return
    const r = await fetch('/api/auth/account', { method: 'DELETE' })
    if (r.ok) { setUser(null); location.hash = '#/' }
  }
  const togglePair = (id: string) => setPair(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id].slice(-2))
  const assessments = (versions ?? []).filter(v => v.kind === 'assessment')
  const chosen = pair.map(id => versions!.find(v => v.id === id)!).filter(Boolean).sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return (
    <>
      <PageHeader title="Version history" actions={<button className="btn-ghost" onClick={signOut}>Sign out</button>}>Signed in as {user.email}{user.company && ` for ${user.company}`}. Every finished assessment and saved comparison is kept here with its date.</PageHeader>
      <Wrap>
        <p className="mb-6 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Only you can see these versions. They are stored on the Stackd server and deleted automatically {RETENTION_MONTHS} months after they were saved. You can delete any version now.</p>
        {msg && <p className="mb-4 rounded-md bg-brand-50 border border-brand-200 px-4 py-2 text-sm text-brand-900" role="status">{msg} <a href="#/results" className="underline">View recommendations</a></p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        {versions && versions.length === 0 && <EmptyState title="No saved versions yet" text="Finish an assessment while signed in, or save a comparison, and it will appear here." action={<a href="#/assess" className="btn-primary">Take the assessment</a>} />}

        {assessments.length > 1 && (
          <section className="card p-5 mb-6">
            <h2 className="h-section">Your top recommendation over time</h2>
            <ol className="mt-3 flex flex-wrap gap-2">{[...assessments].reverse().map(v => v.kind === 'assessment' && <li key={v.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><p className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleDateString()}</p><p className="font-medium text-navy-900">{v.data.top[0]?.name ?? 'None'} <span className="font-normal text-slate-500 tabular-nums">{v.data.top[0]?.score}</span></p></li>)}</ol>
            <p className="mt-3 text-sm text-slate-600">Tick Compare on two assessments below to see exactly what changed.</p>
          </section>
        )}

        {chosen.length === 2 && <section className="card p-5 mb-6"><h2 className="h-section">Changes from {when(chosen[0].createdAt)} to {when(chosen[1].createdAt)}</h2><div className="mt-4"><Changes older={chosen[0]} newer={chosen[1]} /></div></section>}

        {versions && versions.length > 0 && (
          <ul className="card divide-y divide-slate-200">
            {versions.map(v => (
              <li key={v.id} className="p-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`chip ring-1 ring-inset ${v.kind === 'assessment' ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-accent-50 text-accent-800 ring-accent-200'}`}>{v.kind === 'assessment' ? 'Assessment' : 'Comparison'}</span>
                  <p className="font-medium text-navy-900">{when(v.createdAt)}</p>
                  <p className="text-sm text-slate-500">{v.kind === 'assessment' ? `Top match: ${v.data.top[0]?.name ?? 'none'}` : `${v.data.tools.length} tools, best fit: ${v.data.tools[0]?.name}`}</p>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {v.kind === 'assessment' && <label className="flex items-center gap-1.5 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={pair.includes(v.id)} onChange={() => togglePair(v.id)} />Compare</label>}
                    <button className="btn-ghost btn-sm" onClick={() => setView(view === v.id ? null : v.id)}>{view === v.id ? 'Hide' : 'View'}</button>
                    <button className="btn-ghost btn-sm" onClick={() => restore(v)}>Restore</button>
                    <button className="btn-sm btn text-red-700 hover:bg-red-50" onClick={() => remove(v.id)}>Delete</button>
                  </div>
                </div>
                {view === v.id && (
                  <div className="mt-4 grid lg:grid-cols-2 gap-4 text-sm fade">
                    {v.kind === 'assessment' ? <>
                      <div><h3 className="font-semibold text-navy-900">Answers</h3><dl className="mt-2">{Object.entries(v.data.profile.answers ? describe(v.data.profile.answers) : {}).map(([k, val]) => <div key={k} className="grid grid-cols-[150px_1fr] gap-2 border-t border-slate-100 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="text-slate-900">{val}</dd></div>)}</dl></div>
                      <div><h3 className="font-semibold text-navy-900">Recommendations then</h3><ol className="mt-2 space-y-1">{v.data.top.map((t, i) => <li key={t.id} className="flex justify-between border-t border-slate-100 py-1.5"><span>{i + 1}. {t.name}</span><span className="tabular-nums text-slate-600">{t.score}</span></li>)}</ol>
                        {v.data.stack.length > 0 && <p className="mt-2 text-slate-600">Suggested set: {v.data.stack.map(s => s.name).join(', ')}</p>}</div>
                    </> : <>
                      <div><h3 className="font-semibold text-navy-900">Your priorities</h3><ol className="mt-2 list-decimal pl-5">{v.data.priorities.map(p => <li key={p.id}>{p.label}</li>)}</ol></div>
                      <div><h3 className="font-semibold text-navy-900">Tools, by fit</h3><ol className="mt-2 space-y-1">{v.data.tools.map((t, i) => <li key={t.id} className="flex justify-between border-t border-slate-100 py-1.5"><span>{i + 1}. {t.name}</span><span className="tabular-nums text-slate-600">{t.fit}% fit · {t.score}</span></li>)}</ol></div>
                    </>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <section className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="font-semibold text-navy-900">Delete your account</h2>
          <p className="mt-1 text-sm text-slate-600">Removes your account and every saved version from our server right away.</p>
          <button className="btn mt-3 border border-red-300 text-red-700 hover:bg-red-50" onClick={deleteAccount}>Delete my account</button>
        </section>
      </Wrap>
    </>
  )
}
