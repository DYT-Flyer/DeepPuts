"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, MessageSquare, Trash2, Bell } from "lucide-react";
import { Nav } from "@/components/nav";
import { ConvictionBadge } from "@/components/conviction-badge";

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  voteCount: number;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    analysis: { id: string; convictionScore: number; headline: string };
  }>;
}

interface NotifPrefs {
  emailOnHighConviction: boolean;
  minConvictionThreshold: number;
  watchlistAlertsOnly: boolean;
  emailDigestFrequency: "none" | "daily" | "weekly";
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!session) { router.push("/login"); return; }
    Promise.all([
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/user/notifications").then(r => r.json()),
    ]).then(([profileData, notifData]) => {
      setProfile(profileData);
      setName(profileData.name || "");
      if (!notifData.error) setNotifPrefs(notifData);
    }).finally(() => setLoading(false));
  }, [session, router]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setProfile(prev => prev ? { ...prev, name: name.trim() || null } : prev);
    setEditing(false);
    setSaving(false);
  }

  async function updateNotifPref<K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) {
    if (!notifPrefs) return;
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    setSavingPrefs(true);
    await fetch("/api/user/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSavingPrefs(false);
  }

  async function deleteComment(id: string) {
    setDeletingId(id);
    await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
    setProfile(prev => prev ? { ...prev, comments: prev.comments.filter(c => c.id !== id) } : prev);
    setDeletingId(null);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatAge(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "just now";
  }

  const initials = (profile?.name || profile?.email || "?")[0].toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-2xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />)}
          </div>
        ) : !profile ? null : (
          <div className="space-y-8">

            {/* Avatar + header */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
                style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.2)", color: "#f43f5e" }}>
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                  {profile.name || profile.email.split("@")[0]}
                </h1>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>Since {formatDate(profile.createdAt)}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
                    {profile.comments.length} comment{profile.comments.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
                    {profile.voteCount} vote{profile.voteCount !== 1 ? "s" : ""} cast
                  </span>
                </div>
              </div>
            </div>

            {/* Info card */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {/* Username row */}
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>Username</p>
                    {editing ? (
                      <form onSubmit={saveName} style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                        <input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Choose a username"
                          autoFocus
                          className="text-sm px-3 py-1.5 rounded-lg"
                          style={{ background: "var(--surface-2)", border: "1px solid rgba(244,63,94,0.4)", color: "var(--text)", minWidth: "180px" }}
                        />
                        <button type="submit" disabled={saving}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: "#f43f5e", color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button type="button" onClick={() => { setEditing(false); setName(profile.name || ""); }}
                          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--text)" }}>
                        {profile.name || <span style={{ color: "var(--text-3)" }}>Not set</span>}
                      </p>
                    )}
                  </div>
                  {!editing && (
                    <button onClick={() => setEditing(true)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Email row */}
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>Email</p>
                <p className="text-sm" style={{ color: "var(--text)" }}>{profile.email}</p>
              </div>

              {/* Joined row */}
              <div className="px-5 py-4">
                <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>Member since</p>
                <p className="text-sm" style={{ color: "var(--text)" }}>{formatDate(profile.createdAt)}</p>
              </div>
            </div>

            {/* Notification preferences */}
            {notifPrefs && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <Bell size={13} style={{ color: "var(--text-3)" }} />
                  <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                    Notifications
                  </h2>
                  {savingPrefs && <span className="text-xs" style={{ color: "#555" }}>Saving…</span>}
                </div>
                <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {/* Email alerts toggle */}
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>High conviction alerts</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Email when a new thesis scores ≥ {notifPrefs.minConvictionThreshold}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer" style={{ flexShrink: 0 }}>
                      <input type="checkbox" className="sr-only peer" checked={notifPrefs.emailOnHighConviction}
                        onChange={e => updateNotifPref("emailOnHighConviction", e.target.checked)} />
                      <div className="w-10 h-5 rounded-full peer transition-all"
                        style={{ background: notifPrefs.emailOnHighConviction ? "#f43f5e" : "#333", position: "relative" }}>
                        <div style={{ position: "absolute", top: "2px", left: notifPrefs.emailOnHighConviction ? "22px" : "2px", width: "16px", height: "16px", background: "#fff", borderRadius: "50%", transition: "left 0.15s" }} />
                      </div>
                    </label>
                  </div>
                  {/* Watchlist only toggle */}
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Watchlist tickers only</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Only alert for tickers you watch</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer" style={{ flexShrink: 0 }}>
                      <input type="checkbox" className="sr-only peer" checked={notifPrefs.watchlistAlertsOnly}
                        onChange={e => updateNotifPref("watchlistAlertsOnly", e.target.checked)} />
                      <div className="w-10 h-5 rounded-full peer transition-all"
                        style={{ background: notifPrefs.watchlistAlertsOnly ? "#f43f5e" : "#333", position: "relative" }}>
                        <div style={{ position: "absolute", top: "2px", left: notifPrefs.watchlistAlertsOnly ? "22px" : "2px", width: "16px", height: "16px", background: "#fff", borderRadius: "50%", transition: "left 0.15s" }} />
                      </div>
                    </label>
                  </div>
                  {/* Digest frequency */}
                  <div className="px-5 py-4" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Email digest</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Summary of new opportunities</p>
                    </div>
                    <select value={notifPrefs.emailDigestFrequency}
                      onChange={e => updateNotifPref("emailDigestFrequency", e.target.value as NotifPrefs["emailDigestFrequency"])}
                      className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                    >
                      <option value="none">Off</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs mt-2 px-1" style={{ color: "#444" }}>
                  Email delivery requires SMTP configuration. Contact your administrator.
                </p>
              </div>
            )}

            {/* Comment history */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <MessageSquare size={13} style={{ color: "var(--text-3)" }} />
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                  Your Comments
                </h2>
                {profile.comments.length > 0 && (
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--surface)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
                    {profile.comments.length}
                  </span>
                )}
              </div>

              {profile.comments.length === 0 ? (
                <div className="rounded-xl py-12 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <MessageSquare size={24} style={{ color: "#333", margin: "0 auto 12px" }} />
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>No comments yet</p>
                  <p className="text-xs mt-1.5">
                    <Link href="/opportunities" style={{ color: "#f43f5e" }}>Browse opportunities</Link>
                    <span style={{ color: "#333" }}> to join the discussion</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.comments.map(c => (
                    <div key={c.id} className="rounded-xl p-4 transition-all"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      {/* Linked article */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
                        <ConvictionBadge score={c.analysis.convictionScore} size="sm" />
                        <Link href={`/opportunity/${c.analysis.id}`}
                          className="flex-1 text-xs leading-snug transition-colors"
                          style={{ color: "var(--text-3)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                        >
                          {c.analysis.headline}
                          <ArrowUpRight size={10} style={{ display: "inline", marginLeft: "3px", verticalAlign: "middle" }} />
                        </Link>
                      </div>

                      {/* Comment content */}
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{c.content}</p>

                      {/* Footer */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>{formatAge(c.createdAt)}</span>
                        <button
                          onClick={() => deleteComment(c.id)}
                          disabled={deletingId === c.id}
                          className="flex items-center gap-1 text-xs transition-colors"
                          style={{ color: "#333", cursor: deletingId === c.id ? "not-allowed" : "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                        >
                          <Trash2 size={11} />
                          {deletingId === c.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
