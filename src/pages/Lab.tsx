import { useEffect, useMemo, useState } from 'react'
import { PROBLEMS, problemLabel } from '../lib/engine'
import { load, save, K, useStore } from '../lib/store'
import { ACTION, STRESS_LABEL, classifyStress, lines, simulate, type Step } from '../lib/rehearsal'
import { Icon, Option, PageHeader, Wrap } from '../components/ui'

type Setup = { business: string; job: string; jobOther: string; tool: string; toolOther: string; facts: string; rules: string; requests: string; perDay: string; minutes: string; hourly: string; days: string; stress: string; stressFrom: number }
const EMPTY: Setup = { business: '', job: '', jobOther: '', tool: '', toolOther: '', facts: '', rules: '', requests: '', perDay: '', minutes: '', hourly: '', days: '', stress: '', stressFrom: 0 }
const num = (s: string) => { const n = parseFloat(s); return isNaN(n) || n < 0 ? null : n }
const money = (n: number) => `$${Math.round(n).toLocaleString()}`

const BARRIERS = [
  ['Answers only from your facts', 'It repeats information you entered. It does not make up hours, prices or policies.'],
  ['Hands off when unsure', 'If none of your facts cover a question, it tells the customer a person will follow up, instead of guessing.'],
  ['Follows your "never do" rules', 'Anything that touches a rule you wrote, such as refunds or medical advice, goes straight to a person.'],
  ['Blocks sensitive data', 'It refuses to take card numbers, passwords or ID numbers, and offers a safe way to finish.'],
  ['Passes on health, safety and legal questions', 'Questions about injuries, illness, emergencies or legal trouble always go to a person.'],
  ['Saves requests when systems fail', 'If a connection breaks, it saves the message for staff instead of losing it or pretending it worked.'],
  ['People stay in charge', 'Every hand-off reaches a person with the customer message. In your pilot, a person reviews every AI reply for the first days.'],
]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}<div className="mt-1.5">{children}</div></label>
}

