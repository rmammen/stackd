// Deterministic rehearsal: shows how a cautious AI assistant would treat each request, using only the owner's own facts and rules.
export type Action = 'answer' | 'handoff' | 'refuse' | 'queued'
export type Step = { request: string; action: Action; reply: string; reason: string; barrier: string }

const STOP = new Set(['what', 'when', 'where', 'which', 'your', 'have', 'does', 'with', 'that', 'this', 'from', 'will', 'there', 'about', 'could', 'would', 'please', 'today', 'need', 'want', 'like', 'just', 'they', 'them', 'yours',
  'are', 'you', 'the', 'can', 'how', 'much', 'for', 'and', 'our', 'any', 'get', 'did', 'has', 'was', 'may', 'its', 'who', 'why', 'here', 'there', 'some', 'tell', 'know', 'give', 'make'])
const words = (s: string) => [...new Set((s.toLowerCase().match(/[a-z0-9$]{3,}/g) ?? []).filter(w => !STOP.has(w)).map(w => w.slice(0, 5)))]
const overlap = (a: string, b: string) => { const bw = new Set(words(b)); return words(a).filter(w => bw.has(w)).length }
// Share of the request's meaningful words that a fact covers. Half or more is needed to answer.
const coverage = (req: string, fact: string) => { const n = words(req).length; return n ? overlap(req, fact) / n : 0 }
const SENSITIVE = /\b(\d[ -]?){13,19}\b|\b\d{3}-\d{2}-\d{4}\b|password|passcode|pin number|card number|credit card|bank account|routing number|social security|ssn/i
const SAFETY = /\b(rash|sick|ill|pain|hurt|injur|bleed|blood|allerg|swell|infect|medic|diagnos|symptom|emergenc|poison|lawyer|legal|lawsuit|sue|police)/i

export type StressKind = 'outage' | 'wrong' | 'upset' | 'billing' | 'privacy' | 'volume' | 'unknown'
export function classifyStress(text: string): StressKind {
  const t = text.toLowerCase()
  if (/offline|outage|down\b|crash|not working|broken|integration|sync|disconnect|internet|server/.test(t)) return 'outage'
  if (/privacy|leak|data|hack|breach|personal info/.test(t)) return 'privacy'
  if (/wrong|mistake|incorrect|error|made up|hallucinat|outdated|old info/.test(t)) return 'wrong'
  if (/angry|upset|complain|rude|yell|refund|threat|review/.test(t)) return 'upset'
  if (/price|fee|bill|charge|cost|overage|subscription/.test(t)) return 'billing'
  if (/rush|busy|flood|lots of|many|spike|holiday|volume/.test(t)) return 'volume'
  return 'unknown'
}
export const STRESS_LABEL: Record<StressKind, string> = {
  outage: 'A system or connection stops working', wrong: 'The AI gets something wrong', upset: 'An upset customer', billing: 'An unexpected cost or billing problem',
  privacy: 'A privacy or data problem', volume: 'A sudden rush of requests', unknown: 'Something unexpected',
}

function normal(request: string, facts: string[], rules: string[]): Step {
  if (SENSITIVE.test(request)) return { request, action: 'refuse', reply: 'For your security I cannot take card numbers, passwords or ID numbers here. A team member will contact you to finish this safely.', reason: 'The request contains or asks for sensitive information.', barrier: 'Sensitive data block' }
  const rule = rules.map(r => ({ r, n: overlap(request, r) })).sort((a, b) => b.n - a.n)[0]
  if (rule && rule.n > 0) return { request, action: 'handoff', reply: 'Let me get a team member to help with that. They will follow up with you shortly.', reason: `Matches your rule: "${rule.r}".`, barrier: 'Your "never do" rules' }
  if (SAFETY.test(request)) return { request, action: 'handoff', reply: 'That is something a person should answer. I have passed your message to our team, and if it is urgent please contact a professional right away.', reason: 'Health, safety and legal questions always go to a person, even if a fact looks related.', barrier: 'Health, safety and legal hand-off' }
  const fact = facts.map(f => ({ f, n: overlap(request, f), c: coverage(request, f) })).sort((a, b) => b.c - a.c || b.n - a.n)[0]
  if (fact && fact.c >= 0.5) return { request, action: 'answer', reply: fact.f, reason: `Answered from your information (${fact.n} matching ${fact.n === 1 ? 'word' : 'words'}).`, barrier: 'Answers only from your facts' }
  return { request, action: 'handoff', reply: 'I do not have that information, so I have passed your question to a team member who will reply soon.', reason: 'None of your facts cover this. Add one to let the AI answer it next time.', barrier: 'Hands off when unsure' }
}

// Applies the owner's problem scenario on top of the normal result, from the given request onward.
function stressed(s: Step, kind: StressKind, scenario: string): Step {
  if (s.action === 'refuse' || s.barrier === 'Health, safety and legal hand-off') return s
  switch (kind) {
    case 'outage': return { ...s, action: 'queued', reply: 'Our system is having trouble right now. I have saved your message and a team member will confirm by text or email.', reason: `During "${scenario}", the AI cannot check or update your systems, so it saves the request and lists it for staff.`, barrier: 'Fallback queue for staff' }
    case 'wrong': return s.action === 'answer'
      ? { ...s, action: 'handoff', reply: `${s.reply} A team member will double check this for you.`, reason: 'With accuracy in doubt, answers are flagged for a person to confirm before relying on them.', barrier: 'Human review of answers' }
      : s
    case 'upset': return { ...s, action: 'handoff', reply: 'I am sorry about this. I am passing you to a team member right away so they can make it right.', reason: 'Upset customers always go to a person. The AI does not promise refunds or argue.', barrier: 'Escalate emotional conversations' }
    case 'billing': return s.action === 'answer' && /\$|price|cost|fee/i.test(s.reply + s.request)
      ? { ...s, action: 'handoff', reply: 'Let me have a team member confirm the exact price for you.', reason: 'Prices are confirmed by a person until the billing problem is fixed.', barrier: 'No unverified prices' }
      : s
    case 'privacy': return { ...s, action: 'handoff', reply: 'A team member will help you with this directly.', reason: 'During a possible data problem, the AI stops handling customer details and passes everything to staff.', barrier: 'Pause on privacy risk' }
    case 'volume': return s.action === 'answer' ? s : { ...s, action: 'queued', reply: 'Thanks for your patience. We are busy right now and will reply in order.', reason: 'Simple questions are still answered. Everything else waits in a queue for staff.', barrier: 'Queue during rushes' }
    default: return { ...s, action: 'handoff', reply: 'I want to make sure this is handled properly, so a team member will follow up.', reason: `The AI does not recognize this situation ("${scenario}"), so it stops and hands off rather than guess.`, barrier: 'Stop when the situation is unclear' }
  }
}

export function simulate(requests: string[], facts: string[], rules: string[], stress?: { text: string; from: number }) {
  const kind = stress?.text.trim() ? classifyStress(stress.text) : null
  return requests.map((r, i) => {
    const base = normal(r, facts, rules)
    return kind && i >= (stress!.from) ? stressed(base, kind, stress!.text.trim()) : base
  })
}

export const ACTION: Record<Action, [string, string]> = {
  answer: ['Answered by AI', 'bg-brand-50 text-brand-800 ring-brand-200'],
  handoff: ['Sent to a person', 'bg-sky-50 text-sky-800 ring-sky-200'],
  refuse: ['Refused safely', 'bg-red-50 text-red-700 ring-red-200'],
  queued: ['Saved for staff', 'bg-accent-50 text-accent-800 ring-accent-200'],
}

export const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)
