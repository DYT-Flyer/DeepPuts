import { getPolygonClient } from "./client";

export interface PolygonNewsArticle {
  id: string;
  title: string;
  description: string | null;
  article_url: string;
  published_utc: string;
  tickers: string[];
  keywords?: string[];
  author?: string;
}

interface PolygonNewsResponse {
  results: PolygonNewsArticle[];
  status: string;
  next_url?: string;
}

const CRYPTO_TICKERS = [
  "X:BTCUSD",
  "X:ETHUSD",
  "X:SOLUSD",
  "X:DOGEUSD",
  "X:XRPUSD",
  "X:AVAXUSD",
  "X:ADAUSD",
  "X:MATICUSD",
];

const STOCK_WATCHLIST = [
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "AMD",
  "NFLX", "PYPL", "SNAP", "RIVN", "LCID", "PLTR", "COIN", "MSTR",
  "GME", "AMC", "BBBY", "SPCE", "BYND", "HOOD", "RBLX", "ABNB",
  "UBER", "LYFT", "DASH", "CVNA", "OSTK", "WISH",
];

export async function fetchStockNews(sinceUtc?: string): Promise<PolygonNewsArticle[]> {
  const client = getPolygonClient();
  const params: Record<string, string> = {
    limit: "50",
    order: "desc",
    sort: "published_utc",
  };

  if (sinceUtc) {
    params["published_utc.gte"] = sinceUtc;
  }

  const results: PolygonNewsArticle[] = [];

  // Fetch news for a batch of tickers
  for (const ticker of STOCK_WATCHLIST.slice(0, 10)) {
    try {
      const data = await client.get<PolygonNewsResponse>("/v2/reference/news", {
        ...params,
        ticker,
      });
      if (data.results) results.push(...data.results);
    } catch (err) {
      console.error(`Failed to fetch news for ${ticker}:`, err);
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return results.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export async function fetchCryptoNews(sinceUtc?: string): Promise<PolygonNewsArticle[]> {
  const client = getPolygonClient();
  const params: Record<string, string> = {
    limit: "20",
    order: "desc",
    sort: "published_utc",
  };

  if (sinceUtc) {
    params["published_utc.gte"] = sinceUtc;
  }

  const results: PolygonNewsArticle[] = [];

  for (const ticker of CRYPTO_TICKERS.slice(0, 3)) {
    try {
      const data = await client.get<PolygonNewsResponse>("/v2/reference/news", {
        ...params,
        ticker,
      });
      if (data.results) results.push(...data.results);
    } catch (err) {
      console.error(`Failed to fetch crypto news for ${ticker}:`, err);
    }
  }

  const seen = new Set<string>();
  return results.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}
