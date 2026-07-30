const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://deepputs.com";
const FROM = "DeepPuts <onboarding@resend.dev>"; // update to your verified domain once set up in Resend

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail(email, "Reset your DeepPuts password", `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#e5e7eb;border-radius:12px;">
      <h2 style="color:#fff;margin:0 0 8px;">Reset your password</h2>
      <p style="color:#9ca3af;margin:0 0 24px;">Click the button below to set a new password. This link expires in 1 hour.</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Reset Password</a>
      <p style="color:#6b7280;font-size:12px;margin:24px 0 0;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `);
}

export interface AlertAnalysis {
  ticker: string;
  bearThesis: string;
  convictionScore: number;
  signalType: string;
  timeHorizon?: string | null;
  eventUrl: string;
}

export async function sendHighConvictionAlert(email: string, analyses: AlertAnalysis[]) {
  const rows = analyses.map(a => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1f2937;">
        <strong style="color:#fff;">${a.ticker}</strong>
        <span style="color:#f43f5e;font-size:12px;margin-left:8px;">Score ${a.convictionScore}/10</span>
        <p style="color:#9ca3af;font-size:13px;margin:4px 0 8px;">${a.bearThesis.slice(0, 160)}…</p>
        <a href="${APP_URL}${a.eventUrl}" style="color:#f43f5e;font-size:12px;text-decoration:none;">View full analysis →</a>
      </td>
    </tr>
  `).join("");

  await sendEmail(
    email,
    `${analyses.length} new high-conviction signal${analyses.length > 1 ? "s" : ""} on DeepPuts`,
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#e5e7eb;border-radius:12px;">
      <h2 style="color:#fff;margin:0 0 4px;">High-Conviction Alerts</h2>
      <p style="color:#9ca3af;margin:0 0 24px;">${analyses.length} new signal${analyses.length > 1 ? "s" : ""} match your alert preferences.</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="color:#6b7280;font-size:12px;margin:24px 0 0;">
        Manage alerts in your <a href="${APP_URL}/profile" style="color:#f43f5e;">profile settings</a>.
        Not financial advice.
      </p>
    </div>
  `);
}
