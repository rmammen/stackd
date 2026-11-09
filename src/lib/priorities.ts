// Ranks compared tools by the criteria the owner cares about most. Deterministic, using only facts we hold.
import type { Scored } from './engine'
import type { Priority } from './store'

export type CriterionResult = { value: number; note: string; verified: boolean }

export function criterion(p: Priority, s: Scored, all: Scored[]): CriterionResult {
  const t = s.tool
  switch (p.id) {
    case 'cost': {
      const price = t.pricing.startingMonthly
      if (price === null) return { value: 0.4, note: 'Price Not Verified', verified: false }
      const known = all.map(x => x.tool.pricing.startingMonthly).filter((x): x is number => x !== null)
      const max = Math.max(...known), min = Math.min(...known)
      return { value: max === min ? 1 : 1 - (price - min) / (max - min), note: price === 0 ? 'Free plan listed' : `Starts at $${price}/mo`, verified: true }
    }
    case 'ease': return { value: (6 - t.setup) / 5, note: `Setup effort ${t.setup} of 5 (our estimate)`, verified: true }
    case 'integrations': {
      const b = s.breakdown.find(x => x.key === 'integrations')!
      return { value: b.points / b.max, note: b.reason, verified: true }
    }
    case 'support': return { value: t.maturity / 5, note: `Vendor maturity ${t.maturity} of 5 (our estimate; support quality not verified)`, verified: false }
    default: {
      const words = (p.label.toLowerCase().match(/[a-z]{4,}/g) ?? [])
      const hay = [t.name, t.category, ...t.features, ...t.integrations].join(' ').toLowerCase()
      const hit = words.find(w => hay.includes(w.slice(0, 5)))
      return hit ? { value: 1, note: `Listing mentions "${hit}"`, verified: true } : { value: 0, note: 'Not mentioned in the vendor listing', verified: false }
    }
  }
}

// Weight by rank: the top priority counts most (n, n-1, ..., 1).
export function priorityFit(priorities: Priority[], picks: Scored[]) {
  const n = priorities.length
  const rows = picks.map(s => {
    const parts = priorities.map((p, i) => ({ p, w: n - i, ...criterion(p, s, picks) }))
    const total = parts.reduce((a, x) => a + x.w, 0)
    const fit = total ? Math.round((parts.reduce((a, x) => a + x.w * x.value, 0) / total) * 100) : 0
    return { s, fit, parts }
  }).sort((a, b) => b.fit - a.fit || b.s.score - a.s.score)
  return rows
}

export type FitRow = ReturnType<typeof priorityFit>[number]

// Plain-English reason the winner fits better than the runner-up.
export function whyBest(rows: FitRow[]): string {
  if (rows.length < 2) return ''
  const [a, b] = rows
  const wins = a.parts.filter((x, i) => x.value > b.parts[i].value + 0.05)
  const losses = a.parts.filter((x, i) => x.value + 0.05 < b.parts[i].value)
  if (!wins.length) return `${a.s.tool.name} and ${b.s.tool.name} are close on your priorities. ${a.s.tool.name} is listed first because its overall score is ${a.s.score}.`
  const top = wins[0]
  const tiedAbove = a.parts.slice(0, a.parts.indexOf(top)).filter((x, i) => Math.abs(x.value - b.parts[i].value) <= 0.05)
  let text = `${a.s.tool.name} fits your priorities best (${a.fit}% vs ${b.fit}% for ${b.s.tool.name}). `
  text += tiedAbove.length ? `The two are about even on ${tiedAbove.map(x => x.p.label.toLowerCase()).join(', ')}, so the difference comes from ` : 'It does better on '
  text += `${wins.map(w => `${w.p.label.toLowerCase()} (your #${a.parts.indexOf(w) + 1})`).join(', ')}.`
  if (losses.length) text += ` ${b.s.tool.name} is stronger on ${losses.map(l => l.p.label.toLowerCase()).join(', ')}, but you ranked ${losses.length === 1 ? 'that' : 'those'} lower than ${top.p.label.toLowerCase()}.`
  return text
}

// What makes each tool a better or more reliable choice among the ones being compared.
export function strengths(s: Scored, all: Scored[]): { good: string[]; watch: string[] } {
  const t = s.tool, good: string[] = [], watch: string[] = []
  const prices = all.map(x => x.tool.pricing.startingMonthly).filter((x): x is number => x !== null)
  if (t.pricing.startingMonthly !== null && t.pricing.startingMonthly === Math.min(...prices)) good.push(t.pricing.startingMonthly === 0 ? 'Free plan listed' : 'Lowest known price here')
  if (t.pricing.startingMonthly === null) watch.push('Price Not Verified')
  // "Best here" only counts when the tools actually differ on it.
  const best = (vals: number[], v: number, high: boolean) => new Set(vals).size > 1 && v === (high ? Math.max(...vals) : Math.min(...vals))
  if (t.integrations.length && best(all.map(x => x.tool.integrations.length), t.integrations.length, true)) good.push(`Most listed integrations (${t.integrations.length})`)
  if (best(all.map(x => x.tool.setup), t.setup, false)) good.push('Easiest setup here')
  if (best(all.map(x => x.tool.maturity), t.maturity, true)) good.push('Most established vendor here')
  if (t.privacy.summary) good.push('Privacy terms summarized')
  else watch.push('Privacy terms Not Verified')
  if (t.cancellation) good.push('Cancellation terms listed')
  else watch.push('Cancellation terms Not Verified')
  if (t.draft) watch.push('Details entered by you, not checked')
  if (t.risks[0]) watch.push(t.risks[0])
  return { good, watch }
}
