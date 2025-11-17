const FALLBACK_CURRENCY = "EUR";

const normalizeCurrency = (currency?: string) => {
  if (!currency) {
    return FALLBACK_CURRENCY;
  }

  const trimmed = currency.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) {
    return trimmed;
  }

  return FALLBACK_CURRENCY;
};

const buildFormatter = (currency: string, maximumFractionDigits: number) =>
  new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    maximumFractionDigits,
  });

export const formatCurrency = (value: number, currency?: string) => {
  const digits = Number.isInteger(value) ? 0 : 1;
  const normalizedCurrency = normalizeCurrency(currency);

  try {
    return buildFormatter(normalizedCurrency, digits).format(value);
  } catch (error) {
    console.error("Nu am putut formata suma cu valuta furnizată", {
      error,
      currency,
      normalizedCurrency,
    });
    return buildFormatter(FALLBACK_CURRENCY, digits).format(value);
  }
};

export const formatCurrencyWithSecondary = (
  primary: number,
  currency?: string,
  secondary?: number | null,
  secondaryCurrency?: string,
  options?: { separator?: string; secondaryPrefix?: string },
) => {
  const primaryLabel = formatCurrency(primary, currency);
  if (typeof secondary !== "number" || Number.isNaN(secondary)) {
    return primaryLabel;
  }

  const separator = options?.separator ?? " · ";
  const prefix = options?.secondaryPrefix ?? "";
  const secondaryLabel = formatCurrency(secondary, secondaryCurrency);
  return `${primaryLabel}${separator}${prefix}${secondaryLabel}`;
};

export const formatSecondaryCurrencyFootnote = (
  value?: number | null,
  currency?: string,
  options?: { prefix?: string },
): string | null => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const prefix = options?.prefix ?? "≈ ";
  return `${prefix}${formatCurrency(value, currency)}`;
};

