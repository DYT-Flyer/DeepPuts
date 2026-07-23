"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  userEmail?: string | null;
  userName?: string | null;
}

import "./nav.css";

export function Nav({ userEmail, userName }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="nav-container">
      <div className="nav-content">
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <span className="nav-logo-text">
            Deep<span className="nav-logo-highlight">Puts</span>
          </span>
        </Link>

        {/* Links */}
        <div className="nav-links">
          <NavLink href="/" active={pathname === "/"}>Dashboard</NavLink>
          <span className="nav-separator">·</span>
          <NavLink href="/opportunities" active={pathname === "/opportunities"}>Opportunities</NavLink>
          <span className="nav-separator">·</span>
          <NavLink href="/events" active={pathname === "/events"}>Event Feed</NavLink>
          <span className="nav-separator">·</span>
          <NavLink href="/watchlist" active={pathname === "/watchlist"}>Watchlist</NavLink>
          <span className="nav-separator">·</span>
          <NavLink href="/popular" active={pathname === "/popular"}>Popular</NavLink>
        </div>

        {/* Search */}
        <button
          onClick={() => router.push("/search")}
          className="nav-search"
        >
          <Search size={14} />
          <span className="nav-search-text">Search</span>
          <kbd className="nav-search-shortcut">⌘K</kbd>
        </button>

        {/* Right Auth */}
        <div className="nav-auth">
          {userEmail ? (
            <>
              <Link href="/profile" className="nav-auth-user">
                {userName || userEmail}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="nav-auth-btn"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="nav-auth-btn">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`nav-link ${active ? "nav-link-active" : "nav-link-inactive"}`}
    >
      {children}
    </Link>
  );
}
