export interface RssArticle {
  id: string;
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
}

export async function fetchRssFeeds(feeds: string[], providerPrefix: string): Promise<RssArticle[]> {
  const articles: RssArticle[] = [];
  const seenIds = new Set<string>();

  for (const feed of feeds) {
    try {
      const res = await fetch(feed, {
        headers: { "User-Agent": "DeepPutsApp admin@deepputs.com" },
      });
      
      // Some feeds might redirect, so follow redirects is default in fetch.
      if (!res.ok) {
        console.error(`[rss:${providerPrefix}] Failed to fetch feed ${feed}: ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      const items = [...xml.matchAll(itemRegex)];

      for (const match of items) {
        const itemText = match[1];

        const titleMatch = itemText.match(/<title>([^<]+)<\/title>/i);
        const linkMatch = itemText.match(/<link>([^<]+)<\/link>/i);
        
        // CDATA wrapping in description or normal
        const descMatch = itemText.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || itemText.match(/<description>([\s\S]*?)<\/description>/i);
        const pubDateMatch = itemText.match(/<pubDate>([^<]+)<\/pubDate>/i);
        const guidMatch = itemText.match(/<guid[^>]*>([^<]+)<\/guid>/i);

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
          id: `${providerPrefix}-${guid}`,
          title: title.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
          summary: summary.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''), // Strip HTML
          link,
          publishedAt,
        });
      }
    } catch (err) {
      console.error(`[rss:${providerPrefix}] Error fetching feed ${feed}:`, err);
    }
  }

  return articles;
}
