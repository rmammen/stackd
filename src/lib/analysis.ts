// Business analysis: Claude when the server has a key, otherwise a deterministic summary built from the answers and files.
import { buildStack, problemLabel, type Profile, type Scored } from './engine'
import { LOCATIONS, TEAM, YEARS, label } from './questions'
import type { SpendAdvice } from './engine'
import type { Upload } from './store'

export type Analysis = {
  source: 'claude' | 'local'
  sizeEstimate: string; revenueEstimate: string; revenueBasis: string
  affordableMonthlyLow: number | null; affordableMonthlyHigh: number | null; affordableReason: string
  immediateNeeds: { need: string; why: string; toolIds: string[] }[]
  currentToolAdvice: { tool: string; advice: string }[]
  caveats: string
}

export const FILE_CHAR_LIMIT = 60_000

// Splits one CSV row, keeping quoted values like "$12,400" together.
function splitRow(row: string, sep: string): string[] {
  const out: string[] = []; let cur = '', quoted = false
  for (const ch of row) {
    if (ch === '"') quoted = !quoted
    else if (ch === sep && !quoted) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

// Finds a revenue or sales column in a CSV or TSV file and totals it.
export function revenueFromFiles(files: Upload[]) {
  for (const f of files) {
    if (!/\.(csv|tsv)$/i.test(f.name)) continue
    const sep = /\.tsv$/i.test(f.name) ? '\t' : ','
    const rows = f.text.trim().split(/\r?\n/).map(r => splitRow(r, sep))
    const col = rows[0]?.findIndex(h => /revenue|sales|income|gross/i.test(h))
    if (col === undefined || col < 0) continue
    const nums = rows.slice(1).map(r => parseFloat((r[col] ?? '').replace(/[$,"\s]/g, ''))).filter(n => !isNaN(n))
    if (nums.length) return { file: f.name, column: rows[0][col].trim(), rows: nums.length, total: nums.reduce((a, b) => a + b, 0) }
  }
  return null
}

export function localAnalysis(p: Profile, ranked: Scored[], spend: SpendAdvice | null, files: Upload[]): Analysis {
  const a = p.answers
  const rev = revenueFromFiles(files)
  const stack = buildStack(ranked, p)
  const parts = a ? [a.team && `team of ${label(TEAM, a.team, a.teamOther).toLowerCase()}`, a.years && label(YEARS, a.years, a.yearsOther).toLowerCase() + ' in business', a.locations && label(LOCATIONS, a.locations, a.locationsOther).toLowerCase()].filter(x => x && !/prefer not/.test(x as string)) : []
  return {
    source: 'local',
    sizeEstimate: parts.length ? `Based on your answers: ${parts.join(', ')}.` : 'You did not share team size or locations.',
    revenueEstimate: rev ? `Your file ${rev.file} totals $${Math.round(rev.total).toLocaleString()} in the "${rev.column}" column across ${rev.rows} rows.` : 'Not enough information',
    revenueBasis: rev ? 'Added up directly from your file. We do not know what period it covers.' : 'Upload a CSV with a revenue or sales column, or turn on the Claude analysis, for an estimate.',
    affordableMonthlyLow: null,
    affordableMonthlyHigh: spend && (spend.amount > 0 || !spend.unknown.length) ? spend.amount : null,
    affordableReason: spend ? `${spend.basis}${spend.unknown.length ? ` Paid pricing is Not Verified for ${spend.unknown.join(', ')}, so we cannot give a full amount. Check those vendors' pricing pages.` : ''}` : '',
    immediateNeeds: stack.picks.slice(0, 3).map(x => ({ need: problemLabel(x.problem), why: `You listed this${p.problems.indexOf(x.problem) === 0 ? ' first' : ''}. ${x.scored.tool.name} is the best match we found (${x.scored.score} of 100).`, toolIds: [x.scored.tool.id] })),
    currentToolAdvice: [],
    caveats: 'This summary is built from your answers and the prices we have on file. It is an estimate, not financial advice.',
  }
}

export async function claudeAnalysis(p: Profile, files: Upload[]): Promise<Analysis> {
  const { answers, ...profile } = p
  const r = await fetch('/api/analyze', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers, profile, files: files.map(f => ({ name: f.name, text: f.text.slice(0, FILE_CHAR_LIMIT), truncated: f.text.length > FILE_CHAR_LIMIT })) }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Analysis failed')
  return { ...j, source: 'claude' }
}
