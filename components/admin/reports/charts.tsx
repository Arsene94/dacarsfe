import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LegendItem = {
  label: string;
  colorClass: string;
  description?: string;
};

export type TrendValue = {
  label: string;
  current: number;
  previous?: number;
};

export interface TrendBarChartProps {
  title: string;
  description?: ReactNode;
  data: readonly TrendValue[];
  legend: readonly LegendItem[];
  formatter?: (value: number) => string;
}

const getMaxValue = (values: readonly TrendValue[]): number => {
  const maxCandidate = values.reduce((acc, item) => {
    const base = Math.max(item.current, item.previous ?? 0);
    return Math.max(acc, base);
  }, 0);
  return maxCandidate === 0 ? 1 : maxCandidate;
};

const computeHeight = (value: number, max: number): string => {
  if (value <= 0) {
    return "4px";
  }
  const height = Math.round((value / max) * 100);
  return `${Math.max(4, height)}%`;
};

export function ChartLegend({ items }: { readonly items: readonly LegendItem[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className={cn("h-3 w-3 rounded-sm border border-slate-200", item.colorClass)}
            aria-hidden
          />
          <div>
            <p className="font-medium text-slate-700">{item.label}</p>
            {item.description ? (
              <p className="text-xs text-slate-500">{item.description}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendBarChart({
  title,
  description,
  data,
  legend,
  formatter,
}: TrendBarChartProps) {
  const maxValue = getMaxValue(data);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      <ChartLegend items={legend} />
      <div className="mt-8 flex h-64 items-end gap-6">
        {data.map((entry) => (
          <div key={entry.label} className="flex-1">
            <div className="flex h-56 items-end justify-center gap-2">
              {entry.previous != null ? (
                <div
                  className="w-6 rounded-t-lg bg-berkeley/60"
                  style={{ height: computeHeight(entry.previous, maxValue) }}
                  aria-hidden
                />
              ) : null}
              <div
                className="w-6 rounded-t-lg bg-jade"
                style={{ height: computeHeight(entry.current, maxValue) }}
                aria-hidden
              />
            </div>
            <div className="mt-3 text-center text-sm font-medium text-slate-700">
              {entry.label}
            </div>
            <div className="mt-1 text-center text-xs text-slate-500">
              {formatter ? formatter(entry.current) : entry.current.toLocaleString("ro-RO")}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
