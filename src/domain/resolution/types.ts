export type MatchType =
  | "exact_checksum"
  | "url_match"
  | "headline_fuzzy"
  | "manual_merge";

export interface ResolutionOptions {
  windowHours?: number; // Temporal window for matching (default: 24h)
  fuzzyThreshold?: number; // Minimum similarity score for fuzzy headline match (default: 0.75)
}

export interface MatchResult {
  matchedCanonicalId: string;
  matchType: MatchType;
  similarityScore: number;
  explanation: string;
}

export interface ClusterResolutionSummary {
  canonicalEventId: string;
  clusterId: string;
  isNewCanonical: boolean;
  matchType: MatchType;
  similarityScore: number;
  totalMembers: number;
}
