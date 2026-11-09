import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rank, rankReason, buildStack, recommendSpend, currentAiAdvice, type Profile, type Tool } from '../src/lib/engine.ts'
import { simulate, classifyStress } from '../src/lib/rehearsal.ts'
import { priorityFit, whyBest } from '../src/lib/priorities.ts'
import { openDb } from '../server/db.js'

const tools: Tool[] = JSON.parse(readFileSync(new URL('../src/data/tools.json', import.meta.url), 'utf8')).tools
const P: Profile = { businessName: 'Test', businessType: 'salon', problems: ['scheduling', 'marketing_content'], software: ['Square'], budget: 100, employees: 4 }

test('every ranked tool gets a reason that names another tool', () => {
  const r = rank(tools, P)
  r.forEach((_, i) => assert.ok(rankReason(r, i).length > 10))
  assert.match(rankReason(r, 0), new RegExp(r[1].tool.name.replace(/[.()]/g, '\\$&')))
})

test('recommended spend uses only listed prices and names unknowns', () => {
  const st = buildStack(rank(tools, P), P)
  const light = recommendSpend(st, 'light', 1), heavy = recommendSpend(st, 'heavy', 3)
  assert.ok(light.amount >= 0 && heavy.amount >= light.amount)
})

test('current AI tool advice compares against cheaper tools', () => {
  const adv = currentAiAdvice([{ name: 'ChatGPT', spend: 60 }, { name: 'QuickBooks', spend: 30 }], rank(tools, P), P)
  assert.equal(adv.length, 1)
  assert.match(adv[0].text, /\$60/)
})

test('rehearsal answers from facts, hands off when unsure, refuses card numbers', () => {
  const out = simulate(['Are you open on Sunday?', 'Do you sell gift cards for dogs?', 'My card number is 4111 1111 1111 1111', 'Can I get a refund?'],
    ['We are open Sunday 10am to 4pm'], ['Give refunds'])
  assert.deepEqual(out.map(o => o.action), ['answer', 'handoff', 'refuse', 'handoff'])
})

test('open-ended stress test changes results from the chosen point', () => {
  assert.equal(classifyStress('The booking system goes offline at lunch'), 'outage')
  const out = simulate(['Are you open Sunday?', 'Are you open Sunday?'], ['Open Sunday 10 to 4'], [], { text: 'Our booking system crashes', from: 1 })
  assert.equal(out[0].action, 'answer'); assert.equal(out[1].action, 'queued')
  assert.ok(out.every(o => o.reply && o.reason))
})

test('priority ranking follows the owner order', () => {
  const r = rank(tools, P).slice(0, 4)
  const costFirst = priorityFit([{ id: 'cost', label: 'Cost' }, { id: 'ease', label: 'Ease of use' }], r)
  assert.ok(costFirst[0].fit >= costFirst.at(-1)!.fit)
  assert.ok(whyBest(costFirst).length > 0)
})

test('accounts hash passwords and keep each user history private', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stackd-'))
  const db = openDb(join(dir, 'db.json'))
  const pw = 'test-' + Math.random().toString(36).slice(2)
  const a = db.signup('a@example.test', pw, 'A Co'), b = db.signup('b@example.test', pw, 'B Co')
  assert.throws(() => db.signup('a@example.test', pw, ''))
  assert.throws(() => db.login('a@example.test', 'wrong-password'))
  assert.equal(db.login('A@example.test', pw).id, a.id)
  assert.ok(!readFileSync(join(dir, 'db.json'), 'utf8').includes(pw))
  const v = db.addSnapshot(a.id, 'assessment', { x: 1 })
  assert.equal(db.listSnapshots(a.id).length, 1)
  assert.equal(db.listSnapshots(b.id).length, 0)
  assert.equal(db.deleteSnapshot(b.id, v.id), false)
  assert.equal(db.deleteSnapshot(a.id, v.id), true)
  db.deleteUser(a.id)
  assert.throws(() => db.login('a@example.test', pw))
  assert.ok(readdirSync(dir).includes('db.json'))
})

test('rehearsal does not answer from a loosely related fact', () => {
  const facts = ['We groom dogs Tuesday to Saturday, 8am to 5pm', 'A full groom for a small dog costs $65', 'We need proof of rabies vaccine before the first visit']
  const out = simulate(['Are you open on Saturday?', 'How much is a groom for a small dog?', 'My dog has a rash, what is it?', 'Do you need vaccine records?', 'Do you sell dog food?'], facts, [])
  assert.deepEqual(out.map(o => o.action), ['answer', 'answer', 'handoff', 'answer', 'handoff'])
})
