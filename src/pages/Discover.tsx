import { useState } from 'react'
import { PROBLEMS, isBuiltInProblem, type Tool } from '../lib/engine'
import { useStore } from '../lib/store'
import { NotVerified, NutritionLabel, Option, OtherInput, PageHeader, Tag, Wrap } from '../components/ui'

type Draft = { name: string; url: string; category: string; price: string; integrations: string; features: string; privacyUrl: string; cancellation: string; risks: string; solves: string[] }
const EMPTY: Draft = { name: '', url: '', category: '', price: '', integrations: '', features: '', privacyUrl: '', cancellation: '', risks: '', solves: [] }
const list = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)

function toTool(d: Draft): Tool {
  const n = d.price.match(/\$\s?(\d+(?:\.\d+)?)/)
  return {
    id: 'draft-' + (d.name || d.url).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40), name: d.name || 'Untitled tool', vendor: d.name || 'Unknown', url: d.url,
    category: d.category || 'Added by you', solves: d.solves.filter(isBuiltInProblem), businessTypes: ['any'], draft: true,
    pricing: { startingMonthly: /free/i.test(d.price) ? 0 : n ? +n[1] : null, paidMonthly: null, display: d.price ? `${d.price} (from the vendor page, Not Verified)` : 'Not Verified', source: d.url },
    integrations: list(d.integrations), features: [...list(d.features), ...d.solves.filter(x => !isBuiltInProblem(x))],
    privacy: { summary: null, url: d.privacyUrl || null }, cancellation: d.cancellation || null,
    risks: list(d.risks).length ? list(d.risks) : ['Details entered by you and not checked by Stackd'], setup: 3, maturity: 2,
  }
}

export default function Discover() {
  const { addDraft, drafts, removeDraft } = useStore()
  const [url, setUrl] = useState('')
  const [d, setD] = useState<Draft | null>(null)
  const [status, setStatus] = useState<{ kind: 'idle' | 'loading' | 'error' | 'saved'; msg?: string }>({ kind: 'idle' })

  const extract = async () => {
    if (!/^https?:\/\/\S+\.\S+/.test(url)) return setStatus({ kind: 'error', msg: 'Enter a full web address that starts with https://' })
    setStatus({ kind: 'loading' })
    try {
      const r = await fetch('/api/discover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) })
      const j = await r.json().catch(() => ({ error: 'The page reader is not available right now' }))
      if (!r.ok) throw new Error(j.error || 'We could not read that page')
      setD({ ...EMPTY, name: j.name, url: j.url, category: j.description?.slice(0, 80) ?? '', price: j.prices[0] ?? (j.freeTierMentioned ? 'Free plan or trial mentioned' : ''), integrations: j.integrations.join(', '), features: j.features.join(', '), privacyUrl: j.privacyUrl ?? '' })
      setStatus({ kind: 'idle', msg: `Found ${j.prices.length} price ${j.prices.length === 1 ? 'mention' : 'mentions'} and ${j.integrations.length} integration ${j.integrations.length === 1 ? 'name' : 'names'}. Check every field below before saving.` })
    } catch (e) {
      setD({ ...EMPTY, url })
      setStatus({ kind: 'error', msg: `${(e as Error).message}. You can fill in the details yourself below.` })
    }
  }
  const field = (k: keyof Omit<Draft, 'solves'>, label: string, hint?: string) => (
    <label key={k} className="block"><span className="label">{label}</span>
      <input className="input mt-1.5" value={d![k]} onChange={e => setD({ ...d!, [k]: e.target.value })} placeholder={hint} />
    </label>
  )
  const toggle = (id: string) => setD({ ...d!, solves: d!.solves.includes(id) ? d!.solves.filter(x => x !== id) : [...d!.solves, id] })
  return (
    <>
      <PageHeader title="Add a tool">Considering a tool that is not in our list? Paste its website address and we will pull what the page says about pricing, integrations and policies. You can also enter the details yourself.</PageHeader>
      <Wrap>
        <div className="card p-5">
          <label className="label" htmlFor="vendor-url">Tool website address</label>
          <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
            <input id="vendor-url" className="input" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && extract()} placeholder="https://www.example.com/pricing" />
            <button className="btn-primary shrink-0" onClick={extract} disabled={status.kind === 'loading'}>{status.kind === 'loading' ? 'Reading page...' : 'Read page'}</button>
            <button className="btn-ghost shrink-0" onClick={() => { setD({ ...EMPTY, url }); setStatus({ kind: 'idle' }) }}>Enter details myself</button>
          </div>
          {status.msg && <p className={`mt-3 text-sm ${status.kind === 'error' ? 'text-red-700' : status.kind === 'saved' ? 'text-brand-800' : 'text-slate-600'}`} role="status">{status.msg}</p>}
        </div>
        {d && (
          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <div className="card p-5 space-y-4">
              <div className="flex justify-between items-center"><h2 className="h-section">Review the details</h2><NotVerified label="Draft" /></div>
              {field('name', 'Tool name')}{field('url', 'Website')}{field('category', 'What it does', 'For example, AI phone answering')}
              {field('price', 'Pricing', 'Copy it exactly from the vendor, for example $29/month')}
              {field('integrations', 'Integrations, separated by commas')}{field('features', 'Features, separated by commas')}
              {field('privacyUrl', 'Privacy policy address')}{field('cancellation', 'Cancellation terms', 'Leave blank if you are not sure')}{field('risks', 'Risks, separated by commas')}
              <fieldset>
                <legend className="label">Problems it helps with</legend>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">{PROBLEMS.map(p => <Option key={p.id} on={d.solves.includes(p.id)} onClick={() => toggle(p.id)}>{p.label}</Option>)}</div>
                <p className="mt-4 text-sm font-medium text-slate-900">Other</p>
                <div className="mt-1.5"><OtherInput placeholder="Describe another problem it helps with" onAdd={v => !d.solves.includes(v) && setD({ ...d, solves: [...d.solves, v] })} /></div>
                {d.solves.some(x => !isBuiltInProblem(x)) && <div className="mt-3 flex flex-wrap gap-2">{d.solves.filter(x => !isBuiltInProblem(x)).map(x => <Tag key={x} onRemove={() => toggle(x)}>{x}</Tag>)}</div>}
              </fieldset>
              <button className="btn-primary w-full" disabled={!d.name.trim()} onClick={() => { addDraft(toTool(d)); setStatus({ kind: 'saved', msg: `${d.name} was added. It now appears in your recommendations and comparisons, marked as a draft.` }) }}>Save to my tools</button>
            </div>
            <div><p className="text-sm text-slate-500 mb-2">Preview</p><NutritionLabel tool={toTool(d)} /></div>
          </div>
        )}
        {drafts.length > 0 && (
          <section className="mt-8">
            <h2 className="h-section">Tools you added</h2>
            <div className="mt-3 flex flex-wrap gap-2">{drafts.map(t => <Tag key={t.id} onRemove={() => removeDraft(t.id)}>{t.name}</Tag>)}</div>
          </section>
        )}
      </Wrap>
    </>
  )
}
