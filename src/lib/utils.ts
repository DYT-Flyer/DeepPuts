import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCatalyst(isoDate: string): { label: string; urgent: boolean } | null {
  const diff = new Date(isoDate).getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return { label: "catalyst today", urgent: true };
  if (days > 0 && days <= 30) return { label: `in ${days}d`, urgent: days <= 7 };
  if (days < 0 && days >= -30) return { label: `${Math.abs(days)}d ago`, urgent: false };
  return null;
}

export function getDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch (e) {
    return null;
  }
}

export function formatAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}
