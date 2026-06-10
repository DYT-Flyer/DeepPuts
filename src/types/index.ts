export type AssetClass = "stock" | "crypto";

export type SignalType =
  | "earnings_miss"
  | "sec_filing"
  | "news_negative"
  | "macro"
  | "crypto_dump"
  | "insider_sell"
  | "guidance_cut"
  | "regulatory";

export interface AnalysisResult {
  bearThesis: string;
  convictionScore: number;
  signalType: SignalType;
  affectedTickers: string[];
  sector: string | null;
  catalystDate: string | null;
  // v2 fields — optional so old analyses stay compatible
  keyRisks?: string[];
  counterArgs?: string[];
  confidenceLabel?: "high" | "medium" | "low" | "speculative";
  timeHorizon?: "1-7d" | "1-4w" | "1-3m" | "3m+";
  severity?: "low" | "medium" | "high" | "critical";
  sourceQuality?: "primary" | "secondary" | "aggregated";
  industry?: string | null;
}

export interface OpportunityItem {
  id: string;
  bearThesis: string;
  convictionScore: number;
  signalType: SignalType;
  affectedTickers: string[];
  sector: string | null;
  catalystDate: string | null;
  createdAt: string;
  commentCount: number;
  voteScore: number;
  userVote: 1 | -1 | 0;
  event: {
    id: string;
    headline: string;
    summary: string | null;
    publishedAt: string;
    assetClass: AssetClass;
    source: string;
    articleUrl: string | null;
  };
}

export interface EventFeedItem {
  id: string;
  headline: string;
  summary: string | null;
  publishedAt: string;
  assetClass: AssetClass;
  tickers: string[];
  articleUrl: string | null;
  analysis: {
    id: string;
    convictionScore: number;
    signalType: SignalType;
    bearThesis: string;
    affectedTickers: string[];
    voteScore: number;
    userVote: 1 | -1 | 0;
  } | null;
}

export interface SparklinePoint {
  t: number; // timestamp ms
  c: number; // close price
}

export interface SchedulerStatus {
  lastRun: {
    status: string;
    startedAt: string;
    finishedAt: string | null;
    eventsFound: number;
    eventsAnalyzed: number;
    errorMessage: string | null;
  } | null;
}
