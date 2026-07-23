# DeepPuts

AI-structured bear theses on stocks and crypto, ranked by conviction and validated by price performance.

> The other side of the trade.

---

## What it is

DeepPuts is a bearish market intelligence platform. It ingests market events from Polygon.io, runs them through Google Gemini to generate structured bear theses with conviction scores (1–10), and surfaces the results through a community-validated feed with voting, comments, and price performance tracking.

Most market intelligence tools are structurally bullish. DeepPuts is the counterweight.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | SQLite via Prisma (local dev) |
| Auth | NextAuth v5 (credentials provider) |
| AI | Google Gemini (`gemini-3.6-flash`) |
| Market data | Polygon.io |
| Validation | Zod v4 |
| Styling | Tailwind + inline styles |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
DATABASE_URL="file:./prisma/deepputs.db"
NEXTAUTH_SECRET=<32+ random bytes>
NEXTAUTH_URL=http://localhost:3000
POLYGON_API_KEY=<your key>
GEMINI_API_KEY=<your key>
```

### 3. Set up the database

```bash
npx prisma db push
```

The SQLite file lives at `prisma/prisma/deepputs.db` (Prisma resolves the path relative to `prisma/schema.prisma`).

### 4. Run the dev server

```bash
npm run dev
```

### 5. Run the scheduler (ingest + analyze)

```bash
npm run scheduler
```

This fetches market events from Polygon.io and runs Claude on each one to generate bear theses.

---

## Architecture

### Data pipeline

```
Polygon.io news API
  → RawEvent (stored in DB)
    → Claude analysis (bear thesis, conviction score, signal type, tickers)
      → Analysis (stored, linked to RawEvent)
        → PerformanceSnapshot (price tracking vs publication price)
```

### Key files

```
src/
├── app/
│   ├── page.tsx                        # Dashboard (top opportunities + stats)
│   ├── opportunities/page.tsx          # Browse all bear theses
│   ├── events/page.tsx                 # Raw signal feed
│   ├── opportunity/[id]/page.tsx       # Full thesis detail + comments + performance
│   ├── ticker/[symbol]/page.tsx        # Per-ticker view with sparkline
│   ├── search/page.tsx                 # Debounced search across theses and events
│   ├── watchlist/page.tsx              # Saved tickers
│   ├── profile/page.tsx                # User account + comment history
│   └── api/
│       ├── vote/route.ts               # Toggle vote (1 / -1), Zod-validated
│       ├── comments/route.ts           # Post / delete comments
│       ├── watchlist/route.ts          # Add / remove watchlist entries
│       ├── register/route.ts           # User signup
│       ├── profile/route.ts            # GET + PUT user profile
│       ├── opportunities/route.ts      # List + filter bear theses
│       ├── events/route.ts             # List raw events
│       ├── search/route.ts             # Full-text search
│       ├── dashboard-stats/route.ts    # Stats, trending tickers, top opportunities
│       ├── scheduler-status/route.ts   # Last scheduler run
│       ├── opportunity/[id]/route.ts           # Single thesis detail
│       └── opportunity/[id]/performance/route.ts  # Price performance vs pub date
│
├── components/
│   ├── social/
│   │   └── vote-buttons.tsx    # Reusable vote arrows (▲ score ▼)
│   ├── opportunity-card.tsx    # Card used on the opportunity board
│   ├── event-feed-item.tsx     # Row used in the signal feed
│   ├── conviction-badge.tsx    # Colored 1–10 score badge
│   ├── signal-badge.tsx        # Signal type pill
│   ├── comment-section.tsx     # Threaded comments
│   └── nav.tsx                 # Top nav with search button
│
└── lib/
    ├── prisma.ts               # Prisma client singleton
    ├── auth.ts                 # NextAuth config
    ├── utils.ts                # formatCatalyst, formatAge helpers
    └── validation/
        ├── schemas.ts          # Zod schemas: Register, Vote, Comment, Watchlist, Profile
        └── parse.ts            # parseBody() helper — returns { ok, data } | { ok, response }
