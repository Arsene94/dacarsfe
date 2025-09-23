"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useId,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import { Edit, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { extractList } from "@/lib/apiResponse";
import type { ApiItemResult, ApiListResult, LookupRecord } from "@/types/api";
import type { Column } from "@/types/ui";

type FieldOption = {
  value: string;
  label: string;
};

export type CarAttributeField = {
  key: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  type?: "text" | "select";
  options?: FieldOption[];
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
};

export type CarAttributeItem = {
  id: number | string;
  name: string;
  status: string | null;
  slug?: string | null;
  icon?: string | null;
  logo?: string | null;
  raw: LookupRecord;
  [key: string]: unknown;
};

export type CarAttributeManagerProps = {
  title: string;
  description?: string;
  entityName?: string;
  loadRecords: () => Promise<ApiListResult<LookupRecord>>;
  createRecord: (
    payload: Record<string, unknown>,
  ) => Promise<ApiItemResult<LookupRecord>>;
  updateRecord: (
    id: number | string,
    payload: Record<string, unknown>,
  ) => Promise<ApiItemResult<LookupRecord>>;
  columns?: Column<CarAttributeItem>[];
  formFields: CarAttributeField[];
  defaultValues?: Partial<Record<string, string | number | boolean>>;
  mapRecord?: (record: LookupRecord) => CarAttributeItem | null;
  preparePayload?: (
    values: Record<string, string>,
    item: CarAttributeItem | null,
  ) => Record<string, unknown>;
  sortItems?: (items: CarAttributeItem[]) => CarAttributeItem[];
  emptyStateMessage?: string;
  addButtonLabel?: string;
  createModalTitle?: string;
  editModalTitle?: string;
  modalSubmitLabel?: string;
};

export const CAR_ATTRIBUTE_STATUS_OPTIONS: FieldOption[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Publicat" },
];

const toStringValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
};

const parseIdentifier = (value: unknown): number | string | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
    return trimmed;
  }
  return null;
};

const defaultMapRecord = (record: LookupRecord): CarAttributeItem | null => {
  if (!record || typeof record !== "object") {
    return null;
  }

  const source = record as Record<string, unknown>;

  const idCandidates = [
    source.id,
    source.value,
    source.uuid,
    source.slug,
    source.code,
  ];
  let id: number | string | null = null;
  for (const candidate of idCandidates) {
    id = parseIdentifier(candidate);
    if (id !== null) {
      break;
    }
  }
  if (id === null) {
    return null;
  }

  const nameCandidates = [
    source.name,
    source.title,
    source.label,
    source.slug,
    source.code,
  ];
  let name: string | null = null;
  for (const candidate of nameCandidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        name = trimmed;
        break;
      }
    }
  }
  if (!name) {
    return null;
  }

  const statusCandidate =
    source.status ?? source.state ?? source.visibility ?? source.published;
  const status = typeof statusCandidate === "string" ? statusCandidate : null;

  const slugCandidate = source.slug ?? source.code ?? null;
  const slug = typeof slugCandidate === "string" ? slugCandidate : null;

  const iconCandidate = source.icon ?? source.icon_path ?? source.image ?? null;
  const icon = typeof iconCandidate === "string" ? iconCandidate : null;

  const logoCandidate = source.logo ?? source.logo_path ?? null;
  const logo = typeof logoCandidate === "string" ? logoCandidate : null;

  return {
    id,
    name,
    status,
    slug,
    icon,
    logo,
    raw: record,
  };
};

const defaultSortItems = (items: CarAttributeItem[]): CarAttributeItem[] =>
  [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "ro", { sensitivity: "base" }),
  );

const defaultPreparePayload = (
  values: Record<string, string>,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  Object.entries(values).forEach(([key, value]) => {
    const trimmed = value.trim();
    payload[key] = trimmed.length === 0 ? null : trimmed;
  });
  return payload;
};

