import { formatPercent } from "@/components/admin/reports/formatters";

export const getDeltaTone = (ratio: number): string =>
  ratio >= 0 ? "bg-jade/10 text-jade" : "bg-red-100 text-red-700";

export const getDeltaLabel = (ratio: number): string =>
  (ratio >= 0 ? "+" : "−") + formatPercent(Math.abs(ratio));
