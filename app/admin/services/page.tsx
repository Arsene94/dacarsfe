"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import type { Column } from "@/types/ui";
import type { AdminService } from "@/types/admin";

const parsePrice = (raw: unknown): number => {
    if (raw == null) return 0;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
    if (typeof raw === "string") {
        const cleaned = raw
            .replace(/[^0-9.,-]/g, "")
            .replace(/\.(?=\d{3}(?:\D|$))/g, "");
        const normalized = cleaned.replace(/,/g, ".");
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    try {
        return parsePrice(String(raw));
    } catch {
        return 0;
    }
};

const currencyFormatter = new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
});

const AdditionalServicesPage = () => {
    const [services, setServices] = useState<AdminService[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editing, setEditing] = useState<AdminService | null>(null);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    const fetchServices = useCallback(async () => {
        try {
            const response = await apiClient.getServices();
            const rawList = extractList(response);

            const mapped = rawList
                .map((item): AdminService | null => {
                    if (!item || typeof item !== "object") return null;
                    const source = item as Record<string, unknown>;
                    const idCandidate =
                        source.id ?? source.service_id ?? source.value ?? source.serviceId;
                    const id = typeof idCandidate === "number"
                        ? idCandidate
                        : typeof idCandidate === "string"
                            ? Number(idCandidate)
                            : Number.NaN;
                    if (!Number.isFinite(id)) return null;

                    const serviceName =
                        typeof source.name === "string"
                            ? source.name
                            : typeof source.title === "string"
                                ? source.title
                                : "";

                    const priceValue = parsePrice(
                        source.price ??
                            source.amount ??
                            source.value ??
                            source.price_per_day ??
                            source.pricePerDay
                    );

                    const normalized: AdminService = {
                        ...source,
                        id,
                        name: serviceName,
                        price: priceValue,
                        description:
                            typeof source.description === "string"
                                ? source.description
                                : null,
                        content:
                            typeof source.content === "string" ? source.content : null,
                        status:
                            typeof source.status === "string"
                                ? (source.status as AdminService["status"])
                                : null,
                        image:
                            typeof source.image === "string" ? source.image : null,
                        logo:
                            typeof source.logo === "string" ? source.logo : null,
                        created_at:
                            typeof source.created_at === "string" ? source.created_at : null,
                        updated_at:
                            typeof source.updated_at === "string" ? source.updated_at : null,
                    };

                    return normalized;
                })
                .filter((item): item is AdminService => item !== null)
                .sort((a, b) => a.name.localeCompare(b.name, "ro"));

            setServices(mapped);
        } catch (error) {
            console.error("Failed to load services", error);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const openAddModal = () => {
        setEditing(null);
        setName("");
        setPrice("");
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (service: AdminService) => {
        setEditing(service);
        setName(service.name);
        setPrice(service.price.toString());
        setFormError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditing(null);
        setIsSaving(false);
        setFormError(null);
        setName("");
        setPrice("");
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSaving) return;

        const trimmedName = name.trim();
        const numericPrice = parsePrice(price);

        if (!trimmedName) {
            setFormError("Introdu un nume pentru serviciu.");
            return;
        }

        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
            setFormError("Introdu un preț valid.");
            return;
        }

        setIsSaving(true);
        setFormError(null);

        const payload = {
            name: trimmedName,
            price: numericPrice,
        };

        try {
            if (editing) {
                await apiClient.updateService(editing.id, payload);
            } else {
                await apiClient.createService(payload);
            }
            await fetchServices();
            closeModal();
        } catch (error) {
            console.error("Failed to save service", error);
            setFormError("Nu am putut salva serviciul. Încearcă din nou.");
        } finally {
            setIsSaving(false);
        }
    };

    const columns: Column<AdminService>[] = [
        {
            id: "name",
            header: "Nume serviciu",
            accessor: (row) => row.name,
            sortable: true,
        },
        {
            id: "price",
            header: "Preț",
            accessor: (row) => row.price,
            sortable: true,
            cell: (row) => currencyFormatter.format(row.price),
        },
        {
            id: "actions",
            header: "Acțiuni",
            accessor: () => null,
            cell: (row) => (
                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(row);
                    }}
                    aria-label={`Editează ${row.name}`}
                    className="text-jade hover:text-jadeLight"
                >
                    <Edit className="h-4 w-4" />
                </button>
            ),
        },
    ];

    return (
        <div className="p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-semibold">Servicii adiționale</h1>
                <div className="flex w-full justify-start sm:w-auto sm:justify-end">
                    <Button onClick={openAddModal} className="w-full sm:w-auto gap-2">
                        <Plus className="h-4 w-4" /> Adaugă
                    </Button>
                </div>
            </div>
            <DataTable data={services} columns={columns} />

            <Popup open={isModalOpen} onClose={closeModal} className="max-w-lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-lg font-semibold">
                        {editing ? "Editează serviciul" : "Adaugă serviciu"}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                            <label htmlFor="service-name" className="mb-1 block font-medium">
                                Nume
                            </label>
                            <Input
                                id="service-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Ex: Scaun copil"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="service-price" className="mb-1 block font-medium">
                                Preț (EUR)
                            </label>
                            <Input
                                id="service-price"
                                value={price}
                                onChange={(event) => setPrice(event.target.value)}
                                placeholder="Ex: 50"
                                inputMode="decimal"
                                required
                            />
                        </div>
                    </div>
                    {formError && (
                        <p className="text-sm text-red-500" role="alert">
                            {formError}
                        </p>
                    )}
                    <div className="flex flex-col gap-2 lg:flex-row lg:justify-end lg:space-x-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeModal}
                            disabled={isSaving}
                        >
                            Anulează
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Se salvează..." : "Salvează"}
                        </Button>
                    </div>
                </form>
            </Popup>
        </div>
    );
};

export default AdditionalServicesPage;

