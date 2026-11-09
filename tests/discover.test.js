import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extract, discover } from '../server/discover.js'

test('extracts draft facts from vendor HTML', () => {
  const html = `<html><head><title>AcmeAI | Phone agent</title><meta name="description" content="AI that answers calls"></head>
  <body><h2>Answers every call</h2><p>Starter $49/month. Works with Square and Zapier. Free trial.</p><a href="/privacy">Privacy</a></body></html>`
  const r = extract(html, 'https://acme.example/pricing')
  assert.equal(r.name, 'AcmeAI')
  assert.deepEqual(r.prices, ['$49/month'])
  assert.deepEqual(r.integrations, ['Square', 'Zapier'])
  assert.equal(r.privacyUrl, 'https://acme.example/privacy')
  assert.ok(r.freeTierMentioned)
})

test('blocks private network addresses', async () => {
  await assert.rejects(discover('http://127.0.0.1:8787/api/tools'), /not allowed/)
  await assert.rejects(discover('file:///etc/passwd'), /Only http/)
})
