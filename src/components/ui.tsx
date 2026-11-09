import { useEffect, useState, type ReactNode } from 'react'
import type { Profile, Scored, Tool } from '../lib/engine'
import { problemLabel, solvesProblem } from '../lib/engine'

const PATHS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M7 7l10 10M17 7L7 17',
  alert: 'M12 8v5m0 3.5v.5M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  plus: 'M12 5v14M5 12h14',
}
export function Icon({ name, className = 'h-4 w-4' }: { name: keyof typeof PATHS; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={PATHS[name]} /></svg>
}

export function PageHeader({ step, title, children, actions }: { step?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="max-w-3xl">
          {step && <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">{step}</p>}
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {children && <div className="mt-2 text-slate-600">{children}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </section>
  )
}

export const Wrap = ({ children, className = '' }: { children: ReactNode; className?: string }) => <div className={`mx-auto max-w-6xl px-4 py-8 ${className}`}>{children}</div>

export const NotVerified = ({ label = 'Not Verified' }: { label?: string }) => <span className="chip bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">{label}</span>

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const tone = score >= 75 ? 'text-brand-800 bg-brand-50 ring-brand-200' : score >= 55 ? 'text-slate-800 bg-slate-50 ring-slate-200' : 'text-amber-800 bg-amber-50 ring-amber-200'
  return (
    <div className={`shrink-0 rounded-md ring-1 ring-inset text-center ${tone} ${size === 'sm' ? 'px-2 py-1' : 'px-3 py-2'}`} aria-label={`Score ${score} out of 100`}>
      <p className={`font-semibold leading-none tabular-nums ${size === 'sm' ? 'text-base' : 'text-2xl'}`}>{score}</p>
      <p className="text-[10px] mt-0.5 opacity-70">of 100</p>
    </div>
  )
}

export function ScoreBars({ s }: { s: Scored }) {
  return (
    <ul className="space-y-3">
      {s.breakdown.map(b => (
        <li key={b.key}>
          <div className="flex justify-between text-xs"><span className="font-medium text-slate-900">{b.label}</span><span className="text-slate-500 tabular-nums">{b.points} / {b.max}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-brand-600" style={{ width: `${(b.points / b.max) * 100}%` }} /></div>
          <p className="text-xs text-slate-500 mt-1">{b.reason}</p>
        </li>
      ))}
    </ul>
  )
}

const Field = ({ k, children }: { k: string; children: ReactNode }) => (
  <div className="grid grid-cols-[104px_1fr] gap-3 border-t border-slate-300 py-2.5 text-sm"><dt className="font-semibold text-slate-900">{k}</dt><dd className="text-slate-700">{children}</dd></div>
)
const Src = ({ href, label = 'Source' }: { href: string; label?: string }) => <a className="inline-flex items-center gap-1 text-brand-700 underline underline-offset-2 hover:text-brand-900" href={href} target="_blank" rel="noreferrer">{label}<Icon name="external" className="h-3 w-3" /></a>

export function NutritionLabel({ tool }: { tool: Tool }) {
  const p = tool.pricing
  return (
    <div className="border-2 border-slate-900 rounded-md p-4 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tool label</p>
          <h3 className="text-xl font-bold text-slate-900 leading-tight">{tool.name}</h3>
          <p className="text-sm text-slate-600">{tool.vendor} · {tool.category}</p>
        </div>
        {tool.draft && <NotVerified label="Draft" />}
      </div>
      <dl className="mt-3 border-b-2 border-slate-900">
        <Field k="Pricing">{p.startingMonthly === null ? <><NotVerified /><p className="text-xs text-slate-500 mt-1">{p.display}</p></> : p.display}{p.source && <div className="mt-1"><Src href={p.source} label="Pricing page" /></div>}</Field>
        <Field k="Features">{tool.features.length ? <ul className="list-disc pl-4 space-y-0.5">{tool.features.map(f => <li key={f}>{f}</li>)}</ul> : <NotVerified />}</Field>
        <Field k="Integrations">{tool.integrations.length ? <p>{tool.integrations.join(', ')}</p> : <NotVerified />}<p className="text-xs text-slate-500 mt-1">As listed by the vendor.</p></Field>
        <Field k="Privacy">{tool.privacy.summary ?? <NotVerified />}{tool.privacy.url && <div className="mt-1"><Src href={tool.privacy.url} label="Privacy policy" /></div>}</Field>
        <Field k="Cancellation">{tool.cancellation ?? <NotVerified />}</Field>
        <Field k="Risks">{tool.risks.length ? <ul className="list-disc pl-4 space-y-0.5">{tool.risks.map(r => <li key={r}>{r}</li>)}</ul> : <NotVerified />}</Field>
        <Field k="Setup effort">{tool.setup} of 5 <span className="text-xs text-slate-500">(our estimate, lower is easier)</span></Field>
        <Field k="Website">{tool.url ? <Src href={tool.url} label={tool.url.replace(/^https?:\/\/(www\.)?/, '')} /> : <NotVerified />}</Field>
      </dl>
      <p className="text-xs text-slate-500 mt-2">Confirm each field on the vendor's website before you buy.</p>
    </div>
  )
}

export function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-2 sm:p-6 fade" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <p className="font-semibold text-slate-900">{title}</p>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close"><Icon name="close" className="h-5 w-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card p-8 sm:p-10 text-center max-w-xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-slate-600">{text}</p>
      {action && <div className="mt-6 flex gap-3 justify-center flex-wrap">{action}</div>}
    </div>
  )
}

