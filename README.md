# SpeakUpp

AI-powered speaking practice platform for English, French, and Arabic. Users receive personalized CEFR-level prompts, practice deliberate speaking (think 3 minutes, speak 1 minute), and get instant AI feedback on grammar, vocabulary, fluency, and pronunciation.

- **Client telemetry** (`src/lib/observability.ts`) — Sentry for error capture, PostHog for funnel events (`signup_completed`, `practice_topic_generated`, `session_analyzed`, …) with `identifyUser` on sign-in.
- **Server telemetry** (`src/server/observability.server.ts`) — structured logs and `captureServerException` used by every server fn that hits an external API; AI gateway and PayPal errors are logged in detail server-side but returned to the browser as generic messages.
- **Freemium quota** (`src/server/quota.server.ts`) — `assertWithinFreeQuota` runs *before* any AI gateway call in `generateTopic` and `analyzeSession`, so users cannot bypass the paywall by hitting RPCs directly.
- **Topic cache** (`src/lib/topic-cache.ts` + `topic_cache` table) — deterministic `(lang, level, interests_hash)` bucket; the server pulls from cache when there are enough prompts and excludes any prompt the user has already seen in the last 30 days.

## Payments

- **Provider:** PayPal (REST API, `@paypal/react-paypal-js` on the client).
- Lifetime, one-time purchase — no recurring billing.
- **Locale-aware pricing**: server detects country via `cf-connecting-ip` / `x-forwarded-for`, maps to a supported currency, and computes a localised price.
- **Server-verified flow**:
  1. `getLocalPrice` — server returns price + currency.
  2. `paypalCreateOrder` — server creates the PayPal order with the right amount/currency.
  3. Browser opens the PayPal popup.
  4. `paypalCaptureOrder` — server captures and persists the `subscriptions` row (with `paypal_order_id`, `paypal_capture_id`).
  5. **Webhook** (`/api/public/paypal-webhook`) — independent confirmation from PayPal, signature-verified, idempotent.

---

## AI pipeline

All AI calls go through the managed AI gateway, using `google/gemini-2.5-flash`.

1. **Topic generation** (`generateTopic`)
   - Inputs: target language, CEFR level, list of interests.
   - Output: a single, level-appropriate speaking prompt.

2. **Speech-to-text + feedback** (`analyzeSession`)
   - Downloads the user's recording from the `recordings` storage bucket (RLS-scoped).
   - Sends the audio to the gateway as base64 to Gemini (multimodal) for transcription.
   - Sends the transcript + topic + level back to Gemini with a structured-output schema asking for grammar, vocabulary, fluency, pronunciation notes, and an overall summary.
   - Persists the structured result into the `feedback` table.

API keys live in server env only.

---

## Storage

- **Bucket:** `recordings` (private).
- Audio uploads happen from the browser using the user's session, so RLS scopes the file path to the user.
- The `analyze` server function reads the file using the same authenticated client — no service-role read.

---

## Internationalisation (i18n)

- **Languages:** English, French, Arabic.
- A single in-memory dictionary in `src/lib/i18n.tsx` exposes `t.*` for nav, landing, practice, common, and auth namespaces.
- `<html lang>` and `<html dir>` are set automatically — Arabic flips the layout to RTL.
- The user's choice is persisted in `localStorage` (`ui_lang`) and on the `profiles.ui_lang` column once signed in.

---

## Design system

Defined entirely in `src/styles.css` using **`oklch` semantic tokens** so light/dark mode works without touching components:

| Token | Role |
| --- | --- |
| `--sunlight` | Warm off-white background |
| `--peach` | Accent (buttons, CTAs) |
| `--terracotta` | Highlights, focus rings |
| `--sage` | Secondary surfaces |
| `--ink` / `--ink-light` | Foreground text |
| `--shadow-soft` / `--shadow-elevated` | Branded peach-tinted shadows |

Typography:

- **Display:** Fraunces (variable serif) for headlines.
- **Sans:** Outfit for UI/body text.

Components never hard-code hex values — they use `bg-background`, `text-foreground`, `bg-accent`, `text-terracotta`, etc. The shadcn/ui set is fully restyled to the Orador palette.

---

## SEO

- **SSR** via TanStack Start ensures crawlers see fully rendered HTML.
- **Per-route `head()`** with unique `<title>`, `meta description`, and Open Graph tags.
- **JSON-LD** `SoftwareApplication` schema on the home page.
- **`/sitemap.xml`** generated at request time, listing the public routes.
- **`/robots.txt`** allows everything and points at the sitemap.
- **`/llms.txt`** — machine-readable summary for LLM-powered crawlers.
- **`/site.webmanifest`** + 192/512 icons → installable PWA shell.
- `theme-color`, `viewport-fit=cover`, and a Google Search Console verification meta tag are wired in `__root.tsx`.

