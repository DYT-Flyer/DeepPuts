export interface WsjArticle {
  id: string;
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
}

export async function fetchWsjNews(): Promise<WsjArticle[]> {
  const feeds = [
    "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml", // US Business
    "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", // Markets
  ];

  const articles: WsjArticle[] = [];
  const seenIds = new Set<string>();

  for (const feed of feeds) {
    try {
      const res = await fetch(feed, {
        headers: { "User-Agent": "DeepPutsApp admin@deepputs.com" },
      });
      if (!res.ok) {
        console.error(`[wsj] Failed to fetch feed ${feed}: ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const items = [...xml.matchAll(itemRegex)];

      for (const match of items) {
        const itemText = match[1];

        const titleMatch = itemText.match(/<title>([^<]+)<\/title>/);
        const linkMatch = itemText.match(/<link>([^<]+)<\/link>/);
        
        // CDATA wrapping in description or normal
        const descMatch = itemText.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemText.match(/<description>([\s\S]*?)<\/description>/);
        const pubDateMatch = itemText.match(/<pubDate>([^<]+)<\/pubDate>/);
        const guidMatch = itemText.match(/<guid[^>]*>([^<]+)<\/guid>/);

        if (!titleMatch || !linkMatch) continue;

        const title = titleMatch[1].trim();
        const link = linkMatch[1].trim();
        const summary = descMatch ? descMatch[1].trim() : "";
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
        const guid = guidMatch ? guidMatch[1].trim() : link; // fallback to link if no GUID

        if (seenIds.has(guid)) continue;
        seenIds.add(guid);

        // Convert pubDate (e.g. "Fri, 24 Jan 2025 15:38:29 -0500") to ISO Date
        let publishedAt = pubDate;
        try {
          publishedAt = new Date(pubDate).toISOString();
        } catch (e) {
          // ignore parsing error, use original string
        }

        articles.push({
          id: `wsj-${guid}`,
          title: title.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
          summary: summary.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''), // Strip any HTML from summary
          link,
          publishedAt,
        });
      }
    } catch (err) {
      console.error(`[wsj] Error fetching feed ${feed}:`, err);
    }
  }

  return articles;
}
