"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/nav";
import { OpportunityCard } from "@/components/opportunity-card";
import { RefreshCw, Bookmark, BookmarkCheck, ChevronDown, X as XIcon } from "lucide-react";
import type { OpportunityItem, SignalType } from "@/types";

interface SavedFilter {
  id: string;
  name: string;
  filters: { minScore?: string; signal?: string; sector?: string; asset?: string; sort?: string };
  createdAt: string;
}

const SIGNAL_TYPES: SignalType[] = [
  "earnings_miss", "sec_filing", "news_negative", "macro", "crypto_dump",
  "insider_sell", "guidance_cut", "regulatory",
];
const SECTORS = [
  "Technology", "Healthcare", "Energy", "Financials", "Consumer",
  "Industrials", "Materials", "Utilities", "Real Estate", "Crypto", "Macro",
];

const SORT_OPTIONS = [
  ["score",     "AI Score"],
  ["composite", "Composite"],
  ["votes",     "Top Voted"],
  ["recent",    "Most Recent"],
] as const;

type SortKey = typeof SORT_OPTIONS[number][0];

export default function OpportunityBoard() {
  return (
    <Suspense>
      <OpportunityBoardInner />
    </Suspense>
  );
}

function OpportunityBoardInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise from URL
  const [minScore,    setMinScore]    = useState(() => Number(searchParams.get("minScore") ?? "1"));
  const [signalType,  setSignalType]  = useState(() => searchParams.get("signal") ?? "");
  const [sector,      setSector]      = useState(() => searchParams.get("sector") ?? "");
  const [assetClass,  setAssetClass]  = useState(() => searchParams.get("asset")  ?? "");
  const [sortBy,      setSortBy]      = useState<SortKey>(() => (searchParams.get("sort") as SortKey) ?? "score");

  const [items,         setItems]         = useState<OpportunityItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [totalAnalyzed, setTotalAnalyzed] = useState<number | null>(null);
  const [savedFilters,  setSavedFilters]  = useState<SavedFilter[]>([]);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [saveName,      setSaveName]      = useState("");
  const [saveMode,      setSaveMode]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node))
        setFilterMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch("/api/saved-filters").then(r => r.json()).then(d => { if (Array.isArray(d)) setSavedFilters(d); });
  }, [session]);

  // Sync state → URL
  useEffect(() => {
    const p = new URLSearchParams();
    if (minScore > 1)   p.set("minScore", String(minScore));
    if (signalType)     p.set("signal",   signalType);
    if (sector)         p.set("sector",   sector);
    if (assetClass)     p.set("asset",    assetClass);
    if (sortBy !== "score") p.set("sort", sortBy);
    const qs = p.toString();
    router.replace(qs ? `/opportunities?${qs}` : "/opportunities", { scroll: false });
  }, [minScore, signalType, sector, assetClass, sortBy, router]);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (minScore > 1) params.set("minScore", String(minScore));
    if (signalType)   params.set("signalType", signalType);
    if (sector)       params.set("sector", sector);
    if (assetClass)   params.set("assetClass", assetClass);
    if (sortBy)       params.set("sortBy", sortBy);
    params.set("limit", "60");
    const res = await fetch(`/api/opportunities?${params}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [minScore, signalType, sector, assetClass, sortBy]);

  useEffect(() => { fetchOpportunities(); }, [fetchOpportunities]);
  useEffect(() => {
    fetch("/api/scheduler-status").then(r => r.json()).then(d => setTotalAnalyzed(d.totalAnalyzed));
  }, []);

  async function triggerRefresh() {
    setRefreshing(true);
    await fetch("/api/cron", { method: "POST" });
    setTimeout(() => { fetchOpportunities(); setRefreshing(false); }, 3000);
  }

  const highConviction = sortBy === "votes" || sortBy === "recent" || sortBy === "composite"
    ? []
    : items.filter(i => i.convictionScore >= 7);
  const rest = sortBy === "votes" || sortBy === "recent" || sortBy === "composite"
    ? items
    : items.filter(i => i.convictionScore < 7);

  const filtersActive = minScore > 1 || !!signalType || !!sector || !!assetClass;

  function clearFilters() {
    setMinScore(1); setSignalType(""); setSector(""); setAssetClass("");
  }

  function applyFilter(f: SavedFilter) {
    if (f.filters.minScore) setMinScore(Number(f.filters.minScore)); else setMinScore(1);
    if (f.filters.signal !== undefined) setSignalType(f.filters.signal);
    if (f.filters.sector !== undefined) setSector(f.filters.sector);
    if (f.filters.asset !== undefined) setAssetClass(f.filters.asset);
    if (f.filters.sort) setSortBy(f.filters.sort as SortKey);
    setFilterMenuOpen(false);
  }

  async function saveCurrentFilter() {
    if (!saveName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/saved-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveName.trim(),
        filters: {
          ...(minScore > 1 ? { minScore: String(minScore) } : {}),
          ...(signalType ? { signal: signalType } : {}),
          ...(sector ? { sector } : {}),
          ...(assetClass ? { asset: assetClass } : {}),
          ...(sortBy !== "score" ? { sort: sortBy } : {}),
        },
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setSavedFilters(prev => [created, ...prev]);
      setSaveName("");
      setSaveMode(false);
    }
    setSaving(false);
  }

  async function deleteSavedFilter(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/saved-filters?id=${id}`, { method: "DELETE" });
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>Bear Theses</h1>
          </div>
        </div>

        {/* Sort + Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {/* Sort chips */}
          <div className="flex items-center gap-1 mr-2">
            {SORT_OPTIONS.map(([value, label]) => (
              <button key={value} onClick={() => setSortBy(value)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: sortBy === value ? "rgba(244,63,94,0.15)" : "var(--surface)",
                  border: `1px solid ${sortBy === value ? "rgba(244,63,94,0.4)" : "var(--border)"}`,
                  color: sortBy === value ? "#f43f5e" : "var(--text-3)",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ width: "1px", height: "20px", background: "var(--border)", margin: "0 4px" }} />

          {/* Filter selects */}
          {[
            { value: assetClass, set: setAssetClass, options: [["", "All assets"], ["stock", "Stocks"], ["crypto", "Crypto"]] },
            { value: signalType, set: setSignalType, options: [["", "All signals"], ...SIGNAL_TYPES.map(s => [s, s.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())])] },
            { value: sector,     set: setSector,     options: [["", "All sectors"], ...SECTORS.map(s => [s, s])] },
            { value: String(minScore), set: (v: string) => setMinScore(Number(v)), options: [["1","All conviction"],["4","Score ≥ 4"],["7","Score ≥ 7"],["9","Score ≥ 9"]] },
          ].map((f, i) => (
            <select key={i} value={f.value} onChange={e => f.set(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
              style={{
                background: f.value ? "rgba(244,63,94,0.08)" : "var(--surface)",
                border: `1px solid ${f.value ? "rgba(244,63,94,0.25)" : "var(--border)"}`,
                color: f.value ? "#f87171" : "var(--text-2)",
              }}
            >
              {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}

          {filtersActive && (
            <button onClick={clearFilters}
              className="text-xs px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-3)", background: "transparent", border: "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
            >
              Clear
            </button>
          )}

          {/* Saved filters (logged in only) */}
          {session && (
            <div ref={filterMenuRef} style={{ position: "relative", marginLeft: "auto" }}>
              <div className="flex items-center gap-1">
                {/* Save current button — shown when filters are active */}
                {filtersActive && !saveMode && (
                  <button onClick={() => setSaveMode(true)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-3)"; }}
                    title="Save current filters"
                  >
                    <Bookmark size={11} /> Save
                  </button>
                )}
                {/* Saved filters dropdown */}
                {savedFilters.length > 0 && (
                  <button onClick={() => setFilterMenuOpen(o => !o)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                    style={{
                      background: filterMenuOpen ? "rgba(255,255,255,0.06)" : "var(--surface)",
                      border: `1px solid ${filterMenuOpen ? "var(--border-hover)" : "var(--border)"}`,
                      color: "var(--text-2)",
                    }}
                  >
                    <BookmarkCheck size={11} />
                    <span>{savedFilters.length}</span>
                    <ChevronDown size={10} style={{ transform: filterMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  </button>
                )}
              </div>

              {/* Save name input inline */}
              {saveMode && (
                <div className="flex items-center gap-1.5 mt-1" style={{ position: "absolute", right: 0, top: "100%", zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "8px", minWidth: "220px" }}>
                  <input
                    autoFocus
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveCurrentFilter(); if (e.key === "Escape") setSaveMode(false); }}
                    placeholder="Filter name…"
                    maxLength={60}
                    className="flex-1 text-xs px-2 py-1.5 rounded-lg"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                  <button onClick={saveCurrentFilter} disabled={saving || !saveName.trim()}
                    className="text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: saving || !saveName.trim() ? "rgba(244,63,94,0.3)" : "#f43f5e", color: "#fff", cursor: saving || !saveName.trim() ? "not-allowed" : "pointer" }}
                  >{saving ? "…" : "Save"}</button>
                  <button onClick={() => setSaveMode(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#444", padding: "4px", lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#aaa")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#444")}
                  ><XIcon size={12} /></button>
                </div>
              )}

              {/* Saved filters dropdown menu */}
              {filterMenuOpen && (
                <div className="rounded-xl overflow-hidden" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", minWidth: "200px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Saved Filters</span>
                  </div>
                  {savedFilters.map(f => (
                    <div key={f.id}
                      className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onClick={() => applyFilter(f)}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span className="text-xs" style={{ color: "var(--text-2)" }}>{f.name}</span>
                      <button onClick={(e) => deleteSavedFilter(f.id, e)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#333", padding: "2px", lineHeight: 1 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                      ><XIcon size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              {filtersActive ? "No bear theses match these filters." : "No opportunities found"}
            </p>
            {filtersActive ? (
              <button onClick={clearFilters} className="text-xs mt-2 transition-colors" style={{ color: "#f43f5e", background: "none", border: "none", cursor: "pointer" }}>
                Clear filters
              </button>
            ) : (
              <p className="text-xs mt-1" style={{ color: "#333" }}>Adjust your filters or run the scheduler</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {highConviction.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#f43f5e" }}>High Conviction</h2>
                  <div className="flex-1 h-px" style={{ background: "rgba(244,63,94,0.15)" }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {highConviction.map(item => <OpportunityCard key={item.id} item={item} loggedIn={!!session} />)}
                </div>
              </section>
            )}
            {rest.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                    {sortBy === "votes" ? "Top Voted" : sortBy === "recent" ? "Most Recent" : sortBy === "composite" ? "Composite Score" : "Monitoring"}
                  </h2>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {rest.map(item => <OpportunityCard key={item.id} item={item} loggedIn={!!session} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
