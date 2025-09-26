export type TrendDirection = "up" | "down" | "neutral";

export interface TrendDescriptor {
  trend: TrendDirection;
  trendLabel: string;
}

export function describeRelativeChange(
  current: number,
  previous: number,
  context: string,
): TrendDescriptor {
  if (previous === 0) {
    if (current === 0) {
      return {
        trend: "neutral",
        trendLabel: `Neschimbat față de ${context}`,
      };
    }
    return { trend: "up", trendLabel: `Creștere față de ${context}` };
  }

  const delta = current - previous;
  const ratio = delta / Math.abs(previous);
  if (!Number.isFinite(ratio) || Math.abs(ratio) < 0.0001) {
    return { trend: "neutral", trendLabel: `În linie cu ${context}` };
  }

  const percent = (ratio * 100).toFixed(1);
  const trend: TrendDirection = ratio > 0 ? "up" : ratio < 0 ? "down" : "neutral";
  const sign = ratio > 0 ? "+" : "";
  return { trend, trendLabel: `${sign}${percent}% față de ${context}` };
}
