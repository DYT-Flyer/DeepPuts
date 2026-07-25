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

import React, { useState } from "react";

export function Nav({ userEmail, userName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="nav-container">
      <div className="nav-content">
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <span className="nav-logo-text">
            Deep<span className="nav-logo-highlight">Puts</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="nav-links desktop-only">
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

        {/* Right Auth & Search */}
        <div className="nav-right">
          <button
            onClick={() => router.push("/search")}
            className="nav-search desktop-only"
          >
            <Search size={14} />
            <span className="nav-search-text">Search</span>
            <kbd className="nav-search-shortcut">⌘K</kbd>
          </button>

          <div className="nav-auth desktop-only">
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

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-links">
            <NavLink href="/" active={pathname === "/"}>Dashboard</NavLink>
            <NavLink href="/opportunities" active={pathname === "/opportunities"}>Opportunities</NavLink>
            <NavLink href="/events" active={pathname === "/events"}>Event Feed</NavLink>
            <NavLink href="/watchlist" active={pathname === "/watchlist"}>Watchlist</NavLink>
            <NavLink href="/popular" active={pathname === "/popular"}>Popular</NavLink>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/search");
              }}
              className="mobile-menu-search"
            >
              <Search size={14} />
              <span>Search</span>
            </button>
          </div>
          <div className="mobile-menu-auth">
            {userEmail ? (
              <>
                <Link href="/profile" className="mobile-menu-link">
                  Profile ({userName || userEmail})
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="mobile-menu-btn-action"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" className="mobile-menu-btn-action">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
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
