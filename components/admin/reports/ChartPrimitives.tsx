"use client";

import dynamic from "next/dynamic";

const loadModule = async () => import("react-chartjs-2");

export const BarChart = dynamic(async () => (await loadModule()).Bar, {
  ssr: false,
}) as typeof import("react-chartjs-2").Bar;

export const LineChart = dynamic(async () => (await loadModule()).Line, {
  ssr: false,
}) as typeof import("react-chartjs-2").Line;

export const DoughnutChart = dynamic(
  async () => (await loadModule()).Doughnut,
  { ssr: false },
) as typeof import("react-chartjs-2").Doughnut;

export const RadarChart = dynamic(async () => (await loadModule()).Radar, {
  ssr: false,
}) as typeof import("react-chartjs-2").Radar;
