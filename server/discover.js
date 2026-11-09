// Extracts draft Nutrition Label facts from a vendor page. Everything returned is a draft and Not Verified.
import { lookup } from 'node:dns/promises'
import net from 'node:net'

const KNOWN = ['Square', 'QuickBooks', 'Shopify', 'Google Workspace', 'Gmail', 'Google Calendar', 'Google Sheets', 'Microsoft 365', 'Outlook', 'Excel', 'Instagram', 'Facebook', 'Zapier', 'Stripe', 'PayPal', 'Mailchimp', 'Calendly', 'Slack', 'Zoom', 'WordPress', 'Toast', 'Clover', 'HubSpot', 'Salesforce']

function isPrivate(ip) {
  if (net.isIPv6(ip)) return ip === '::1' || /^f[cd]/i.test(ip) || /^fe80/i.test(ip) || ip.startsWith('::ffff:') && isPrivate(ip.slice(7))
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

async function safeFetch(raw, hops = 0) {
  const u = new URL(raw)
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http(s) URLs are allowed')
  const { address } = await lookup(u.hostname)
  if (isPrivate(address)) throw new Error('That address is not allowed')
  const res = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'StackdBot/1.0', accept: 'text/html' } })
  if (res.status >= 300 && res.status < 400 && res.headers.get('location') && hops < 3) return safeFetch(new URL(res.headers.get('location'), u).href, hops + 1)
  if (!res.ok) throw new Error(`Site responded ${res.status}`)
  const html = (await res.text()).slice(0, 600_000)
  return { html, finalUrl: u.href }
}

const decode = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const meta = (html, name) => decode(html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)`, 'i'))?.[1] ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'))?.[1] ?? '').trim()

export function extract(html, pageUrl) {
  const clean = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
  const text = decode(clean.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')
  const title = decode(clean.match(/<title[^>]*>([^<]*)/i)?.[1] ?? '').trim()
  const siteName = meta(html, 'og:site_name') || title.split(/[|\-\u2013\u2014:]/)[0].trim()
  const description = meta(html, 'description') || meta(html, 'og:description')
  const prices = [...new Set((text.match(/\$\s?\d{1,4}(?:\.\d{2})?\s*(?:\/\s?|per\s)(?:mo(?:nth)?|user|seat|agent|month)\b/gi) ?? []).map(s => s.replace(/\s+/g, ' ')))].slice(0, 6)
  const integrations = KNOWN.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text))
  const links = [...clean.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({ href: m[1], label: m[2].replace(/<[^>]+>/g, '').trim() }))
  const find = re => { const l = links.find(l => re.test(l.href) || re.test(l.label)); return l ? new URL(l.href, pageUrl).href : null }
  const features = [...clean.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)].map(m => decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()).filter((s, i, a) => s.length > 3 && s.length < 90 && a.indexOf(s) === i).slice(0, 6)
  return {
    name: siteName || new URL(pageUrl).hostname, url: pageUrl, description, prices, integrations, features,
    privacyUrl: find(/privacy/i), termsUrl: find(/terms|legal/i), pricingUrl: find(/pricing|plans/i),
    freeTierMentioned: /free (plan|tier|forever)|free trial/i.test(text),
  }
}

export async function discover(url) {
  const { html, finalUrl } = await safeFetch(url)
  return extract(html, finalUrl)
}
