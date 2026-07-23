const POLYGON_BASE = "https://api.polygon.io";
const MIN_INTERVAL_MS = 12_500; // 5 req/min = 1 per 12.5s (with buffer)

type QueueItem = {
  path: string;
  params: Record<string, string>;
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
};

class PolygonClient {
  private queue: QueueItem[] = [];
  private processing = false;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ path, params, resolve: resolve as (data: unknown) => void, reject });
      this.drain();
    });
  }

  private async drain() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        const url = new URL(`${POLYGON_BASE}${item.path}`);
        url.searchParams.set("apiKey", this.apiKey);
        for (const [k, v] of Object.entries(item.params)) {
          url.searchParams.set(k, v);
        }

        const tickerParam = item.params.ticker ? ` (${item.params.ticker})` : "";
        console.log(`[polygon] API call: ${item.path}${tickerParam} [${this.queue.length} left in queue]`);

        const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
        if (!res.ok) {
          item.reject(new Error(`Polygon API error ${res.status}: ${await res.text()}`));
        } else {
          item.resolve(await res.json());
        }
      } catch (err) {
        item.reject(err as Error);
      }

      if (this.queue.length > 0) {
        await sleep(MIN_INTERVAL_MS);
      }
    }

    this.processing = false;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let _client: PolygonClient | null = null;

export function getPolygonClient(): PolygonClient {
  if (!_client) {
    const key = process.env.POLYGON_API_KEY;
    if (!key) throw new Error("POLYGON_API_KEY is not set");
    _client = new PolygonClient(key);
  }
  return _client;
}
