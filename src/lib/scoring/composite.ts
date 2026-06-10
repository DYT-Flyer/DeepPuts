interface ScoringInputs {
  convictionScore: number;
  confidenceLabel?: string | null;
  sourceQuality?: string | null;
  severity?: string | null;
  noveltyScore?: number | null;
  voteScore: number;
  commentCount: number;
  ageHours: number;
  priceChangePct?: number | null;
}

export interface CompositeScore {
  total: number;
  breakdown: Record<string, number>;
}

export function computeCompositeScore(inputs: ScoringInputs): CompositeScore {
  // AI component — 40 pts max
  const confidenceMultiplier = ({
    high: 1.0, medium: 0.85, low: 0.65, speculative: 0.45,
  } as Record<string, number>)[inputs.confidenceLabel ?? ""] ?? 0.85;
  const aiComponent = Math.round((inputs.convictionScore / 10) * 40 * confidenceMultiplier);

  // Source quality — 15 pts max
  const sourcePoints = ({ primary: 15, secondary: 9, aggregated: 5 } as Record<string, number>)[inputs.sourceQuality ?? ""] ?? 9;
  const severityMult = ({ critical: 1.0, high: 0.85, medium: 0.65, low: 0.45 } as Record<string, number>)[inputs.severity ?? ""] ?? 0.65;
  const qualityComponent = Math.round(sourcePoints * severityMult);

  // Community — 20 pts max, log-scaled
  const votePoints = inputs.voteScore > 0
    ? Math.min(12, Math.round(Math.log(inputs.voteScore + 1) * 5))
    : inputs.voteScore < 0
    ? Math.max(-6, Math.round(Math.log(Math.abs(inputs.voteScore) + 1) * -3))
    : 0;
  const commentPoints = Math.min(8, Math.round(Math.log(inputs.commentCount + 1) * 3));
  const communityComponent = Math.max(0, votePoints + commentPoints);

  // Recency — 15 pts max
  const recencyComponent =
    inputs.ageHours < 6   ? 15 :
    inputs.ageHours < 24  ? 12 :
    inputs.ageHours < 72  ? 8  :
    inputs.ageHours < 168 ? 4  : 1;

  // Performance — 10 pts max, neutral if no data
  let performanceComponent = 5;
  if (inputs.priceChangePct !== null && inputs.priceChangePct !== undefined) {
    if      (inputs.priceChangePct < -15) performanceComponent = 10;
    else if (inputs.priceChangePct < -5)  performanceComponent = 8;
    else if (inputs.priceChangePct < 0)   performanceComponent = 6;
    else if (inputs.priceChangePct < 5)   performanceComponent = 4;
    else                                   performanceComponent = 1;
  }

  const total = Math.min(100, aiComponent + qualityComponent + communityComponent + recencyComponent + performanceComponent);

  return {
    total,
    breakdown: {
      "AI Conviction":   aiComponent,
      "Source Quality":  qualityComponent,
      "Community":       communityComponent,
      "Recency":         recencyComponent,
      "Performance":     performanceComponent,
    },
  };
}
