"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ReportSection({
  title,
  description,
  children,
  className,
}: ReportSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg",
        "animate-fade-in",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-berkeley">{title}</h2>
        {description ? (
          <p className="text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4 text-sm text-[#191919]">{children}</div>
    </section>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trendLabel?: string;
  trend?: "up" | "down" | "neutral";
  footer?: ReactNode;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trendLabel,
  trend = "neutral",
  footer,
}: MetricCardProps) {
  const trendIcon =
    trend === "up" ? (
      <ArrowUpRight className="h-4 w-4" />
    ) : trend === "down" ? (
      <ArrowDownRight className="h-4 w-4" />
    ) : (
      <Minus className="h-4 w-4" />
    );
  const trendClasses =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-red-600"
        : "text-slate-500";

  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className="font-poppins text-3xl font-semibold text-berkeley">{value}</p>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {trendLabel ? (
        <div className={cn("flex items-center gap-2 text-sm font-medium", trendClasses)}>
          {trendIcon}
          <span>{trendLabel}</span>
        </div>
      ) : null}
      {footer ? <div className="text-xs text-slate-500">{footer}</div> : null}
    </div>
  );
}

export function InsightList({
  items,
  icon,
}: {
  items: readonly string[];
  icon?: ReactNode;
}) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <ul className="list-inside space-y-2 text-sm text-slate-700">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          {icon ? <span className="mt-0.5 text-emerald-600">{icon}</span> : null}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function ChartContainer({
  children,
  heightClass = "h-72",
}: {
  children: ReactNode;
  heightClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className={cn("w-full", heightClass)}>{children}</div>
    </div>
  );
}
