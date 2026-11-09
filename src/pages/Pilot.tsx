import { useEffect, useState } from 'react'
import { buildStack, isBuiltInProblem, problemLabel } from '../lib/engine'
import { K, load, save, useStore } from '../lib/store'
import { Icon, NeedProfile, NotVerified, PageHeader, Wrap } from '../components/ui'

const METRIC: Record<string, string> = {
  missed_calls: 'Missed calls per week (target: cut in half)', scheduling: 'No-shows per week and minutes spent booking', invoicing: 'Days from job to invoice; overdue invoices',
  bookkeeping: 'Hours per week on bookkeeping', marketing_content: 'Posts published per week; time per post', email_marketing: 'Emails sent per month; open rate',
  customer_messages: 'Median reply time to customers', reviews: 'New reviews per month; share of reviews answered', admin_automation: 'Hours of repetitive admin per week',
}
const metric = (p: string) => (isBuiltInProblem(p) ? METRIC[p] : `Hours per week spent on ${p.toLowerCase()}`)

export default function Pilot() {
  const { profile, ranked } = useStore()
  const [done, setDone] = useState<Record<string, boolean>>(() => load(K.pilot, {}))
  useEffect(() => save(K.pilot, done), [done])
  if (!profile) return <NeedProfile />
  const stack = buildStack(ranked, profile)
  const tools = stack.picks.map(p => p.scored.tool)
  const first = tools[0]
  const weeks = [
    { title: 'Week 1: Prepare and record a baseline', focus: 'Measure how things work today and get your first tool ready. Do not change how you work yet.', items: [
      `Write down this week's numbers: ${profile.problems.map(metric).join('; ')}`,
      'Open the label for each tool and confirm pricing on the vendor website',
      `Read the privacy and cancellation terms for ${tools.map(t => t.name).join(', ')}`,
      'Decide what the AI must never do, such as safety answers, refunds or taking card numbers',
      first ? `Sign up for ${first.name} on a free or month-to-month plan` : 'Pick your first tool',
    ] },
    { title: 'Week 2: Start with one task', focus: 'Turn on one tool for one job, with a person checking its work.', items: [
      first ? `Connect ${first.name} to ${stack.softwareLinks.filter(l => l.tool === first.name).map(l => l.software).join(', ') || 'your current tools'} (if listed)` : 'Connect your first tool',
      `Use it only for ${problemLabel(stack.picks[0]?.problem ?? 'one task').toLowerCase()} and keep the old process as a backup`,
      'Have a person review every AI output for the first 5 days',
      'Spend 20 minutes showing staff what the AI does and how to step in',
      'Run your own stress test in the Rehearsal tab and set up the same safety barriers in the real tool',
    ] },
    { title: 'Week 3: Measure and expand', focus: 'Compare results with Week 1 and decide whether to add more.', items: [
      'Compare your numbers with the Week 1 baseline',
      'Log every AI mistake and how it was caught',
      tools[1] ? `If week 2 went well, add ${tools[1].name}` : 'Fine-tune instructions and FAQs',
      'Check the usage and billing page for extra charges',
      'Ask five customers how the experience felt',
    ] },
    { title: 'Week 4: Keep, change or cancel', focus: 'Make a decision with your numbers, before the next bill.', items: [
      'Keep a tool if it hit your targets with no serious errors',
      'Compare the real cost with the time saved, using the Rehearsal estimate only as a guide',
      'Cancel anything that missed targets before the next billing date',
      'Export your data before cancelling',
      'Book a free SCORE or SBDC mentor session to review the results',
    ] },
  ]
  const total = weeks.reduce((n, w) => n + w.items.length, 0)
  const checked = weeks.reduce((n, w, wi) => n + w.items.filter((_, ii) => done[`${wi}-${ii}`]).length, 0)
  const current = weeks.findIndex((w, wi) => w.items.some((_, ii) => !done[`${wi}-${ii}`]))
  const allDone = checked === total
  return (
    <>
      <PageHeader step="Step 5 of 5" title={`30-day pilot plan for ${profile.businessName}`} actions={<button onClick={() => print()} className="btn-ghost no-print">Print plan</button>}>A short, low-risk trial of your suggested tools, with clear measures and a way out.</PageHeader>
      <Wrap>
        <section className="grid lg:grid-cols-3 gap-4">
          <div className="card p-5 lg:col-span-2">
            <h2 className="h-section">What is a pilot plan?</h2>
            <p className="mt-2 text-sm text-slate-700">A pilot is a small test run. Instead of switching your whole business to a new tool, you try it on one task for a few weeks, measure what changes, and then decide to keep it, change it or cancel it. You find out whether it works before you commit money or change how your team works.</p>
            <h3 className="mt-4 font-semibold text-navy-900 text-sm">How to use this tab</h3>
            <ol className="mt-2 space-y-1.5 text-sm text-slate-700 list-decimal pl-5">
              <li>Start with Week 1. Each week has a short goal and a checklist.</li>
              <li>Tick each item when you finish it. Your progress is saved in this browser.</li>
              <li>Move to the next week once its items are done. The current week is highlighted.</li>
              <li>At the end of Week 4, use your numbers to decide what to keep. We will show you what to do next.</li>
            </ol>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500">Progress</p>
            <p className="text-2xl font-semibold text-navy-900 tabular-nums">{checked} of {total} done</p>
            <div className="h-2 bg-slate-100 rounded-full mt-3"><div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${(checked / total) * 100}%` }} /></div>
            <p className="mt-3 text-sm text-slate-700">{allDone ? 'All four weeks are complete.' : <>You are on <span className="font-semibold">{weeks[current].title.split(':')[0]}</span>: {weeks[current].focus}</>}</p>
            <p className="mt-4 text-sm text-slate-500">Known starting cost</p>
            <p className="font-semibold text-navy-900 tabular-nums">${stack.knownMonthly} per month{profile.budgetKnown !== false && <span className="font-normal text-slate-500">, budget ${profile.budget}</span>}</p>
            {stack.unknownCount > 0 && <p className="text-xs text-amber-800 mt-1">{stack.unknownCount} {stack.unknownCount > 1 ? 'tools have' : 'tool has'} unverified pricing. Confirm before signing up.</p>}
          </div>
        </section>

        {tools.length === 0 ? <p className="card p-6 mt-6 text-slate-600">None of the tools in our list match your needs yet. <a className="underline" href="#/discover">Add a tool</a> you are considering, or <a className="underline" href="#/assess">edit your answers</a>.</p> : <>
        <p className="mt-6 text-sm text-slate-600">Tools in this pilot, in order: <span className="font-medium text-navy-900">{tools.map(t => t.name).join(', ')}</span></p>
        <div className="grid lg:grid-cols-2 gap-4 mt-3">
          {weeks.map((w, wi) => {
            const wDone = w.items.every((_, ii) => done[`${wi}-${ii}`])
            return (
              <section key={w.title} className={`card p-5 ${wi === current ? 'ring-2 ring-accent-400' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-navy-900">{w.title}</h2>
                  {wDone ? <span className="chip bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200"><Icon name="check" className="h-3 w-3" />Complete</span> : wi === current && <span className="chip bg-accent-50 text-accent-800 ring-1 ring-inset ring-accent-200">This week</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600"><span className="font-medium text-slate-800">Your job this week:</span> {w.focus}</p>
                <ul className="mt-3 space-y-2">
                  {w.items.map((it, ii) => { const k = `${wi}-${ii}`, on = !!done[k]; return (
                    <li key={k}>
                      <button type="button" role="checkbox" aria-checked={on} onClick={() => setDone({ ...done, [k]: !on })} className={`w-full flex gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${on ? 'border-brand-200 bg-brand-50 text-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-400'}`}>{on && <Icon name="check" className="h-3 w-3" />}</span>
                        <span>{it}{on && <span className="sr-only"> (done)</span>}</span>
                      </button>
                    </li>
                  ) })}
                </ul>
              </section>
            )
          })}
        </div>

        {allDone && (
          <section className="mt-6 rounded-lg border-2 border-brand-700 bg-white p-6 fade">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">Pilot complete</p>
            <h2 className="mt-1 text-xl font-semibold text-navy-900">What comes next</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-700 list-decimal pl-5">
              <li><span className="font-medium">Keep what worked.</span> Move tools that hit their targets to a plan that fits your real usage, and set a reminder to review them every quarter.</li>
              <li><span className="font-medium">Cancel what did not.</span> Export your data, cancel before the next billing date, and note why for next time.</li>
              <li><span className="font-medium">Update your answers.</span> Your needs have changed. Retake the assessment so your recommendations reflect what you learned. If you are signed in, it is saved as a new version you can compare in History.</li>
              <li><span className="font-medium">Pick the next problem.</span> Start a new pilot for your next biggest frustration.</li>
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="#/assess" className="btn-primary">Update my answers</a>
              <a href="#/history" className="btn-ghost">View my history</a>
              <button className="btn-ghost" onClick={() => setDone({})}>Start a new pilot</button>
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-3 gap-4 mt-6">
          <section className="card p-5"><h3 className="font-semibold text-navy-900">How to measure success</h3><ul className="mt-3 text-sm space-y-2 text-slate-700">{profile.problems.map(p => <li key={p} className="flex gap-2"><Icon name="check" className="h-4 w-4 mt-0.5 shrink-0 text-brand-700" />{metric(p)}</li>)}</ul></section>
          <section className="card p-5"><h3 className="font-semibold text-navy-900">Risks to watch</h3><ul className="mt-3 text-sm space-y-2 text-slate-700">{tools.map(t => <li key={t.id}><span className="font-medium text-slate-900">{t.name}:</span> {t.risks[0] ?? 'Not Verified'}</li>)}</ul></section>
          <section className="card p-5"><h3 className="font-semibold text-navy-900">How to cancel</h3><ul className="mt-3 text-sm space-y-2 text-slate-700">{tools.map(t => <li key={t.id}><span className="font-medium text-slate-900">{t.name}:</span> {t.cancellation ?? <><NotVerified /> Find the cancellation steps before you sign up.</>}</li>)}</ul><p className="text-xs text-slate-500 mt-3">Set a calendar reminder three days before each trial ends or bill is due.</p></section>
        </div>
        </>}
      </Wrap>
    </>
  )
}
