export interface SecEvent {
  id: string;
  cik: string;
  ticker: string | null;
  companyName: string;
  formType: string;
  summary: string;
  link: string;
  updatedAt: string;
}

let cikToTickerCache: Record<string, string> | null = null;
let tickersLastFetched = 0;

async function getCikToTickerMap(): Promise<Record<string, string>> {
  const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
  if (cikToTickerCache && Date.now() - tickersLastFetched < CACHE_TTL) {
    return cikToTickerCache;
  }

  try {
    const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": "DeepPutsApp admin@deepputs.com" },
    });
    if (!res.ok) throw new Error(`SEC Ticker map returned ${res.status}`);
    
    const data = await res.json() as Record<string, { cik_str: number; ticker: string; title: string }>;
    const map: Record<string, string> = {};
    
    // Normalize CIK to string without leading zeros for the map keys
    for (const key of Object.keys(data)) {
      const item = data[key];
      map[item.cik_str.toString()] = item.ticker;
    }
    
    cikToTickerCache = map;
    tickersLastFetched = Date.now();
    return map;
  } catch (err) {
    console.error("[sec] Failed to fetch CIK to ticker map:", err);
    if (cikToTickerCache) return cikToTickerCache; // fallback to stale cache
    return {};
  }
}

export async function fetchRecent8KFilings(): Promise<SecEvent[]> {
  const url = "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-k&count=100&output=atom";
  
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "DeepPutsApp admin@deepputs.com" },
    });
    if (!res.ok) throw new Error(`SEC RSS returned ${res.status}`);
    
    const xml = await res.text();
    const map = await getCikToTickerMap();
    
    // Simple regex parser for Atom feed <entry>
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const entries = [...xml.matchAll(entryRegex)];
    
    const events: SecEvent[] = [];
    
    for (const match of entries) {
      const entryText = match[1];
      
      const titleMatch = entryText.match(/<title>([^<]+)<\/title>/);
      const linkMatch = entryText.match(/<link[^>]+href="([^"]+)"/);
      const summaryMatch = entryText.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
      const updatedMatch = entryText.match(/<updated>([^<]+)<\/updated>/);
      const idMatch = entryText.match(/<id>([^<]+)<\/id>/);
      
      if (!titleMatch) continue;
      const title = titleMatch[1]; // e.g., "8-K - NATURAL GAS SERVICES GROUP INC (0001084991) (Filer)"
      
      // Extract CIK
      const cikMatch = title.match(/\((\d{10})\)/);
      if (!cikMatch) continue;
      
      const paddedCik = cikMatch[1];
      const numericCik = parseInt(paddedCik, 10).toString();
      const ticker = map[numericCik] || null;
      
      // Extract Company Name
      const nameMatch = title.match(/8-K - (.*?) \(\d{10}\)/);
      const companyName = nameMatch ? nameMatch[1].trim() : "Unknown Company";
      
      // Parse summary (html encoded) and strip tags
      let summary = "";
      if (summaryMatch) {
        // Unescape standard html entities if needed, but simple regex strip is fine for the summary text
        summary = summaryMatch[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        summary = summary.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim();
      }
      
      events.push({
        id: idMatch ? idMatch[1] : `sec-${paddedCik}-${Date.now()}`,
        cik: paddedCik,
        ticker,
        companyName,
        formType: "8-K",
        summary: summary || title,
        link: linkMatch ? linkMatch[1] : "",
        updatedAt: updatedMatch ? updatedMatch[1] : new Date().toISOString(),
      });
    }
    
    return events;
  } catch (err) {
    console.error("[sec] Failed to fetch SEC 8-K filings:", err);
    return [];
  }
}
