"use client";

import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api";
import { DynamicPrice, DynamicPricePercentage } from "@/types/admin";

const numberOptions = Array.from({ length: 201 }, (_, i) => i - 100);

const DynamicPricesPage = () => {
  const [prices, setPrices] = useState<DynamicPrice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DynamicPrice>({
    id: 0,
    start_from: "",
    end_to: "",
    enabled: true,
    percentages: [
      { percentage_start: 0, percentage_end: 0, percentage_amount: 0 },
    ],
  });

  const fetchPrices = async () => {
    try {
      const res = await apiClient.getDynamicPrices();
      setPrices(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const openAdd = () => {
    setForm({
      id: 0,
      start_from: "",
      end_to: "",
      enabled: true,
      percentages: [
        { percentage_start: 0, percentage_end: 0, percentage_amount: 0 },
      ],
    });
    setShowModal(true);
  };

  const openEdit = (price: DynamicPrice) => {
    setForm({ ...price });
    setShowModal(true);
  };

  const handleToggle = async (price: DynamicPrice) => {
    try {
      await apiClient.toggleDynamicPrice(price.id, !price.enabled);
      setPrices((prev) =>
        prev.map((p) => (p.id === price.id ? { ...p, enabled: !p.enabled } : p))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const updatePercentage = (
    index: number,
    field: keyof DynamicPricePercentage,
    value: number
  ) => {
    setForm((prev) => {
      const percentages = [...prev.percentages];
      percentages[index] = { ...percentages[index], [field]: value };
      return { ...prev, percentages };
    });
  };

  const addPercentage = () => {
    setForm((prev) => ({
      ...prev,
      percentages: [
        ...prev.percentages,
        { percentage_start: 0, percentage_end: 0, percentage_amount: 0 },
      ],
    }));
  };

  const removePercentage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      percentages: prev.percentages.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      start_from: form.start_from,
      end_to: form.end_to,
      enabled: form.enabled,
      percentages: form.percentages,
    };
    try {
      if (form.id) {
        await apiClient.updateDynamicPrice(form.id, payload);
      } else {
        await apiClient.createDynamicPrice(payload);
      }
      setShowModal(false);
      fetchPrices();
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    {
      id: "period",
      header: "Perioadă",
      accessor: (row: DynamicPrice) => `${row.start_from} - ${row.end_to}`,
    },
    {
      id: "enabled",
      header: "Activ",
      accessor: (row: DynamicPrice) => row.enabled,
      cell: (row: DynamicPrice) => (
        <input
          type="checkbox"
          checked={row.enabled}
          onChange={(e) => {
            e.stopPropagation();
            handleToggle(row);
          }}
          className="h-4 w-4"
          aria-label="Toggle"
        />
      ),
    },
    {
      id: "actions",
      header: "Acțiuni",
      accessor: () => null,
      cell: (row: DynamicPrice) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(row);
          }}
          aria-label="Editează"
          className="text-jade"
        >
          <Edit className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Dynamic Price</h1>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Adaugă
        </Button>
      </div>
      <DataTable
        data={prices}
        columns={columns}
        renderRowDetails={(row: DynamicPrice) => (
          <ul className="space-y-1">
            {row.percentages.map((p) => (
              <li key={p.id || `${p.percentage_start}-${p.percentage_end}`}>
                {p.percentage_start}% - {p.percentage_end}% : {p.percentage_amount}%
              </li>
            ))}
          </ul>
        )}
      />
      <Popup open={showModal} onClose={() => setShowModal(false)} className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium">Start</label>
              <Input
                type="date"
                value={form.start_from}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, start_from: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Sfârșit</label>
              <Input
                type="date"
                value={form.end_to}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, end_to: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <div>
            <label className="block mb-1 font-medium">Procentaje</label>
            <div className="space-y-2">
              {form.percentages.map((p, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Select
                    value={p.percentage_start.toString()}
                    onValueChange={(v) =>
                      updatePercentage(index, "percentage_start", Number(v))
                    }
                  >
                    {numberOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                  <span>-</span>
                  <Select
                    value={p.percentage_end.toString()}
                    onValueChange={(v) =>
                      updatePercentage(index, "percentage_end", Number(v))
                    }
                  >
                    {numberOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={p.percentage_amount.toString()}
                    onValueChange={(v) =>
                      updatePercentage(index, "percentage_amount", Number(v))
                    }
                  >
                    {numberOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => removePercentage(index)}
                    aria-label="Șterge procentajul"
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={addPercentage}
            >
              Adaugă procent
            </Button>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Anulează
            </Button>
            <Button type="submit">Salvează</Button>
          </div>
        </form>
      </Popup>
    </div>
  );
};

export default DynamicPricesPage;

