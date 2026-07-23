import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { analyzeEvent, PROMPT_VERSION, GEMINI_MODEL } from "@/lib/gemini/analyze";

export class AnalysisOrchestrator {
  constructor(private db: PrismaClient) {}

  public async analyzeCanonicalEvent(canonicalEventId: string): Promise<string | null> {
    const canonical = await this.db.canonicalEvent.findUnique({
      where: { id: canonicalEventId },
    });

    if (!canonical) {
      throw new Error(`CanonicalEvent not found: ${canonicalEventId}`);
    }

    // Compute Input Hash for Idempotency
    const inputPayload = `${canonical.assetClass}:${canonical.primaryTicker || ""}:${canonical.primaryHeadline}:${canonical.summary || ""}`;
    const inputHash = createHash("sha256").update(inputPayload).digest("hex");
    const promptHash = createHash("sha256").update(PROMPT_VERSION).digest("hex");

    // Check if analysis already successfully ran for this canonical event + model + input
    const existingRun = await this.db.analysisPipelineRun.findUnique({
      where: {
        canonicalEventId_promptVersion_modelName_inputHash: {
          canonicalEventId,
          promptVersion: PROMPT_VERSION,
          modelName: GEMINI_MODEL,
          inputHash,
        },
      },
    });

    if (existingRun && existingRun.status === "success") {
      console.log(`[AnalysisOrchestrator] Skipping analysis for ${canonicalEventId}, already completed.`);
      return existingRun.id; // already analyzed
    }

    // Generate Analysis
    const eventInput = {
      assetClass: canonical.assetClass as "stock" | "crypto",
      headline: canonical.primaryHeadline,
      summary: canonical.summary,
      tickers: JSON.parse(canonical.affectedTickers || "[]"),
      publishedAt: canonical.firstSeenAt.toISOString(),
    };

    let pipelineRunId = "";
    let pipelineStatus = "failed";
    const retryHistory: string[] = [];
    
    try {
      const { result, usage } = await analyzeEvent(eventInput);
      
      const success = result.convictionScore > 1 || result.bearThesis !== "Analysis could not be completed.";
      pipelineStatus = success ? "success" : "failed";

      if (!success) {
        retryHistory.push("Gemini returned fallback error response");
      }

      await this.db.$transaction(async (tx) => {
        // Upsert AnalysisPipelineRun
        const run = await tx.analysisPipelineRun.upsert({
          where: {
            canonicalEventId_promptVersion_modelName_inputHash: {
              canonicalEventId,
              promptVersion: PROMPT_VERSION,
              modelName: GEMINI_MODEL,
              inputHash,
            },
          },
          create: {
            canonicalEventId,
            promptVersion: PROMPT_VERSION,
            modelName: GEMINI_MODEL,
            inputHash,
            promptHash,
            tokenUsage: usage.inputTokens + usage.outputTokens,
            latencyMs: usage.latencyMs,
            status: pipelineStatus,
            retryHistory: retryHistory.length ? JSON.stringify(retryHistory) : null,
          },
          update: {
            tokenUsage: usage.inputTokens + usage.outputTokens,
            latencyMs: usage.latencyMs,
            status: pipelineStatus,
            retryHistory: retryHistory.length ? JSON.stringify(retryHistory) : null,
          },
        });
        pipelineRunId = run.id;

        // Create or update Analysis
        if (success) {
          await tx.analysis.upsert({
            where: { canonicalEventId },
            create: {
              canonicalEventId,
              bearThesis: result.bearThesis,
              convictionScore: result.convictionScore,
              signalType: result.signalType,
              affectedTickers: JSON.stringify(result.affectedTickers),
              sector: result.sector,
              catalystDate: result.catalystDate ? new Date(result.catalystDate) : null,
              analysisJson: JSON.stringify(result),
              promptVersion: PROMPT_VERSION,
              modelName: GEMINI_MODEL,
              ...(result.keyRisks ? { keyRisks: JSON.stringify(result.keyRisks) } : {}),
              ...(result.counterArgs ? { counterArgs: JSON.stringify(result.counterArgs) } : {}),
              ...(result.confidenceLabel ? { confidenceLabel: result.confidenceLabel } : {}),
              ...(result.timeHorizon ? { timeHorizon: result.timeHorizon } : {}),
              ...(result.severity ? { severity: result.severity } : {}),
              ...(result.sourceQuality ? { sourceQuality: result.sourceQuality } : {}),
              ...(result.industry ? { industry: result.industry } : {}),
            },
            update: {
              bearThesis: result.bearThesis,
              convictionScore: result.convictionScore,
              signalType: result.signalType,
              affectedTickers: JSON.stringify(result.affectedTickers),
              sector: result.sector,
              catalystDate: result.catalystDate ? new Date(result.catalystDate) : null,
              analysisJson: JSON.stringify(result),
              promptVersion: PROMPT_VERSION,
              modelName: GEMINI_MODEL,
              ...(result.keyRisks ? { keyRisks: JSON.stringify(result.keyRisks) } : {}),
              ...(result.counterArgs ? { counterArgs: JSON.stringify(result.counterArgs) } : {}),
              ...(result.confidenceLabel ? { confidenceLabel: result.confidenceLabel } : {}),
              ...(result.timeHorizon ? { timeHorizon: result.timeHorizon } : {}),
              ...(result.severity ? { severity: result.severity } : {}),
              ...(result.sourceQuality ? { sourceQuality: result.sourceQuality } : {}),
              ...(result.industry ? { industry: result.industry } : {}),
            },
          });
        }
        
        // Log API usage
        await tx.apiUsageLog.create({
          data: {
            provider: "google",
            endpoint: "generateContent",
            costUsd: usage.estimatedCostUsd,
            tokens: usage.inputTokens + usage.outputTokens,
            latencyMs: usage.latencyMs,
            success,
          },
        }).catch(() => {});
      });

      return pipelineRunId;
    } catch (err) {
      retryHistory.push((err as Error).message);
      await this.db.analysisPipelineRun.upsert({
        where: {
          canonicalEventId_promptVersion_modelName_inputHash: {
            canonicalEventId,
            promptVersion: PROMPT_VERSION,
            modelName: GEMINI_MODEL,
            inputHash,
          },
        },
        create: {
          canonicalEventId,
          promptVersion: PROMPT_VERSION,
          modelName: GEMINI_MODEL,
          inputHash,
          promptHash,
          status: "failed",
          retryHistory: JSON.stringify(retryHistory),
        },
        update: {
          status: "failed",
          retryHistory: JSON.stringify(retryHistory),
        },
      });
      throw err;
    }
  }
}
