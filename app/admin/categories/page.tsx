"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, Plus } from "lucide-react";
import apiClient from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import type { ApiItemResult } from "@/types/api";
import {
  AdminCategory,
  CategoryPrice,
  CategoryPriceCalendar,
  CategoryPriceCalendarMonthKey,
} from "@/types/admin";

type PricePeriodForm = Omit<CategoryPrice, "price_calendar"> & { tempId: string };

const generateTempId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `temp-${Math.random().toString(36).slice(2)}`;
};

const sortPeriods = (periods: PricePeriodForm[]) =>
  [...periods].sort((a, b) => {
    if (a.days === b.days) {
      return a.days_end - b.days_end;
    }
    return a.days - b.days;
  });

const calculateNextStart = (periods: PricePeriodForm[]) => {
  if (!periods.length) return 1;
  const maxEnd = periods.reduce(
    (acc, period) => Math.max(acc, clampDay(period.days_end)),
    0
  );
  const nextStart = maxEnd + 1;
  if (nextStart > 90) {
    return 90;
  }
  return nextStart;
};

const buildRange = (min: number, max: number) => {
  if (min > max) {
    return [min];
  }
  return Array.from({ length: max - min + 1 }, (_, idx) => min + idx);
};

const clampDay = (value: number) => Math.max(1, Math.min(value, 90));

const uniqueSorted = (values: number[]) =>
  Array.from(new Set(values)).sort((a, b) => a - b);

