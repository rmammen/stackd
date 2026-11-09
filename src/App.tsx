import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Assessment from './pages/Assessment'
import Results from './pages/Results'
import Compare from './pages/Compare'
import Lab from './pages/Lab'
import Pilot from './pages/Pilot'
import Discover from './pages/Discover'
import Resources from './pages/Resources'
import History from './pages/History'
import { Pricing, SignIn, SignUp, Terms } from './pages/Account'
import { useStore } from './lib/store'
import { Icon } from './components/ui'

const NAV = [
  ['assess', 'Assessment'], ['results', 'Recommendations'], ['compare', 'Compare'],
  ['lab', 'Rehearsal'], ['pilot', 'Pilot Plan'], ['history', 'History'],
] as const
const MORE = [['discover', 'Add a Tool'], ['resources', 'Free Help'], ['pricing', 'Pricing'], ['terms', 'Terms of Service']] as const
const PAGES: Record<string, () => React.JSX.Element> = {
  '': Home, assess: Assessment, results: Results, compare: Compare, lab: Lab, pilot: Pilot, discover: Discover, resources: Resources,
  history: History, signup: SignUp, signin: SignIn, terms: Terms, pricing: Pricing,
}

export default function App() {
  const [route, setRoute] = useState(() => location.hash.replace(/^#\/?/, ''))
  const [open, setOpen] = useState(false)
  const { profile, user } = useStore()
  useEffect(() => {
    const on = () => { setRoute(location.hash.replace(/^#\/?/, '')); setOpen(false); window.scrollTo(0, 0) }
    addEventListener('hashchange', on); return () => removeEventListener('hashchange', on)
  }, [])
  const Page = PAGES[route] ?? Home
  const link = (id: string, label: string, cls: string) => (
    <a key={id} href={`#/${id}`} aria-current={route === id ? 'page' : undefined} className={cls + (route === id ? ' text-white font-semibold' : ' text-slate-300 hover:text-white')}>{label}</a>
  )
  const account = user
    ? <a href="#/history" className="text-sm text-slate-300 hover:text-white whitespace-nowrap max-w-40 truncate" title={user.email}>{user.company || user.email}</a>
    : <><a href="#/signin" className="text-sm text-slate-300 hover:text-white whitespace-nowrap">Sign in</a><a href="#/signup" className="btn-accent whitespace-nowrap">Sign up</a></>
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-navy-900 border-b border-navy-950">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-6">
          <a href="#/" className="flex items-center gap-2 font-semibold text-white text-lg tracking-tight shrink-0">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />Stackd
          </a>
          <nav className="hidden xl:flex items-center gap-5 text-sm" aria-label="Main">{NAV.map(([id, l]) => link(id, l, 'whitespace-nowrap py-5 border-b-2 ' + (route === id ? 'border-accent-500' : 'border-transparent')))}</nav>
          <div className="ml-auto flex items-center gap-3">
            <a href="#/pricing" className="hidden md:inline text-sm text-slate-300 hover:text-white">Pricing</a>
            <div className="hidden sm:flex items-center gap-3">{account}</div>
            <button className="xl:hidden rounded-md p-2 text-slate-200 hover:bg-navy-800" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} className="h-5 w-5" /></button>
          </div>
        </div>
        {open && (
          <nav className="xl:hidden border-t border-navy-800 px-4 py-2 flex flex-col" aria-label="Main">
            {[...NAV, ...MORE].map(([id, l]) => link(id, l, 'py-2.5 text-sm border-b border-navy-800 last:border-0'))}
            <div className="sm:hidden flex items-center gap-3 py-3">{account}</div>
          </nav>
        )}
      </header>
      <main className="flex-1"><Page /></main>
      <footer className="bg-navy-900 text-sm text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <p><span className="font-semibold text-white">Stackd</span>. Find, compare and rehearse AI tools for your business. Free to use.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            <a href={profile ? '#/results' : '#/assess'} className="hover:text-white">{profile ? 'My recommendations' : 'Assessment'}</a>
            {MORE.map(([id, l]) => <a key={id} href={`#/${id}`} className="hover:text-white">{l}</a>)}
          </nav>
        </div>
      </footer>
    </div>
  )
}
