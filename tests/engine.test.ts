import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { rank, buildStack, typeKey, type Profile, type Tool } from '../src/lib/engine.ts'

const PROFILE: Profile = { businessName: 'Test Salon', businessType: 'salon', problems: ['scheduling', 'marketing_content', 'invoicing'], software: ['Square', 'Instagram'], budget: 100, employees: 4 }

const tools: Tool[] = JSON.parse(readFileSync(new URL('../src/data/tools.json', import.meta.url), 'utf8')).tools

test('scores are deterministic and within 0-100', () => {
  const a = rank(tools, PROFILE), b = rank(tools, PROFILE)
  assert.deepEqual(a.map(x => [x.tool.id, x.score]), b.map(x => [x.tool.id, x.score]))
  for (const s of a) {
    assert.ok(s.score >= 0 && s.score <= 100, `${s.tool.id} ${s.score}`)
    assert.equal(s.score, s.breakdown.reduce((n, x) => n + x.points, 0))
    for (const b of s.breakdown) assert.ok(b.points <= b.max)
  }
})

test('unknown price is flagged, not invented', () => {
  const s = rank(tools, PROFILE).find(x => x.tool.pricing.startingMonthly === null)!
  assert.ok(s.flags.includes('Price Not Verified'))
})

test('stack covers the chosen problems and stays under budget on known costs', () => {
  const st = buildStack(rank(tools, PROFILE), PROFILE)
  assert.ok(st.picks.length >= 3)
  assert.ok(st.picks.some(p => p.problem === 'scheduling'))
  assert.ok(st.knownMonthly <= PROFILE.budget)
})

test('every tool has a source URL', () => {
  for (const t of tools) assert.match(t.pricing.source, /^https:\/\//)
})

test('typed-in business types and problems are scored like built-in ones', () => {
  assert.equal(typeKey('Dog grooming salon'), 'salon')
  assert.equal(typeKey('Food truck'), 'restaurant')
  const custom: Profile = { ...PROFILE, businessType: 'Nail studio', problems: ['Booking appointments'], software: ['Square', 'Vagaro'] }
  const r = rank(tools, custom)
  assert.ok(r[0].breakdown.find(b => b.key === 'fit')!.points > 20)
  assert.ok(buildStack(r, custom).picks.length >= 1)
})

test('tool data has no em dashes', () => {
  assert.ok(!readFileSync(new URL('../src/data/tools.json', import.meta.url), 'utf8').includes('\u2014'))
})
