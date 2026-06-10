"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Nav } from "@/components/nav";
import { OpportunityCard } from "@/components/opportunity-card";
import type { OpportunityItem } from "@/types";

interface RawEventResult {
  id: string;
  headline: string;
  publishedAt: string;
  assetClass: string;
  tickers: string[];
  articleUrl: string | null;
}

interface SearchResults {
  opportunities: OpportunityItem[];
  events: RawEventResult[];
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "opportunities" | "events">("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
      setLoading(false);
    }, 300);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalOpps = results?.opportunities.length ?? 0;
  const totalEvents = results?.events.length ?? 0;
  const total = totalOpps + totalEvents;

  const showOpps = tab === "all" || tab === "opportunities";
  const showEvents = tab === "all" || tab === "events";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Search box */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search opportunities, tickers, events…"
            className="w-full text-sm pl-10 pr-4 py-3 rounded-xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            onFocus={e => (e.target.style.borderColor = "var(--border-hover)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Tabs + count */}
        {results && (
          <div className="flex items-center gap-1 mb-6">
            {(["all", "opportunities", "events"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="text-xs px-3 py-1.5 rounded-lg capitalize transition-all"
                style={{
                  background: tab === t ? "rgba(255,255,255,0.08)" : "transparent",
                  color: tab === t ? "var(--text)" : "var(--text-3)",
                  border: `1px solid ${tab === t ? "var(--border-hover)" : "transparent"}`,
                }}
              >
                {t === "all" ? `All (${total})` : t === "opportunities" ? `Opportunities (${totalOpps})` : `Events (${totalEvents})`}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && query.trim().length >= 2 && results && total === 0 && (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: "var(--text-3)" }}>No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {/* Prompt */}
        {!loading && query.trim().length < 2 && (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Type at least 2 characters to search</p>
          </div>
        )}

        {/* Results */}
        {!loading && results && (
          <div className="space-y-6">
            {showOpps && totalOpps > 0 && (
              <section>
                {tab === "all" && (
                  <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                    Opportunities
                  </h2>
                )}
                <div className="space-y-3">
                  {results.opportunities.map(item => (
                    <OpportunityCard key={item.id} item={item} loggedIn={!!session} />
                  ))}
                </div>
              </section>
            )}

            {showEvents && totalEvents > 0 && (
              <section>
                {tab === "all" && (
                  <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                    Events
                  </h2>
                )}
                <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {results.events.map((e, i) => (
                    <div key={e.id} className="px-4 py-3 transition-colors"
                      style={{ borderBottom: i < results.events.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                    >
                      {e.articleUrl ? (
                        <a href={e.articleUrl} target="_blank" rel="noopener noreferrer"
                          className="block text-sm leading-snug transition-colors mb-1"
                          style={{ color: "#d4d4d4" }}
                          onMouseEnter={ev => (ev.currentTarget.style.color = "#fff")}
                          onMouseLeave={ev => (ev.currentTarget.style.color = "#d4d4d4")}
                        >{e.headline}</a>
                      ) : (
                        <p className="text-sm leading-snug mb-1" style={{ color: "#d4d4d4" }}>{e.headline}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs capitalize" style={{ color: "#666" }}>{e.assetClass}</span>
                        <span style={{ color: "#333" }}>·</span>
                        <span className="text-xs" style={{ color: "#555" }}>
                          {new Date(e.publishedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                        {e.tickers.slice(0, 5).map(t => (
                          <span key={t} className="flex items-center gap-1.5">
                            <span style={{ color: "#333" }}>·</span>
                            <Link href={`/ticker/${t}`} className="text-xs font-mono transition-colors"
                              style={{ color: "#888" }}
                              onMouseEnter={ev => (ev.currentTarget.style.color = "#fff")}
                              onMouseLeave={ev => (ev.currentTarget.style.color = "#888")}
                            >{t}</Link>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
