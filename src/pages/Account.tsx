import { useState } from 'react'
import { useStore } from '../lib/store'
import { RETENTION_MONTHS, SESSION_DAYS } from '../lib/privacy'
import { PageHeader, Wrap } from '../components/ui'

function AuthForm({ mode }: { mode: 'signup' | 'signin' }) {
  const { setUser, profile } = useStore()
  const [f, setF] = useState({ company: profile?.businessName && profile.businessName !== 'your business' ? profile.businessName : '', email: '', password: '', agree: false })
  const [state, setState] = useState<{ loading: boolean; error?: string }>({ loading: false })
  const signup = mode === 'signup'
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (signup && !f.agree) return setState({ loading: false, error: 'Please agree to the Terms of Service to create an account.' })
    setState({ loading: true })
    try {
      const r = await fetch(`/api/auth/${signup ? 'signup' : 'login'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: f.email, password: f.password, company: f.company }) })
      const j = await r.json().catch(() => ({ error: 'The account service is not available right now' }))
      if (!r.ok) throw new Error(j.error)
      setUser(j.user)
      location.hash = profile ? '#/history' : '#/assess'
    } catch (err) { setState({ loading: false, error: (err as Error).message }) }
  }
  return (
    <>
      <PageHeader title={signup ? 'Create your free account' : 'Sign in'}>{signup ? 'An account lets you save dated versions of your assessments and comparisons, and see how your recommendations change over time.' : 'Welcome back. Sign in to see your saved versions.'}</PageHeader>
      <Wrap className="max-w-md">
        <form className="card p-6 space-y-4" onSubmit={submit}>
          {signup && <label className="block"><span className="label">Company name <span className="font-normal text-slate-500">Optional</span></span><input className="input mt-1.5" value={f.company} onChange={e => setF({ ...f, company: e.target.value })} autoComplete="organization" /></label>}
          <label className="block"><span className="label">Email</span><input className="input mt-1.5" type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
          <label className="block"><span className="label">Password</span><input className="input mt-1.5" type="password" required minLength={signup ? 8 : undefined} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete={signup ? 'new-password' : 'current-password'} />{signup && <span className="mt-1 block text-xs text-slate-500">At least 8 characters. Use a password you do not use anywhere else.</span>}</label>
          {signup && <label className="flex gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-700" checked={f.agree} onChange={e => setF({ ...f, agree: e.target.checked })} />I agree to the <a href="#/terms" className="underline">Terms of Service</a>.</label>}
          {state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
          <button className="btn-primary w-full" disabled={state.loading}>{state.loading ? 'Please wait...' : signup ? 'Create account' : 'Sign in'}</button>
          <p className="text-sm text-slate-600 text-center">{signup ? <>Already have an account? <a href="#/signin" className="underline">Sign in</a></> : <>New to Stackd? <a href="#/signup" className="underline">Create a free account</a></>}</p>
        </form>
        {signup && <p className="mt-4 text-xs text-slate-500">We store your email, optional company name and a scrambled (hashed) version of your password. Sign-ins last {SESSION_DAYS} days. Saved versions are deleted automatically after {RETENTION_MONTHS} months, and you can delete your account and all its data at any time from the History page.</p>}
      </Wrap>
    </>
  )
}
export const SignUp = () => <AuthForm mode="signup" />
export const SignIn = () => <AuthForm mode="signin" />

export function Terms() {
  return (
    <>
      <PageHeader title="Terms of Service">Last updated November 8, 2026. Please read these terms before using Stackd.</PageHeader>
      <Wrap className="max-w-3xl">
        <div className="card p-6 space-y-5 text-sm text-slate-700 leading-relaxed">
          <section><h2 className="font-semibold text-navy-900 text-base">1. What Stackd is</h2><p className="mt-1">Stackd helps small businesses find, compare and rehearse AI tools. Scores, estimates, simulations and analyses are for general information only. They are not financial, legal or professional advice. Always confirm prices, terms and features with each vendor before you buy.</p></section>
          <section><h2 className="font-semibold text-navy-900 text-base">2. Your data</h2><p className="mt-1">We will try our best to keep your data safe. However, we make no guarantees that data stored or sent through Stackd will always be secure, available or free from loss or unauthorized access. Do not enter passwords for other services, banking details, tax IDs, or customer or employee personal information.</p>
            <p className="mt-2">Assessment answers are saved in your browser. If you create an account, your email, optional company name, a hashed password and your saved versions are stored on the Stackd server. Saved versions are deleted automatically after {RETENTION_MONTHS} months. You can delete versions, or your whole account, at any time. Uploaded files are not stored. If you use a Claude feature, the related text is sent to Anthropic to produce the result.</p></section>
          <section><h2 className="font-semibold text-navy-900 text-base">3. No liability</h2><p className="mt-1">Stackd is provided as is, without warranties of any kind. To the fullest extent allowed by law, Stackd and the people who run it are not liable for any wrongdoing, loss, damage or harm arising from your use of the site, including decisions you make based on its scores, estimates or recommendations, the actions of third-party tools or vendors, or any loss or exposure of data.</p></section>
          <section><h2 className="font-semibold text-navy-900 text-base">4. Third-party tools</h2><p className="mt-1">Stackd does not sell, operate or endorse the tools it lists. Your use of any vendor is governed by that vendor's own terms and privacy policy.</p></section>
          <section><h2 className="font-semibold text-navy-900 text-base">5. Acceptable use</h2><p className="mt-1">Do not misuse the site, try to access other people's data, or interfere with how it runs. We may suspend accounts that do.</p></section>
          <section><h2 className="font-semibold text-navy-900 text-base">6. Changes</h2><p className="mt-1">We may update these terms. Continuing to use Stackd after a change means you accept the updated terms.</p></section>
        </div>
      </Wrap>
    </>
  )
}

const FREE = [
  'Full business assessment with progress saving',
  'Ranked recommendations with scores explained',
  'Unlimited side-by-side comparisons, ranked by your priorities',
  'Rehearsal with your own business details and stress tests',
  '30-day pilot plan with weekly checklists',
  'Saved version history with a free account',
  'Claude business analysis, when available on the server',
]
export function Pricing() {
  return (
    <>
      <PageHeader title="Pricing">Stackd is free. Try every feature on your own business and see what it is worth to you.</PageHeader>
      <Wrap className="max-w-4xl">
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 items-start">
          <section className="card p-6 border-2 !border-brand-700">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Free plan</p>
            <p className="mt-2 text-4xl font-semibold text-navy-900">$0<span className="text-base font-normal text-slate-500"> per month</span></p>
            <p className="mt-1 text-sm text-slate-600">No credit card. No trial that runs out.</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">{FREE.map(x => <li key={x} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />{x}</li>)}</ul>
            <div className="mt-6 flex flex-wrap gap-2"><a href="#/assess" className="btn-primary">Start the assessment</a><a href="#/signup" className="btn-ghost">Create a free account</a></div>
          </section>
          <section className="space-y-4 text-sm text-slate-700">
            <div className="card p-5"><h2 className="font-semibold text-navy-900">Why is it free?</h2><p className="mt-1">The best way to know whether Stackd helps is to use it on your own business. We would rather you try everything than guess from a feature list.</p></div>
            <div className="card p-5"><h2 className="font-semibold text-navy-900">Do the tools cost money?</h2><p className="mt-1">Some do. Stackd shows each vendor's listed price and marks anything we could not confirm as Not Verified. You pay vendors directly, never through Stackd.</p></div>
          </section>
        </div>
      </Wrap>
    </>
  )
}
