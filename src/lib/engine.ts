// Deterministic scoring and stack building. No randomness and no network: the same input always gives the same output.
import type { Answers } from './questions'

export type Tool = {
  id: string; name: string; vendor: string; url: string; category: string
  solves: string[]; businessTypes: string[]
  pricing: { startingMonthly: number | null; paidMonthly: number | null; display: string; source: string }
  integrations: string[]; features: string[]
  privacy: { summary: string | null; url: string | null }
  cancellation: string | null; risks: string[]
  setup: number; maturity: number
  draft?: boolean
}

// businessType holds a built-in id or the owner's own text. problems holds built-in ids or the owner's own text.
export type Profile = {
  businessName: string; businessType: string; problems: string[]; software: string[]; budget: number; employees: number
  budgetKnown?: boolean // false when the owner was unsure; budget then holds our recommended amount
  answers?: Answers
}

export type Breakdown = { key: string; label: string; points: number; max: number; reason: string }
export type Scored = { tool: Tool; score: number; breakdown: Breakdown[]; flags: string[] }

export const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant or food service' },
  { id: 'salon', label: 'Salon, spa or barber' },
  { id: 'services', label: 'Home or professional services' },
  { id: 'retail', label: 'Retail shop' },
]

export const PROBLEMS = [
  { id: 'missed_calls', label: 'Missed phone calls' },
  { id: 'scheduling', label: 'Booking and scheduling' },
  { id: 'invoicing', label: 'Invoices and late payments' },
  { id: 'bookkeeping', label: 'Bookkeeping' },
  { id: 'marketing_content', label: 'Social posts and flyers' },
  { id: 'email_marketing', label: 'Email newsletters' },
  { id: 'customer_messages', label: 'Answering customer questions' },
  { id: 'reviews', label: 'Getting and replying to reviews' },
  { id: 'admin_automation', label: 'Repetitive admin work' },
]

export const SOFTWARE = ['Square', 'QuickBooks', 'Shopify', 'Google Workspace', 'Microsoft 365', 'Instagram', 'Facebook', 'Calendly', 'Mailchimp', 'Google Sheets']

export const isBuiltInType = (t: string) => BUSINESS_TYPES.some(b => b.id === t)
export const typeLabel = (t: string) => BUSINESS_TYPES.find(b => b.id === t)?.label ?? t
// Maps a typed-in business type to the closest built-in group for scoring; '' means no close match.
export function typeKey(t: string): string {
  if (isBuiltInType(t)) return t
  const x = t.toLowerCase()
  if (/salon|spa\b|barber|hair|nail|beauty|lash|brow|massage/.test(x)) return 'salon'
  if (/restaurant|caf[eé]|bakery|food|bar\b|pizza|deli|catering|truck|diner|brewery/.test(x)) return 'restaurant'
  if (/shop|store|boutique|retail|market/.test(x)) return 'retail'
  if (/plumb|electric|clean|repair|contract|landscap|consult|account|law|agency|studio|clinic|tutor|service/.test(x)) return 'services'
  return ''
}

// Names that count as the same ecosystem when matching integrations.
const ALIASES: Record<string, string[]> = {
  'Google Workspace': ['Google Workspace', 'Gmail', 'Google Sheets', 'Google Drive', 'Google Calendar'],
  'Google Sheets': ['Google Sheets', 'Google Workspace'],
  'Microsoft 365': ['Microsoft 365', 'Excel', 'Outlook', 'Teams'],
  Square: ['Square', 'Square POS'],
}
const norm = (s: string) => s.toLowerCase()
export function connects(tool: Tool, software: string): boolean {
  const names = (ALIASES[software] ?? [software]).map(norm)
  return tool.integrations.some(i => names.includes(norm(i))) || norm(tool.vendor).includes(norm(software))
}

export const isBuiltInProblem = (id: string) => PROBLEMS.some(p => p.id === id)
export const problemLabel = (id: string) => PROBLEMS.find(p => p.id === id)?.label ?? id

