import prisma from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { calculateHeadlineSimilarity, normalizeUrl } from "./similarity";
import type { ResolutionOptions, ClusterResolutionSummary, MatchResult } from "./types";
import { createHash } from "crypto";

export class DeduplicationService {
  constructor(private db: PrismaClient = prisma) {}

  async resolveCanonicalEvent(
    rawEventId: string,
    options: ResolutionOptions = {}
  ): Promise<ClusterResolutionSummary> {
    const windowHours = options.windowHours ?? 24;
    const fuzzyThreshold = options.fuzzyThreshold ?? 0.75;

    const rawEvent = await this.db.rawEvent.findUnique({
      where: { id: rawEventId },
      include: { clusterMember: true },
    });

    if (!rawEvent) {
      throw new Error(`RawEvent not found: ${rawEventId}`);
    }

    if (rawEvent.canonicalEventId && rawEvent.clusterMember) {
      const cluster = await this.db.eventCluster.findUnique({
        where: { canonicalEventId: rawEvent.canonicalEventId },
        include: { members: true },
      });
      return {
        canonicalEventId: rawEvent.canonicalEventId,
        clusterId: cluster?.id || "",
        isNewCanonical: false,
        matchType: rawEvent.clusterMember.matchType as any,
        similarityScore: rawEvent.clusterMember.similarityScore,
        totalMembers: cluster?.members.length || 1,
      };
    }

    const tickers: string[] = JSON.parse(rawEvent.tickers || "[]");
    const primaryTicker = tickers[0] || null;

    // Search for candidates within windowHours
    const windowStart = new Date(rawEvent.publishedAt.getTime() - windowHours * 60 * 60 * 1000);
    const windowEnd = new Date(rawEvent.publishedAt.getTime() + windowHours * 60 * 60 * 1000);

    const candidates = await this.db.canonicalEvent.findMany({
      where: {
        assetClass: rawEvent.assetClass,
        firstSeenAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        rawEvents: true,
      },
    });

    let bestMatch: MatchResult | null = null;

    // Extract URL if present in rawJson
    let rawUrl: string | null = null;
    try {
      const parsed = JSON.parse(rawEvent.rawJson);
      rawUrl = parsed.article_url || parsed.url || null;
    } catch {}

    const normRawUrl = rawUrl ? normalizeUrl(rawUrl) : null;

    for (const candidate of candidates) {
      // If primary tickers are specified for both and differ, skip fuzzy matching
      if (primaryTicker && candidate.primaryTicker && primaryTicker !== candidate.primaryTicker) {
        continue;
      }

      // 1. Exact payload hash match
      if (rawEvent.payloadHash && candidate.rawEvents.some((r) => r.payloadHash === rawEvent.payloadHash)) {
        bestMatch = {
          matchedCanonicalId: candidate.id,
          matchType: "exact_checksum",
          similarityScore: 1.0,
          explanation: "Exact SHA-256 payload checksum match",
        };
        break;
      }

      // 2. Normalized URL match
      if (normRawUrl) {
        for (const candidateRaw of candidate.rawEvents) {
          try {
            const candidateParsed = JSON.parse(candidateRaw.rawJson);
            const candidateUrl = candidateParsed.article_url || candidateParsed.url || null;
            if (candidateUrl && normalizeUrl(candidateUrl) === normRawUrl) {
              bestMatch = {
                matchedCanonicalId: candidate.id,
                matchType: "url_match",
                similarityScore: 1.0,
                explanation: `Normalized URL match: ${normRawUrl}`,
              };
              break;
            }
          } catch {}
        }
        if (bestMatch) break;
      }

      // 3. Fuzzy headline similarity
      const score = calculateHeadlineSimilarity(rawEvent.headline, candidate.primaryHeadline);
      if (score >= fuzzyThreshold) {
        if (!bestMatch || score > bestMatch.similarityScore) {
          bestMatch = {
            matchedCanonicalId: candidate.id,
            matchType: "headline_fuzzy",
            similarityScore: score,
            explanation: `Fuzzy headline match (score: ${score.toFixed(3)}) with primary headline "${candidate.primaryHeadline}"`,
          };
        }
      }
    }

    if (bestMatch) {
      // Merge into existing canonical event
      const canonicalId = bestMatch.matchedCanonicalId;

      const cluster = await this.db.eventCluster.findUnique({
        where: { canonicalEventId: canonicalId },
      });

      const clusterId = cluster
        ? cluster.id
        : (
            await this.db.eventCluster.create({
              data: {
                canonicalEventId: canonicalId,
                clusterName: `Cluster: ${rawEvent.headline.slice(0, 50)}`,
                matchExplanation: bestMatch.explanation,
                confidenceScore: bestMatch.similarityScore,
              },
            })
          ).id;

      await this.db.eventClusterMember.create({
        data: {
          clusterId,
          rawEventId: rawEvent.id,
          canonicalEventId: canonicalId,
          matchType: bestMatch.matchType,
          similarityScore: bestMatch.similarityScore,
        },
      });

      await this.db.rawEvent.update({
        where: { id: rawEvent.id },
        data: {
          canonicalEventId: canonicalId,
          processingStatus: "canonicalized",
        },
      });

      const updatedCanonical = await this.db.canonicalEvent.update({
        where: { id: canonicalId },
        data: {
          mergedEventCount: { increment: 1 },
          lastSeenAt: rawEvent.publishedAt > new Date() ? rawEvent.publishedAt : new Date(),
        },
        include: { rawEvents: true },
      });

      return {
        canonicalEventId: canonicalId,
        clusterId,
        isNewCanonical: false,
        matchType: bestMatch.matchType,
        similarityScore: bestMatch.similarityScore,
        totalMembers: updatedCanonical.rawEvents.length,
      };
    }

    // Create brand new CanonicalEvent & Cluster
    const canonicalHash = createHash("sha256")
      .update(`${rawEvent.assetClass}:${primaryTicker || ""}:${rawEvent.headline}:${rawEvent.publishedAt.toISOString()}`)
      .digest("hex");

    const canonical = await this.db.canonicalEvent.create({
      data: {
        canonicalHash,
        primaryHeadline: rawEvent.headline,
        summary: rawEvent.summary,
        assetClass: rawEvent.assetClass,
        primaryTicker,
        affectedTickers: rawEvent.tickers,
        mergedEventCount: 1,
        firstSeenAt: rawEvent.publishedAt,
        lastSeenAt: rawEvent.publishedAt,
      },
    });

    const cluster = await this.db.eventCluster.create({
      data: {
        canonicalEventId: canonical.id,
        clusterName: `Cluster: ${rawEvent.headline.slice(0, 50)}`,
        matchExplanation: "Canonical seed event",
        confidenceScore: 1.0,
      },
    });

    await this.db.eventClusterMember.create({
      data: {
        clusterId: cluster.id,
        rawEventId: rawEvent.id,
        canonicalEventId: canonical.id,
        matchType: "exact_checksum",
        similarityScore: 1.0,
      },
    });

    await this.db.rawEvent.update({
      where: { id: rawEvent.id },
      data: {
        canonicalEventId: canonical.id,
        processingStatus: "canonicalized",
      },
    });

    return {
      canonicalEventId: canonical.id,
      clusterId: cluster.id,
      isNewCanonical: true,
      matchType: "exact_checksum",
      similarityScore: 1.0,
      totalMembers: 1,
    };
  }

