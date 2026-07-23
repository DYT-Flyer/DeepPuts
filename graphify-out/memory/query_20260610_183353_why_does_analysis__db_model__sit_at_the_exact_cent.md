---
type: "query"
date: "2026-06-10T18:33:53.441901+00:00"
question: "Why does Analysis (DB Model) sit at the exact center between docs, API, and UI with 8 edges crossing 3 community boundaries?"
contributor: "graphify"
source_nodes: ["Analysis (DB Model)", "Anthropic Claude", "PerformanceSnapshot (DB Model)", "Vote (DB Model)", "Comment (DB Model)", "Component: signal-badge.tsx"]
---

# Q: Why does Analysis (DB Model) sit at the exact center between docs, API, and UI with 8 edges crossing 3 community boundaries?

## Answer

Analysis is the central domain object in DeepPuts - it IS the core product artifact (the AI-generated bear thesis). It sits at the intersection of 3 communities because: (1) UPSTREAM: Anthropic Claude produces it (community 3 Platform Architecture - the pipeline flow from Polygon -> RawEvent -> Claude -> Analysis); (2) DOWNSTREAM-PERFORMANCE: PerformanceSnapshot hangs off it by FK, which lives in community 7 (Opportunity Detail) because performance is only surfaced on the detail page; (3) DOWNSTREAM-ENGAGEMENT: Vote, Comment, AnalysisVersion all reference Analysis.id as their FK - these are the community engagement layer; (4) UI: signal-badge.tsx renders signalType field, conviction-badge.tsx renders convictionScore - both extracted from Analysis.analysisJson; (5) SCORING: composite.ts computes the composite score FROM Analysis fields (sourceQuality, convictionScore, etc). The reason it appears in docs community 2 is because the README extracted it as a DB model concept first, and the semantic subagent correctly identified all its downstream relationships from the README data model section.

## Source Nodes

- Analysis (DB Model)
- Anthropic Claude
- PerformanceSnapshot (DB Model)
- Vote (DB Model)
- Comment (DB Model)
- Component: signal-badge.tsx