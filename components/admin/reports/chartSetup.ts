export const REPORT_COLORS = {
  primary: "#1A3661",
  primaryLight: "#4F6FA4",
  accent: "#206442",
  accentLight: "#38B275",
  warning: "#F59E0B",
  info: "#0EA5E9",
  neutral: "#64748B",
};

export type ChartColorKey = keyof typeof REPORT_COLORS;

export const getColor = (key: ChartColorKey): string => REPORT_COLORS[key];
