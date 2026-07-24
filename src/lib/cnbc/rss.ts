export interface CnbcArticle {
  id: string;
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
}

export async function fetchCnbcNews(): Promise<CnbcArticle[]> {
  const feeds = [
    "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", // Top News
    "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",  // Finance
  ];

  const articles: CnbcArticle[] = [];
  const seenIds = new Set<string>();

  for (const feed of feeds) {
    try {
      const res = await fetch(feed, {
        headers: { "User-Agent": "DeepPutsApp admin@deepputs.com" },
      });
      if (!res.ok) {
        console.error(`[cnbc] Failed to fetch feed ${feed}: ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const items = [...xml.matchAll(itemRegex)];

      for (const match of items) {
        const itemText = match[1];

        const titleMatch = itemText.match(/<title>([^<]+)<\/title>/);
        const linkMatch = itemText.match(/<link>([^<]+)<\/link>/);
        
        // CDATA wrapping in description
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

        // Convert pubDate (e.g. "Tue, 21 Jul 2026 10:24:07 GMT") to ISO Date
        let publishedAt = pubDate;
        try {
          publishedAt = new Date(pubDate).toISOString();
        } catch (e) {
          // ignore parsing error, use original string
        }

        articles.push({
          id: `cnbc-${guid}`,
          title: title.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
          summary: summary.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
          link,
          publishedAt,
        });
      }
    } catch (err) {
      console.error(`[cnbc] Error fetching feed ${feed}:`, err);
    }
  }

  return articles;
}
