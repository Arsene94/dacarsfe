"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, Plus } from "lucide-react";
import apiClient from "@/lib/api";
import { AdminCategory, CategoryPrice } from "@/types/admin";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [pricePeriods, setPricePeriods] = useState<CategoryPrice[]>([]);
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
        setPricePeriods(prices);
        const lastEnd = prices.length ? prices[prices.length - 1].days_end : 0;
        const nextStart = lastEnd + 1;
        setPeriodStart(nextStart);
        setPeriodEnd(nextStart);
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
        pricePeriods.map((p) => {
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
    const newPeriod: CategoryPrice = {
      category_id: editing?.id || 0,
      days: periodStart,
      days_end: periodEnd,
      price: periodPrice,
    };
    const updated = [...pricePeriods, newPeriod].sort(
      (a, b) => a.days - b.days
    );
    setPricePeriods(updated);
    const nextStart = updated[updated.length - 1].days_end + 1;
    setPeriodStart(nextStart);
    setPeriodEnd(nextStart);
    setPeriodPrice("");
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
          <div className="bg-white p-6 rounded-md w-full max-w-md">
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
                      {pricePeriods.map((p, idx) => (
                        <tr key={idx}>
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

