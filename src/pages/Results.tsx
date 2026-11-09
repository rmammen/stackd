import { useEffect, useState } from 'react'
import { SCORE_PARTS, buildStack, currentAiAdvice, mustHaveCheck, problemLabel, rankReason, solvesProblem, type Scored } from '../lib/engine'
import { MUST_HAVES, NA, spendMid, summary } from '../lib/questions'
import { assessmentSnapshot, useStore } from '../lib/store'
import { FILE_CHAR_LIMIT, claudeAnalysis, localAnalysis, type Analysis } from '../lib/analysis'
import { Explain, Icon, Modal, NeedProfile, NotVerified, Notice, NutritionLabel, PageHeader, ScoreBadge, ScoreBars, Wrap } from '../components/ui'

const money = (n: number) => `$${Math.round(n).toLocaleString()}`

function ScoreGuide() {
  return (
    <details className="card p-5 group">
      <summary className="cursor-pointer font-semibold text-navy-900 list-none flex items-center justify-between">What the score out of 100 means<span className="text-sm font-normal text-brand-700 group-open:hidden">Show</span><span className="text-sm font-normal text-brand-700 hidden group-open:inline">Hide</span></summary>
      <p className="mt-3 text-sm text-slate-600">Every tool is scored the same way from your answers, so scores can be compared. 75 or higher is a strong match, 55 to 74 is worth a look, and below 55 is a weak fit. The total adds up five parts:</p>
      <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SCORE_PARTS.map(s => <li key={s.key} className="rounded-md border border-slate-200 p-3 text-sm"><p className="font-medium text-navy-900">{s.label} <span className="text-slate-500 font-normal">up to {s.max}</span></p><p className="mt-1 text-xs text-slate-600">{s.text}</p></li>)}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Scores are calculated in your browser with fixed rules. The same answers always give the same scores.</p>
    </details>
  )
}