```

### Prisma schema highlights

- **Analysis** — bear thesis, conviction score (1–10), signal type, affected tickers, sector, catalyst date, prompt version, model name, confidence label, time horizon, severity, source quality, novelty score, stale flag
- **PerformanceSnapshot** — pub price + 1d/5d/30d/90d/current prices, SPY benchmarks, thesis status
- **AnalysisVersion** — full Claude output history per analysis (re-analysis support)
- **Vote** — per-user per-analysis, toggle semantics (same vote again = remove)
- **Comment** — threaded (parent → replies), moderation flag support
- **Watchlist** — symbol per user, unique constraint
- **UserReputation** — accuracy tracking (confirmed vs invalidated votes)
- **ModerationFlag** — for flagging comments

---

## Features

### Implemented

- **Signal ingestion** — Polygon.io news events, deduplicated by external ID
- **AI analysis** — Claude generates bear thesis, conviction score, signal type, affected tickers, catalyst date
- **Opportunity board** — filter by signal type, sort by conviction
- **Signal feed** — chronological raw event list with analysis status
- **Opportunity detail** — full thesis, price performance card, threaded comments
- **Voting** — ▲/▼ arrows on all cards (dashboard, feed, board, detail); toggle semantics; optimistic state updates via reusable `VoteButtons` component
- **Comments** — threaded replies, collapse, delete own, `@mention` prefill on reply
- **Price performance** — pub price vs current price per ticker, direct parallel Polygon fetch with 8s timeout, crypto symbol mapping (BTC→X:BTCUSD)
- **Catalyst countdown** — badge on cards showing days until catalyst, amber if ≤7 days
- **Trending tickers** — sidebar on dashboard, last 30 days
- **Search** — debounced, URL-synced, tabs for Opportunities / Events
- **Watchlist** — add/remove tickers, shown on watchlist page
- **User profiles** — comment history, name edit
- **Auth** — register + login (bcrypt passwords, NextAuth sessions)
- **Zod validation** — all write API routes (vote, comments, watchlist, register, profile) validated via shared `parseBody()` helper
- **Scheduler** — fetches events, runs Claude, stores results; rate-limited Polygon singleton queue (12.5s between requests)

### Not yet implemented (planned)

- Turso migration (SQLite → edge-replicated LibSQL for Vercel deployment)
- Admin scheduler page (`/admin`)
- Composite scoring formula (AI + community + recency + performance)
- Multi-horizon performance tabs (1D / 5D / 30D / 90D)
- Thesis status badges (Confirmed / Invalidated / Pending / Mixed)
- Onboarding modal with terms acceptance
- Email alerts for watchlist tickers
- Rate limiting on write routes
- Saved filters with URL persistence
- Sentry / error monitoring
- Full disclaimer footer

---

## Vote semantics

▲ = "I agree with this bear thesis"  
▼ = "I disagree — thesis is weak"

Voting the same value twice removes the vote. Votes are per-user per-analysis.

---

## Price performance

The performance card on each opportunity detail page fetches directly from Polygon.io in parallel (not through the scheduler queue) with an 8-second per-request timeout. Publication price is cached in the DB on first fetch. Crypto tickers are mapped to Polygon format (e.g. `BTC` → `X:BTCUSD`).

Bear thesis confirmed = price went **down** (green ↓)  
Bear thesis wrong = price went **up** (red ↑)

---

## Conviction score

| Score | Meaning |
|---|---|
| 1–2 | Noise / speculative |
| 3–4 | Weak signal |
| 5–6 | Moderate thesis |
| 7–8 | Strong, documented |
| 9 | Primary source + near-term catalyst |
| 10 | Reserved — do not assign routinely |

Scores 7+ are highlighted as "High Conviction" across the UI.

---

## Disclaimer

DeepPuts provides AI-generated market analysis for research and educational purposes only. Nothing on this platform constitutes investment advice, a solicitation to trade, or a recommendation to buy or sell any security or derivative. Conviction scores are experimental and do not predict returns. Use at your own risk.
