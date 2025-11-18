"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import type { Column } from "@/types/ui";
import type {
  AdminReportMonthlyCarUsageCar,
  AdminReportMonthlyCarUsageResponse,
} from "@/types/reports";
import {
  ReportSection,
  StatGrid,
  MetricCard,
  InsightList,
} from "@/components/admin/reports/ReportElements";
import {
  formatCurrency,
  formatSecondaryCurrencyFootnote,
} from "@/components/admin/reports/formatting";

const DEFAULT_TIMEZONE = "Europe/Bucharest";

const timezoneOptions = [
  { value: "Europe/Bucharest", label: "București (GMT+2)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1)" },
  { value: "Europe/London", label: "Londra (GMT+0)" },
  { value: "UTC", label: "UTC" },
];

const buildDefaultMonth = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

type QueryState = {
  month: string;
  timezone: string;
  carId: string;
};

const buildQueryString = (query: QueryState) => {
  const searchParams = new URLSearchParams();
  if (query.month) {
    searchParams.set("month", query.month);
  }
  if (query.carId && query.carId !== "all") {
    searchParams.set("car_id", query.carId);
  }
  if (query.timezone && query.timezone !== DEFAULT_TIMEZONE) {
    searchParams.set("timezone", query.timezone);
  }
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
};

export default function AdminMonthlyCarUsageReportPage() {
  const defaultMonthRef = useRef(buildDefaultMonth());
  const [query, setQuery] = useState<QueryState>(() => ({
    month: defaultMonthRef.current,
    timezone: DEFAULT_TIMEZONE,
    carId: "all",
  }));
  const [formMonth, setFormMonth] = useState(defaultMonthRef.current);
  const [formTimezone, setFormTimezone] = useState(DEFAULT_TIMEZONE);
  const [formCarId, setFormCarId] = useState("all");
  const [data, setData] = useState<AdminReportMonthlyCarUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carCatalog, setCarCatalog] = useState<AdminReportMonthlyCarUsageCar[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reports/monthly/cars${buildQueryString(query)}`);
      const payload = (await response.json()) as
        | AdminReportMonthlyCarUsageResponse
        | { error?: string };
      if (!response.ok || "error" in payload) {
        throw new Error(
          (payload as { error?: string })?.error ||
            "Nu am putut încărca raportul de utilizare pe mașini.",
        );
      }
      setData(payload as AdminReportMonthlyCarUsageResponse);
      setCarCatalog((prev) => {
        const map = new Map<number, AdminReportMonthlyCarUsageCar>();
        prev.forEach((car) => map.set(car.car_id, car));
        (payload as AdminReportMonthlyCarUsageResponse).cars.forEach((car) => {
          map.set(car.car_id, car);
        });
        return Array.from(map.values()).sort((a, b) =>
          a.car_name.localeCompare(b.car_name, "ro"),
        );
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut încărca raportul de utilizare pe mașini.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setQuery({
        month: formMonth,
        timezone: formTimezone,
        carId: formCarId,
      });
    },
    [formCarId, formMonth, formTimezone],
  );

  const handleReset = useCallback(() => {
    setFormMonth(defaultMonthRef.current);
    setFormTimezone(DEFAULT_TIMEZONE);
    setFormCarId("all");
    setQuery({
      month: defaultMonthRef.current,
      timezone: DEFAULT_TIMEZONE,
      carId: "all",
    });
  }, []);

  const availableCars = carCatalog.length > 0 ? carCatalog : data?.cars ?? [];
  const selectedCar =
    query.carId !== "all"
      ? availableCars.find((car) => String(car.car_id) === query.carId)
      : null;
  const bookingsCount = useMemo(
    () => data?.cars.reduce((total, car) => total + car.bookings_count, 0) ?? 0,
    [data?.cars],
  );
  const bestUtilizationCar = useMemo(() => {
    if (!data?.cars.length) {
      return null;
    }
    return data.cars.reduce((best, car) =>
      car.days_rented > best.days_rented ? car : best,
    );
  }, [data?.cars]);
  const topRevenueCar = useMemo(() => {
    if (!data?.cars.length) {
      return null;
    }
    return data.cars.reduce((best, car) =>
      car.total_revenue > best.total_revenue ? car : best,
    );
  }, [data?.cars]);

  const columns = useMemo<Column<AdminReportMonthlyCarUsageCar>[]>(
    () => [
      {
        id: "car",
        header: "Mașină",
        accessor: (row) => row.car_name,
        cell: (row) => (
          <div className="space-y-1">
            <p className="font-semibold text-berkeley">{row.car_name}</p>
            <p className="text-xs text-slate-500">{row.license_plate}</p>
          </div>
        ),
      },
      {
        id: "days",
        header: "Zile închiriate",
        accessor: (row) => row.days_rented,
        cell: (row) => (
          <span className="font-medium text-slate-800">{row.days_rented}</span>
        ),
      },
      {
        id: "bookings",
        header: "Rezervări",
        accessor: (row) => row.bookings_count,
        cellClassName: "text-right",
        headerClassName: "text-right",
        cell: (row) => (
          <span className="font-medium text-slate-800">{row.bookings_count}</span>
        ),
      },
      {
        id: "revenue",
        header: "Venit facturat",
        accessor: (row) => row.total_revenue,
        headerClassName: "text-right",
        cellClassName: "text-right",
        cell: (row) => (
          <div className="space-y-1">
            <p className="font-semibold text-berkeley">
              {formatCurrency(row.total_revenue, data?.currency)}
            </p>
            <p className="text-xs text-slate-500">
              {formatSecondaryCurrencyFootnote(
                row.total_revenue_ron,
                data?.currency_secondary,
              )}
            </p>
          </div>
        ),
      },
      {
        id: "adr",
        header: "ADR",
        accessor: (row) => row.average_daily_rate,
        headerClassName: "text-right",
        cellClassName: "text-right",
        cell: (row) => (
          <div className="space-y-1">
            <p className="font-semibold text-berkeley">
              {formatCurrency(row.average_daily_rate, data?.currency)}
            </p>
            <p className="text-xs text-slate-500">
              {formatSecondaryCurrencyFootnote(
                row.average_daily_rate_ron,
                data?.currency_secondary,
              )}
            </p>
          </div>
        ),
      },
    ],
    [data?.currency, data?.currency_secondary],
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-jade">
          Rapoarte lunare
        </p>
        <h1 className="text-3xl font-semibold text-berkeley">
          Utilizare flotă pe fiecare mașină
        </h1>
        <p className="text-sm text-slate-600">
          Analizează câte zile a lucrat fiecare vehicul, câte rezervări a generat și
          care este ADR-ul aferent perioadei selectate.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="month">
              Luna analizată
            </label>
            <Input
              id="month"
              type="month"
              value={formMonth}
              onChange={(event) => setFormMonth(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="timezone">
              Fus orar
            </label>
            <Select
              id="timezone"
              value={formTimezone}
              onChange={(event) => setFormTimezone(event.target.value)}
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="car">
              Mașină
            </label>
            <Select
              id="car"
              value={formCarId}
              onChange={(event) => setFormCarId(event.target.value)}
            >
              <option value="all">Toată flota</option>
              {availableCars.map((car) => (
                <option key={car.car_id} value={car.car_id}>
                  {car.car_name} ({car.license_plate})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <Button type="submit" className="w-full bg-jade text-white" disabled={loading}>
              Aplică filtrele
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Resetează
            </Button>
          </div>
        </form>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Se încarcă raportul pentru luna selectată...
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <StatGrid>
            <MetricCard
              title="Zile facturate"
              value={data.summary.total_days_rented.toLocaleString("ro-RO")}
              subtitle={`Perioada ${data.period.label}`}
            />
            <MetricCard
              title="Venit total"
              value={formatCurrency(data.summary.total_revenue.eur, data.currency)}
              subtitle="Include toate canalele"
              footer={formatSecondaryCurrencyFootnote(
                data.summary.total_revenue.ron,
                data.currency_secondary,
              )}
            />
            <MetricCard
              title="ADR"
              value={formatCurrency(
                data.summary.average_daily_rate.eur,
                data.currency,
              )}
              subtitle="Tarif mediu per zi"
              footer={formatSecondaryCurrencyFootnote(
                data.summary.average_daily_rate.ron,
                data.currency_secondary,
              )}
            />
            <MetricCard
              title="Rezervări facturate"
              value={bookingsCount.toLocaleString("ro-RO")}
              subtitle="Ordonate după mașină"
            />
          </StatGrid>

          <ReportSection
            title="Contextul ferestrei analizate"
            description={`Filtru curent: ${
              selectedCar
                ? `${selectedCar.car_name} (${selectedCar.license_plate})`
                : "toată flota"
            } · Fus orar ${
              timezoneOptions.find((option) => option.value === query.timezone)?.label ||
              query.timezone
            }`}
          >
            <p>
              Rapoartele sunt calculate pentru luna {data.period.label}. Utilizează filtrul de mai sus
              pentru a urmări un singur vehicul și compară ADR-ul său cu media flotei prin KPI-urile
              expuse în carduri.
            </p>
            <p className="text-sm text-slate-600">
              Valorile în RON sunt generate automat din EUR folosind cursul fix 1 EUR = 5 RON, pentru a
              alinia raportarea financiară la standardele interne DaCars.
            </p>
          </ReportSection>

          <ReportSection
            title="Performanță detaliată pe mașină"
            description="Folosește tabelul pentru a identifica rapid mașinile cu grad mare de utilizare."
          >
            <DataTable
              data={data.cars}
              columns={columns}
              pageSize={8}
            />
          </ReportSection>

          <ReportSection
            title="Recomandări operaționale"
            description="Sugestii bazate pe comportamentul din luna curentă."
          >
            <InsightList
              icon={<Target className="h-4 w-4" />}
              items={[
                selectedCar
                  ? `Monitorizează variația ADR pentru ${selectedCar.car_name} față de media flotei (${formatCurrency(
                      data.summary.average_daily_rate.eur,
                      data.currency,
                    )}).`
                  : "Concentrează campaniile promoționale pe mașinile cu cele mai multe zile închiriate.",
                bestUtilizationCar
                  ? `${bestUtilizationCar.car_name} a acumulat ${bestUtilizationCar.days_rented} zile. Planifică mentenanța imediat ce disponibilitatea scade sub 10 zile.`
                  : "Actualizează periodic ferestrele de mentenanță în funcție de zilele facturate.",
                topRevenueCar
                  ? `${topRevenueCar.car_name} a generat ${formatCurrency(
                      topRevenueCar.total_revenue,
                      data.currency,
                    )}. Propune pachete corporate dedicate pentru a replica succesul.`
                  : "Folosește filtrul pe mașini pentru a identifica oportunitățile de upsell.",
              ]}
            />
          </ReportSection>
        </div>
      ) : null}
    </div>
  );
}
