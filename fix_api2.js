const fs = require('fs');
const path = require('path');

let eventsContent = fs.readFileSync('src/app/api/events/route.ts', 'utf8');
eventsContent = eventsContent.replace(/include: \{ analysis: true \}/g, 'include: { canonicalEvent: { include: { analysis: true } } }');
eventsContent = eventsContent.replace(/\.analysis/g, '.canonicalEvent?.analysis');
fs.writeFileSync('src/app/api/events/route.ts', eventsContent);

let searchContent = fs.readFileSync('src/app/api/search/route.ts', 'utf8');
searchContent = searchContent.replace(/analysis: null,/g, 'canonicalEvent: { is: { analysis: null } },');
fs.writeFileSync('src/app/api/search/route.ts', searchContent);

let seedContent = fs.readFileSync('prisma/seed.ts', 'utf8');
seedContent = seedContent.replace(/rawEventId: event\.id/g, 'canonicalEventId: canonical.id');
seedContent = seedContent.replace(/const event = await prisma.rawEvent.create\(\{/, `
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
    const event = await prisma.rawEvent.create({`);
seedContent = seedContent.replace(/rawJson: "\{\}",/, 'rawJson: "{}", canonicalEventId: canonical.id, processingStatus: "canonicalized"');
fs.writeFileSync('prisma/seed.ts', seedContent);

console.log("Fixed files");
