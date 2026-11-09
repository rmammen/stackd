import { useState, type ReactNode } from 'react'
import type { Scored, Tool } from '../lib/engine'
import { DEFAULT_PRIORITIES, useStore } from '../lib/store'
import { priorityFit, strengths, whyBest } from '../lib/priorities'
import { EmptyState, Icon, NeedProfile, NotVerified, OtherInput, PageHeader, ScoreBadge, Tag, Wrap } from '../components/ui'

// A tool the owner typed in by name only. Every fact starts as Not Verified.
const blankTool = (name: string): Tool => ({
  id: 'draft-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40), name, vendor: name, url: '', category: 'Added by you', draft: true,
  solves: [], businessTypes: ['any'], pricing: { startingMonthly: null, paidMonthly: null, display: 'Not Verified', source: '' },
  integrations: [], features: [], privacy: { summary: null, url: null }, cancellation: null, risks: [], setup: 3, maturity: 2,
})

export default function Compare() {
  const { profile, ranked, compare, toggleCompare, setCompare, addDraft, priorities, setPriorities, user, saveVersion } = useStore()
  const [pick, setPick] = useState('')
  const [saved, setSaved] = useState('')
  if (!profile) return <NeedProfile />
  const picks = compare.map(id => ranked.find(r => r.tool.id === id)).filter((x): x is Scored => !!x)
  const available = ranked.filter(r => !compare.includes(r.tool.id))
  const add = (id: string) => { if (id && !compare.includes(id)) setCompare([...compare, id]); setPick('') }
  const addOther = (name: string) => { const t = blankTool(name); addDraft(t); add(t.id) }
  const move = (i: number, d: number) => { const p = [...priorities]; [p[i], p[i + d]] = [p[i + d], p[i]]; setPriorities(p) }
  const unused = DEFAULT_PRIORITIES.filter(d => !priorities.some(p => p.id === d.id))
  const rows = priorityFit(priorities, picks)
  const fitOf = (s: Scored) => rows.find(r => r.s === s)!

  const saveComparison = async () => {
    if (!user) return setSaved('signup')
    const ok = await saveVersion('comparison', { priorities, tools: rows.map(r => ({ id: r.s.tool.id, name: r.s.tool.name, score: r.s.score, fit: r.fit })), businessName: profile.businessName })
    setSaved(ok ? 'Comparison saved to your History.' : 'We could not save this comparison. Try again.')
  }

  const details: [string, (s: Scored) => ReactNode][] = [
    ['Why choose it', s => { const g = strengths(s, picks).good; return g.length ? <ul className="space-y-1">{g.map(x => <li key={x} className="flex gap-1.5"><Icon name="check" className="h-4 w-4 mt-0.5 shrink-0 text-brand-700" />{x}</li>)}</ul> : <span className="text-slate-500">No clear advantage among these</span> }],
    ['Watch out for', s => <ul className="space-y-1">{strengths(s, picks).watch.map(x => <li key={x} className="flex gap-1.5"><Icon name="alert" className="h-4 w-4 mt-0.5 shrink-0 text-accent-600" />{x}</li>)}</ul>],
    ['Pricing', s => s.tool.pricing.startingMonthly === null ? <><NotVerified /><p className="text-xs text-slate-500 mt-1">{s.tool.pricing.display}</p></> : s.tool.pricing.display],
    ['Category', s => s.tool.category],
    ['Works with your software', s => s.breakdown.find(x => x.key === 'integrations')!.reason],
    ['Listed integrations', s => s.tool.integrations.join(', ') || <NotVerified />],
    ['Privacy', s => s.tool.privacy.summary ?? <NotVerified />],
    ['Cancellation', s => s.tool.cancellation ?? <NotVerified />],
    ['Source', s => s.tool.pricing.source ? <a className="text-brand-700 underline" href={s.tool.pricing.source} target="_blank" rel="noreferrer">Pricing page</a> : <NotVerified />],
  ]
  return (
    <>
      <PageHeader step="Step 3 of 5" title="Compare tools" actions={picks.length > 1 && <button className="btn-ghost" onClick={saveComparison}>Save this comparison</button>}>Add as many tools as you like, then rank what matters most to you. We use your ranking to explain which tool fits better and why.</PageHeader>
      <Wrap>
        {saved === 'signup' ? <p className="mb-4 rounded-md bg-accent-50 border border-accent-200 px-4 py-2 text-sm" role="status"><a href="#/signup" className="underline font-medium">Create a free account</a> or <a href="#/signin" className="underline">sign in</a> to save comparisons to your history.</p>
          : saved && <p className="mb-4 rounded-md bg-brand-50 border border-brand-200 px-4 py-2 text-sm text-brand-900" role="status">{saved} <a href="#/history" className="underline">View history</a></p>}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          <section className="card p-5">
            <h2 className="font-semibold text-navy-900">Tools to compare</h2>
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="add-tool">Add a tool from the list</label>
                <select id="add-tool" className="input mt-1.5" value={pick} onChange={e => add(e.target.value)}>
                  <option value="">Choose a tool...</option>
                  {available.map(r => <option key={r.tool.id} value={r.tool.id}>{r.tool.name} ({r.score})</option>)}
                </select>
              </div>
              <div>
                <p className="label">Other</p>
                <div className="mt-1.5"><OtherInput placeholder="Type a tool not listed" onAdd={addOther} /></div>
                <p className="mt-1 text-xs text-slate-500">Fill in its details later under <a href="#/discover" className="underline">Add a Tool</a>.</p>
              </div>
            </div>
            {picks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600 mr-1">Comparing {picks.length}:</span>
                {picks.map(s => <Tag key={s.tool.id} onRemove={() => toggleCompare(s.tool.id)}>{s.tool.name}</Tag>)}
                <button className="ml-auto text-sm text-slate-600 underline hover:text-slate-900" onClick={() => setCompare([])}>Clear all</button>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-navy-900">What matters most to you?</h2>
            <p className="text-xs text-slate-500 mt-0.5">Put your top priority first. Higher priorities count more.</p>
            <ol className="mt-3 space-y-1.5">
              {priorities.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span className="w-6 text-accent-700 font-semibold tabular-nums">#{i + 1}</span>
                  <span className="flex-1 text-slate-900">{p.label}</span>
                  <button className="rounded px-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${p.label} up`}>Up</button>
                  <button className="rounded px-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === priorities.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${p.label} down`}>Down</button>
                  <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900" onClick={() => setPriorities(priorities.filter(x => x !== p))} aria-label={`Remove ${p.label}`}><Icon name="x" className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ol>
            {unused.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{unused.map(u => <button key={u.id} className="btn-ghost btn-sm" onClick={() => setPriorities([...priorities, u])}><Icon name="plus" className="h-3 w-3" />{u.label}</button>)}</div>}
            <p className="mt-3 text-sm font-medium text-slate-900">Other</p>
            <div className="mt-1.5"><OtherInput placeholder="For example, text message reminders" onAdd={v => !priorities.some(p => p.label.toLowerCase() === v.toLowerCase()) && setPriorities([...priorities, { id: 'custom:' + v, label: v }])} /></div>
          </section>
        </div>

        {picks.length === 0 ? (
          <div className="mt-8"><EmptyState title="No tools selected yet" text="Choose tools above, or start with your three highest-scoring matches." action={<button className="btn-primary" onClick={() => setCompare(ranked.slice(0, 3).map(r => r.tool.id))}>Add my top 3</button>} /></div>
        ) : (
          <>
            {picks.length > 1 && priorities.length > 0 && (
              <section className="mt-6 rounded-lg border-2 border-brand-700 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">Best fit for your priorities</p>
                <p className="mt-1 text-xl font-semibold text-navy-900">{rows[0].s.tool.name}</p>
                <p className="mt-2 text-sm text-slate-700">{whyBest(rows)}</p>
              </section>
            )}
            <section className="mt-6 card overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 300 + priorities.length * 140 }}>
                <caption className="text-left px-5 pt-5 pb-3 font-semibold text-navy-900">Ranked by your priorities</caption>
                <thead className="text-left text-xs text-slate-500 border-y border-slate-200 bg-slate-50">
                  <tr><th className="px-5 py-2 font-medium">Tool</th><th className="px-3 py-2 font-medium">Priority fit</th><th className="px-3 py-2 font-medium">Overall score</th>{priorities.map((p, i) => <th key={p.id} className="px-3 py-2 font-medium">#{i + 1} {p.label}</th>)}<th /></tr>
                </thead>
                <tbody>
                  {rows.map(({ s, fit, parts }) => (
                    <tr key={s.tool.id} className="border-b border-slate-100 last:border-0 align-top">
                      <td className="px-5 py-3 font-medium text-navy-900">{s.tool.name}</td>
                      <td className="px-3 py-3"><span className="text-base font-semibold tabular-nums text-navy-900">{fit}%</span></td>
                      <td className="px-3 py-3"><ScoreBadge score={s.score} size="sm" /></td>
                      {parts.map(x => (
                        <td key={x.p.id} className="px-3 py-3">
                          <div className="h-1.5 w-20 rounded-full bg-slate-100"><div className={`h-full rounded-full ${x.verified ? 'bg-brand-600' : 'bg-accent-400'}`} style={{ width: `${Math.round(x.value * 100)}%` }} /></div>
                          <p className="mt-1 text-xs text-slate-500 max-w-[160px]">{x.note}</p>
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right"><button className="text-xs text-slate-500 underline hover:text-slate-900" onClick={() => toggleCompare(s.tool.id)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-5 pb-4 text-xs text-slate-500">Priority fit weighs each criterion by your ranking. Amber bars use estimates or facts we could not verify.</p>
            </section>

            <section className="mt-6 card overflow-x-auto">
              <p className="px-5 pt-5 pb-3 font-semibold text-navy-900">Details {picks.length > 3 && <span className="font-normal text-sm text-slate-500">(scroll sideways to see all)</span>}</p>
              <table className="text-sm border-t border-slate-200" style={{ minWidth: 180 + picks.length * 230 }}>
                <thead><tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 w-44 px-5 py-3 text-left" />
                  {rows.map(({ s }) => <th key={s.tool.id} className="w-[230px] px-4 py-3 text-left align-top font-semibold text-navy-900">{s.tool.name}<p className="text-xs font-normal text-slate-500">{s.tool.vendor} · fit {fitOf(s).fit}%</p></th>)}
                </tr></thead>
                <tbody>{details.map(([k, f]) => (
                  <tr key={k} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-3 text-left align-top font-medium text-navy-900 shadow-[1px_0_0_#e2e8f0]">{k}</th>
                    {rows.map(({ s }) => <td key={s.tool.id} className="px-4 py-3 align-top text-slate-700">{f(s)}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </section>
          </>
        )}
      </Wrap>
    </>
  )
}
