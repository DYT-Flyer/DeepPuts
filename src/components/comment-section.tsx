"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Flag } from "lucide-react";
import Link from "next/link";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface Props {
  analysisId: string;
  open: boolean;
}

export function CommentSection({ analysisId, open }: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    fetch(`/api/comments?analysisId=${analysisId}`)
      .then(r => r.json())
      .then(d => { setComments(d); setLoaded(true); })
      .finally(() => setLoading(false));
  }, [open, analysisId, loaded]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId, content: text }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments(prev => [...prev, c]);
      setText("");
    }
    setSubmitting(false);
  }

  async function deleteComment(id: string) {
    await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
    setComments(prev => prev.filter(c => c.id !== id));
  }

  async function flagComment(id: string) {
    if (flagged.has(id) || flagging) return;
    setFlagging(id);
    await fetch("/api/comments/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: id, reason: "spam" }),
    });
    setFlagged(prev => new Set([...prev, id]));
    setFlagging(null);
  }

  function formatAge(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
  }

  function displayName(user: Comment["user"]) {
    return user.name || user.email.split("@")[0];
  }

  if (!open) return null;

  return (
    <div className="mt-3 space-y-3" style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-3)" }}>No comments yet.</p>
      ) : (
        comments.map(c => (
          <div key={c.id} className="rounded-lg px-3 py-2" style={{ background: "var(--surface-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>{displayName(c.user)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="text-xs" style={{ color: "var(--text-3)" }}>{formatAge(c.createdAt)}</span>
                {session && session.user?.id !== c.user.id && (
                  <button
                    onClick={() => flagComment(c.id)}
                    disabled={flagged.has(c.id) || flagging === c.id}
                    title={flagged.has(c.id) ? "Reported" : "Report comment"}
                    style={{ background: "none", border: "none", padding: "0", cursor: flagged.has(c.id) ? "default" : "pointer", color: flagged.has(c.id) ? "#f59e0b" : "#333", lineHeight: 1 }}
                    onMouseEnter={e => { if (!flagged.has(c.id)) e.currentTarget.style.color = "#666"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = flagged.has(c.id) ? "#f59e0b" : "#333"; }}
                  >
                    <Flag size={10} />
                  </button>
                )}
                {session?.user?.id === c.user.id && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="text-xs transition-colors"
                    style={{ color: "#444" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#444")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>{c.content}</p>
          </div>
        ))
      )}

      {session ? (
        <form onSubmit={submit} style={{ display: "flex", gap: "6px" }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={1000}
            className="flex-1 text-xs px-3 py-2 rounded-lg"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            onFocus={e => (e.target.style.borderColor = "rgba(244,63,94,0.4)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="text-xs px-3 py-2 rounded-lg transition-all"
            style={{
              background: submitting || !text.trim() ? "rgba(244,63,94,0.2)" : "#f43f5e",
              color: "#fff",
              cursor: submitting || !text.trim() ? "not-allowed" : "pointer",
            }}
          >
            Post
          </button>
        </form>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          <Link href="/login" style={{ color: "#f43f5e" }}>Sign in</Link> to comment.
        </p>
      )}
    </div>
  );
}
