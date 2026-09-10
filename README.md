# Madison Management Services — website redesign

A redesign of [madisonmanagement.net](https://www.madisonmanagement.net) for Madison Management
Services, LLC — specialty loan servicing for private investors, and loss-mitigation options for
homeowners. Eight static pages plus an AI chat assistant.

| | |
|---|---|
| **Preview** | https://madison-redesign-964sjoaem-siddarth30.vercel.app |
| **Production** | https://madisonmanagementnet.vercel.app |
| **Live site (unchanged)** | https://www.madisonmanagement.net |

> **Production is not current.** The redesign lives on the preview URL only. Production still
> serves the previous design until someone promotes a deployment.

---

## Stack

Deliberately minimal — this is a marketing site, not an application.

- **Plain HTML, CSS, and JavaScript.** No framework, no bundler, no build step. Every page is a
  complete `.html` file you can open in a browser.
- **One stylesheet** (`assets/style.css`) and **one script** (`assets/main.js`) shared by all pages.
- **One serverless function** (`api/chat.js`) — the only thing that needs a server.
- Fonts load from Google Fonts. There are no other third-party runtime dependencies.

The single npm dependency (`@anthropic-ai/sdk`) is used *only* by the serverless function. The
pages themselves ship no npm code.

## Structure

```
├── index.html              Home
├── about.html              About Us
├── contact.html            Contact
├── faq.html                FAQs (accordion)
├── homeowners.html         Homeowner loss-mitigation options
├── investors.html          Investor solutions
├── loan-servicing.html     Loan servicing + fee schedule
├── rmlo-services.html      RMLO services + pricing
│
├── assets/
│   ├── style.css           Entire design system (tokens → components → responsive)
│   ├── main.js             Nav, scroll reveals, counters, FAQ accordion
│   ├── chat.js             Chat widget UI (injects itself into every page)
│   └── madison-logo*.png   Official brand lockup (1x + 2x)
│
├── api/
│   ├── chat.js             Serverless endpoint — POST /api/chat
│   └── _knowledge.js       Hand-written knowledge base the assistant is grounded in
│
└── package.json            One dependency, for api/ only
```

Every page shares an identical `<head>`, top bar, nav, and footer. If you change one, change all
eight — there is no templating layer.

## Running locally

No build step. Any static file server works:

```bash
npx serve -l 4321 .
```

Then open http://localhost:4321. On Windows PowerShell use `npx.cmd` — script execution policy
blocks the `npx` shim.

`.claude/launch.json` does the same thing for the Claude Code browser preview. It is a local
convenience only and is Windows-specific.

**The chat widget will not work against a plain static server** — `/api/chat` doesn't exist there,
so the widget shows its "couldn't reach the assistant" fallback. That's expected. To run the API
locally you need `vercel dev` and the environment variable below.

---

## The chat assistant

A widget on every page, backed by one serverless function that calls the Anthropic API.

**Flow:** `assets/chat.js` (UI) → `POST /api/chat` → Anthropic Messages API → reply rendered back
into the panel.

### Configuration

Set in `api/chat.js`:

| Setting | Value |
|---|---|
| Model | `claude-haiku-4-5` |
| Max response tokens | 600 |
| Max question length | 1000 characters |
| Conversation history kept | 12 turns |
| Rate limit | 20 requests per IP per 10 minutes |

### Required environment variable

```
ANTHROPIC_API_KEY
```

Read only as `process.env.ANTHROPIC_API_KEY` — it is never committed and never sent to the browser.
On Vercel it is stored as a Sensitive environment variable. Without it the endpoint returns `503`
and the widget tells the user to call instead; **the rest of the site is unaffected.**

Billing is a prepaid credit balance on the Anthropic account, with a monthly spend cap. If credits
run out, the endpoint fails the same way — the site keeps working, the assistant stops.

### Grounding and safety

The assistant is **not** free to answer from general knowledge. `api/_knowledge.js` contains a
hand-written reference of Madison's real fees, hours, forms, and policies, injected into every
request. The system prompt forbids stating any fee, rate, timeline, or policy not present in that
reference — this is what stops it inventing servicing fees.

Other deliberate choices:

- Model output is rendered with `textContent` and `createElement`, **never** `innerHTML`. Markdown
  bold is parsed into real `<strong>` nodes rather than by parsing HTML, so model output cannot
  inject markup.
- The widget states it is automated, cannot access accounts, and tells users not to share account
  numbers, SSNs, or passwords.
- The system prompt resists attempts to override its instructions.

**Known limitation:** the rate limiter keeps counts in an in-memory `Map`. On serverless each
instance has its own map and cold starts reset it, so the limit is best-effort abuse damping, not a
hard guarantee. A shared store (Redis/KV) would be needed for a real cap.

---

## Deploying

### Vercel (current)

```bash
npx vercel          # preview deployment
npx vercel --prod   # promote to production
```

`api/` is picked up automatically by Vercel's file-system routing — `api/chat.js` becomes
`/api/chat`. `_knowledge.js` is not routed because of the leading underscore.

### Hosting elsewhere

The eight HTML pages and `assets/` are pure static files — drop them on any web server, IIS
included. Nothing needs Node.

**The chat assistant is the only part that needs porting.** `api/chat.js` is an ES module exporting
a default `(req, res)` handler in Vercel's serverless signature. On a normal server it needs a thin
wrapper — for example an Express route that calls the same handler — plus `ANTHROPIC_API_KEY` in
that environment and `npm install` for the SDK. It also expects `req.body` to be parsed JSON and
reads the client IP from `x-forwarded-for`, so a reverse proxy must forward that header.

If the assistant isn't wanted on the new host, delete `api/` and remove the `chat.js` script tag
from the eight pages. Nothing else depends on it.

---

## Design

Typography carries the design; the palette was inherited and kept.

- **Newsreader** (editorial serif) for headings, **Instrument Sans** for body, **IBM Plex Mono**
  for section labels, statistics, and fee tables.
- Brand **navy** `#12233f` and **maroon** `#8b2635` unchanged. Warm ivory `#faf8f4` replaces
  clinical grey; muted brass is used for hairlines only.
- Design tokens live at the top of `assets/style.css`. The older variable names (`--navy`,
  `--maroon`, `--border`…) are kept as aliases, so inline styles in the HTML still resolve.
- The **logo is never recoloured.** Its rust and blue sit outside the site palette on purpose. In
  the dark footer it sits on an ivory plate, because a white knockout fills in the key inside the
  house.

Motion is applied by `assets/main.js` at runtime — scroll reveals, a stat counter, sticky-nav
condensing, and a reading-progress bar. Reveal targets are selected by CSS class in JS rather than
marked up per element, so pages can't fall out of sync. All of it is gated behind
`prefers-reduced-motion`, and **if the script fails to run, every element stays visible** and all
controls still work as plain HTML.

Verified across 8 pages × 8 viewport widths (320–1600px): no horizontal overflow, both logos load,
nav baselines identical.

---

## Content

Page copy mirrors the real Madison site, with wording changes requested by Sadhna Cordell and Edith
Vivar. Fees, licensing (47 states + DC + PR), NMLS #185724, hours, and phone numbers are real —
**treat them as content to verify, not to invent.** The same applies to `api/_knowledge.js`; an
error there becomes something the assistant tells customers.

The contact form currently uses a `mailto:` action, which depends on the visitor having a mail
client configured. It should be replaced with a real form handler before launch.