export function NeedProfile() {
  return (
    <Wrap className="py-16">
      <EmptyState title="Start with a short assessment" text="Answer a few questions about your business. Your recommendations, comparisons and pilot plan are built from your answers." action={<a href="#/assess" className="btn-primary">Start the assessment</a>} />
    </Wrap>
  )
}

function localExplain(s: Scored, p: Profile) {
  const sorted = [...s.breakdown].sort((a, b) => b.points / b.max - a.points / a.max)
  const first = p.problems.find(x => solvesProblem(s.tool, x))
  return `${s.tool.name} scores ${s.score} out of 100 for ${p.businessName}. Its strongest area is ${sorted[0].label.toLowerCase()}: ${sorted[0].reason}. Its weakest is ${sorted.at(-1)!.label.toLowerCase()}: ${sorted.at(-1)!.reason}. Try it on one task (${first ? problemLabel(first).toLowerCase() : 'a small task'}) for two weeks before committing.`
}

export function Explain({ s, p }: { s: Scored; p: Profile }) {
  const [state, setState] = useState<{ text: string; source: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const run = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profile: p, tool: s.tool, score: s.score, breakdown: s.breakdown }) })
      if (!r.ok) throw 0
      setState(await r.json())
    } catch { setState({ text: localExplain(s, p), source: 'template' }) }
    setLoading(false)
  }
  if (!state) return <button onClick={run} disabled={loading} className="btn-ghost btn-sm">{loading ? 'Writing summary...' : 'Summarize in plain English'}</button>
  return (
    <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-sm text-slate-800">
      <p>{state.text}</p>
      <p className="mt-1 text-xs text-slate-500">{state.source === 'claude' ? 'Written by Claude from the facts on this page.' : 'Generated from the score breakdown.'}</p>
    </div>
  )
}

// A selectable option button used for single and multi-select lists.
export function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`option flex items-center gap-2 ${on ? 'border-brand-700 bg-brand-50 text-slate-900' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}>
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${on ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-400'}`}>{on && <Icon name="check" className="h-3 w-3" />}</span>
      <span className="min-w-0">{children}</span>
    </button>
  )
}

// "Other" input: type a value and press Add (or Enter). Used wherever a list of options is offered.
export function OtherInput({ placeholder, onAdd, label = 'Add' }: { placeholder: string; onAdd: (v: string) => void; label?: string }) {
  const [v, setV] = useState('')
  const add = () => { const t = v.trim(); if (t) { onAdd(t); setV('') } }
  return (
    <div className="flex gap-2">
      <input className="input" value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder={placeholder} aria-label={placeholder} />
      <button type="button" className="btn-ghost shrink-0" onClick={add} disabled={!v.trim()}><Icon name="plus" />{label}</button>
    </div>
  )
}

