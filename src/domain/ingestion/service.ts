import prisma from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { computePayloadHash } from "./hash";
import type { RawEventPayload, IngestedEventResult } from "./types";

export class IngestionService {
  constructor(private db: PrismaClient = prisma) {}

  async startRun(provider = "polygon"): Promise<string> {
    const run = await this.db.ingestionRun.create({
      data: {
        provider,
        status: "running",
      },
    });
    return run.id;
  }

  async ingestEvent(
    payload: RawEventPayload,
    ingestionRunId?: string
  ): Promise<IngestedEventResult> {
    const rawJsonStr = typeof payload.rawJson === "string" ? payload.rawJson : JSON.stringify(payload.rawJson);
    const hash = computePayloadHash(rawJsonStr);
    const provider = payload.provider || "polygon";

    // 1. Check for duplicate by externalId
    const existingByExternalId = await this.db.rawEvent.findUnique({
      where: { externalId: payload.externalId },
    });

    if (existingByExternalId) {
      return {
        id: existingByExternalId.id,
        status: "duplicate",
        payloadHash: hash,
      };
    }

    // 2. Check for duplicate by payloadHash
    const existingByHash = await this.db.rawEvent.findFirst({
      where: { payloadHash: hash },
    });

    if (existingByHash) {
      return {
        id: existingByHash.id,
        status: "duplicate",
        payloadHash: hash,
      };
    }

    // 3. Basic validation checks
    if (!payload.headline || payload.headline.trim() === "") {
      return this.quarantineEvent(payload, "Missing required headline", { headline: "Headline is blank" }, ingestionRunId);
    }

    // 4. Create raw event record with provenance & hash
    const publishedAtDate = payload.publishedAt instanceof Date ? payload.publishedAt : new Date(payload.publishedAt);

    const created = await this.db.rawEvent.create({
      data: {
        provider,
        providerEventId: payload.providerEventId || payload.externalId,
        source: payload.source,
        assetClass: payload.assetClass,
        externalId: payload.externalId,
        tickers: JSON.stringify(payload.tickers || []),
        headline: payload.headline,
        summary: payload.summary,
        publishedAt: isNaN(publishedAtDate.getTime()) ? new Date() : publishedAtDate,
        rawJson: rawJsonStr,
        payloadHash: hash,
        schemaVersion: "v1",
        processingStatus: "pending",
        ingestionRunId,
      },
    });

    if (ingestionRunId) {
      await this.db.ingestionRun.update({
        where: { id: ingestionRunId },
        data: { itemCount: { increment: 1 } },
      }).catch(() => {});
    }

    return {
      id: created.id,
      status: "created",
      payloadHash: hash,
    };
  }

  async quarantineEvent(
    payload: RawEventPayload,
    reason: string,
    errors?: unknown,
    ingestionRunId?: string
  ): Promise<IngestedEventResult> {
    const rawJsonStr = typeof payload.rawJson === "string" ? payload.rawJson : JSON.stringify(payload.rawJson);
    const hash = computePayloadHash(rawJsonStr);
    const provider = payload.provider || "polygon";

    const publishedAtDate = payload.publishedAt ? new Date(payload.publishedAt) : new Date();

    const created = await this.db.rawEvent.create({
      data: {
        provider,
        providerEventId: payload.providerEventId || payload.externalId,
        source: payload.source,
        assetClass: payload.assetClass,
        externalId: payload.externalId,
        tickers: JSON.stringify(payload.tickers || []),
        headline: payload.headline || "QUARANTINED PAYLOAD",
        summary: payload.summary,
        publishedAt: isNaN(publishedAtDate.getTime()) ? new Date() : publishedAtDate,
        rawJson: rawJsonStr,
        payloadHash: hash,
        schemaVersion: "v1",
        processingStatus: "quarantined",
        quarantineReason: reason,
        validationErrors: errors ? JSON.stringify(errors) : null,
        ingestionRunId,
      },
    });

    if (ingestionRunId) {
      await this.db.ingestionRun.update({
        where: { id: ingestionRunId },
        data: {
          itemCount: { increment: 1 },
          errorCount: { increment: 1 },
        },
      }).catch(() => {});
    }

    return {
      id: created.id,
      status: "quarantined",
      payloadHash: hash,
      quarantineReason: reason,
    };
  }

  async finishRun(
    runId: string,
    status: "success" | "partial" | "failed" = "success",
    errorMessage?: string
  ): Promise<void> {
    await this.db.ingestionRun.update({
      where: { id: runId },
      data: {
        status,
        finishedAt: new Date(),
        errorMessage,
      },
    });
  }
}
