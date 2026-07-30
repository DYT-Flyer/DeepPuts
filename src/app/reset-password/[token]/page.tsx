import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { ResetForm } from "../reset-form";
import "../../login/login.css";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="login-container">
      <div className="login-bg-glow" />
      <div className="login-card">
        <div className="login-logo-container">
          <Link href="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="login-icon-box">
              <TrendingDown size={22} />
            </div>
            <h1 className="login-logo-text">Deep<span className="login-logo-highlight">Puts</span></h1>
          </Link>
          <p className="login-subtitle">Set a new password</p>
        </div>
        <ResetForm token={token} />
        <div className="login-footer">
          <p className="login-footer-disclaimer">Not financial advice. For informational purposes only.</p>
        </div>
      </div>
    </div>
  );
}
