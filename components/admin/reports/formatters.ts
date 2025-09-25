const currencyFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("ro-RO", {
  style: "percent",
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("ro-RO");

export const formatCurrency = (value: number): string => currencyFormatter.format(value);

export const formatPercent = (ratio: number): string => percentageFormatter.format(ratio);

export const formatNumber = (value: number): string => numberFormatter.format(value);

export const calculateVariation = (
  current: number,
  previous: number,
): { value: number; ratio: number } => {
  const difference = current - previous;
  const ratio = previous === 0 ? 1 : difference / previous;
  return { value: difference, ratio };
};
