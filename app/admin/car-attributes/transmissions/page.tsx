"use client";

import { useCallback } from "react";
import CarAttributeManager, {
  CAR_ATTRIBUTE_STATUS_OPTIONS,
  type CarAttributeItem,
} from "@/components/admin/car-attribute-manager";
import apiClient from "@/lib/api";
import type { Column } from "@/types/ui";

const transmissionColumns: Column<CarAttributeItem>[] = [
  {
    id: "name",
    header: "Transmisie",
    accessor: (row) => row.name,
    sortable: true,
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => row.status ?? "",
    sortable: true,
  },
  {
    id: "icon",
    header: "Icon",
    accessor: (row) => row.icon ?? "",
    cell: (row) =>
      row.icon ? (
        <span className="font-mono text-xs text-gray-600 break-all">{row.icon}</span>
      ) : (
        "—"
      ),
  },
];

export default function CarTransmissionsPage() {
  const loadRecords = useCallback(
    () => apiClient.getCarTransmissions({ limit: 200 }),
    [],
  );
  const createRecord = useCallback(
    (payload: Record<string, unknown>) => apiClient.createCarTransmission(payload),
    [],
  );
  const updateRecord = useCallback(
    (id: number | string, payload: Record<string, unknown>) =>
      apiClient.updateCarTransmission(id, payload),
    [],
  );

  return (
    <CarAttributeManager
      title="Transmisii"
      description="Administrează tipurile de transmisie disponibile pentru mașini."
      entityName="transmisie"
      loadRecords={loadRecords}
      createRecord={createRecord}
      updateRecord={updateRecord}
      columns={transmissionColumns}
      formFields={[
        {
          key: "name",
          label: "Nume",
          placeholder: "Ex: Automată",
          required: true,
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          placeholder: "Selectează statusul",
          options: CAR_ATTRIBUTE_STATUS_OPTIONS,
        },
        {
          key: "icon",
          label: "Icon (cale fișier)",
          placeholder: "Ex: icons/automatic.svg",
          description: "Folosește calea către pictograma din storage.",
        },
      ]}
      defaultValues={{ status: "published" }}
      emptyStateMessage="Nu există transmisii definite momentan."
      addButtonLabel="Adaugă transmisie"
      createModalTitle="Adaugă transmisie"
      editModalTitle="Editează transmisia"
    />
  );
}
