import { computePayloadHash } from "../hash";
import { IngestionService } from "../service";
import prisma from "@/lib/prisma";

async function runIngestionTests() {
  console.log("=== Running Ingestion Service Unit & Integration Tests ===");

  // 1. Test Hash Calculation
  const payload1 = JSON.stringify({ id: "test-101", title: "Tesla Recalls 100k cars" });
  const payload2 = JSON.stringify({ id: "test-101", title: "Tesla Recalls 100k cars" });
  const payload3 = JSON.stringify({ id: "test-102", title: "Tesla Recalls 200k cars" });

  const hash1 = computePayloadHash(payload1);
  const hash2 = computePayloadHash(payload2);
  const hash3 = computePayloadHash(payload3);

  console.assert(hash1 === hash2, "Identical payloads must produce identical SHA-256 hashes");
  console.assert(hash1 !== hash3, "Different payloads must produce different hashes");
  console.log("✔ SHA-256 Payload Hashing Verified");

  // 2. Test Ingestion Service DB operations
  const service = new IngestionService(prisma);
  const runId = await service.startRun("test_provider");
  console.assert(typeof runId === "string", "Run ID must be generated");

  const testExternalId = `test-evt-${Date.now()}`;
  const testPayload = {
    provider: "test_provider",
    source: "unit_test",
    assetClass: "stock" as const,
    externalId: testExternalId,
    tickers: ["TSLA"],
    headline: "Unit Test Headline",
    summary: "Test Summary",
    publishedAt: new Date().toISOString(),
    rawJson: payload1,
  };

  // Test Creation
  const res1 = await service.ingestEvent(testPayload, runId);
  console.assert(res1.status === "created", `Expected status 'created', got '${res1.status}'`);
  console.assert(res1.payloadHash === hash1, "Payload hash mismatch");
  console.log("✔ Event Ingestion Created Record Successfully");

  // Test Duplicate by External ID
  const resDuplicate = await service.ingestEvent(testPayload, runId);
  console.assert(resDuplicate.status === "duplicate", `Expected status 'duplicate', got '${resDuplicate.status}'`);
  console.log("✔ Duplicate Event Detection Verified");

  // Test Quarantine Flow
  const invalidPayload = {
    provider: "test_provider",
    source: "unit_test",
    assetClass: "stock" as const,
    externalId: `test-quarantine-${Date.now()}`,
    tickers: ["TSLA"],
    headline: "", // Blank headline triggers quarantine
    summary: "Blank headline payload",
    publishedAt: new Date().toISOString(),
    rawJson: JSON.stringify({ bad: true }),
  };

  const resQuarantined = await service.ingestEvent(invalidPayload, runId);
  console.assert(resQuarantined.status === "quarantined", `Expected status 'quarantined', got '${resQuarantined.status}'`);
  console.log("✔ Quarantine Handling Verified");

  await service.finishRun(runId, "success");
  console.log("=== All Ingestion Unit Tests Passed Successfully ===");
}

runIngestionTests().catch((err) => {
  console.error("Test Failed:", err);
  process.exit(1);
});