  async mergeCanonicalEvents(
    targetCanonicalId: string,
    sourceCanonicalId: string,
    reason = "Manual user merge"
  ): Promise<void> {
    if (targetCanonicalId === sourceCanonicalId) return;

    const sourceEvents = await this.db.rawEvent.findMany({
      where: { canonicalEventId: sourceCanonicalId },
    });

    const targetCluster = await this.db.eventCluster.findUnique({
      where: { canonicalEventId: targetCanonicalId },
    });

    if (!targetCluster) {
      throw new Error(`Target cluster for canonical event ${targetCanonicalId} not found`);
    }

    for (const raw of sourceEvents) {
      // Delete old cluster member entry
      await this.db.eventClusterMember.deleteMany({
        where: { rawEventId: raw.id },
      });

      // Add to target cluster
      await this.db.eventClusterMember.create({
        data: {
          clusterId: targetCluster.id,
          rawEventId: raw.id,
          canonicalEventId: targetCanonicalId,
          matchType: "manual_merge",
          similarityScore: 1.0,
        },
      });

      await this.db.rawEvent.update({
        where: { id: raw.id },
        data: { canonicalEventId: targetCanonicalId },
      });
    }

    await this.db.canonicalEvent.update({
      where: { id: targetCanonicalId },
      data: {
        mergedEventCount: { increment: sourceEvents.length },
      },
    });

    // Clean up source cluster and canonical event
    await this.db.eventCluster.deleteMany({
      where: { canonicalEventId: sourceCanonicalId },
    });
    await this.db.canonicalEvent.delete({
      where: { id: sourceCanonicalId },
    });
  }

  async splitRawEvent(rawEventId: string, reason = "Manual user split"): Promise<string> {
    const raw = await this.db.rawEvent.findUnique({
      where: { id: rawEventId },
    });

    if (!raw || !raw.canonicalEventId) {
      throw new Error(`Raw event ${rawEventId} not linked to a canonical event`);
    }

    const oldCanonicalId = raw.canonicalEventId;

    // Delete existing cluster membership
    await this.db.eventClusterMember.deleteMany({
      where: { rawEventId: rawEventId },
    });

    // Unlink raw event
    await this.db.rawEvent.update({
      where: { id: rawEventId },
      data: { canonicalEventId: null },
    });

    // Decrement count on old canonical event
    await this.db.canonicalEvent.update({
      where: { id: oldCanonicalId },
      data: { mergedEventCount: { decrement: 1 } },
    });

    // Create new canonical event for split raw event
    const summary = await this.resolveCanonicalEvent(rawEventId);
    return summary.canonicalEventId;
  }
}