// Removable tag for user-entered values.
export function Tag({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-brand-700 bg-brand-50 pl-2 pr-1 py-1 text-sm text-slate-900">
      {children}
      {onRemove && <button type="button" onClick={onRemove} className="rounded p-0.5 text-slate-500 hover:bg-brand-100 hover:text-slate-900" aria-label="Remove"><Icon name="x" className="h-3.5 w-3.5" /></button>}
    </span>
  )
}

// A question with a short note explaining why we ask.
export function Question({ title, why, optional = true, children }: { title: string; why: string; optional?: boolean; children: ReactNode }) {
  return (
    <fieldset className="border-t border-slate-200 pt-5 first:border-0 first:pt-0">
      <legend className="label float-left w-full">{title}{optional && <span className="ml-2 font-normal text-slate-500">Optional</span>}</legend>
      <p className="clear-both pt-1 text-xs text-slate-500"><span className="font-medium text-accent-700">Why we ask:</span> {why}</p>
      <div className="mt-3">{children}</div>
    </fieldset>
  )
}

type Opt = { id: string; label: string }
// Single choice with Other (free text) and Prefer not to say.
export function SingleChoice({ options, value, other, onChange, otherPlaceholder = 'Type your answer', cols = 'sm:grid-cols-2', preferNot = true }: {
  options: Opt[]; value: string; other: string; onChange: (value: string, other: string) => void; otherPlaceholder?: string; cols?: string; preferNot?: boolean
}) {
  return (
    <>
      <div className={`grid ${cols} gap-2`}>
        {options.map(o => <Option key={o.id} on={value === o.id} onClick={() => onChange(o.id, other)}>{o.label}</Option>)}
        <Option on={value === 'other'} onClick={() => onChange('other', other)}>Other</Option>
        {preferNot && <Option on={value === 'na'} onClick={() => onChange('na', other)}>Prefer not to say</Option>}
      </div>
      {value === 'other' && <input className="input mt-2" autoFocus value={other} onChange={e => onChange('other', e.target.value)} placeholder={otherPlaceholder} aria-label={otherPlaceholder} />}
    </>
  )
}

// Multiple choice with an Other input that adds the owner's own values, plus Prefer not to say.
export function MultiChoice({ options, value, onChange, otherPlaceholder, cols = 'sm:grid-cols-2', ranked = false }: {
  options: Opt[]; value: string[]; onChange: (v: string[]) => void; otherPlaceholder: string; cols?: string; ranked?: boolean
}) {
  const ids = options.map(o => o.id)
  const custom = value.filter(v => v !== 'na' && !ids.includes(v))
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value.filter(x => x !== 'na'), id])
  const rank = (v: string) => ranked && value.includes(v) && <span className="ml-1 text-xs text-brand-700">(#{value.filter(x => x !== 'na').indexOf(v) + 1})</span>
  return (
    <>
      <div className={`grid ${cols} gap-2`}>
        {options.map(o => <Option key={o.id} on={value.includes(o.id)} onClick={() => toggle(o.id)}>{o.label}{rank(o.id)}</Option>)}
        <Option on={value.includes('na')} onClick={() => onChange(value.includes('na') ? [] : ['na'])}>Prefer not to say</Option>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-900">Other</p>
      <div className="mt-1.5"><OtherInput placeholder={otherPlaceholder} onAdd={v => !value.some(x => x.toLowerCase() === v.toLowerCase()) && onChange([...value.filter(x => x !== 'na'), v])} /></div>
      {custom.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{custom.map(c => <Tag key={c} onRemove={() => toggle(c)}>{c}{rank(c)}</Tag>)}</div>}
    </>
  )
}

export function Notice({ title, children, tone = 'brand' }: { title: string; children: ReactNode; tone?: 'brand' | 'accent' }) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${tone === 'brand' ? 'border-brand-200 bg-brand-50' : 'border-accent-200 bg-accent-50'}`}>
      <p className="font-semibold text-navy-900">{title}</p>
      <div className="mt-1 text-slate-700 space-y-1">{children}</div>
    </div>
  )
}
