"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, Plus } from "lucide-react";
import apiClient from "@/lib/api";
import { AdminCategory, CategoryPrice } from "@/types/admin";

type PricePeriodForm = CategoryPrice & { tempId: string };

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [pricePeriods, setPricePeriods] = useState<PricePeriodForm[]>([]);
  const [periodStart, setPeriodStart] = useState(1);
  const [periodEnd, setPeriodEnd] = useState(1);
  const [periodPrice, setPeriodPrice] = useState("");
  const [discounts, setDiscounts] = useState<number[]>(Array(12).fill(0));
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.getCategories();
        setCategories(res?.data ?? res);
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
    setDiscounts(Array(12).fill(0));
    setIsModalOpen(true);
  };

  const openEditModal = (category: AdminCategory) => {
    setEditing(category);
    setForm({ name: category.name, description: category.description ?? "" });
    setPricePeriods([]);
    setPeriodStart(1);
    setPeriodEnd(1);
    setPeriodPrice("");
    setDiscounts(Array(12).fill(0));
    apiClient
      .getCategoryPrices(category.id)
      .then((prices) => {
        const sorted = sortPeriods(
          prices.map((price) => ({
            ...price,
            price:
              typeof price.price === "number"
                ? price.price.toString()
                : price.price ?? "",
            tempId: price.tempId ?? (price.id ? `existing-${price.id}` : generateTempId()),
          }))
        );
        setPricePeriods(sorted);
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
    try {
      if (editing) {
        const res = await apiClient.updateCategory(editing.id, form);
        const updated = res?.data ?? res;
        setCategories((prev) =>
          prev.map((c) => (c.id === editing.id ? updated : c))
        );
        await savePrices(editing.id);
      } else {
        const res = await apiClient.createCategory(form);
        const created = res?.data ?? res;
        setCategories((prev) => [...prev, created]);
        await savePrices(created.id);
      }
      setIsModalOpen(false);
      setEditing(null);
    } catch (error) {
      console.error("Failed to save category", error);
    }
  };

  const savePrices = async (categoryId: number) => {
    try {
      await Promise.all(
        pricePeriods.map(({ tempId: _tempId, ...p }) => {
          const payload = {
            category_id: categoryId,
            days: p.days,
            days_end: p.days_end,
            price: Number(p.price),
          };
          if (p.id) {
            return apiClient.updateCategoryPrice(p.id, payload);
          }
          return apiClient.createCategoryPrice(payload);
        })
      );
    } catch (err) {
      console.error("Failed to save prices", err);
    }
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
    setPricePeriods((prev) => prev.filter((period) => period.tempId !== tempId));
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Categorii</h1>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 rounded-md bg-jade text-white hover:bg-jade/90"
        >
          <Plus className="h-4 w-4 mr-2" /> Adaugă categorie
        </button>
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
                            <tr key={p.tempId}>
                              <td className="border p-1">
                                <select
                                  value={p.days}
                                  onChange={(e) =>
                                    handlePeriodStartChange(p.tempId, Number(e.target.value))
                                  }
                                  className="border rounded px-2 py-1 text-xs"
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
                                  className="border rounded px-2 py-1 text-xs"
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
                                  className="border rounded px-2 py-1 w-24 text-xs"
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
                        <th className="border p-2"></th>
                        {months.map((m) => (
                          <th key={m} className="border p-2 text-xs">
                            {m}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th className="border p-1 text-xs">Reducere</th>
                        {months.map((m, i) => (
                          <th key={m} className="border p-1">
                            <select
                              value={discounts[i]}
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
                              {Array.from({ length: 21 }, (_, j) => j * 5).map(
                                (n) => (
                                  <option key={n} value={n}>
                                    {n}%
                                  </option>
                                )
                              )}
                            </select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pricePeriods.map((p) => (
                        <tr key={p.tempId}>
                          <td className="border p-2 text-xs">
                            {p.days}-{p.days_end} Zile
                          </td>
                          {months.map((m, i) => (
                            <td key={i} className="border p-2 text-xs">
                              {(
                                parseFloat(p.price) *
                                (1 - discounts[i] / 100)
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md border"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-jade text-white hover:bg-jade/90"
                >
                  {editing ? "Salvează" : "Adaugă"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

