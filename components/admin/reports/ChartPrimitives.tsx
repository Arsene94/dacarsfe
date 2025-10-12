"use client";

import type { ReactNode } from "react";
import {
  Bar as RechartsBar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  Pie as RechartsPie,
  PieChart,
  Radar as RechartsRadar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Cell,
} from "recharts";

export type DataRecord = Record<string, string | number>;

type ValueFormatter = (value: number, name: string, payload?: DataRecord) => string;
type LabelFormatter = (label: string | number) => string;
type TickFormatter = (value: number | string) => string;

type LegendAlign = "left" | "center" | "right";

const defaultNumberFormatter = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 2,
});

const defaultValueFormatter: ValueFormatter = (value, name) =>
  `${name}: ${defaultNumberFormatter.format(value)}`;

const defaultLabelFormatter: LabelFormatter = (label) => String(label);

interface BaseCartesianProps {
  data: DataRecord[];
  xKey: string;
  yTickFormatter?: TickFormatter;
  xTickFormatter?: TickFormatter;
  valueFormatter?: ValueFormatter;
  labelFormatter?: LabelFormatter;
  legendAlign?: LegendAlign;
  hideGrid?: boolean;
  hideLegend?: boolean;
}

export interface BarSeries {
  dataKey: string;
  name: string;
  color: string;
  radius?: number | [number, number, number, number];
  stackId?: string;
}

export interface SimpleBarChartProps extends BaseCartesianProps {
  series: BarSeries[];
  layout?: "horizontal" | "vertical";
  barCategoryGap?: number | string;
  barGap?: number;
}

