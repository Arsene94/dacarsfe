"use client";

import { useCallback } from "react";
import CarAttributeManager, {
  CAR_ATTRIBUTE_STATUS_OPTIONS,
  type CarAttributeItem,
} from "@/components/admin/car-attribute-manager";
import apiClient from "@/lib/api";
import type { Column } from "@/types/ui";

const typeColumns: Column<CarAttributeItem>[] = [
  {
    id: "name",
    header: "Tip",
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

export default function CarTypesPage() {
  const loadRecords = useCallback(() => apiClient.getCarTypes({ limit: 200 }), []);
  const createRecord = useCallback(
    (payload: Record<string, unknown>) => apiClient.createCarType(payload),
    [],
  );
  const updateRecord = useCallback(
    (id: number | string, payload: Record<string, unknown>) =>
      apiClient.updateCarType(id, payload),
    [],
  );

  return (
    <CarAttributeManager
      title="Tipuri auto"
      description="Definește tipurile de vehicul disponibile la închiriere."
      entityName="tip auto"
      loadRecords={loadRecords}
      createRecord={createRecord}
      updateRecord={updateRecord}
      columns={typeColumns}
      formFields={[
        {
          key: "name",
          label: "Nume",
          placeholder: "Ex: SUV",
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
      emptyStateMessage="Nu există tipuri definite momentan."
      addButtonLabel="Adaugă tip"
      createModalTitle="Adaugă tip auto"
      editModalTitle="Editează tipul auto"
    />
  );
}
