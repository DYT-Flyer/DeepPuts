"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Props {
  userEmail?: string | null;
}

export function Nav({ userEmail }: Props) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="text-sm font-bold text-red-400 font-mono tracking-tight">
          DEEP<span className="text-zinc-300">PUTS</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-4">
          <NavLink href="/" active={pathname === "/"}>
            Opportunities
          </NavLink>
          <NavLink href="/events" active={pathname === "/events"}>
            Event Feed
          </NavLink>
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-3">
          {userEmail && (
            <span className="text-xs text-zinc-600 hidden sm:block">{userEmail}</span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm transition-colors",
        active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {children}
    </Link>
  );
}