const STOP = new Set(['with', 'that', 'this', 'from', 'more', 'have', 'need', 'help', 'better', 'about', 'their', 'into', 'time'])
// Built-in problems match a tool's tagged problems; typed-in problems match words in the tool's description.
export function solvesProblem(tool: Tool, prob: string): boolean {
  if (isBuiltInProblem(prob)) return tool.solves.includes(prob)
  const words = (prob.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(w => !STOP.has(w))
  const hay = [tool.name, tool.category, ...tool.features, ...tool.solves.map(problemLabel)].join(' ').toLowerCase()
  return words.some(w => hay.includes(w.slice(0, 5)))
}

export function scoreTool(tool: Tool, p: Profile): Scored {
  const flags: string[] = []
  const matched = p.problems.filter(prob => solvesProblem(tool, prob))
  const need = Math.max(1, Math.min(p.problems.length, 2))
  const key = typeKey(p.businessType)
  const typeFit = key && tool.businessTypes.includes(key) ? 1 : tool.businessTypes.includes('any') ? 0.6 : 0.2
  const fit = Math.round(35 * (0.8 * Math.min(1, matched.length / need) + 0.2 * typeFit))

  const start = tool.pricing.startingMonthly
  let price: number, priceReason: string
  if (start === null) { price = 8; priceReason = 'Price Not Verified, so this gets a neutral score'; flags.push('Price Not Verified') }
  else if (start === 0) { price = 20; priceReason = 'Free plan listed' }
  else if (start <= p.budget) { price = Math.round(20 * (1 - 0.5 * start / Math.max(p.budget, 1))); priceReason = `$${start}/mo fits your $${p.budget} budget` }
  else { price = 0; priceReason = `$${start}/mo is over your $${p.budget} budget`; flags.push('Over budget') }

  const mine = p.software.filter(s => s !== 'None')
  const hits = mine.filter(s => connects(tool, s))
  const integ = mine.length === 0 ? 14 : Math.round(20 * Math.min(1, (hits.length + 0.5) / Math.min(mine.length, 3)) * (hits.length ? 1 : 0.35))
  const integReason = mine.length === 0 ? 'No existing software to connect' : hits.length ? `Listed integrations: ${hits.join(', ')}` : 'No listed integration with your current software'

  const setup = Math.round(15 * (6 - tool.setup) / 5)
  const rel = Math.round(10 * tool.maturity / 5)
  if (tool.draft) flags.push('Draft label, not verified')
  if (!tool.privacy.summary) flags.push('Privacy summary Not Verified')

  const breakdown: Breakdown[] = [
    { key: 'fit', label: 'Business fit', points: fit, max: 35, reason: matched.length ? `Helps with: ${matched.map(problemLabel).join(', ')}` : 'Does not target your selected problems' },
    { key: 'price', label: 'Pricing', points: price, max: 20, reason: priceReason },
    { key: 'integrations', label: 'Integrations', points: integ, max: 20, reason: integReason },
    { key: 'setup', label: 'Setup ease', points: setup, max: 15, reason: `Our setup estimate: ${tool.setup}/5 (lower is easier)` },
    { key: 'reliability', label: 'Reliability', points: rel, max: 10, reason: `Our vendor maturity estimate: ${tool.maturity}/5` },
  ]
  return { tool, score: breakdown.reduce((a, b) => a + b.points, 0), breakdown, flags }
}

export function rank(tools: Tool[], p: Profile): Scored[] {
  return tools.map(t => scoreTool(t, p)).sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
}

export type Stack = {
  picks: { problem: string; scored: Scored }[]
  knownMonthly: number; unknownCount: number; overBudget: boolean
  links: { a: string; b: string; ok: boolean }[]
  softwareLinks: { tool: string; software: string }[]
}

export function buildStack(ranked: Scored[], p: Profile, maxTools = 4): Stack {
  const picks: Stack['picks'] = []
  for (const prob of p.problems) {
    if (picks.length >= maxTools) break
    if (picks.some(x => solvesProblem(x.scored.tool, prob))) continue
    // Per-problem pick: ignore how many *other* problems a tool covers; favor specialists that fit and connect.
    const perProblem = (r: Scored) => {
      const pts = (k: string) => r.breakdown.find(b => b.key === k)!.points
      const k = typeKey(p.businessType)
      const typeFit = k && r.tool.businessTypes.includes(k) ? 7 : r.tool.businessTypes.includes('any') ? 4 : 1
      return r.score - pts('fit') + pts('integrations') * 0.5 + typeFit
    }
    const best = ranked
      .filter(r => solvesProblem(r.tool, prob) && !picks.some(x => x.scored.tool.id === r.tool.id))
      .sort((a, b) => perProblem(b) - perProblem(a))[0]
    if (best) picks.push({ problem: prob, scored: best })
  }
  const tools = picks.map(x => x.scored.tool)
  const links: Stack['links'] = []
  for (let i = 0; i < tools.length; i++) for (let j = i + 1; j < tools.length; j++) {
    const a = tools[i], b = tools[j]
    const ok = a.integrations.some(n => norm(b.name).includes(norm(n)) || norm(b.vendor).includes(norm(n))) ||
      b.integrations.some(n => norm(a.name).includes(norm(n)) || norm(a.vendor).includes(norm(n)))
    links.push({ a: a.name, b: b.name, ok })
  }
  const softwareLinks = tools.flatMap(t => p.software.filter(s => connects(t, s)).map(s => ({ tool: t.name, software: s })))
  const knownMonthly = tools.reduce((sum, t) => sum + (t.pricing.startingMonthly ?? 0), 0)
  const unknownCount = tools.filter(t => t.pricing.startingMonthly === null).length
  return { picks, knownMonthly, unknownCount, overBudget: knownMonthly > p.budget, links, softwareLinks }
}

// The score out of 100, in plain words. Shown next to every score.
export const SCORE_PARTS = [
  { key: 'fit', label: 'Business fit', max: 35, text: 'Does it solve the problems you picked, and is it made for your kind of business?' },
  { key: 'price', label: 'Pricing', max: 20, text: 'Free plans score highest. Known prices inside your budget score well. Over budget scores 0. Unverified prices get a neutral 8.' },
  { key: 'integrations', label: 'Integrations', max: 20, text: 'Does the vendor list a connection to the software you already use?' },
  { key: 'setup', label: 'Setup ease', max: 15, text: 'Our estimate of how much work it takes to get running. Easier scores higher.' },
  { key: 'reliability', label: 'Reliability', max: 10, text: 'Our estimate of how established the vendor is. It is not a user review.' },
]

const pts = (s: Scored, k: string) => s.breakdown.find(b => b.key === k)!.points

// Why a tool is ranked where it is, compared with the tool just below it (or above it, for the last one).
export function rankReason(ranked: Scored[], i: number): string {
  const s = ranked[i], other = ranked[i + 1] ?? ranked[i - 1]
  if (!other) return `${s.tool.name} is the only tool scored.`
  const diffs = s.breakdown.map(b => ({ label: b.label.toLowerCase(), d: b.points - pts(other, b.key) })).filter(x => x.d !== 0)
  const ahead = diffs.filter(x => x.d > 0).sort((a, b) => b.d - a.d)
  const behind = diffs.filter(x => x.d < 0).sort((a, b) => a.d - b.d)
  if (ranked[i + 1]) {
    if (s.score === other.score) return `Tied with ${other.tool.name} at ${s.score}, so it is listed first by name.`
    const gap = s.score - other.score
    const lead = ahead.slice(0, 2).map(x => `${x.label} (+${x.d})`).join(' and ')
    return `Ahead of ${other.tool.name} by ${gap} ${gap === 1 ? 'point' : 'points'}, mainly on ${lead}.${behind[0] ? ` ${other.tool.name} does better on ${behind[0].label}.` : ''}`
  }
  return `Lowest of the tools scored. ${other.tool.name} beats it on ${behind.slice(0, 2).map(x => x.label).join(' and ') || 'overall score'}.`
}

// Checks a must-have against facts we hold. true = confirmed, false = does not meet it, null = Not Verified.
export function mustHaveCheck(tool: Tool, id: string, p: Profile): boolean | null {
  switch (id) {
    case 'free_plan': return tool.pricing.startingMonthly === null ? null : tool.pricing.startingMonthly === 0
    case 'easy_setup': return tool.setup <= 2
    case 'connects': return p.software.length ? p.software.some(s => connects(tool, s)) : null
    case 'privacy': return tool.privacy.url || tool.privacy.summary ? true : null
    case 'cancel': return tool.cancellation ? true : null
    default: {
      const words = (id.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(w => !STOP.has(w))
      const hay = [tool.category, ...tool.features].join(' ').toLowerCase()
      return words.length && words.some(w => hay.includes(w.slice(0, 5))) ? true : null
    }
  }
}

// Usage-based spend recommendation built only from prices listed in our data.
export type SpendAdvice = { amount: number; basis: string; unknown: string[] }
export function recommendSpend(stack: Stack, level: 'light' | 'regular' | 'heavy', users: number): SpendAdvice {
  const tools = stack.picks.map(x => x.scored.tool)
  // Beyond light use a free plan is usually not enough, so a tool with no verified paid price counts as unknown.
  const price = (t: Tool) => (level === 'light' ? t.pricing.startingMonthly : t.pricing.paidMonthly ?? (t.pricing.startingMonthly ? t.pricing.startingMonthly : null))
  const unknown = tools.filter(t => price(t) === null).map(t => t.name)
  const per = tools.reduce((n, t) => n + (price(t) ?? 0), 0)
  if (level === 'light') return { amount: per, basis: 'Light use: the free or entry plans listed for your suggested tools are usually enough.', unknown }
  if (level === 'regular') return { amount: per, basis: 'Daily use: the first paid plan listed for each suggested tool, where we have one.', unknown }
  const seats = Math.min(users, 25)
  return { amount: per * seats, basis: `Heavy use: the first paid plan for each tool times ${seats} ${seats === 1 ? 'person' : 'people'}, in case the tool charges per person. Check each vendor's billing.`, unknown }
}

const AI_NAME = /\b(ai|gpt|chatgpt|openai|claude|gemini|copilot|jasper|writesonic|grammarly|otter|perplexity|midjourney|lyro|goodcall|slang|smith\.ai)\b/i
export type ToolAdvice = { name: string; spend: number | null; text: string; cheaper: { name: string; price: string }[] }
// For each AI tool the owner already pays for, compare with tools in our data that cover the same needs.
export function currentAiAdvice(current: { name: string; spend: number | null }[], ranked: Scored[], p: Profile): ToolAdvice[] {
  const match = (c: string) => ranked.find(r => norm(r.tool.name).includes(norm(c)) || norm(c).includes(norm(r.tool.name)))
  return current.filter(c => AI_NAME.test(c.name) || /AI/.test(match(c.name)?.tool.category ?? '')).map(c => {
    const own = match(c.name)
    const needs = own ? own.tool.solves : p.problems
    const cheaper = c.spend === null ? [] : ranked.filter(r => r !== own && r.tool.pricing.startingMonthly !== null && r.tool.pricing.startingMonthly < c.spend! && needs.some(n => solvesProblem(r.tool, n)))
      .slice(0, 3).map(r => ({ name: r.tool.name, price: r.tool.pricing.display }))
    let text: string
    if (c.spend === null) text = 'You did not give a spend amount, so we cannot compare prices. Add a rough range to see possible savings.'
    else if (c.spend === 0) text = 'You are on a free plan. Only upgrade if you regularly hit its limits.'
    else if (own && own.tool.pricing.paidMonthly !== null && c.spend > own.tool.pricing.paidMonthly * 1.5) text = `You spend about $${c.spend} a month. The first paid plan we have on file is $${own.tool.pricing.paidMonthly} a month, so check whether you pay for extra seats or add-ons you do not use.`
    else if (cheaper.length) text = `You spend about $${c.spend} a month. The tools below cover the same needs with a lower known starting price. Try one on its free plan before switching.`
    else text = `You spend about $${c.spend} a month. We did not find a cheaper tool in our data for the same needs, so keeping it is reasonable.`
    if (own && ranked[0] && ranked[0] !== own && own.score < ranked[0].score - 15) text += ` For your answers, ${ranked[0].tool.name} scores higher (${ranked[0].score} vs ${own.score}).`
    return { name: c.name, spend: c.spend, text, cheaper }
  })
}
