import { useStore } from '../lib/store'

const STEPS = [
  ['Assessment', 'Short steps about your business, tools, frustrations, goals and budget.', 'assess'],
  ['Recommendations', 'Ranked tools, a plain explanation of every score, and a recommended spend.', 'results'],
  ['Compare', 'Rank what matters to you and see which tool fits best, and why.', 'compare'],
  ['Rehearsal', 'Run a normal day with your own details, then test what happens when things go wrong.', 'lab'],
  ['Pilot Plan', 'A four-week checklist with clear measures and a way out if it does not work.', 'pilot'],
]
const POINTS = [
  ['Scores you can check', 'Every tool gets a score out of 100 from fit, price, integrations, setup effort and reliability. The reasoning sits next to each number.'],
  ['Honest tool facts', 'Prices, integrations, privacy and cancellation terms come from vendor pages with a link to the source. Anything we could not confirm is marked Not Verified.'],
  ['Practice before you buy', 'Enter your own facts and customer questions, then see how a careful AI assistant would answer, hand off or refuse.'],
]

export default function Home() {
  const { profile, user } = useStore()
  return (
    <>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20 grid lg:grid-cols-[1.25fr_1fr] gap-12 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-400">For small businesses</p>
            <h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">Find AI tools that fit your business, and try them before you pay.</h1>
            <p className="mt-5 text-lg text-slate-300 max-w-xl">Answer a few questions about how you work. Stackd ranks AI tools for your needs and budget, explains every score, and lets you rehearse how a tool would handle your real customers.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={profile ? '#/results' : '#/assess'} className="btn-accent !px-5 !py-2.5 !text-base">{profile ? 'View my recommendations' : 'Start the assessment'}</a>
              {!user && <a href="#/signup" className="btn !px-5 !py-2.5 !text-base border border-slate-500 text-white hover:bg-navy-800">Create a free account</a>}
            </div>
            <p className="mt-4 text-sm text-slate-400">Free to use. No credit card. An account is only needed to save version history.</p>
          </div>
          <ol className="rounded-lg border border-navy-700 bg-navy-800/60 p-6 space-y-4">
            {['Tell us what slows you down', 'See which tools fit, and why', 'Rehearse with your own details', 'Run a safe 30-day pilot'].map((t, i) => (
              <li key={t} className="flex items-center gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-sm font-semibold text-navy-950">{i + 1}</span><span className="text-slate-100">{t}</span></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="h-section">How it works</h2>
        <ol className="mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          {STEPS.map(([t, d, h], i) => (
            <li key={t} className="bg-white">
              <a href={`#/${h}`} className="block h-full p-5 hover:bg-brand-50">
                <p className="text-sm font-semibold text-accent-700">Step {i + 1}</p>
                <p className="mt-1 font-semibold text-navy-900">{t}</p>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-3 gap-8">
          {POINTS.map(([t, d]) => (
            <div key={t} className="border-l-2 border-brand-600 pl-4"><h3 className="font-semibold text-navy-900">{t}</h3><p className="mt-2 text-sm text-slate-600 leading-relaxed">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <h2 className="h-section">Free, so you can see the value first</h2>
          <p className="mt-2 text-slate-600 max-w-2xl">Every feature is free. Try it on your own business and decide for yourself whether it helps.</p>
        </div>
        <div className="flex flex-wrap gap-2"><a href="#/pricing" className="btn-ghost">See pricing</a><a href="#/resources" className="btn-ghost">Free small business help</a></div>
      </section>
    </>
  )
}
