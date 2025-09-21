const DEFAULT_LOCALE = "ro-RO";

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

export const formatDateTime = (
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (!isValidDate(date)) {
    return "—";
  }
  const formatterOptions: Intl.DateTimeFormatOptions =
    options ?? { dateStyle: "medium", timeStyle: "short" };
  return date.toLocaleString(locale, formatterOptions);
};

export const formatDate = (
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (!isValidDate(date)) {
    return "—";
  }
  const formatterOptions: Intl.DateTimeFormatOptions =
    options ?? { dateStyle: "long" };
  return date.toLocaleDateString(locale, formatterOptions);
};

export const toLocalDatetimeInputValue = (value?: string | null): string => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (!isValidDate(date)) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

export const toIsoStringFromInput = (
  value?: string | null,
): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  if (!isValidDate(date)) {
    return null;
  }
  return date.toISOString();
};
