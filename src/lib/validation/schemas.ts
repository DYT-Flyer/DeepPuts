import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  name: z.string().min(1, "Name is required").max(64).trim(),
});

export const ProfileUpdateSchema = z.object({
  name: z.string().max(64).trim().nullable().optional(),
});

// ─── Voting ───────────────────────────────────────────────────────────────────

export const VoteSchema = z.object({
  analysisId: z.string().cuid("Invalid analysis ID"),
  value: z.union([z.literal(1), z.literal(-1)]),
});

// ─── Comments ────────────────────────────────────────────────────────────────

export const CommentCreateSchema = z.object({
  analysisId: z.string().cuid("Invalid analysis ID"),
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be under 1000 characters")
    .trim(),
  parentId: z.string().cuid("Invalid parent ID").optional(),
});

// ─── Watchlist ────────────────────────────────────────────────────────────────

export const WatchlistToggleSchema = z.object({
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(12, "Symbol too long")
    .trim()
    .toUpperCase(),
});

// ─── Saved Filters ────────────────────────────────────────────────────────────

export const SavedFilterSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  filters: z.object({
    signalType: z.string().optional(),
    sector: z.string().optional(),
    minScore: z.number().int().min(1).max(10).optional(),
    assetClass: z.string().optional(),
    sortBy: z.string().optional(),
  }),
});

// ─── Moderation ───────────────────────────────────────────────────────────────

export const ModerationFlagSchema = z.object({
  commentId: z.string().cuid("Invalid comment ID"),
  reason: z.enum(["spam", "misleading", "offensive", "manipulation"]),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type VoteInput = z.infer<typeof VoteSchema>;
export type CommentCreateInput = z.infer<typeof CommentCreateSchema>;
export type WatchlistToggleInput = z.infer<typeof WatchlistToggleSchema>;