export function SimpleBarChart({
  data,
  xKey,
  series,
  layout = "horizontal",
  yTickFormatter,
  xTickFormatter,
  valueFormatter = defaultValueFormatter,
  labelFormatter = defaultLabelFormatter,
  legendAlign = "center",
  hideGrid = false,
  hideLegend = false,
  barCategoryGap = "20%",
  barGap = 8,
}: SimpleBarChartProps) {
  const isHorizontal = layout === "horizontal";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={data}
        layout={layout}
        barCategoryGap={barCategoryGap}
        barGap={barGap}
      >
        {!hideGrid ? (
          <CartesianGrid
            stroke="#E2E8F0"
            strokeDasharray="4 4"
            vertical={isHorizontal}
            horizontal={true}
          />
        ) : null}
        {isHorizontal ? (
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#1A3661", fontSize: 12 }}
            tickFormatter={xTickFormatter}
          />
        ) : (
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#475569", fontSize: 12 }}
            tickFormatter={yTickFormatter as TickFormatter}
          />
        )}
        {isHorizontal ? (
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#475569", fontSize: 12 }}
            tickFormatter={yTickFormatter}
          />
        ) : (
          <YAxis
            type="category"
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#1A3661", fontSize: 12 }}
            tickFormatter={xTickFormatter}
            width={120}
          />
        )}
        <Tooltip
          cursor={{ fill: "rgba(79, 111, 164, 0.08)" }}
          formatter={(value, name, props) =>
            valueFormatter(Number(value), String(name), props?.payload as DataRecord)
          }
          labelFormatter={labelFormatter}
        />
        {!hideLegend ? <Legend align={legendAlign} verticalAlign="bottom" /> : null}
        {series.map((serie) => (
          <RechartsBar
            key={serie.dataKey}
            dataKey={serie.dataKey}
            name={serie.name}
            fill={serie.color}
            radius={serie.radius ?? 8}
            stackId={serie.stackId}
            maxBarSize={38}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

export interface LineSeries {
  dataKey: string;
  name: string;
  color: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  dot?: boolean;
  fillOpacity?: number;
}

export interface LineChartProps extends BaseCartesianProps {
  series: LineSeries[];
}

export function LineChart({
  data,
  xKey,
  series,
  yTickFormatter,
  xTickFormatter,
  valueFormatter = defaultValueFormatter,
  labelFormatter = defaultLabelFormatter,
  legendAlign = "center",
  hideGrid = false,
  hideLegend = false,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data}>
        {!hideGrid ? (
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
        ) : null}
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#1A3661", fontSize: 12 }}
          tickFormatter={xTickFormatter}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#475569", fontSize: 12 }}
          tickFormatter={yTickFormatter}
        />
        <Tooltip
          cursor={{ stroke: "#CBD5F5", strokeWidth: 2, strokeDasharray: "4 4" }}
          formatter={(value, name, props) =>
            valueFormatter(Number(value), String(name), props?.payload as DataRecord)
          }
          labelFormatter={labelFormatter}
        />
        {!hideLegend ? <Legend align={legendAlign} verticalAlign="bottom" /> : null}
        {series.map((serie) => (
          <RechartsLine
            key={serie.dataKey}
            type="monotone"
            dataKey={serie.dataKey}
            name={serie.name}
            stroke={serie.color}
            strokeWidth={serie.strokeWidth ?? 3}
            strokeDasharray={serie.strokeDasharray}
            dot={
              serie.dot === false
                ? false
                : { r: 4, fill: serie.color, strokeWidth: 2, stroke: "#ffffff" }
            }
            activeDot={{ r: 6 }}
            fillOpacity={serie.fillOpacity ?? 0}
            fill={serie.fillOpacity ? serie.color : undefined}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

export interface DoughnutSlice {
  name: string;
  value: number;
  color: string;
  payload?: DataRecord;
}

export interface DoughnutChartProps {
  data: DoughnutSlice[];
  valueFormatter?: ValueFormatter;
  labelFormatter?: LabelFormatter;
  legendAlign?: LegendAlign;
  innerRadius?: string | number;
  outerRadius?: string | number;
  hideLegend?: boolean;
}

export function DoughnutChart({
  data,
  valueFormatter = defaultValueFormatter,
  labelFormatter = defaultLabelFormatter,
  legendAlign = "center",
  innerRadius = "55%",
  outerRadius = "85%",
  hideLegend = false,
}: DoughnutChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip
          formatter={(value, name, props) =>
            valueFormatter(Number(value), String(name), props?.payload as DataRecord)
          }
          labelFormatter={labelFormatter}
        />
        {!hideLegend ? <Legend align={legendAlign} verticalAlign="bottom" /> : null}
        <RechartsPie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={4}
        >
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} stroke="#ffffff" strokeWidth={2} />
          ))}
        </RechartsPie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export interface RadarSeries {
  dataKey: string;
  name: string;
  color: string;
  fillOpacity?: number;
}

export interface RadarChartProps {
  data: DataRecord[];
  angleKey: string;
  series: RadarSeries[];
  domain?: [number, number];
  tickFormatter?: TickFormatter;
  valueFormatter?: ValueFormatter;
  legendAlign?: LegendAlign;
  hideLegend?: boolean;
}

export function RadarChart({
  data,
  angleKey,
  series,
  domain = [0, 100],
  tickFormatter,
  valueFormatter = defaultValueFormatter,
  legendAlign = "center",
  hideLegend = false,
}: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsRadarChart data={data} outerRadius="80%">
        <PolarGrid stroke="#CBD5F5" />
        <PolarAngleAxis
          dataKey={angleKey}
          tick={{ fill: "#1A3661", fontSize: 12 }}
        />
        <PolarRadiusAxis
          tick={{ fill: "#475569", fontSize: 12 }}
          tickFormatter={tickFormatter}
          domain={domain}
        />
        <Tooltip
          formatter={(value, name, props) =>
            valueFormatter(Number(value), String(name), props?.payload as DataRecord)
          }
        />
        {!hideLegend ? <Legend align={legendAlign} verticalAlign="bottom" /> : null}
        {series.map((serie) => (
          <RechartsRadar
            key={serie.dataKey}
            dataKey={serie.dataKey}
            name={serie.name}
            stroke={serie.color}
            fill={serie.color}
            fillOpacity={serie.fillOpacity ?? 0.35}
          />
        ))}
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}

export interface ChartPlaceholderProps {
  message: ReactNode;
}

export function ChartPlaceholder({ message }: ChartPlaceholderProps) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
      {message}
    </div>
  );
}
