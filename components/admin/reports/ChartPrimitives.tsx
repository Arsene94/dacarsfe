"use client";

import dynamic from "next/dynamic";

type ChartModule = typeof import("react-chartjs-2");

const ChartPlaceholder = ({ message }: { message: string }) => (
  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
    {message}
  </div>
);

const ChartLoading = () => (
  <div className="flex h-full items-center justify-center text-sm text-slate-500">
    Se încarcă vizualizarea grafică...
  </div>
);

const ChartUnavailable = (_props: Record<string, unknown>) => (
  <ChartPlaceholder message="Nu am putut încărca vizualizarea grafică." />
);
ChartUnavailable.displayName = "ChartUnavailable";

const loadChartModule = async (): Promise<ChartModule | null> => {
  try {
    return await import("react-chartjs-2");
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Nu s-a putut încărca react-chartjs-2", error);
    }
    return null;
  }
};

const loadBarChart = async () => {
  const chartModule = await loadChartModule();
  return (chartModule?.Bar ?? (ChartUnavailable as unknown)) as ChartModule["Bar"];
};

const loadLineChart = async () => {
  const chartModule = await loadChartModule();
  return (chartModule?.Line ?? (ChartUnavailable as unknown)) as ChartModule["Line"];
};

const loadDoughnutChart = async () => {
  const chartModule = await loadChartModule();
  return (chartModule?.Doughnut ?? (ChartUnavailable as unknown)) as ChartModule["Doughnut"];
};

const loadRadarChart = async () => {
  const chartModule = await loadChartModule();
  return (chartModule?.Radar ?? (ChartUnavailable as unknown)) as ChartModule["Radar"];
};

export const BarChart = dynamic(loadBarChart, {
  ssr: false,
  loading: ChartLoading,
}) as ChartModule["Bar"];
export const LineChart = dynamic(loadLineChart, {
  ssr: false,
  loading: ChartLoading,
}) as ChartModule["Line"];
export const DoughnutChart = dynamic(loadDoughnutChart, {
  ssr: false,
  loading: ChartLoading,
}) as ChartModule["Doughnut"];
export const RadarChart = dynamic(loadRadarChart, {
  ssr: false,
  loading: ChartLoading,
}) as ChartModule["Radar"];
