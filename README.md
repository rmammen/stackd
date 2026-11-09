# Stackd

Stackd helps small business owners find, compare, test and safely adopt AI tools based on their needs, current software and budget.

## Features
| Page | What it does |
|---|---|
| Assessment | 7 short steps with a progress bar: basics (industry, team size up to 500, years, locations), current tools and spend ranges, frustrations, goals and must-haves, budget range and expected use, tools to keep, and optional file uploads. Every question has Other, a "why we ask" note, and most have Prefer not to say |
| Recommendations | Ranked tools with a deterministic score out of 100 (fit 35, price 20, integrations 20, setup 15, reliability 10), a plain explanation of the score, why each tool ranks above the next one, must-have checks, a usage-based spend recommendation when the owner is unsure, savings advice for AI tools they already pay for, and an optional Claude business analysis (size, revenue, affordable spend, immediate needs) |
| Nutrition Labels | Pricing, features, integrations, privacy, cancellation, risks and sources. Missing facts show **Not Verified** |
| Compare | Unlimited tools side by side. Owners rank what matters (cost, ease of use, integrations, support, or their own criterion) and the page explains which tool fits best and why, plus each tool's strengths and watch-outs |
| Rehearsal | Fill-in-the-blank setup with the owner's own facts, rules and customer requests. Shows what a cautious AI would answer, hand off or refuse, with the safety barrier used. Optional Claude role-play |
| Stress Test | Open-ended: the owner describes what could go wrong and when it starts, and every request shows a specific result side by side with a normal day |
| Pilot Plan | Explains what a pilot is, what to do each week and in the tab, marks finished items with a checkmark and color, and shows next steps when everything is done |
| History | With a free account, each finished assessment and saved comparison becomes a dated version. View, compare two versions, restore, or delete. Versions are deleted automatically after 12 months |
| Accounts, Terms, Pricing | Sign up and sign in, Terms of Service, and a Pricing page (everything is free) |
| Add a Tool | Paste a vendor URL to get a draft label (prices, integrations, policy links), or fill it in by hand |
| Free Help | Links to official free assistance (SBA, SCORE, SBDC, Maryland SBDC, and more) |

The app starts empty, with no sample businesses or data. Every selection list includes an **Other** option for your own entries. An account is only needed for version history. No API key is needed; Claude features fall back to built-in results.

## Run locally
Requires Node 24 or newer.
```bash
npm install
```
```bash
npm run dev
```
Open http://localhost:5173. The API runs on :8787 and Vite proxies `/api` to it.

Production build and server, at http://localhost:8787:
```bash
npm run build && npm start
```
Tests (scoring, rehearsal, priorities, accounts and URL extraction):
```bash
npm test
```

### Optional Claude features
Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. The key is read only on the server and never reaches the browser. It powers score summaries, the business analysis and the rehearsal role-play, using `claude-opus-5-5` by default (override with `CLAUDE_MODEL`). Without a key, each feature uses a deterministic fallback.

### Where data is stored
- Assessment answers, comparisons, rehearsal setup and pilot progress: the browser (localStorage).
- Uploaded files: memory only, cleared when the tab closes. Sent to Anthropic only when the owner runs a Claude analysis; never written to disk.
- Accounts and saved versions: `server/data/db.json` (override with `STACKD_DB`). Passwords are hashed with scrypt. Sessions last 30 days in an HttpOnly cookie. Versions older than 365 days are deleted automatically. The file is not encrypted at rest, so host it on a private disk and add the `Secure` cookie flag behind HTTPS before going live.

## Deploy
- **Any Node host** (Render, Railway, Fly.io): build command `npm install && npm run build`, start command `npm start`. Set `ANTHROPIC_API_KEY` as a secret env var if you want Claude features. Give the host a persistent disk for `server/data/` or accounts are lost on redeploy.
- **Static only** (Netlify, Vercel, GitHub Pages): deploy `dist/`. Accounts, history, URL discovery and Claude features need the Node server; everything else works.

## Structure
```
src/data/tools.json   researched tool dataset (null = Not Verified)
src/lib/engine.ts     deterministic scoring + stack builder
src/lib/questions.ts  questionnaire options and answer-to-profile mapping
src/lib/rehearsal.ts  rule-based rehearsal and stress tests
src/lib/priorities.ts priority-weighted comparison
src/lib/analysis.ts   business analysis (Claude or built-in)
src/pages/*           Home, Assessment, Results, Compare, Lab, Pilot, History, Account pages, Discover, Resources
server/index.js       API + static server
server/db.js          JSON file store for accounts and saved versions
server/claude.js      Claude calls (Anthropic SDK)
server/discover.js    vendor page extraction (SSRF-guarded)
```

## Data honesty
- Prices, integrations and policies come from vendors' public pages. Anything not confirmed is `null` and shows **Not Verified**. **Re-check every entry against its source link before a live demo**, because vendor pricing changes often.
- `setup` and `maturity` are editorial estimates, not reviews. Stackd does not publish reviews.
- The Rehearsal uses only what the owner types in. Time and cost figures are estimates from the owner's own numbers.
- Recommended spend only adds up prices listed in the data and names every tool whose paid price is Not Verified.

## 16-week roadmap
| Weeks | Milestone |
|---|---|
| 1-2 | Human verification pass on every tool field, with a `lastVerified` date per field; expand to 40 tools |
| 3-4 | Move data to SQLite plus an admin review queue for Discover drafts |
| 5-6 | Usability tests with 10 local owners through the Maryland SBDC; fix the top issues |
| 7-8 | Smarter rehearsal matching, plus import of real FAQ pages into the Rehearsal |
| 9-10 | Claude-assisted discovery: structured extraction from pricing and terms pages, with citations |
| 11-12 | Shareable pilot plans (PDF export, link), plus email reminders before billing dates |
| 13-14 | Accessibility audit (WCAG 2.2 AA) and Spanish translation |
| 15-16 | Pilot outcome tracking (opt-in), anonymous benchmark data, and partnerships with SBDC advisors |
