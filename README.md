# DeepPuts

DeepPuts is an AI-powered financial intelligence dashboard designed specifically for identifying bearish market signals and shorting opportunities.

## Overview

Unlike traditional stock screeners that focus on growth and bullish trends, DeepPuts aggregates negative catalysts, regulatory warnings, and bearish news across the market. It utilizes advanced Large Language Models (LLMs) to analyze incoming financial data and assign a **Bear Bias** conviction score to potential short opportunities.

## Key Features

- **Automated Intelligence Pipeline:** Continuously ingests data from SEC EDGAR, Reuters, Bloomberg, and other financial RSS feeds.
- **AI-Powered Analysis:** Leverages AI (Anthropic/Gemini) to parse dense financial filings and news, distilling them into actionable bearish theses and conviction scores (1-10).
- **Event Feed & Opportunities:** Real-time dashboards displaying the latest market-moving events and ranked shorting opportunities.
- **Personalized Watchlists:** Authenticated users can track specific tickers and save high-conviction events.
- **Admin Console:** Integrated dashboard to manage the ingestion scheduler, moderate community comments, and track website traffic via a custom analytics engine.
- **Modern UI:** Built with Next.js, Tailwind CSS, and a fully functional Light/Dark mode cookie-based theme switcher.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Prisma ORM (PostgreSQL)
- **Authentication:** NextAuth.js (Credentials Provider)
- **Styling:** Tailwind CSS + Lucide Icons
- **AI Integration:** `@google/genai` and `@anthropic-ai/sdk`
- **Background Jobs:** Node-Cron & p-limit for concurrent execution

## Disclaimer

*DeepPuts provides AI-generated analysis for research and educational purposes only — not investment advice. Short selling and put options strategies carry significant risk of unlimited losses. Always conduct your own due diligence.*

## Stripe Configuration
To test Stripe, create an account, get test API keys and set:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID` (Subscription Price ID)
- `STRIPE_WEBHOOK_SECRET`