export default function Results() {
  const { profile, ranked, compare, toggleCompare, spend, files, user, authReady, saveVersion } = useStore()
  const [label, setLabel] = useState<Scored | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [aState, setAState] = useState<{ loading: boolean; msg?: string }>({ loading: false })
  const [saved, setSaved] = useState('')

  // Save a dated version once per finished assessment, for signed-in users.
  useEffect(() => {
    if (!profile || !ranked.length || !authReady) return
    let pending = false
    try { pending = sessionStorage.getItem('stackd.pendingVersion') === '1'; sessionStorage.removeItem('stackd.pendingVersion') } catch { /* ignore */ }
    if (!pending) return
    if (user) saveVersion('assessment', assessmentSnapshot(profile, ranked)).then(ok => setSaved(ok ? 'This assessment was saved to your History.' : 'We could not save this version. Your answers are still in this browser.'))
    else setSaved('signup')
  }, [profile, ranked, user, authReady, saveVersion])

  if (!profile) return <NeedProfile />
  const a = profile.answers
  const stack = buildStack(ranked, profile)
  const unmatched = profile.problems.filter(p => !ranked.some(r => solvesProblem(r.tool, p)))
  const query = q.trim().toLowerCase()
  const list = ranked.filter(r => (filter === 'all' || solvesProblem(r.tool, filter)) && (!query || `${r.tool.name} ${r.tool.vendor} ${r.tool.category} ${r.tool.features.join(' ')}`.toLowerCase().includes(query)))
  const mustHaves = (a?.mustHaves ?? []).filter(m => m !== NA)
  const aiAdvice = currentAiAdvice((a?.tools ?? []).map(t => ({ name: t.name, spend: spendMid(t) })), ranked, profile)
  const runAnalysis = async (useClaude: boolean) => {
    if (!useClaude) return setAnalysis(localAnalysis(profile, ranked, spend, files))
    setAState({ loading: true })
    try { setAnalysis(await claudeAnalysis(profile, files)); setAState({ loading: false }) }
    catch (e) { setAnalysis(localAnalysis(profile, ranked, spend, files)); setAState({ loading: false, msg: `${(e as Error).message}. Showing the built-in summary instead.` }) }
  }
  const nameOf = (id: string) => ranked.find(r => r.tool.id === id)?.tool.name

  return (
    <>
      <PageHeader step="Step 2 of 5" title={`Recommendations for ${profile.businessName}`} actions={<a href="#/assess" className="btn-ghost">Edit my answers</a>}>
        {(a && summary(a).join(' · ')) || 'Based on your answers'}
      </PageHeader>
      <Wrap>
        {saved === 'signup' ? <div className="mb-6"><Notice title="Want to keep this version?" tone="accent"><p><a href="#/signup" className="underline font-medium">Create a free account</a> to save dated versions of your assessments and see how your recommendations change over time.</p></Notice></div>
          : saved && <p className="mb-6 rounded-md bg-brand-50 border border-brand-200 px-4 py-2 text-sm text-brand-900" role="status">{saved} <a href="#/history" className="underline">View history</a></p>}

        <div className="grid lg:grid-cols-3 gap-4">
          <section className="card p-5">
            <p className="text-sm text-slate-500">{profile.budgetKnown === false ? 'Recommended monthly spend' : 'Your budget and known cost'}</p>
            {profile.budgetKnown === false && spend ? <>
              <p className="mt-1 text-3xl font-semibold text-navy-900 tabular-nums">{spend.unknown.length ? `${money(spend.amount)} or more` : money(spend.amount)}<span className="text-sm font-normal text-slate-500"> per month</span></p>
              <p className="mt-2 text-sm text-slate-600">{spend.basis}</p>
              {spend.unknown.length > 0 && <p className="mt-2 text-sm text-amber-800">Paid pricing is Not Verified for {spend.unknown.join(', ')}, so this only counts prices we could confirm. Check those vendors before you set a budget.</p>}
            </> : <>
              <p className="mt-1 text-3xl font-semibold text-navy-900 tabular-nums">{money(stack.knownMonthly)}<span className="text-sm font-normal text-slate-500"> of {money(profile.budget)} a month</span></p>
              <p className={`mt-2 text-sm ${stack.overBudget ? 'text-red-700' : 'text-slate-600'}`}>{stack.overBudget ? 'The suggested tools cost more than your budget.' : 'The known starting cost of the suggested tools fits your budget.'}{stack.unknownCount > 0 && ` ${stack.unknownCount} ${stack.unknownCount === 1 ? 'tool has' : 'tools have'} unverified pricing.`}</p>
              {spend && <p className="mt-2 text-xs text-slate-500">For your expected use: about {money(spend.amount)} a month. {spend.basis}</p>}
            </>}
          </section>

          <section className="card p-5 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-semibold text-navy-900">Business analysis</h2><p className="text-sm text-slate-600">Estimated size and revenue, what you can afford, and your most immediate needs.{files.length > 0 && ` Uses ${files.length} uploaded ${files.length === 1 ? 'file' : 'files'}.`}</p></div>
              <div className="flex gap-2">
                <button className="btn-primary btn-sm" disabled={aState.loading} onClick={() => runAnalysis(true)}>{aState.loading ? 'Analyzing...' : 'Analyze with Claude'}</button>
                {!analysis && <button className="btn-ghost btn-sm" onClick={() => runAnalysis(false)}>Quick summary</button>}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Claude analysis sends your answers{files.length ? ' and file text' : ''} through our server to Anthropic. Nothing is stored on our server.{files.some(f => f.text.length > FILE_CHAR_LIMIT) && ` Only the first ${FILE_CHAR_LIMIT.toLocaleString()} characters of each large file are sent.`}</p>
            {aState.msg && <p className="mt-2 text-sm text-amber-800">{aState.msg}</p>}
            {analysis && (
              <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Company size</p><p className="mt-1 text-slate-800">{analysis.sizeEstimate}</p></div>
                <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Revenue estimate</p><p className="mt-1 text-slate-800">{analysis.revenueEstimate}</p><p className="text-xs text-slate-500">{analysis.revenueBasis}</p></div>
                <div className="sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">What you can afford for AI tools</p>
                  <p className="mt-1 text-slate-800">{analysis.affordableMonthlyHigh !== null && <span className="font-semibold">{analysis.affordableMonthlyLow ? `${money(analysis.affordableMonthlyLow)} to ` : 'Up to '}{money(analysis.affordableMonthlyHigh)} a month. </span>}{analysis.affordableReason}</p></div>
                <div className="sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Immediate needs</p>
                  <ul className="mt-1 space-y-2">{analysis.immediateNeeds.map(n => <li key={n.need} className="rounded-md bg-slate-50 border border-slate-200 p-3"><p className="font-medium text-navy-900">{n.need}</p><p className="text-slate-600">{n.why}</p>{n.toolIds.some(nameOf) && <p className="mt-1 text-xs text-brand-800">Suggested: {n.toolIds.map(nameOf).filter(Boolean).join(', ')}</p>}</li>)}</ul></div>
                {analysis.currentToolAdvice.length > 0 && <div className="sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tools you already pay for</p><ul className="mt-1 space-y-1">{analysis.currentToolAdvice.map(c => <li key={c.tool}><span className="font-medium">{c.tool}:</span> {c.advice}</li>)}</ul></div>}
                <p className="sm:col-span-2 text-xs text-slate-500">{analysis.source === 'claude' ? 'Written by Claude from your answers and the prices we have on file. ' : 'Built-in summary. '}{analysis.caveats}</p>
              </div>
            )}
          </section>
        </div>

        {aiAdvice.length > 0 && (
          <section className="card p-5 mt-4">
            <h2 className="font-semibold text-navy-900">AI tools you already use</h2>
            <p className="text-sm text-slate-600">Could you spend less or switch? Compared with the prices we have on file.</p>
            <ul className="mt-3 divide-y divide-slate-200">{aiAdvice.map(x => (
              <li key={x.name} className="py-3 text-sm">
                <p className="font-medium text-navy-900">{x.name}{x.spend !== null && <span className="font-normal text-slate-500"> · about {money(x.spend)} a month</span>}</p>
                <p className="text-slate-700">{x.text}</p>
                {x.cheaper.length > 0 && <ul className="mt-1 text-slate-600 list-disc pl-5">{x.cheaper.map(c => <li key={c.name}>{c.name}: {c.price}</li>)}</ul>}
              </li>
            ))}</ul>
          </section>
        )}

        <section className="card mt-6">
          <div className="p-6 border-b border-slate-200"><h2 className="h-section">Suggested set of tools</h2><p className="mt-1 text-sm text-slate-600">The best match for each need, favoring tools that work with your software.</p></div>
          {stack.picks.length === 0 ? <p className="p-6 text-sm text-slate-600">None of the tools in our list match the needs you entered. Try adding a tool under <a href="#/discover" className="underline">Add a Tool</a>.</p> : (
            <div className="divide-y divide-slate-200">
              {stack.picks.map(({ problem, scored }) => {
                const links = stack.softwareLinks.filter(l => l.tool === scored.tool.name).map(l => l.software)
                const rivals = ranked.filter(r => r !== scored && solvesProblem(r.tool, problem))
                return (
                  <div key={scored.tool.id} className="p-4 sm:px-6 grid sm:grid-cols-[200px_1fr_auto] gap-2 sm:gap-6 items-center">
                    <p className="text-sm text-slate-500">{problemLabel(problem)}</p>
                    <div>
                      <p className="font-medium text-navy-900">{scored.tool.name}</p>
                      <p className="text-sm text-slate-600">{scored.tool.pricing.startingMonthly === null ? 'Price Not Verified' : scored.tool.pricing.display}{links.length > 0 && <> · Works with {links.join(', ')}</>}</p>
                      <p className="mt-1 text-xs text-slate-500">{rivals.length ? `Chosen over ${rivals.slice(0, 2).map(r => r.tool.name).join(' and ')} because ${links.length ? 'it lists a connection to your software' : 'it has the best balance of price, setup and reliability for this need'}.` : 'The only tool in our list for this need.'}</p>
                    </div>
                    <div className="flex items-center gap-3"><ScoreBadge score={scored.score} size="sm" /><button className="btn-ghost btn-sm" onClick={() => setLabel(scored)}>View label</button></div>
                  </div>
                )
              })}
            </div>
          )}
          {stack.links.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-sm">
              <p className="font-medium text-navy-900">Do these tools connect to each other?</p>
              <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-slate-600">
                {stack.links.map(l => <li key={l.a + l.b} className="flex items-center gap-2"><Icon name={l.ok ? 'check' : 'x'} className={`h-4 w-4 ${l.ok ? 'text-brand-700' : 'text-slate-400'}`} />{l.a} and {l.b}: {l.ok ? 'listed integration' : 'no listed integration'}</li>)}
              </ul>
            </div>
          )}
          {unmatched.length > 0 && <p className="px-6 py-3 border-t border-slate-200 text-sm text-slate-600">No tool in our list matches: {unmatched.map(problemLabel).join(', ')}. You can <a href="#/discover" className="underline">add a tool</a> you are considering.</p>}
          <div className="px-6 py-4 border-t border-slate-200 flex flex-wrap gap-2">
            <a href="#/compare" className="btn-primary">Compare tools</a>
            <a href="#/lab" className="btn-ghost">Rehearse a tool</a>
            <a href="#/pilot" className="btn-ghost">Create a 30-day pilot plan</a>
          </div>
        </section>

        <div className="mt-6"><ScoreGuide /></div>

        <div className="mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div><h2 className="h-section">All tools, ranked</h2><p className="mt-1 text-sm text-slate-600">Each card says why it ranks where it does. Select tools to compare them side by side.</p></div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="input sm:!w-56" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or feature" aria-label="Search tools" />
            <select className="input sm:!w-56" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter by need">
              <option value="all">All of my needs</option>
              {profile.problems.map(p => <option key={p} value={p}>{problemLabel(p)}</option>)}
            </select>
          </div>
        </div>
        {compare.length > 0 && (
          <div className="sticky top-16 z-20 mt-4 rounded-md bg-navy-900 text-white px-4 py-3 flex items-center justify-between gap-2 text-sm">
            <span>{compare.length} {compare.length === 1 ? 'tool' : 'tools'} selected to compare</span><a href="#/compare" className="btn btn-sm bg-accent-500 text-navy-950 hover:bg-accent-400">Compare now</a>
          </div>
        )}
        {list.length === 0 && <p className="mt-6 text-sm text-slate-600">No tools match your search.</p>}
        <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(s => {
            const i = ranked.indexOf(s)
            return (
              <article key={s.tool.id} className="card p-5 flex flex-col">
                <div className="flex gap-3 items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500"><span className="font-semibold text-accent-700">#{i + 1}</span> · {s.tool.category}</p>
                    <h3 className="mt-0.5 font-semibold text-navy-900">{s.tool.name}</h3>
                    <p className="text-sm text-slate-500">{s.tool.vendor}</p>
                  </div>
                  <ScoreBadge score={s.score} />
                </div>
                <p className="mt-3 text-sm text-slate-700">{s.tool.pricing.display}</p>
                <p className="mt-2 text-xs text-slate-600"><span className="font-medium text-navy-900">Why it ranks here: </span>{rankReason(ranked, i)}</p>
                {mustHaves.length > 0 && <ul className="mt-2 flex flex-wrap gap-1" aria-label="Must-have checks">{mustHaves.map(m => { const ok = mustHaveCheck(s.tool, m, profile); const name = MUST_HAVES.find(x => x.id === m)?.label ?? m; return <li key={m} className={`chip ring-1 ring-inset ${ok === true ? 'bg-brand-50 text-brand-800 ring-brand-200' : ok === false ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>{ok === true ? 'Has' : ok === false ? 'No' : 'Not Verified'}: {name}</li> })}</ul>}
                {s.flags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{s.flags.map(f => <NotVerified key={f} label={f} />)}</div>}
                {open === s.tool.id && <div className="mt-4 pt-4 border-t border-slate-200"><ScoreBars s={s} /><div className="mt-4"><Explain s={s} p={profile} /></div></div>}
                <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
                  <button className="btn-ghost btn-sm" onClick={() => setOpen(open === s.tool.id ? null : s.tool.id)} aria-expanded={open === s.tool.id}>{open === s.tool.id ? 'Hide score details' : 'Score details'}</button>
                  <button className="btn-ghost btn-sm" onClick={() => setLabel(s)}>View label</button>
                  <label className="ml-auto flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={compare.includes(s.tool.id)} onChange={() => toggleCompare(s.tool.id)} />Compare</label>
                </div>
              </article>
            )
          })}
        </div>
      </Wrap>
      {label && <Modal title={label.tool.name} onClose={() => setLabel(null)}><NutritionLabel tool={label.tool} /><div className="mt-4"><p className="font-semibold text-slate-900 mb-3">Score: {label.score} of 100</p><ScoreBars s={label} /></div></Modal>}
    </>
  )
}
