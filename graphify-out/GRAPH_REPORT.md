# Graph Report - .  (2026-06-10)

## Corpus Check
- Corpus is ~30,190 words - fits in a single context window. You may not need a graph.

## Summary
- 171 nodes · 185 edges · 25 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `DeepPuts` - 9 edges
2. `Analysis (DB Model)` - 8 edges
3. `lib/validation/schemas.ts` - 7 edges
4. `toDateStr()` - 5 edges
5. `Polygon.io Market Data` - 5 edges
6. `PolygonClient` - 4 edges
7. `Anthropic Claude` - 4 edges
8. `Vote (DB Model)` - 4 edges
9. `POST()` - 3 edges
10. `GET()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `serialize()`  [INFERRED]
  src/app/api/cron/route.ts → src/app/api/comments/route.ts
- `POST()` --calls--> `requireAdmin()`  [INFERRED]
  src/app/api/cron/route.ts → src/app/api/admin/moderation/route.ts
- `DELETE()` --calls--> `GET()`  [INFERRED]
  src/app/api/comments/route.ts → src/app/api/watchlist/route.ts
- `GET()` --calls--> `requireAdmin()`  [INFERRED]
  src/app/api/watchlist/route.ts → src/app/api/admin/moderation/route.ts

## Hyperedges (group relationships)
- **Data Pipeline Flow** — readme_polygon_io, readme_rawevent, readme_anthropic_claude, readme_analysis, readme_performancesnapshot [EXTRACTED 1.00]
- **DeepPuts Tech Stack** — readme_nextjs, readme_sqlite_prisma, readme_nextauth, readme_anthropic_claude, readme_polygon_io, readme_zod, readme_tailwind [EXTRACTED 1.00]
- **Prisma DB Schema Models** — readme_rawevent, readme_analysis, readme_performancesnapshot, readme_analysisversion, readme_vote, readme_comment, readme_watchlist, readme_userreputation, readme_moderationflag [EXTRACTED 1.00]

## Communities

### Community 0 - "UI Components"
Cohesion: 0.07
Nodes (0): 

### Community 1 - "Auth & Scoring Engine"
Cohesion: 0.1
Nodes (7): DELETE(), fetchClose(), GET(), POST(), requireAdmin(), serialize(), toDateStr()

### Community 2 - "API Routes (Docs)"
Cohesion: 0.1
Nodes (22): Analysis (DB Model), AnalysisVersion (DB Model), API: comments/route.ts, API: profile/route.ts, API: register/route.ts, API: vote/route.ts, API: watchlist/route.ts, Bear Thesis (+14 more)

### Community 3 - "Platform Architecture Docs"
Cohesion: 0.12
Nodes (19): Anthropic Claude, Bearish Market Intelligence Platform, Component: event-feed-item.tsx, Data Pipeline, DeepPuts, lib/auth.ts, lib/prisma.ts, NextAuth v5 (+11 more)

### Community 4 - "API Clients (Claude + Polygon)"
Cohesion: 0.14
Nodes (2): PolygonClient, sleep()

### Community 5 - "Market Data & Anomalies"
Cohesion: 0.24
Nodes (9): detectAnomalies(), fetchCurrentPrice(), fetchPriceAt(), fetchSparkline(), toDateStr(), analyzeEvent(), sleep(), runRefreshCycle() (+1 more)

### Community 6 - "App Shell & Layout"
Cohesion: 0.22
Nodes (0): 

### Community 7 - "Opportunity Detail Docs"
Cohesion: 0.29
Nodes (7): API: opportunity/[id]/route.ts, API: opportunity performance route, Component: comment-section.tsx, Opportunity Detail Page, PerformanceSnapshot (DB Model), Price Performance Tracking, Rationale: Direct Polygon Fetch for Performance

### Community 8 - "Comment System"
Cohesion: 0.33
Nodes (0): 

### Community 9 - "Dashboard Docs"
Cohesion: 1.0
Nodes (2): API: dashboard-stats/route.ts, Dashboard Page

### Community 10 - "Opportunities Docs"
Cohesion: 1.0
Nodes (2): API: opportunities/route.ts, Opportunities Page

### Community 11 - "Events Docs"
Cohesion: 1.0
Nodes (2): API: events/route.ts, Events Page

### Community 12 - "Next.js Types"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Next.js Config"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Type Definitions"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Error Page"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "404 Page"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Search Docs"
Cohesion: 1.0
Nodes (1): Search Page

### Community 19 - "Watchlist Docs"
Cohesion: 1.0
Nodes (1): Watchlist Page

### Community 20 - "Profile Docs"
Cohesion: 1.0
Nodes (1): Profile Page

### Community 21 - "Search API Docs"
Cohesion: 1.0
Nodes (1): API: search/route.ts

### Community 22 - "Scheduler Docs"
Cohesion: 1.0
Nodes (1): API: scheduler-status/route.ts

### Community 23 - "Nav Component Docs"
Cohesion: 1.0
Nodes (1): Component: nav.tsx

### Community 24 - "Utils Docs"
Cohesion: 1.0
Nodes (1): lib/utils.ts

## Knowledge Gaps
- **37 isolated node(s):** `Next.js 15 (App Router)`, `Tailwind CSS`, `Data Pipeline`, `AnalysisVersion (DB Model)`, `Watchlist (DB Model)` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Dashboard Docs`** (2 nodes): `API: dashboard-stats/route.ts`, `Dashboard Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Opportunities Docs`** (2 nodes): `API: opportunities/route.ts`, `Opportunities Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Events Docs`** (2 nodes): `API: events/route.ts`, `Events Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Types`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Type Definitions`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Error Page`** (1 nodes): `error.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `404 Page`** (1 nodes): `not-found.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Search Docs`** (1 nodes): `Search Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Watchlist Docs`** (1 nodes): `Watchlist Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profile Docs`** (1 nodes): `Profile Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Search API Docs`** (1 nodes): `API: search/route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Scheduler Docs`** (1 nodes): `API: scheduler-status/route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Nav Component Docs`** (1 nodes): `Component: nav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utils Docs`** (1 nodes): `lib/utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Analysis (DB Model)` connect `API Routes (Docs)` to `Platform Architecture Docs`, `Opportunity Detail Docs`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Anthropic Claude` connect `Platform Architecture Docs` to `API Routes (Docs)`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Analysis (DB Model)` (e.g. with `Comment (DB Model)` and `Component: signal-badge.tsx`) actually correct?**
  _`Analysis (DB Model)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `lib/validation/schemas.ts` (e.g. with `API: vote/route.ts` and `API: comments/route.ts`) actually correct?**
  _`lib/validation/schemas.ts` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `toDateStr()` (e.g. with `detectAnomalies()` and `fetchPriceAt()`) actually correct?**
  _`toDateStr()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Next.js 15 (App Router)`, `Tailwind CSS`, `Data Pipeline` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._