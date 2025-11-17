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

export const formatSecondaryCurrency = (
  value?: number | null,
  currency?: string,
): string | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return formatCurrency(value, currency);
};

export const formatCurrencyPair = (
  primaryValue: number,
  primaryCurrency?: string,
  secondaryValue?: number | null,
  secondaryCurrency?: string,
) => {
  const primary = formatCurrency(primaryValue, primaryCurrency);
  const secondary = formatSecondaryCurrency(secondaryValue, secondaryCurrency);
  if (!secondary) {
    return primary;
  }
  return `${primary} (${secondary})`;
};

