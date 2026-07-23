export interface RawEventPayload {
  provider?: string;
  providerEventId?: string;
  source: string; // e.g., "polygon_news" | "polygon_anomaly"
  assetClass: "stock" | "crypto";
  externalId: string;
  tickers: string[];
  headline: string;
  summary: string | null;
  publishedAt: Date | string;
  rawJson: string;
}

export interface IngestedEventResult {
  id: string;
  status: "created" | "duplicate" | "quarantined";
  payloadHash: string;
  quarantineReason?: string;
}

export interface IngestionBatchSummary {
  runId: string;
  totalReceived: number;
  createdCount: number;
  duplicateCount: number;
  quarantineCount: number;
  errorCount: number;
}
