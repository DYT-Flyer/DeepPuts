import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const email = process.env.SEED_EMAIL || "admin@deepputs.local";
  const password = process.env.SEED_PASSWORD || "changeme123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, passwordHash, name: "Admin" },
  });

  console.log(`Created user: ${email} / ${password}`);

  // Seed some mock events + analyses for UI development
  const mockEvents = [
    {
      externalId: "mock-1",
      source: "polygon_news",
      assetClass: "stock",
      tickers: ["NVDA", "AMD"],
      headline: "NVIDIA Issues Profit Warning Amid Slowing Data Center Demand",
      summary: "NVIDIA Corp warned that its data center revenue will fall short of analyst estimates for Q4, citing slower-than-expected enterprise AI adoption and increased competition from AMD.",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      bearThesis: "NVIDIA's data center business, which accounts for 87% of revenue, is showing cracks. With enterprise AI budgets tightening and AMD gaining share, multiple compression is inevitable. The stock trades at 35x forward earnings — extreme for a business facing deceleration.",
      convictionScore: 8,
      signalType: "earnings_miss",
      affectedTickers: ["NVDA", "AMD"],
      sector: "Technology",
    },
    {
      externalId: "mock-2",
      source: "polygon_news",
      assetClass: "crypto",
      tickers: ["BTC", "ETH"],
      headline: "Major Crypto Exchange Reports $400M Hack, Users Withdrawals Frozen",
      summary: "A top-5 crypto exchange by volume disclosed a security breach resulting in the theft of approximately $400 million in customer assets. Withdrawal processing has been suspended pending investigation.",
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      bearThesis: "Exchange hacks historically cause 15-30% drawdowns in BTC and 20-40% in altcoins within 48 hours. The frozen withdrawals will trigger panic selling once they resume. Market confidence in custodied assets is severely damaged.",
      convictionScore: 9,
      signalType: "crypto_dump",
      affectedTickers: ["BTC", "ETH", "SOL"],
      sector: "Crypto",
    },
    {
      externalId: "mock-3",
      source: "polygon_news",
      assetClass: "stock",
      tickers: ["TSLA"],
      headline: "Tesla CEO Sells $2.1B in Company Stock Following Earnings Beat",
      summary: "Elon Musk sold 13.7 million Tesla shares worth $2.1 billion in the three days following Tesla's Q3 earnings release, SEC filings show.",
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      bearThesis: "Significant insider selling immediately after a beat is a major red flag — it suggests the CEO believes the stock is overvalued at current levels. With Tesla trading at 70x earnings and facing pressure from BYD, this creates a strong short setup.",
      convictionScore: 7,
      signalType: "insider_sell",
      affectedTickers: ["TSLA"],
      sector: "Consumer",
    },
    {
      externalId: "mock-4",
      source: "polygon_anomaly",
      assetClass: "stock",
      tickers: ["COIN"],
      headline: "COIN dropped 12.3% with 3.8x average volume",
      summary: "Price anomaly detected: COIN experienced an unusual -12.3% price move with volume 3.8x above the 30-day average. Current price: $142.50.",
      publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      bearThesis: "Coinbase is highly correlated with crypto market sentiment. A 12% drop on 3.8x volume indicates institutional distribution. With crypto winter risk increasing and the SEC lawsuit unresolved, COIN faces both regulatory and market headwinds.",
      convictionScore: 7,
      signalType: "news_negative",
      affectedTickers: ["COIN"],
      sector: "Financials",
    },
    {
      externalId: "mock-5",
      source: "polygon_news",
      assetClass: "stock",
      tickers: ["PYPL"],
      headline: "PayPal Faces DOJ Antitrust Probe Into Payment Processing Practices",
      summary: "The Department of Justice has launched an antitrust investigation into PayPal's business practices in the digital payments space, specifically examining its agreements with merchants.",
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      bearThesis: "Regulatory overhang from a DOJ probe typically causes 10-25% multiple compression in fintech. PayPal's core business already faces competition from Apple Pay and Stripe. Combined with the investigation, this creates a sustained bearish catalyst.",
      convictionScore: 6,
      signalType: "regulatory",
      affectedTickers: ["PYPL"],
      sector: "Financials",
    },
    {
      externalId: "mock-6",
      source: "polygon_news",
      assetClass: "stock",
      tickers: ["SNAP"],
      headline: "Snap Cuts Q4 Revenue Guidance by 18%, Announces 500 Layoffs",
      summary: "Snap Inc. slashed its Q4 revenue guidance from $1.3B to $1.07B, citing deteriorating digital advertising market conditions and increased competition from TikTok.",
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      bearThesis: "Snap's guidance cut signals digital ad market weakness that will ripple to Meta, Pinterest, and YouTube. The 18% revenue miss guidance combined with layoffs suggests structural deterioration, not a one-quarter blip.",
      convictionScore: 8,
      signalType: "guidance_cut",
      affectedTickers: ["SNAP", "META", "PINS"],
      sector: "Technology",
    },
  ];

  for (const mock of mockEvents) {
    
    const canonical = await prisma.canonicalEvent.create({
      data: {
        canonicalHash: mock.externalId + "-hash",
        primaryHeadline: mock.headline,
        summary: mock.summary,
        assetClass: mock.assetClass,
        primaryTicker: mock.tickers[0],
        affectedTickers: JSON.stringify(mock.tickers),
        firstSeenAt: mock.publishedAt,
        lastSeenAt: mock.publishedAt,
      }
    });
    const event = await prisma.rawEvent.create({
      data: {
        externalId: mock.externalId,
        source: mock.source,
        assetClass: mock.assetClass,
        tickers: JSON.stringify(mock.tickers),
        headline: mock.headline,
        summary: mock.summary,
        publishedAt: mock.publishedAt,
        rawJson: "{}", canonicalEventId: canonical.id, processingStatus: "canonicalized"
      },
    });

    await prisma.analysis.create({
      data: {
        canonicalEventId: canonical.id,
        bearThesis: mock.bearThesis,
        convictionScore: mock.convictionScore,
        signalType: mock.signalType,
        affectedTickers: JSON.stringify(mock.affectedTickers),
        sector: mock.sector,
        analysisJson: "{}",
      },
    });
  }

  console.log(`Seeded ${mockEvents.length} mock events`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
