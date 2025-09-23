"use client";

import { useCallback } from "react";
import CarAttributeManager, {
  CAR_ATTRIBUTE_STATUS_OPTIONS,
  type CarAttributeItem,
} from "@/components/admin/car-attribute-manager";
import apiClient from "@/lib/api";
import type { Column } from "@/types/ui";

const makeColumns: Column<CarAttributeItem>[] = [
  {
    id: "name",
    header: "Marcă",
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
    id: "logo",
    header: "Logo",
    accessor: (row) => row.logo ?? "",
    cell: (row) =>
      row.logo ? (
        <span className="font-mono text-xs text-gray-600 break-all">{row.logo}</span>
      ) : (
        "—"
      ),
  },
];

export default function CarMakesPage() {
  const loadRecords = useCallback(() => apiClient.getCarMakes({ limit: 200 }), []);
  const createRecord = useCallback(
    (payload: Record<string, unknown>) => apiClient.createCarMake(payload),
    [],
  );
  const updateRecord = useCallback(
    (id: number | string, payload: Record<string, unknown>) =>
      apiClient.updateCarMake(id, payload),
    [],
  );

  return (
    <CarAttributeManager
      title="Mărci auto"
      description="Gestionează lista de mărci disponibile în flotă."
      entityName="marcă auto"
      loadRecords={loadRecords}
      createRecord={createRecord}
      updateRecord={updateRecord}
      columns={makeColumns}
      formFields={[
        {
          key: "name",
          label: "Nume",
          placeholder: "Ex: Tesla",
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
          key: "logo",
          label: "Logo (cale fișier)",
          placeholder: "Ex: logos/tesla.svg",
          description: "Folosește calea relativă din storage.",
        },
      ]}
      defaultValues={{ status: "published" }}
      emptyStateMessage="Nu există mărci definite momentan."
      addButtonLabel="Adaugă marcă"
      createModalTitle="Adaugă marcă auto"
      editModalTitle="Editează marca auto"
    />
  );
}
