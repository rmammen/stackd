// Questionnaire options and how raw answers turn into the scoring profile.
// Money questions use ranges. 'other' means the owner typed their own answer; 'na' means "Prefer not to say".
import { BUSINESS_TYPES, PROBLEMS, isBuiltInType, typeLabel, type Profile } from './engine'

export type Opt = { id: string; label: string }
export type ToolSpend = { name: string; spend: string; spendOther: string }
export type Answers = {
  businessName: string
  industry: string; industryOther: string
  team: string; teamOther: string
  years: string; yearsOther: string
  locations: string; locationsOther: string
  tools: ToolSpend[]
  frustrations: string[]
  goals: string[]
  mustHaves: string[]
  budget: string; budgetOther: string
  usage: string; usageOther: string
  users: string; usersOther: string
  mustKeep: string[]
  notes: string
}
export const EMPTY_ANSWERS: Answers = {
  businessName: '', industry: '', industryOther: '', team: '', teamOther: '', years: '', yearsOther: '', locations: '', locationsOther: '',
  tools: [], frustrations: [], goals: [], mustHaves: [], budget: '', budgetOther: '', usage: '', usageOther: '', users: '', usersOther: '', mustKeep: [], notes: '',
}
export const NA = 'na'
export const PREFER_NOT = 'Prefer not to say'

export const INDUSTRY: Opt[] = BUSINESS_TYPES
export const TEAM: Opt[] = [
  { id: '1', label: 'Just me' }, { id: '2-5', label: '2 to 5' }, { id: '6-10', label: '6 to 10' }, { id: '11-25', label: '11 to 25' },
  { id: '26-50', label: '26 to 50' }, { id: '51-100', label: '51 to 100' }, { id: '101-250', label: '101 to 250' }, { id: '251-500', label: '251 to 500' },
]
export const YEARS: Opt[] = [{ id: '<1', label: 'Less than 1 year' }, { id: '1-2', label: '1 to 2 years' }, { id: '3-5', label: '3 to 5 years' }, { id: '6-10', label: '6 to 10 years' }, { id: '10+', label: 'More than 10 years' }]
export const LOCATIONS: Opt[] = [{ id: '0', label: 'Online only' }, { id: '1', label: '1 location' }, { id: '2-3', label: '2 or 3' }, { id: '4-10', label: '4 to 10' }, { id: '10+', label: 'More than 10' }]
export const SPEND: Opt[] = [
  { id: '0', label: 'Free' }, { id: '1-25', label: '$1 to $25 a month' }, { id: '26-50', label: '$26 to $50' }, { id: '51-100', label: '$51 to $100' },
  { id: '101-250', label: '$101 to $250' }, { id: '251-500', label: '$251 to $500' }, { id: '500+', label: 'More than $500' }, { id: 'unsure', label: 'Not sure' },
]
export const BUDGET: Opt[] = [
  { id: '0', label: 'Free tools only' }, { id: '1-50', label: '$1 to $50 a month' }, { id: '51-100', label: '$51 to $100' }, { id: '101-250', label: '$101 to $250' },
  { id: '251-500', label: '$251 to $500' }, { id: '501-1000', label: '$501 to $1,000' }, { id: '1000+', label: 'More than $1,000' }, { id: 'unsure', label: 'Not sure, recommend an amount' },
]
export const USAGE: Opt[] = [
  { id: 'light', label: 'A few times a week' }, { id: 'regular', label: 'Every day, by one or two people' }, { id: 'heavy', label: 'All day, by several people' },
]
export const USERS: Opt[] = [{ id: '1', label: '1 person' }, { id: '2-3', label: '2 or 3' }, { id: '4-10', label: '4 to 10' }, { id: '11-25', label: '11 to 25' }, { id: '26+', label: 'More than 25' }]
export const GOALS: Opt[] = [
  { id: 'save_time', label: 'Save staff time' }, { id: 'reply_faster', label: 'Answer customers faster' }, { id: 'more_sales', label: 'Get more bookings or sales' },
  { id: 'paid_faster', label: 'Get paid faster' }, { id: 'cut_costs', label: 'Spend less on software' }, { id: 'marketing', label: 'Market the business better' }, { id: 'fewer_errors', label: 'Make fewer mistakes' },
]
export const MUST_HAVES: Opt[] = [
  { id: 'free_plan', label: 'Free plan or trial' }, { id: 'easy_setup', label: 'Easy to set up without IT help' }, { id: 'connects', label: 'Works with my current software' },
  { id: 'privacy', label: 'Clear privacy policy' }, { id: 'cancel', label: 'Easy to cancel' }, { id: 'mobile', label: 'Works on a phone' }, { id: 'support', label: 'Live support' },
]
// Goals that point at a built-in problem, so goals improve recommendations even when no frustration was chosen.
const GOAL_PROBLEM: Record<string, string> = { save_time: 'admin_automation', reply_faster: 'customer_messages', more_sales: 'scheduling', paid_faster: 'invoicing', marketing: 'marketing_content' }

