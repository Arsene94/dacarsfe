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

