import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MOCK_URLS: Record<string, string> = {
  "mock-1": "https://www.reuters.com/technology/nvidia-warns-data-center-demand/",
  "mock-2": "https://www.coindesk.com/markets/exchange-hack-400m/",
  "mock-3": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=TSLA&type=4",
  "mock-4": "https://finance.yahoo.com/quote/COIN/",
  "mock-5": "https://www.reuters.com/legal/paypal-doj-antitrust/",
  "mock-6": "https://investor.snap.com/news-releases/",
};

async function main() {
  for (const [externalId, url] of Object.entries(MOCK_URLS)) {
    const event = await prisma.rawEvent.findUnique({ where: { externalId } });
    if (!event) { console.log(`Not found: ${externalId}`); continue; }

    await prisma.rawEvent.update({
      where: { externalId },
      data: { rawJson: JSON.stringify({ article_url: url }) },
    });
    console.log(`Patched ${externalId} → ${url}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
