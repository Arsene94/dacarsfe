"use client";

import { useState, type FormEvent } from "react";
import { trackMetaEvent, setMetaEventId } from "@/lib/analytics/meta";
import { sha256Browser } from "@/lib/crypto/hash";

type LeadResult = {
  ok: boolean;
  status: number;
  meta: unknown;
  error?: string;
};

function generateEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const randomPart = Math.random().toString(16).slice(2, 10);
  return `${Date.now()}-${randomPart}`;
}

function toNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toServiceIds(value: string): string[] | undefined {
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return entries.length > 0 ? entries : undefined;
}

function cleanValue<T>(input: T): T {
  const cleaned = removeUndefined(input);
  return (cleaned === undefined ? (Array.isArray(input) ? ([] as unknown as T) : ({} as T)) : (cleaned as T));
}

function removeUndefined<T>(value: T): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const mapped = value
      .map((item) => removeUndefined(item))
      .filter((item): item is Exclude<typeof item, undefined> => typeof item !== "undefined");
    return mapped as unknown as T;
  }

  if (value && typeof value === "object") {
    if (value === null) {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (typeof raw === "undefined") {
        continue;
      }

      const cleaned = removeUndefined(raw);
      if (typeof cleaned === "undefined") {
        continue;
      }

      result[key] = cleaned;
    }

    return result as unknown as T;
  }

  return value;
}

async function hashEmail(value: string): Promise<string | undefined> {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return sha256Browser(trimmed);
}

async function hashPhone(value: string): Promise<string | undefined> {
  const digits = value.replace(/\D+/g, "");
  if (!digits) {
    return undefined;
  }

  return sha256Browser(digits);
}

const DEFAULT_CURRENCY = "EUR";

const ClientLeadButton = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [carId, setCarId] = useState("");
  const [carName, setCarName] = useState("");
  const [value, setValue] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [withDeposit, setWithDeposit] = useState(false);
  const [serviceIds, setServiceIds] = useState("");
  const [testEventCode, setTestEventCode] = useState("");
  const [leadId, setLeadId] = useState("");
  const [result, setResult] = useState<LeadResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const eventId = generateEventId();

    try {
      const [hashedEmail, hashedPhone] = await Promise.all([
        hashEmail(email),
        hashPhone(phone),
      ]);

      setMetaEventId(eventId);

      const totalAmount = toNumber(value);
      const services = toServiceIds(serviceIds);
      const pixelPayload = cleanValue({
        value: totalAmount,
        currency: DEFAULT_CURRENCY,
        content_ids: carId ? [carId] : undefined,
        content_name: carName || undefined,
        content_type: carId ? "product" : undefined,
        contents:
          carId || totalAmount
            ? [
                cleanValue({
                  id: carId || undefined,
                  quantity: 1,
                  item_price: totalAmount,
                  title: carName || undefined,
                }),
              ]
            : undefined,
        reservation_id: reservationId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        with_deposit: withDeposit,
        service_ids: services,
        em: hashedEmail,
        ph: hashedPhone,
      });

      trackMetaEvent("Lead", pixelPayload);

      const requestBody = cleanValue({
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: eventId,
        test_event_code: testEventCode || undefined,
        user_data: cleanValue({
          em: hashedEmail || undefined,
          ph: hashedPhone || undefined,
          lead_id: leadId || undefined,
          hashed: true,
        }),
        custom_data: cleanValue({
          event_source: "crm",
          lead_event_source: "DaCars",
          value: totalAmount,
          currency: DEFAULT_CURRENCY,
          content_ids: carId ? [carId] : undefined,
          content_name: carName || undefined,
          content_type: carId ? "product" : undefined,
          contents:
            carId || totalAmount
              ? [
                  cleanValue({
                    id: carId || undefined,
                    quantity: 1,
                    item_price: totalAmount,
                    title: carName || undefined,
                  }),
                ]
              : undefined,
          reservation_id: reservationId || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          with_deposit: withDeposit,
          service_ids: services,
        }),
      });

      const response = await fetch("/api/meta/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; meta?: unknown; error?: string };
      setResult({
        ok: Boolean(body.ok),
        status: response.status,
        meta: body.meta,
        error: body.error,
      });
    } catch (error) {
      setResult({
        ok: false,
        status: 500,
        meta: null,
        error: error instanceof Error ? error.message : "A apărut o eroare neașteptată",
      });
    } finally {
      setMetaEventId(null);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
              placeholder="client@example.com"
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Telefon
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
              placeholder="07xx xxx xxx"
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Lead ID (opțional)
            <input
              type="text"
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
              placeholder="ID numeric 15-17 cifre"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Test Event Code (opțional)
            <input
              type="text"
              value={testEventCode}
              onChange={(event) => setTestEventCode(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
              placeholder="TEST123"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Car ID
            <input
              type="text"
              value={carId}
              onChange={(event) => setCarId(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
              placeholder="DACARS-123"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Car Name
            <input
              type="text"
              value={carName}
              onChange={(event) => setCarName(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
              placeholder="Dacia Duster"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Valoare rezervare (EUR)
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
              placeholder="299"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Reservation ID
            <input
              type="text"
              value={reservationId}
              onChange={(event) => setReservationId(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
              placeholder="RES-001"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Data start
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Data final
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Servicii extra (CSV)
            <input
              type="text"
              value={serviceIds}
              onChange={(event) => setServiceIds(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-berkeley focus:outline-none focus:ring-2 focus:ring-berkeley/40"
              placeholder="gps,child-seat"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={withDeposit}
            onChange={(event) => setWithDeposit(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-berkeley focus:ring-berkeley"
          />
          Rezervare cu avans
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-berkeley px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-berkeley/90 disabled:cursor-not-allowed disabled:bg-berkeley/50"
          disabled={loading}
        >
          {loading ? "Se trimite..." : "Trimite Lead către Meta"}
        </button>
      </form>

      {result ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700">
            Status: <span className={result.ok ? "text-jade" : "text-red-600"}>{result.ok ? "Succes" : "Eșec"}</span> (HTTP {result.status})
          </p>
          {result.error ? (
            <p className="mt-2 text-sm text-red-600">{result.error}</p>
          ) : null}
          <pre className="mt-4 max-h-64 overflow-auto rounded bg-gray-900 p-4 text-xs text-gray-100">
            {JSON.stringify(result.meta, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
};

export default ClientLeadButton;