export default function Lab() {
  const { profile, ranked } = useStore()
  const [s, setS] = useState<Setup>(() => {
    const saved = load<Setup>(K.lab, EMPTY)
    const fromProfile = profile?.businessName && profile.businessName !== 'your business' ? profile.businessName : ''
    return { ...EMPTY, ...saved, business: saved.business || fromProfile }
  })
  useEffect(() => save(K.lab, s), [s])
  const set = (p: Partial<Setup>) => setS(prev => ({ ...prev, ...p }))
  const [ran, setRan] = useState<{ normal: Step[]; stressed: Step[] | null } | null>(null)
  const [claude, setClaude] = useState<{ loading: boolean; msg?: string; results?: { request: string; action: string; reply: string; reason: string }[]; summary?: string }>({ loading: false })

  const requests = lines(s.requests), facts = lines(s.facts), rules = lines(s.rules)
  const job = s.job === 'other' ? s.jobOther : s.job ? problemLabel(s.job) : ''
  const tool = s.tool === 'other' ? s.toolOther : ranked.find(r => r.tool.id === s.tool)?.tool.name ?? ''
  const jobOptions = [...new Set([...(profile?.problems ?? []), ...PROBLEMS.map(p => p.id)])].slice(0, 9)
  const ready = requests.length > 0

  const run = () => setRan({ normal: simulate(requests, facts, rules), stressed: s.stress.trim() ? simulate(requests, facts, rules, { text: s.stress, from: Math.min(s.stressFrom, requests.length - 1) }) : null })
  useEffect(() => { setRan(null); setClaude({ loading: false }) }, [s.requests, s.facts, s.rules, s.stress, s.stressFrom])
  const askClaude = async () => {
    setClaude({ loading: true })
    try {
      const r = await fetch('/api/rehearse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ business: s.business, job, facts, rules, requests, stress: s.stress }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Claude rehearsal failed')
      setClaude({ loading: false, ...j })
    } catch (e) { setClaude({ loading: false, msg: `${(e as Error).message}. The built-in rehearsal above still works.` }) }
  }

  const stats = useMemo(() => {
    if (!ran) return null
    const count = (steps: Step[]) => ({ ai: steps.filter(x => x.action === 'answer').length, total: steps.length })
    const perDay = num(s.perDay), minutes = num(s.minutes), hourly = num(s.hourly), days = num(s.days)
    const calc = (steps: Step[]) => {
      const c = count(steps)
      if (perDay === null || minutes === null) return { ...c, before: null, after: null }
      const share = c.total ? c.ai / c.total : 0
      const before = perDay * minutes, after = perDay * (1 - share) * minutes + perDay * share * 1 // one minute of review per AI answer
      return { ...c, before, after }
    }
    const week = (mins: number | null) => (mins === null || days === null ? null : (mins / 60) * days)
    const n = calc(ran.normal), st = ran.stressed ? calc(ran.stressed) : null
    return { n, st, week, hourly }
  }, [ran, s.perDay, s.minutes, s.hourly, s.days])

  return (
    <>
      <PageHeader step="Step 4 of 5" title="Rehearsal">Try an AI assistant on your own business before you buy one. Fill in the blanks, run a normal day, then describe something going wrong and see how it reacts.</PageHeader>
      <Wrap>
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="card p-5 space-y-5">
            <h2 className="h-section">1. Describe your business</h2>
            <Field label="Business name"><input className="input" value={s.business} onChange={e => set({ business: e.target.value })} placeholder="Your business name" /></Field>
            <fieldset>
              <legend className="label">What job would the AI do?</legend>
              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                {jobOptions.map(id => <Option key={id} on={s.job === id} onClick={() => set({ job: id })}>{problemLabel(id)}</Option>)}
                <Option on={s.job === 'other'} onClick={() => set({ job: 'other' })}>Other</Option>
              </div>
              {s.job === 'other' && <input className="input mt-2" autoFocus value={s.jobOther} onChange={e => set({ jobOther: e.target.value })} placeholder="Describe the job, for example answering delivery questions" aria-label="Other job" />}
            </fieldset>
            <Field label="Tool you are rehearsing" hint="Optional. The rehearsal shows safe behavior you should expect from any tool.">
              <select className="input" value={s.tool} onChange={e => set({ tool: e.target.value })}>
                <option value="">Not decided yet</option>
                {ranked.map(r => <option key={r.tool.id} value={r.tool.id}>{r.tool.name}</option>)}
                <option value="other">Other</option>
              </select>
              {s.tool === 'other' && <input className="input mt-2" value={s.toolOther} onChange={e => set({ toolOther: e.target.value })} placeholder="Tool name" aria-label="Other tool" />}
            </Field>
            <Field label="Facts the AI can use, one per line" hint="Hours, prices, policies, services. The AI will only answer from these.">
              <textarea className="input min-h-28" value={s.facts} onChange={e => set({ facts: e.target.value })} placeholder={'We are open 9am to 6pm, Monday to Saturday\nDelivery within 5 miles costs $10'} />
            </Field>
            <Field label="Things the AI must never do, one per line" hint="Anything matching these goes to a person.">
              <textarea className="input min-h-20" value={s.rules} onChange={e => set({ rules: e.target.value })} placeholder={'Give refunds or discounts\nPromise same-day service'} />
            </Field>
          </section>

          <section className="card p-5 space-y-5">
            <h2 className="h-section">2. A normal day</h2>
            <Field label="Requests customers send on a typical day, one per line" hint="Use real questions you get, in your customers' words.">
              <textarea className="input min-h-36" value={s.requests} onChange={e => set({ requests: e.target.value })} placeholder={'Are you open on Sunday?\nHow much is delivery?\nCan I get a refund on my order?'} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Requests per day"><input className="input" inputMode="decimal" value={s.perDay} onChange={e => set({ perDay: e.target.value })} placeholder="Your number" /></Field>
              <Field label="Staff minutes per request"><input className="input" inputMode="decimal" value={s.minutes} onChange={e => set({ minutes: e.target.value })} placeholder="Your number" /></Field>
              <Field label="Staff cost per hour ($)"><input className="input" inputMode="decimal" value={s.hourly} onChange={e => set({ hourly: e.target.value })} placeholder="Optional" /></Field>
              <Field label="Days open per week"><input className="input" inputMode="decimal" value={s.days} onChange={e => set({ days: e.target.value })} placeholder="Your number" /></Field>
            </div>
            <h2 className="h-section pt-2">3. Stress test</h2>
            <Field label="Describe something that could go wrong" hint="In your own words. For example: the booking system goes offline at lunch, or a customer is angry about a late order.">
              <textarea className="input min-h-20" value={s.stress} onChange={e => set({ stress: e.target.value })} placeholder="What could go wrong?" />
            </Field>
            {s.stress.trim() && requests.length > 1 && (
              <Field label="When does it start?">
                <select className="input" value={s.stressFrom} onChange={e => set({ stressFrom: +e.target.value })}>
                  {requests.map((r, i) => <option key={i} value={i}>Before request {i + 1}: {r.slice(0, 50)}</option>)}
                </select>
              </Field>
            )}
            {s.stress.trim() && <p className="text-xs text-slate-500">We read this as: <span className="font-medium text-slate-700">{STRESS_LABEL[classifyStress(s.stress)]}</span>.</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" disabled={!ready} onClick={run}>{s.stress.trim() ? 'Run the day and the stress test' : 'Run the day'}</button>
              <button className="btn-ghost" disabled={!ready || claude.loading} onClick={askClaude}>{claude.loading ? 'Asking Claude...' : 'Role-play with Claude'}</button>
            </div>
            {!ready && <p className="text-sm text-slate-500">Add at least one customer request to start.</p>}
          </section>
        </div>

        {ran && (
          <section className="mt-6 card overflow-x-auto fade">
            <div className="p-5 border-b border-slate-200">
              <h2 className="h-section">Your rehearsal results{tool && <span className="font-normal text-slate-500"> with {tool}</span>}</h2>
              <p className="text-sm text-slate-600">{s.business || 'Your business'}{job && `, ${job.toLowerCase()}`}. Every request shows exactly what the AI would do and which safety barrier applied.</p>
            </div>
            <table className="w-full text-sm" style={{ minWidth: ran.stressed ? 860 : 600 }}>
              <thead className="text-left text-xs text-slate-500 bg-slate-50 border-b border-slate-200"><tr><th className="px-5 py-2 font-medium w-1/4">Customer request</th><th className="px-3 py-2 font-medium">Normal day</th>{ran.stressed && <th className="px-3 py-2 font-medium">During: {s.stress.slice(0, 60)}</th>}</tr></thead>
              <tbody>{ran.normal.map((n, i) => {
                const st = ran.stressed?.[i]
                const cell = (x: Step, changed?: boolean) => (
                  <td className={`px-3 py-3 align-top ${changed ? 'bg-accent-50/60' : ''}`}>
                    <span className={`chip ring-1 ring-inset ${ACTION[x.action][1]}`}>{ACTION[x.action][0]}</span>
                    <p className="mt-1.5 text-slate-800">"{x.reply}"</p>
                    <p className="mt-1 text-xs text-slate-500">{x.reason} <span className="font-medium text-slate-600">Barrier: {x.barrier}.</span></p>
                  </td>
                )
                return <tr key={i} className="border-b border-slate-100 last:border-0"><td className="px-5 py-3 align-top font-medium text-navy-900">{n.request}</td>{cell(n)}{st && cell(st, st.action !== n.action)}</tr>
              })}</tbody>
            </table>
            {stats && (
              <div className="p-5 border-t border-slate-200 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div><p className="text-slate-500">Answered by AI on a normal day</p><p className="text-2xl font-semibold text-navy-900">{stats.n.ai} of {stats.n.total}</p></div>
                {stats.st && <div><p className="text-slate-500">Answered by AI during the problem</p><p className="text-2xl font-semibold text-navy-900">{stats.st.ai} of {stats.st.total}</p></div>}
                {stats.n.before !== null ? <>
                  <div><p className="text-slate-500">Staff time per day</p><p className="text-2xl font-semibold text-navy-900">{Math.round(stats.n.before)} to {Math.round(stats.n.after!)} min</p><p className="text-xs text-slate-500">Includes one minute to review each AI answer.</p></div>
                  {stats.week(stats.n.before) !== null && <div><p className="text-slate-500">Hours saved per week</p><p className="text-2xl font-semibold text-brand-700">{(stats.week(stats.n.before)! - stats.week(stats.n.after)!).toFixed(1)}</p>{stats.hourly !== null && <p className="text-xs text-slate-500">About {money((stats.week(stats.n.before)! - stats.week(stats.n.after)!) * stats.hourly)} of staff time a week</p>}</div>}
                </> : <p className="text-slate-500 lg:col-span-2">Add requests per day and minutes per request to estimate time saved.</p>}
                <p className="sm:col-span-2 lg:col-span-4 text-xs text-slate-500">Estimates use your numbers and the share of sample requests the AI could answer. Real tools vary, so measure during your pilot.</p>
              </div>
            )}
          </section>
        )}

        {(claude.results || claude.msg) && (
          <section className="mt-6 card p-5">
            <h2 className="h-section">Claude role-play</h2>
            {claude.msg && <p className="mt-2 text-sm text-amber-800">{claude.msg}</p>}
            {claude.summary && <p className="mt-2 text-sm text-slate-700">{claude.summary}</p>}
            {claude.results && <ul className="mt-3 divide-y divide-slate-200">{claude.results.map((r, i) => <li key={i} className="py-3 text-sm"><p className="font-medium text-navy-900">{r.request}</p><span className={`chip ring-1 ring-inset mt-1 ${ACTION[(r.action === 'answer' || r.action === 'refuse' ? r.action : 'handoff') as 'answer'][1]}`}>{r.action === 'answer' ? 'Answered' : r.action === 'refuse' ? 'Refused' : 'Sent to a person'}</span><p className="mt-1 text-slate-800">"{r.reply}"</p><p className="text-xs text-slate-500">{r.reason}</p></li>)}</ul>}
            <p className="mt-2 text-xs text-slate-500">Claude was told to answer only from your facts and to hand off when unsure. Your requests were sent through our server to Anthropic and not stored.</p>
          </section>
        )}

        <section className="mt-8 grid lg:grid-cols-[1.3fr_1fr] gap-6">
          <div className="card p-5">
            <h2 className="h-section">How the AI handles mistakes</h2>
            <p className="mt-1 text-sm text-slate-600">These are the safety barriers used in this rehearsal. Before you buy a real tool, check that you can set up each one.</p>
            <ul className="mt-4 space-y-3">{BARRIERS.map(([t, d]) => <li key={t} className="flex gap-3 text-sm"><Icon name="check" className="h-5 w-5 shrink-0 text-brand-700" /><div><p className="font-medium text-navy-900">{t}</p><p className="text-slate-600">{d}</p></div></li>)}</ul>
          </div>
          <div className="card p-5 bg-navy-900 text-slate-200 border-navy-900">
            <h2 className="text-lg font-semibold text-white">Is it safe?</h2>
            <p className="mt-2 text-sm">It can be, if it is set up with barriers like these and a person checks its work at first. No AI tool is error-free. Real tools can misunderstand a question, use old information, or stop working when another system goes down.</p>
            <p className="mt-2 text-sm">This rehearsal follows fixed rules, so it is more predictable than a real tool. Treat it as a checklist of the behavior to demand, then confirm it during a short pilot with a person reviewing replies.</p>
            <a href="#/pilot" className="btn-accent mt-4">Plan a safe pilot</a>
          </div>
        </section>
      </Wrap>
    </>
  )
}
