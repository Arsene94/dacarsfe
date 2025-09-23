"use client";

import { useCallback } from "react";
import CarAttributeManager, {
  CAR_ATTRIBUTE_STATUS_OPTIONS,
  type CarAttributeItem,
} from "@/components/admin/car-attribute-manager";
import apiClient from "@/lib/api";
import type { Column } from "@/types/ui";

const fuelColumns: Column<CarAttributeItem>[] = [
  {
    id: "name",
    header: "Combustibil",
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

export default function CarFuelsPage() {
  const loadRecords = useCallback(() => apiClient.getCarFuels({ limit: 200 }), []);
  const createRecord = useCallback(
    (payload: Record<string, unknown>) => apiClient.createCarFuel(payload),
    [],
  );
  const updateRecord = useCallback(
    (id: number | string, payload: Record<string, unknown>) =>
      apiClient.updateCarFuel(id, payload),
    [],
  );

  return (
    <CarAttributeManager
      title="Tipuri de combustibil"
      description="Gestionează tipurile de combustibil acceptate pentru flotă."
      entityName="combustibil"
      loadRecords={loadRecords}
      createRecord={createRecord}
      updateRecord={updateRecord}
      columns={fuelColumns}
      formFields={[
        {
          key: "name",
          label: "Nume",
          placeholder: "Ex: Electric",
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
      emptyStateMessage="Nu există combustibili definiți momentan."
      addButtonLabel="Adaugă combustibil"
      createModalTitle="Adaugă tip de combustibil"
      editModalTitle="Editează tipul de combustibil"
    />
  );
}
