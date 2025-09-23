"use client";

import { useCallback } from "react";
import CarAttributeManager, {
  CAR_ATTRIBUTE_STATUS_OPTIONS,
  type CarAttributeItem,
} from "@/components/admin/car-attribute-manager";
import apiClient from "@/lib/api";
import type { Column } from "@/types/ui";

const colorColumns: Column<CarAttributeItem>[] = [
  {
    id: "name",
    header: "Culoare",
    accessor: (row) => row.name,
    sortable: true,
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => row.status ?? "",
    sortable: true,
  },
];

export default function CarColorsPage() {
  const loadRecords = useCallback(() => apiClient.getCarColors({ limit: 200 }), []);
  const createRecord = useCallback(
    (payload: Record<string, unknown>) => apiClient.createCarColor(payload),
    [],
  );
  const updateRecord = useCallback(
    (id: number | string, payload: Record<string, unknown>) =>
      apiClient.updateCarColor(id, payload),
    [],
  );

  return (
    <CarAttributeManager
      title="Culori auto"
      description="Gestionează culorile disponibile pentru mașini."
      entityName="culoare"
      loadRecords={loadRecords}
      createRecord={createRecord}
      updateRecord={updateRecord}
      columns={colorColumns}
      formFields={[
        {
          key: "name",
          label: "Nume",
          placeholder: "Ex: Albastru Midnight",
          required: true,
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          placeholder: "Selectează statusul",
          options: CAR_ATTRIBUTE_STATUS_OPTIONS,
        },
      ]}
      defaultValues={{ status: "published" }}
      emptyStateMessage="Nu există culori definite momentan."
      addButtonLabel="Adaugă culoare"
      createModalTitle="Adaugă culoare"
      editModalTitle="Editează culoarea"
    />
  );
}