export const WHY: Record<string, string> = {
  businessName: 'We use it to label your plan and saved versions. A nickname is fine.',
  industry: 'Tools are built for different kinds of businesses, so this shapes the business fit score.',
  team: 'Team size changes which plans make sense and how much time a tool can save.',
  years: 'Newer businesses usually need simpler, cheaper tools. Established ones may need tools that grow with them.',
  locations: 'Multiple locations often need shared calendars, inboxes and reporting.',
  tools: 'We favor AI tools that connect to what you already use. Rough spend helps us spot savings.',
  frustrations: 'This is the main input for matching tools. Put the biggest one first.',
  goals: 'Goals help us rank tools when several could solve the same problem.',
  mustHaves: 'We check each tool against these and show which ones we could confirm.',
  budget: 'Tools over your budget lose pricing points. A range is enough.',
  usage: 'How often you use a tool decides whether a free plan is enough.',
  users: 'Some tools charge per person, so this affects the estimated cost.',
  mustKeep: 'Tools that cannot connect to these are marked down.',
  files: 'Sales summaries or metrics help Claude estimate your size and what you can afford.',
  notes: 'Anything that did not fit the questions above.',
}

export const label = (opts: Opt[], id: string, other = '') => (id === 'other' ? other || 'Other' : id === NA ? PREFER_NOT : opts.find(o => o.id === id)?.label ?? id)
const firstNum = (s: string) => { const m = s.replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? +m[0] : null }
// Midpoint of a range id like '6-10' or '500+'.
export function rangeMid(id: string): number | null {
  if (id === '0') return 0
  const m = id.match(/^(\d+)-(\d+)$/); if (m) return (+m[1] + +m[2]) / 2
  const p = id.match(/^(\d+)\+$/); if (p) return +p[1]
  return /^\d+$/.test(id) ? +id : null
}
function rangeTop(id: string): number | null {
  const m = id.match(/^(\d+)-(\d+)$/); if (m) return +m[2]
  const p = id.match(/^(\d+)\+$/); if (p) return +p[1]
  return /^\d+$/.test(id) ? +id : null
}
export const spendMid = (t: ToolSpend) => (t.spend === 'other' ? firstNum(t.spendOther) : rangeMid(t.spend))

export function teamCount(a: Answers): number {
  const n = a.team === 'other' ? firstNum(a.teamOther) : rangeMid(a.team)
  return Math.min(500, Math.max(1, Math.round(n ?? 3)))
}
export function userCount(a: Answers): number {
  const n = a.users === 'other' ? firstNum(a.usersOther) : rangeMid(a.users)
  return Math.max(1, Math.round(n ?? 1))
}
// null means the owner is unsure or preferred not to say, so we recommend an amount instead.
export function budgetAmount(a: Answers): number | null {
  if (a.budget === 'other') return firstNum(a.budgetOther)
  return rangeTop(a.budget)
}
export const usageLevel = (a: Answers): 'light' | 'regular' | 'heavy' => {
  if (a.usage === 'light' || a.usage === 'regular' || a.usage === 'heavy') return a.usage
  return /day|daily|constant|all/i.test(a.usageOther) ? 'regular' : 'light'
}

export function toProfile(a: Answers): Profile {
  const businessType = a.industry === 'other' ? a.industryOther.trim() : a.industry === NA ? '' : a.industry
  const goalProblems = a.goals.map(g => GOAL_PROBLEM[g]).filter(Boolean)
  const problems = [...new Set([...a.frustrations.filter(x => x !== NA), ...goalProblems])]
  const software = [...new Set([...a.tools.map(t => t.name), ...a.mustKeep.filter(x => x !== NA)])]
  const amount = budgetAmount(a)
  return { businessName: a.businessName.trim() || 'your business', businessType, problems, software, budget: amount ?? 0, budgetKnown: amount !== null, employees: teamCount(a), answers: a }
}

// One-line summary used on the Recommendations header and in version history.
export function summary(a: Answers): string[] {
  const out: string[] = []
  if (a.industry && a.industry !== NA) out.push(a.industry === 'other' ? a.industryOther : typeLabel(a.industry))
  if (a.team && a.team !== NA) out.push(`Team: ${label(TEAM, a.team, a.teamOther)}`)
  if (a.locations && a.locations !== NA) out.push(label(LOCATIONS, a.locations, a.locationsOther))
  if (a.budget && a.budget !== NA) out.push(`Budget: ${label(BUDGET, a.budget, a.budgetOther)}`)
  return out
}

// Field-by-field description of answers, used to show what changed between saved versions.
export function describe(a: Answers): Record<string, string> {
  const list = (xs: string[], opts: Opt[]) => xs.filter(x => x !== NA).map(x => opts.find(o => o.id === x)?.label ?? x).join(', ') || (xs.includes(NA) ? PREFER_NOT : 'None')
  return {
    'Business name': a.businessName || 'Not given',
    Industry: a.industry ? (isBuiltInType(a.industry) ? typeLabel(a.industry) : label(INDUSTRY, a.industry, a.industryOther)) : 'Not given',
    'Team size': a.team ? label(TEAM, a.team, a.teamOther) : 'Not given',
    'Years in business': a.years ? label(YEARS, a.years, a.yearsOther) : 'Not given',
    Locations: a.locations ? label(LOCATIONS, a.locations, a.locationsOther) : 'Not given',
    'Current tools': a.tools.map(t => `${t.name} (${label(SPEND, t.spend, t.spendOther) || 'spend not given'})`).join(', ') || 'None',
    Frustrations: list(a.frustrations, PROBLEMS),
    Goals: list(a.goals, GOALS),
    'Must-haves': list(a.mustHaves, MUST_HAVES),
    Budget: a.budget ? label(BUDGET, a.budget, a.budgetOther) : 'Not given',
    'Expected use': a.usage ? label(USAGE, a.usage, a.usageOther) : 'Not given',
    'People using the tools': a.users ? label(USERS, a.users, a.usersOther) : 'Not given',
    'Must keep or connect': list(a.mustKeep, []),
    Notes: a.notes || 'None',
  }
}