---

## Testing

**Vitest** with `happy-dom` is configured via `vitest.config.ts`. Suites cover the pure-logic seams of the backend so they can run without a DB or HTTP server:

| File | What it covers |
| --- | --- |
| `src/lib/topic-cache.test.ts` | Deterministic interests hashing + cache bucket invariants |
| `src/server/paypal.server.test.ts` | Country → currency mapping, locale price math |
| `src/server/observability.server.test.ts` | Structured logger output + error capture envelope |

Run with `bunx vitest run`.

---

## Project structure

```
src/
├── routes/                       # File-based routes (TanStack Router)
│   ├── __root.tsx                # Root layout, providers, head meta, SEO
│   ├── index.tsx                 # Landing page
│   ├── login.tsx, signup.tsx
│   ├── onboarding.tsx
│   ├── practice.tsx
│   ├── session.$id.tsx
│   ├── dashboard.tsx, history.tsx, rankings.tsx
│   ├── account.tsx, upgrade.tsx, admin.tsx
│   ├── sitemap[.]xml.ts          # Server route → XML sitemap
│   └── api/public/
│       └── paypal-webhook.ts     # Signature-verified webhook
├── server/                       # createServerFn handlers (Workers runtime)
│   ├── account.functions.ts
│   ├── admin.functions.ts
│   ├── analyze.functions.ts
│   ├── dashboard.functions.ts
│   ├── history.functions.ts
│   ├── onboarding.functions.ts
│   ├── paypal.functions.ts
│   ├── paypal-config.functions.ts
│   ├── paypal.server.ts          # Server-only PayPal helpers
│   ├── rankings.functions.ts
│   ├── session.functions.ts
│   ├── topic.functions.ts
│   ├── quota.server.ts           # Free-tier enforcement
│   ├── observability.server.ts   # Structured server logging
│   ├── auth-client-middleware.ts # Attaches bearer token client-side
│   ├── observability.server.test.ts
│   └── paypal.server.test.ts
├── components/
│   ├── app-header.tsx            # Top navigation
│   ├── logo.tsx                  # Brand mark
│   └── ui/                       # shadcn/ui primitives (46 components)
├── hooks/
│   └── use-mobile.tsx
├── lib/
│   ├── auth-context.tsx          # Supabase session provider
│   ├── i18n.tsx                  # EN/FR/AR + RTL
│   ├── interests.ts              # Curated interests list
│   ├── topic-cache.ts            # Deterministic cache helpers
│   ├── topic-cache.test.ts
│   ├── observability.ts          # Sentry + PostHog client wiring
│   └── utils.ts                  # cn() helper
├── integrations/supabase/        # ⚠ auto-generated, do not edit
│   ├── client.ts                 # Browser client (publishable key)
│   ├── client.server.ts          # Admin client (service role, server only)
│   ├── auth-middleware.ts        # requireSupabaseAuth
│   ├── auth-attacher.ts          # Bearer-token client middleware
│   └── types.ts
├── router.tsx                    # createRouter + DefaultErrorComponent
├── start.ts                      # Global server middleware (security headers)
├── routeTree.gen.ts              # ⚠ auto-generated by router plugin
└── styles.css                    # Tailwind v4 + design tokens
public/
├── robots.txt
├── llms.txt
├── site.webmanifest
└── icon-192.png / icon-512.png
supabase/
└── config.toml                   # Project ref only — no edge functions
docs/screenshots/                 # README screenshots
vitest.config.ts                  # Vitest + happy-dom
wrangler.jsonc                    # Cloudflare Workers config
components.json                   # shadcn/ui config
```


---

## Environment variables

Managed automatically (do not edit `.env` manually):

**Browser (build-time, `import.meta.env.VITE_*`):**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

**Server-only (`process.env.*`, never bundled):**

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` — AI gateway
- `ELEVENLABS_API_KEY` — speech-to-text
- `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_ENV`, `PAYPAL_WEBHOOK_ID`
- `GOOGLE_SEARCH_CONSOLE_API_KEY` (managed by connector)

---

## Local development

```bash
bun install
bun run dev          # Vite dev server with SSR
bun run build        # Production build (Cloudflare Workers target)
bun run preview      # Preview the production bundle
bun run lint         # ESLint
bun run format       # Prettier
```

> Database, auth, storage, AI, and secrets are all provisioned by the managed backend — there's nothing to spin up locally.

---

## Deployment

- **Hosting:** Cloudflare Workers via `@cloudflare/vite-plugin` (`wrangler.jsonc`).
- **Live URL:** `https://orador.lovable.app` (or a custom domain).