const MONTH_KEYS: CategoryPriceCalendarMonthKey[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const MONTH_LABELS = MONTH_KEYS.map((key) => key.toUpperCase());

const DISCOUNT_OPTIONS = Array.from({ length: 41 }, (_, idx) => -100 + idx * 5);

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [pricePeriods, setPricePeriods] = useState<PricePeriodForm[]>([]);
  const [periodStart, setPeriodStart] = useState(1);
  const [periodEnd, setPeriodEnd] = useState(1);
  const [periodPrice, setPeriodPrice] = useState("");
  const [discounts, setDiscounts] = useState<number[]>(
    Array(MONTH_KEYS.length).fill(0)
  );
  const [priceCalendarId, setPriceCalendarId] = useState<number | null>(null);
  const [removedPriceIds, setRemovedPriceIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.getCategories();
        setCategories(extractList(res));
      } catch (error) {
        console.error("Failed to load categories", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const nextStart = calculateNextStart(pricePeriods);
    const boundedStart = Math.max(1, Math.min(nextStart, 90));
    setPeriodStart(boundedStart);
    setPeriodEnd(boundedStart);
  }, [pricePeriods]);

  const openAddModal = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setPricePeriods([]);
    setPeriodStart(1);
    setPeriodEnd(1);
    setPeriodPrice("");
    setDiscounts(Array(MONTH_KEYS.length).fill(0));
    setPriceCalendarId(null);
    setRemovedPriceIds([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setPriceCalendarId(null);
    setRemovedPriceIds([]);
  };

  const openEditModal = (category: AdminCategory) => {
    setEditing(category);
    setForm({ name: category.name, description: category.description ?? "" });
    setPricePeriods([]);
    setPeriodStart(1);
    setPeriodEnd(1);
    setPeriodPrice("");
    setDiscounts(Array(MONTH_KEYS.length).fill(0));
    setPriceCalendarId(null);
    setRemovedPriceIds([]);
    apiClient
      .getCategoryPrices(category.id)
      .then(({ prices, priceCalendar }) => {
        const sorted = sortPeriods(
          prices.map((price) => ({
            ...price,
            price: price.price ?? "",
            tempId: price.tempId ?? (price.id ? `existing-${price.id}` : generateTempId()),
          }))
        );
        setPricePeriods(sorted);
        setPriceCalendarId(priceCalendar?.id ?? null);
        if (priceCalendar) {
          setDiscounts(
            MONTH_KEYS.map((key) => Number(priceCalendar[key] ?? 0))
          );
        } else {
          setDiscounts(Array(MONTH_KEYS.length).fill(0));
        }
      })
      .catch((err) => console.error("Failed to load prices", err));
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete category", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editing) {
        const res = await apiClient.updateCategory(editing.id, form);
        const updated =
          extractItem(res as ApiItemResult<AdminCategory>) ?? editing;
        setCategories((prev) =>
          prev.map((c) => (c.id === editing.id ? updated : c))
        );
        await savePrices(editing.id);
      } else {
        const res = await apiClient.createCategory(form);
        const rawCreated = extractItem(res as ApiItemResult<AdminCategory>);
        if (!rawCreated) {
          throw new Error("Categoria creată nu a fost returnată de API.");
        }
        const newId =
          typeof rawCreated?.id === "number"
            ? rawCreated.id
            : Number(rawCreated?.id);

        if (!Number.isFinite(newId)) {
          throw new Error("Categoria creată nu a returnat un ID valid");
        }

        const created: AdminCategory = {
          ...rawCreated,
          id: Number(newId),
        };

        setCategories((prev) => [...prev, created]);
        await savePrices(Number(newId));
      }
      closeModal();
    } catch (error) {
      console.error("Failed to save category", error);
    } finally {
      setIsSaving(false);
    }
  };

  const savePriceCalendar = async (categoryId: number) => {
    const hasDiscounts = discounts.some((value) => Number(value) !== 0);
    if (!priceCalendarId && pricePeriods.length === 0 && !hasDiscounts) {
      return;
    }

    const calendarPayload: Omit<
      CategoryPriceCalendar,
      "id" | "created_at" | "updated_at"
    > = {
      category_id: categoryId,
      jan: 0,
      feb: 0,
      mar: 0,
      apr: 0,
      may: 0,
      jun: 0,
      jul: 0,
      aug: 0,
      sep: 0,
      oct: 0,
      nov: 0,
      dec: 0,
    };

    MONTH_KEYS.forEach((key, index) => {
      const value = Number(discounts[index] ?? 0);
      calendarPayload[key] = Number.isFinite(value) ? value : 0;
    });

    if (priceCalendarId) {
      const res = await apiClient.updateCategoryPriceCalendar(
        priceCalendarId,
        calendarPayload
      );
      const updated = extractItem(
        res as ApiItemResult<CategoryPriceCalendar>,
      );
      if (updated && typeof updated.id === "number") {
        setPriceCalendarId(updated.id);
      }
      return;
    }

    const res = await apiClient.createCategoryPriceCalendar(calendarPayload);
    const created = extractItem(
      res as ApiItemResult<CategoryPriceCalendar>,
    );
    if (created && typeof created.id === "number") {
      setPriceCalendarId(created.id);
    }
  };

  const savePrices = async (categoryId: number) => {
    const operations: Promise<unknown>[] = [];

    const idsToDelete = Array.from(new Set(removedPriceIds)).filter((id) =>
      Number.isFinite(id)
    ) as number[];

    idsToDelete.forEach((id) => {
      operations.push(apiClient.deleteCategoryPrice(id));
    });

    pricePeriods.forEach(({ tempId: _tempId, ...period }) => {
      const parsedPrice = Number(period.price);
      if (!Number.isFinite(parsedPrice)) {
        return;
      }

      const payload = {
        category_id: categoryId,
        days: clampDay(period.days),
        days_end: clampDay(period.days_end),
        price: parsedPrice,
      };

      if (period.id) {
        operations.push(apiClient.updateCategoryPrice(period.id, payload));
      } else {
        operations.push(apiClient.createCategoryPrice(payload));
      }
    });

    if (operations.length > 0) {
      await Promise.all(operations);
    }

    await savePriceCalendar(categoryId);
    setRemovedPriceIds([]);
  };

  const addPeriod = () => {
    if (periodStart > periodEnd || !periodPrice) return;
    const startValue = Math.max(1, Math.min(periodStart, 90));
    const endValue = Math.max(startValue, Math.min(periodEnd, 90));
    const newPeriod: PricePeriodForm = {
      tempId: generateTempId(),
      category_id: editing?.id || 0,
      days: startValue,
      days_end: endValue,
      price: periodPrice,
    };
    setPricePeriods((prev) => sortPeriods([...prev, newPeriod]));
    setPeriodPrice("");
  };

  const handlePeriodStartChange = (tempId: string, value: number) => {
    const clamped = Math.max(1, Math.min(value, 90));
    setPricePeriods((prev) =>
      sortPeriods(
        prev.map((period) =>
          period.tempId === tempId
            ? {
                ...period,
                days: clamped,
                days_end: period.days_end < clamped ? clamped : period.days_end,
              }
            : period
        )
      )
    );
  };

  const handlePeriodEndChange = (tempId: string, value: number) => {
    setPricePeriods((prev) =>
      sortPeriods(
        prev.map((period) =>
          period.tempId === tempId
            ? {
                ...period,
                days_end: Math.max(period.days, Math.min(value, 90)),
              }
            : period
        )
      )
    );
  };

  const handlePeriodPriceChange = (tempId: string, value: string) => {
    setPricePeriods((prev) =>
      prev.map((period) =>
        period.tempId === tempId ? { ...period, price: value } : period
      )
    );
  };

  const handleRemovePeriod = (tempId: string) => {
    setPricePeriods((prev) => {
      const target = prev.find((period) => period.tempId === tempId);
      if (target && typeof target.id === "number") {
        const targetId = target.id;
        setRemovedPriceIds((ids) =>
          ids.includes(targetId) ? ids : [...ids, targetId]
        );
      }
      return prev.filter((period) => period.tempId !== tempId);
    });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Categorii</h1>
        <div className="flex w-full justify-start sm:w-auto sm:justify-end">
          <button
            onClick={openAddModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-jade px-4 py-2 text-white transition-colors hover:bg-jade/90 sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Adaugă categorie
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b bg-blue-50">
              <th className="py-3 px-4">Nume</th>
              <th className="py-3 px-4">Descriere</th>
              <th className="py-3 px-4">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b">
                <td className="py-3 px-4">{cat.name}</td>
                <td className="py-3 px-4">{cat.description}</td>
                <td className="py-3 px-4 space-x-2">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Editează"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Șterge"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-md w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Editează categoria" : "Adaugă categorie"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium" htmlFor="name">
                  Nume
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium" htmlFor="description">
                  Descriere
                </label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div>
                <h3 className="font-medium mb-2">Prețuri</h3>
                <div className="flex items-end space-x-2 mb-4">
                  <div>
                    <label className="block text-xs" htmlFor="days_start">
                      De la
                    </label>
                    <select
                      id="days_start"
                      value={periodStart}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPeriodStart(val);
                        if (periodEnd < val) setPeriodEnd(val);
                      }}
                      className="border rounded px-2 py-1"
                    >
                      {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs" htmlFor="days_end">
                      Până la
                    </label>
                    <select
                      id="days_end"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(Number(e.target.value))}
                      className="border rounded px-2 py-1"
                    >
                      {Array.from({ length: 90 - periodStart + 1 }, (_, i) =>
                        i + periodStart
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs" htmlFor="price">
                      Preț (EUR)
                    </label>
                    <input
                      id="price"
                      type="number"
                      min="0"
                      value={periodPrice}
                      onChange={(e) => setPeriodPrice(e.target.value)}
                      className="border rounded px-2 py-1 w-24"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addPeriod}
                    className="px-3 py-1 rounded-md bg-blue-600 text-white"
                  >
                    Adaugă preț
                  </button>
                </div>
                {pricePeriods.length > 0 && (
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full text-left border">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border p-2 text-xs">De la</th>
                          <th className="border p-2 text-xs">Până la</th>
                          <th className="border p-2 text-xs">Preț (EUR)</th>
                          <th className="border p-2 text-xs">Acțiuni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricePeriods.map((p, idx) => {
                          const previousEnd = idx > 0 ? pricePeriods[idx - 1].days_end : 0;
                          const minStartOption = clampDay(previousEnd + 1);
                          const startCandidates = buildRange(minStartOption, 90);
                          const currentStart = clampDay(p.days);
                          if (!startCandidates.includes(currentStart)) {
                            startCandidates.push(currentStart);
                          }
                          const startOptions = uniqueSorted(startCandidates);

                          const minEndOption = clampDay(Math.max(p.days, 1));
                          const endCandidates = buildRange(minEndOption, 90);
                          const currentEnd = clampDay(p.days_end);
                          if (!endCandidates.includes(currentEnd)) {
                            endCandidates.push(currentEnd);
                          }
                          const endOptions = uniqueSorted(endCandidates);

                          return (
                            <tr key={p.tempId} className="odd:bg-white even:bg-gray-100 hover:bg-gray-200">
                              <td className="border p-1">
                                <select
                                  value={p.days}
                                  onChange={(e) =>
                                    handlePeriodStartChange(p.tempId, Number(e.target.value))
                                  }
                                  className="border rounded px-2 py-1 text-xs w-full"
                                >
                                  {startOptions.map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="border p-1">
                                <select
                                  value={p.days_end}
                                  onChange={(e) =>
                                    handlePeriodEndChange(p.tempId, Number(e.target.value))
                                  }
                                  className="border rounded px-2 py-1 text-xs w-full"
                                >
                                  {endOptions.map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="border p-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={p.price}
                                  onChange={(e) =>
                                    handlePeriodPriceChange(p.tempId, e.target.value)
                                  }
                                  className="border rounded px-2 py-1 w-24 text-xs w-full"
                                />
                              </td>
                              <td className="border p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePeriod(p.tempId)}
                                  className="text-red-600 hover:text-red-800"
                                  aria-label="Șterge perioadă"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-center border">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 p-2 bg-gray-200"></th>
                        {MONTH_LABELS.map((label) => (
                          <th key={label} className="border border-gray-300 p-2 text-xs bg-gray-200">
                            {label}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th className="border p-1 text-xs">Reducere</th>
                        {MONTH_KEYS.map((key, i) => {
                          const currentValue = discounts[i] ?? 0;
                          const options = uniqueSorted([
                            ...DISCOUNT_OPTIONS,
                            currentValue,
                          ]);
                          return (
                            <th key={key} className="border p-1">
                              <select
                              value={currentValue}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setDiscounts((d) => {
                                  const copy = [...d];
                                  copy[i] = val;
                                  return copy;
                                });
                              }}
                              className="border rounded px-1 py-0.5 text-xs"
                            >
                              {options.map((n) => (
                                <option key={n} value={n}>
                                  {n}%
                                </option>
                              ))}
                            </select>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {pricePeriods.map((p) => (
                        <tr key={p.tempId} className="odd:bg-white even:bg-gray-100 hover:bg-gray-200">
                          <td className="border p-2 text-xs">
                            {p.days}-{p.days_end} Zile
                          </td>
                          {MONTH_KEYS.map((key, i) => (
                            <td key={key} className="border p-2 text-xs">
                              {(
                                parseFloat(p.price) *
                                (1 - (discounts[i] ?? 0) / 100)
                              ).toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-md border"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-jade text-white hover:bg-jade/90 disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? "Se salvează..." : editing ? "Salvează" : "Adaugă"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

