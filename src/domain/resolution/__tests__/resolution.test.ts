import { calculateHeadlineSimilarity, normalizeUrl } from "../similarity";
import { DeduplicationService } from "../service";
import { IngestionService } from "../../ingestion/service";
import prisma from "@/lib/prisma";

async function runResolutionTests() {
  console.log("=== Running Deduplication & Resolution Unit Tests ===");

  // 1. Test Text Normalization & Similarity
  const h1 = "Tesla Recalls 500,000 Electric Vehicles in North America Due to Steering Defects!";
  const h2 = "Tesla recalling 500k EVs over potential steering defect issues";
  const h3 = "Apple releases new M3 MacBook Air laptops with faster processors";

  const sim12 = calculateHeadlineSimilarity(h1, h2);
  const sim13 = calculateHeadlineSimilarity(h1, h3);

  if (sim12 <= 0.40) throw new Error(`Expected fuzzy similarity > 0.40 between related headlines, got ${sim12.toFixed(3)}`);
  if (sim13 >= 0.20) throw new Error(`Expected low similarity < 0.20 for unrelated headlines, got ${sim13.toFixed(3)}`);
  console.log(`✔ Headline Similarity Algorithms Verified (Match: ${sim12.toFixed(3)}, Unrelated: ${sim13.toFixed(3)})`);

  // 2. Test URL Normalization
  const url1 = "https://www.reuters.com/business/autos-transportation/tesla-recalls-500k-vehicles-2026-07-22/";
  const url2 = "http://reuters.com/business/autos-transportation/tesla-recalls-500k-vehicles-2026-07-22";
  if (normalizeUrl(url1) !== normalizeUrl(url2)) throw new Error("Normalized URLs must match");
  console.log("✔ URL Normalization Verified");

  // 3. Test Ingestion + Canonical Event Resolution with unique run prefix
  const ingestionService = new IngestionService(prisma);
  const dedupService = new DeduplicationService(prisma);

  const runId = await ingestionService.startRun("unit_test");
  const testTag = `unit-${Date.now()}`;
  const timestamp = new Date();
  const testUrl1 = `https://www.reuters.com/news/tesla-recall-${testTag}`;

  // Primary event
  const raw1 = await ingestionService.ingestEvent({
    provider: "test",
    source: "wire",
    assetClass: "stock",
    externalId: `raw1-${testTag}`,
    tickers: [`TSLA-${testTag}`],
    headline: `Tesla Recalls 500,000 EVs in North America (${testTag})`,
    summary: "Safety regulators flagged steering system risks in TSLA vehicles.",
    publishedAt: timestamp,
    rawJson: JSON.stringify({ article_url: testUrl1 }),
  }, runId);

  const res1 = await dedupService.resolveCanonicalEvent(raw1.id);
  if (!res1.isNewCanonical) throw new Error(`First event must create a NEW CanonicalEvent, got canonicalId=${res1.canonicalEventId}`);
  if (res1.totalMembers !== 1) throw new Error("Initial member count should be 1");
  console.log("✔ Canonical Event Seed Creation Verified");

  // Similar secondary event from different news outlet
  const raw2 = await ingestionService.ingestEvent({
    provider: "test_wire2",
    source: "wire2",
    assetClass: "stock",
    externalId: `raw2-${testTag}`,
    tickers: [`TSLA-${testTag}`],
    headline: `Tesla recalling 500k EVs over steering system risks (${testTag})`,
    summary: "Automaker TSLA issuing recall for North American models.",
    publishedAt: timestamp,
    rawJson: JSON.stringify({ article_url: `https://bloomberg.com/news/tesla-steering-recall-${testTag}` }),
  }, runId);

  const res2 = await dedupService.resolveCanonicalEvent(raw2.id, { fuzzyThreshold: 0.40 });
  if (res2.isNewCanonical) throw new Error("Secondary similar event must MERGE into existing CanonicalEvent");
  if (res2.canonicalEventId !== res1.canonicalEventId) throw new Error("Must match same CanonicalEvent ID");
  if (res2.totalMembers !== 2) throw new Error("Merged cluster size should now be 2");
  console.log(`✔ Fuzzy Matching & Cluster Aggregation Verified (Matched Type: ${res2.matchType})`);

  // 4. Test Manual Merge & Split API
  const raw3 = await ingestionService.ingestEvent({
    provider: "test",
    source: "wire",
    assetClass: "stock",
    externalId: `raw3-${testTag}`,
    tickers: [`NVDA-${testTag}`],
    headline: `Nvidia announces new AI GPU accelerator chips (${testTag})`,
    summary: "Nvidia unveils next gen architecture.",
    publishedAt: timestamp,
    rawJson: JSON.stringify({ article_url: `https://techcrunch.com/nvidia-gpu-${testTag}` }),
  }, runId);

  const res3 = await dedupService.resolveCanonicalEvent(raw3.id);
  if (!res3.isNewCanonical) throw new Error("Unrelated ticker event must create separate CanonicalEvent");

  // Manual Merge res3 into res1
  await dedupService.mergeCanonicalEvents(res1.canonicalEventId, res3.canonicalEventId, "Manual merge test");
  const updatedCluster = await prisma.eventCluster.findUnique({
    where: { canonicalEventId: res1.canonicalEventId },
    include: { members: true },
  });
  if (updatedCluster?.members.length !== 3) throw new Error("Merged cluster should have 3 members");
  console.log("✔ Manual Merge API Verified");

  // Manual Split raw3 out of cluster
  const newCanonicalId = await dedupService.splitRawEvent(raw3.id, "Manual split test");
  if (newCanonicalId === res1.canonicalEventId) throw new Error("Split event must create distinct canonical ID");
  console.log("✔ Manual Split API Verified");

  await ingestionService.finishRun(runId, "success");
  console.log("=== All Deduplication & Resolution Unit Tests Passed 100% ===");
}

runResolutionTests().catch((err) => {
  console.error("Resolution Test Failed:", err);
  process.exit(1);
});
