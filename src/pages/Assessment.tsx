import { useState } from 'react'
import { PROBLEMS, SOFTWARE } from '../lib/engine'
import { BUDGET, EMPTY_ANSWERS, GOALS, INDUSTRY, LOCATIONS, MUST_HAVES, NA, SPEND, TEAM, USAGE, USERS, WHY, YEARS, toProfile, type Answers } from '../lib/questions'
import { useStore, type Upload } from '../lib/store'
import { DataSafety } from '../lib/privacy'
import { Icon, MultiChoice, Option, OtherInput, PageHeader, Question, SingleChoice, Tag, Wrap } from '../components/ui'

const STEPS = ['Basics', 'Current tools', 'Frustrations', 'Goals', 'Budget', 'Keep or connect', 'Files and notes']
const MAX_FILE = 1_000_000
const MAX_FILES = 5

export default function Assessment() {
  const { profile, setProfile, files, setFiles, user } = useStore()
  const [a, setA] = useState<Answers>({ ...EMPTY_ANSWERS, ...(profile?.answers ?? {}) })
  const [step, setStep] = useState(0)
  const [fileMsg, setFileMsg] = useState('')
  const set = (patch: Partial<Answers>) => setA(prev => ({ ...prev, ...patch }))
  const toolNames = a.tools.map(t => t.name)
  const toggleTool = (name: string) => set({ tools: toolNames.includes(name) ? a.tools.filter(t => t.name !== name) : [...a.tools, { name, spend: '', spendOther: '' }] })
  const customTools = toolNames.filter(n => !SOFTWARE.includes(n))
  const keepOptions = [...new Set([...toolNames, ...SOFTWARE])].map(n => ({ id: n, label: n }))
  const hasNeed = a.frustrations.some(x => x !== NA) || a.goals.some(x => x !== NA)

  const finish = () => {
    setProfile(toProfile(a))
    try { sessionStorage.setItem('stackd.pendingVersion', '1') } catch { /* ignore */ }
    location.hash = '#/results'
  }
  const addFiles = async (list: FileList | null) => {
    if (!list) return
    const out: Upload[] = [...files], skipped: string[] = []
    for (const f of Array.from(list)) {
      if (out.length >= MAX_FILES) { skipped.push(`${f.name} (limit of ${MAX_FILES} files)`); continue }
      if (f.size > MAX_FILE) { skipped.push(`${f.name} (over 1 MB)`); continue }
      if (!/\.(csv|tsv|txt|md|json)$/i.test(f.name)) { skipped.push(`${f.name} (use CSV, TSV, TXT, MD or JSON)`); continue }
      out.push({ name: f.name, size: f.size, text: await f.text() })
    }
    setFiles(out)
    setFileMsg(skipped.length ? `Skipped: ${skipped.join('; ')}. For spreadsheets, save or export as CSV first.` : '')
  }
  const pct = Math.round(((step + 1) / STEPS.length) * 100)

  return (
    <>
      <PageHeader step="Step 1 of 5" title="Tell us about your business">Seven short steps, about five minutes. Every question is optional, but we need at least one frustration or goal to match tools to.</PageHeader>
      <Wrap className="max-w-3xl">
        <div className="mb-6" aria-label="Progress">
          <div className="flex items-baseline justify-between text-sm">
            <p className="font-medium text-navy-900">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
            <p className="text-slate-500 tabular-nums">{pct}% done</p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-label="Questionnaire progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <ol className="mt-3 hidden sm:flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {STEPS.map((s, i) => <li key={s}><button className={i === step ? 'text-navy-900 font-semibold' : i < step ? 'text-brand-700 hover:underline' : 'text-slate-400'} disabled={i > step} onClick={() => setStep(i)}>{i < step && <Icon name="check" className="inline h-3 w-3 mr-0.5" />}{s}</button></li>)}
          </ol>
        </div>

        <div className="card p-6 space-y-6">
          {step === 0 && <>
            <Question title="Business name" why={WHY.businessName}><input className="input" value={a.businessName} onChange={e => set({ businessName: e.target.value })} placeholder="For example, Main Street Bakery" aria-label="Business name" /></Question>
            <Question title="Industry" why={WHY.industry}><SingleChoice options={INDUSTRY} value={a.industry} other={a.industryOther} onChange={(v, o) => set({ industry: v, industryOther: o })} otherPlaceholder="For example, dog grooming, tutoring, food truck" /></Question>
            <Question title="Team size, including you" why={WHY.team}><SingleChoice cols="grid-cols-2 sm:grid-cols-4" options={TEAM} value={a.team} other={a.teamOther} onChange={(v, o) => set({ team: v, teamOther: o })} otherPlaceholder="Exact number, up to 500" /></Question>
            <Question title="Years in business" why={WHY.years}><SingleChoice options={YEARS} value={a.years} other={a.yearsOther} onChange={(v, o) => set({ years: v, yearsOther: o })} otherPlaceholder="For example, opening next month" /></Question>
            <Question title="Number of locations" why={WHY.locations}><SingleChoice cols="grid-cols-2 sm:grid-cols-3" options={LOCATIONS} value={a.locations} other={a.locationsOther} onChange={(v, o) => set({ locations: v, locationsOther: o })} otherPlaceholder="For example, one shop plus a market stall" /></Question>
          </>}

          {step === 1 && <Question title="Which software do you use today, and roughly what does each cost?" why={WHY.tools}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{SOFTWARE.map(s => <Option key={s} on={toolNames.includes(s)} onClick={() => toggleTool(s)}>{s}</Option>)}</div>
            <p className="mt-4 text-sm font-medium text-slate-900">Other</p>
            <div className="mt-1.5"><OtherInput placeholder="Add software or an AI tool you use, for example ChatGPT or Toast" onAdd={v => !toolNames.some(n => n.toLowerCase() === v.toLowerCase()) && toggleTool(v)} /></div>
            {customTools.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{customTools.map(c => <Tag key={c} onRemove={() => toggleTool(c)}>{c}</Tag>)}</div>}
            {a.tools.length > 0 && (
              <div className="mt-5 rounded-md border border-slate-200 divide-y divide-slate-200">
                <p className="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50">Approximate monthly cost of each</p>
                {a.tools.map((t, i) => (
                  <div key={t.name} className="px-4 py-3 grid sm:grid-cols-[1fr_220px] gap-2 items-center">
                    <p className="text-sm font-medium text-slate-900">{t.name}</p>
                    <div>
                      <select className="input" aria-label={`Monthly cost of ${t.name}`} value={t.spend} onChange={e => set({ tools: a.tools.map((x, j) => j === i ? { ...x, spend: e.target.value } : x) })}>
                        <option value="">Choose a range</option>
                        {SPEND.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        <option value="other">Other</option>
                        <option value={NA}>Prefer not to say</option>
                      </select>
                      {t.spend === 'other' && <input className="input mt-2" value={t.spendOther} onChange={e => set({ tools: a.tools.map((x, j) => j === i ? { ...x, spendOther: e.target.value } : x) })} placeholder="For example, about $40 a month" aria-label={`Other cost for ${t.name}`} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">Not using any software yet? Skip this step.</p>
          </Question>}

          {step === 2 && <Question title="What are your biggest frustrations? Pick the biggest first." why={WHY.frustrations}>
            <MultiChoice ranked options={PROBLEMS} value={a.frustrations} onChange={v => set({ frustrations: v })} otherPlaceholder="For example, tracking inventory" />
          </Question>}

          {step === 3 && <>
            <Question title="What do you want AI tools to help you achieve?" why={WHY.goals}><MultiChoice options={GOALS} value={a.goals} onChange={v => set({ goals: v })} otherPlaceholder="For example, open a second location" /></Question>
            <Question title="Must-have features" why={WHY.mustHaves}><MultiChoice options={MUST_HAVES} value={a.mustHaves} onChange={v => set({ mustHaves: v })} otherPlaceholder="For example, Spanish language support" /></Question>
          </>}

          {step === 4 && <>
            <Question title="Monthly budget for AI tools" why={WHY.budget}><SingleChoice options={BUDGET} value={a.budget} other={a.budgetOther} onChange={(v, o) => set({ budget: v, budgetOther: o })} otherPlaceholder="For example, around $300 a month" /></Question>
            <Question title="How much would you use these tools?" why={WHY.usage}><SingleChoice options={USAGE} value={a.usage} other={a.usageOther} onChange={(v, o) => set({ usage: v, usageOther: o })} otherPlaceholder="Describe it in your own words" /></Question>
            <Question title="How many people would use them?" why={WHY.users}><SingleChoice cols="grid-cols-2 sm:grid-cols-3" options={USERS} value={a.users} other={a.usersOther} onChange={(v, o) => set({ users: v, usersOther: o })} otherPlaceholder="Exact number" /></Question>
            {(a.budget === 'unsure' || a.budget === NA || !a.budget) && <p className="text-sm text-slate-600">No problem. We will recommend an amount based on how much you expect to use the tools, using only prices listed on vendor pages.</p>}
          </>}

          {step === 5 && <Question title="Tools you must keep, or that new tools must connect to" why={WHY.mustKeep}>
            <MultiChoice cols="grid-cols-2 sm:grid-cols-3" options={keepOptions} value={a.mustKeep} onChange={v => set({ mustKeep: v })} otherPlaceholder="Add another tool to keep" />
          </Question>}

          {step === 6 && <>
            <Question title="Upload company data for a better analysis" why={WHY.files}>
              <label className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center cursor-pointer hover:border-brand-400">
                <span className="text-sm font-medium text-navy-900">Choose files</span>
                <span className="text-xs text-slate-500">CSV, TSV, TXT, MD or JSON. Up to {MAX_FILES} files, 1 MB each. Export spreadsheets as CSV.</span>
                <input type="file" multiple accept=".csv,.tsv,.txt,.md,.json" className="sr-only" onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
              </label>
              {fileMsg && <p className="mt-2 text-sm text-amber-800">{fileMsg}</p>}
              {files.length > 0 && <ul className="mt-3 space-y-1">{files.map(f => <li key={f.name} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm"><span>{f.name} <span className="text-slate-500">({Math.ceil(f.size / 1024)} KB)</span></span><button className="text-xs underline text-slate-600" onClick={() => setFiles(files.filter(x => x !== f))}>Remove</button></li>)}</ul>}
              <p className="mt-2 text-xs text-slate-500">Good examples: monthly sales totals, number of bookings, hours spent on admin. Remove customer and employee names first.</p>
            </Question>
            <Question title="Anything else we should know?" why={WHY.notes}><textarea className="input min-h-24" value={a.notes} onChange={e => set({ notes: e.target.value })} placeholder="For example, we are busiest on weekends and most bookings come by phone" aria-label="Notes" /></Question>
          </>}
        </div>

        <div className="mt-5 flex justify-between gap-2">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
          {step < STEPS.length - 1
            ? <button className="btn-primary" onClick={() => setStep(step + 1)}>Continue</button>
            : <button className="btn-primary" disabled={!hasNeed} onClick={finish}>See my recommendations</button>}
        </div>
        {step === STEPS.length - 1 && !hasNeed && <p className="mt-2 text-right text-sm text-amber-800">Go back and add at least one frustration or goal so we have something to match.</p>}
        <div className="mt-8"><DataSafety signedIn={!!user} /></div>
        {profile && <p className="mt-6 text-sm text-slate-500">Want to start over? <button className="underline hover:text-slate-900" onClick={() => { setProfile(null); setA(EMPTY_ANSWERS); setFiles([]); setStep(0) }}>Clear my answers</button></p>}
      </Wrap>
    </>
  )
}
