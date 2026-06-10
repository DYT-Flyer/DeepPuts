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

export function Nav({ userEmail, userName }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="glass sticky top-0 z-50 border-b" style={{ background: "rgba(8,8,8,0.85)", borderColor: "var(--border)" }}>
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tracking-tight text-white">
            Deep<span className="text-rose-400">Puts</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-2">
          <NavLink href="/" active={pathname === "/"}>Dashboard</NavLink>
          <span style={{ color: "#333" }}>·</span>
          <NavLink href="/opportunities" active={pathname === "/opportunities"}>Opportunities</NavLink>
          <span style={{ color: "#333" }}>·</span>
          <NavLink href="/events" active={pathname === "/events"}>Event Feed</NavLink>
          <span style={{ color: "#333" }}>·</span>
          <NavLink href="/watchlist" active={pathname === "/watchlist"}>Watchlist</NavLink>
          <span style={{ color: "#333" }}>·</span>
          <NavLink href="/admin" active={pathname.startsWith("/admin")}>Admin</NavLink>
        </div>

        {/* Search */}
        <button
          onClick={() => router.push("/search")}
          className="ml-auto flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-2)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-3)"; }}
        >
          <Search size={12} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden md:inline text-xs px-1 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#555", border: "1px solid rgba(255,255,255,0.08)", fontSize: "10px" }}>⌘K</kbd>
        </button>

        {/* Right */}
        <div className="flex items-center gap-4">
          {userEmail ? (
            <>
              <Link href="/profile"
                className="text-xs hidden sm:block transition-colors"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
              >
                {userName || userEmail}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs transition-colors"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login"
              className="text-xs transition-colors"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
            >
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
      className={cn(
        "px-3 py-1.5 rounded-md text-sm transition-all duration-150",
        active
          ? "bg-white/8 text-white font-medium"
          : "text-[#666] hover:text-[#aaa] hover:bg-white/4"
      )}
    >
      {children}
    </Link>
  );
}
