"use client";

import { useState } from "react";

interface Props {
  analysisId: string;
  initialScore: number;
  initialUserVote: 1 | -1 | 0;
  loggedIn: boolean;
  size?: "sm" | "md";
}

export function VoteButtons({
  analysisId,
  initialScore,
  initialUserVote,
  loggedIn,
  size = "sm",
}: Props) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(initialUserVote);
  const [voting, setVoting] = useState(false);

  const arrowSize = size === "sm" ? "10px" : "13px";
  const scoreSize = size === "sm" ? "11px" : "13px";

  async function handleVote(value: 1 | -1) {
    if (!loggedIn || voting) return;
    setVoting(true);
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId, value }),
    });
    if (res.ok) {
      const data = await res.json();
      setScore(data.voteScore);
      setUserVote(data.userVote);
    }
    setVoting(false);
  }

  const upColor = userVote === 1 ? "#34d399" : "#bbb";
  const downColor = userVote === -1 ? "#f43f5e" : "#bbb";
  const scoreColor = score > 0 ? "#34d399" : score < 0 ? "#f43f5e" : "#bbb";

  const btnStyle = (activeColor: string): React.CSSProperties => ({
    background: "none",
    border: "none",
    cursor: loggedIn ? "pointer" : "default",
    padding: "2px 4px",
    borderRadius: "4px",
    lineHeight: 1,
    fontSize: arrowSize,
    transition: "color 0.15s",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
      <button
        onClick={() => handleVote(1)}
        title={loggedIn ? "Agree with this thesis" : "Sign in to vote"}
        style={{ ...btnStyle(upColor), color: upColor }}
        onMouseEnter={e => { if (loggedIn) e.currentTarget.style.color = userVote === 1 ? "#34d399" : "#ddd"; }}
        onMouseLeave={e => { e.currentTarget.style.color = upColor; }}
      >
        ▲
      </button>

      <span
        className="font-mono"
        style={{ color: scoreColor, fontSize: scoreSize, minWidth: "16px", textAlign: "center" }}
      >
        {score}
      </span>

      <button
        onClick={() => handleVote(-1)}
        title={loggedIn ? "Disagree — thesis is weak" : "Sign in to vote"}
        style={{ ...btnStyle(downColor), color: downColor }}
        onMouseEnter={e => { if (loggedIn) e.currentTarget.style.color = userVote === -1 ? "#f43f5e" : "#ddd"; }}
        onMouseLeave={e => { e.currentTarget.style.color = downColor; }}
      >
        ▼
      </button>
    </div>
  );
}
