import yahooFinance from 'yahoo-finance2';

export interface YahooNewsArticle {
  id: string;
  title: string;
  description: string | null;
  article_url: string;
  published_utc: string;
  tickers: string[];
  author?: string;
}

const STOCK_WATCHLIST = [
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL",
];

const CRYPTO_WATCHLIST = [
  "BTC-USD", "ETH-USD", "SOL-USD",
];

export async function fetchStockNews(sinceUtc?: string): Promise<YahooNewsArticle[]> {
  const allNews: YahooNewsArticle[] = [];
  const sinceDate = sinceUtc ? new Date(sinceUtc) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  // We'll search for news on a few major stocks to simulate the market-wide feed
  for (const symbol of STOCK_WATCHLIST) {
    try {
      const results: any = await yahooFinance.search(symbol, { newsCount: 5 });
      if (results.news) {
        for (const item of results.news) {
          const pubDate = new Date(item.providerPublishTime * 1000);
          if (pubDate > sinceDate) {
            allNews.push({
              id: item.uuid,
              title: item.title,
              description: item.title, // Yahoo search doesn't always provide a good snippet
              article_url: item.link,
              published_utc: pubDate.toISOString(),
              tickers: item.relatedTickers || [symbol],
              author: item.publisher,
            });
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch news for ${symbol}`, e);
    }
  }

  // Deduplicate by URL
  const unique = Array.from(new Map(allNews.map(item => [item.article_url, item])).values());
  return unique.sort((a, b) => new Date(b.published_utc).getTime() - new Date(a.published_utc).getTime());
}

export async function fetchCryptoNews(sinceUtc?: string): Promise<YahooNewsArticle[]> {
  const allNews: YahooNewsArticle[] = [];
  const sinceDate = sinceUtc ? new Date(sinceUtc) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const symbol of CRYPTO_WATCHLIST) {
    try {
      const results: any = await yahooFinance.search(symbol, { newsCount: 5 });
      if (results.news) {
        for (const item of results.news) {
          const pubDate = new Date(item.providerPublishTime * 1000);
          if (pubDate > sinceDate) {
            allNews.push({
              id: item.uuid,
              title: item.title,
              description: item.title,
              article_url: item.link,
              published_utc: pubDate.toISOString(),
              tickers: item.relatedTickers || [symbol],
              author: item.publisher,
            });
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch crypto news for ${symbol}`, e);
    }
  }

  const unique = Array.from(new Map(allNews.map(item => [item.article_url, item])).values());
  return unique.sort((a, b) => new Date(b.published_utc).getTime() - new Date(a.published_utc).getTime());
}
