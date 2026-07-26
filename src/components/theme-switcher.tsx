"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";

export function ThemeSwitcher() {
  const router = useRouter();
  const [theme, setTheme] = useState<string>("dark");

  useEffect(() => {
    // Sync with the server-rendered HTML class
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  async function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <button 
      onClick={toggleTheme}
      className="nav-auth-btn flex items-center justify-center p-2 rounded-full"
      title="Toggle Theme"
      style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