function CarAttributeManager({
  title,
  description,
  entityName = "element",
  loadRecords,
  createRecord,
  updateRecord,
  columns,
  formFields,
  defaultValues,
  mapRecord,
  preparePayload,
  sortItems,
  emptyStateMessage = "Nu există elemente înregistrate momentan.",
  addButtonLabel,
  createModalTitle,
  editModalTitle,
  modalSubmitLabel = "Salvează",
}: CarAttributeManagerProps) {
  const mapFn = useMemo(() => mapRecord ?? defaultMapRecord, [mapRecord]);
  const sortFn = useMemo(() => sortItems ?? defaultSortItems, [sortItems]);

  const baseDefaults = useMemo<Record<string, string>>(() => {
    const seeds: Record<string, string> = {};
    formFields.forEach((field) => {
      const fallback = defaultValues?.[field.key];
      seeds[field.key] =
        fallback === undefined ? "" : toStringValue(fallback);
    });

    if (defaultValues) {
      Object.entries(defaultValues).forEach(([key, value]) => {
        if (!(key in seeds)) {
          seeds[key] = toStringValue(value);
        }
      });
    }
    return seeds;
  }, [formFields, defaultValues]);

  const [items, setItems] = useState<CarAttributeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(
    baseDefaults,
  );
  const [editingItem, setEditingItem] = useState<CarAttributeItem | null>(null);

  const formId = useId();

  useEffect(() => {
    setFormValues(baseDefaults);
  }, [baseDefaults]);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const response = await loadRecords();
      const rawItems = extractList(response);
      const mapped = rawItems
        .map((entry) => mapFn(entry))
        .filter((entry): entry is CarAttributeItem => entry !== null);
      const sorted = sortFn(mapped);
      setItems(sorted);
    } catch (error) {
      console.error(`Failed to load ${entityName} entries`, error);
      setGlobalError("Nu am putut încărca datele. Încearcă din nou.");
    } finally {
      setIsLoading(false);
    }
  }, [entityName, loadRecords, mapFn, sortFn]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleAdd = useCallback(() => {
    setEditingItem(null);
    setFormValues(baseDefaults);
    setFormError(null);
    setIsModalOpen(true);
  }, [baseDefaults]);

  const handleEdit = useCallback(
    (item: CarAttributeItem) => {
      setEditingItem(item);
      const nextValues: Record<string, string> = { ...baseDefaults };
      const itemRecord = item as Record<string, unknown>;
      const rawRecord = item.raw as Record<string, unknown>;

      formFields.forEach((field) => {
        const candidate =
          field.key in itemRecord ? itemRecord[field.key] : rawRecord[field.key];
        if (typeof candidate === "string") {
          nextValues[field.key] = candidate;
        } else if (candidate == null) {
          nextValues[field.key] = "";
        } else {
          nextValues[field.key] = String(candidate);
        }
      });

      setFormValues(nextValues);
      setFormError(null);
      setIsModalOpen(true);
    },
    [baseDefaults, formFields],
  );

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    setIsSaving(false);
    setFormError(null);
    setEditingItem(null);
    setFormValues(baseDefaults);
  }, [baseDefaults]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSaving) {
        return;
      }

      for (const field of formFields) {
        const rawValue = formValues[field.key] ?? "";
        if (field.required && rawValue.trim().length === 0) {
          setFormError(`Completează câmpul "${field.label}".`);
          return;
        }
      }

      setIsSaving(true);
      setFormError(null);

      const normalizedValues: Record<string, string> = {};
      Object.entries(formValues).forEach(([key, value]) => {
        normalizedValues[key] = value.trim();
      });

      const payload =
        preparePayload?.(normalizedValues, editingItem) ??
        defaultPreparePayload(normalizedValues);

      try {
        if (editingItem) {
          await updateRecord(editingItem.id, payload);
        } else {
          await createRecord(payload);
        }
        await fetchRecords();
        handleClose();
      } catch (error) {
        console.error(`Failed to save ${entityName}`, error);
        setFormError("Nu am putut salva modificările. Încearcă din nou.");
      } finally {
        setIsSaving(false);
      }
    },
    [
      createRecord,
      editingItem,
      entityName,
      fetchRecords,
      formFields,
      formValues,
      handleClose,
      isSaving,
      preparePayload,
      updateRecord,
    ],
  );

  const baseColumns = useMemo<Column<CarAttributeItem>[]>(() => {
    if (columns && columns.length > 0) {
      return [...columns];
    }
    return [
      {
        id: "name",
        header: "Nume",
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
  }, [columns]);

  const actionColumn = useMemo<Column<CarAttributeItem>>(
    () => ({
      id: "actions",
      header: "Acțiuni",
      accessor: () => "",
      cell: (row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleEdit(row);
          }}
          className="text-jade hover:text-jadeLight"
          aria-label={`Editează ${row.name}`}
        >
          <Edit className="h-4 w-4" />
        </button>
      ),
    }),
    [handleEdit],
  );

  const tableColumns = useMemo<Column<CarAttributeItem>[]>(() => {
    const hasActions = baseColumns.some((column) => column.id === "actions");
    if (hasActions) {
      return baseColumns;
    }
    return [...baseColumns, actionColumn];
  }, [actionColumn, baseColumns]);

  const addLabel =
    addButtonLabel ?? `Adaugă ${entityName}`.replace(/\s{2,}/g, " ").trim();
  const createTitle =
    createModalTitle ?? `Adaugă ${entityName}`.replace(/\s{2,}/g, " ").trim();
  const editTitle =
    editModalTitle ?? `Editează ${entityName}`.replace(/\s{2,}/g, " ").trim();

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-berkeley">{title}</h1>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {globalError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <p>{globalError}</p>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void fetchRecords();
              }}
            >
              Reîncearcă
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-16 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Se încarcă datele...
        </div>
      ) : items.length > 0 ? (
        <DataTable data={items} columns={tableColumns} />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
          {emptyStateMessage}
        </div>
      )}

      <Popup open={isModalOpen} onClose={handleClose} className="max-w-xl">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-berkeley">
            {editingItem ? editTitle : createTitle}
          </h2>

          {formFields.map((field) => {
            const value = formValues[field.key] ?? "";
            const fieldId = `${formId}-${field.key}`;
            return (
              <div key={field.key} className="space-y-1">
                <label htmlFor={fieldId} className="block text-sm font-medium">
                  {field.label}
                </label>
                {field.type === "select" ? (
                  <Select
                    id={fieldId}
                    value={value}
                    onChange={(event) =>
                      handleFieldChange(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                  >
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id={fieldId}
                    value={value}
                    onChange={(event) =>
                      handleFieldChange(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    required={field.required}
                    inputMode={field.inputMode}
                    autoComplete={field.autoComplete}
                  />
                )}
                {field.description && (
                  <p className="text-xs text-gray-500">{field.description}</p>
                )}
              </div>
            );
          })}

          {formError && (
            <p className="text-sm text-red-500" role="alert">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Anulează
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Se salvează..." : modalSubmitLabel}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
}

export default CarAttributeManager;
