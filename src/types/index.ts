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
    convictionScore: number;
    signalType: SignalType;
    bearThesis: string;
    affectedTickers: string[];
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
