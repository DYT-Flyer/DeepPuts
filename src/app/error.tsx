"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <AlertTriangle size={24} style={{ color: "#f59e0b" }} />
        </div>
        <p className="text-xs font-mono mb-3" style={{ color: "#444" }}>500</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-3" style={{ color: "var(--text)" }}>
          Something went wrong
        </h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-3)" }}>
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs font-mono mb-6" style={{ color: "#444" }}>
            ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="text-sm px-4 py-2 rounded-xl transition-all"
          style={{ background: "#f43f5e", color: "#fff", cursor: "pointer", border: "none" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#fb4f6b")}
          onMouseLeave={e => (e.currentTarget.style.background = "#f43f5e")}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
