import { fetchRssFeeds, RssArticle } from "./fetcher";

export async function fetchSeekingAlphaNews(): Promise<RssArticle[]> {
  return fetchRssFeeds([
    "https://seekingalpha.com/market_currents.xml",
  ], "seeking_alpha");
}

export async function fetchMarketWatchNews(): Promise<RssArticle[]> {
  return fetchRssFeeds([
    "https://feeds.content.dowjones.io/public/rss/mw_topstories",
  ], "marketwatch");
}

export async function fetchBenzingaNews(): Promise<RssArticle[]> {
  return fetchRssFeeds([
    "https://www.benzinga.com/feed",
  ], "benzinga");
}
