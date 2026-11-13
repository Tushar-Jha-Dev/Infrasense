const inrCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return inrCurrencyFormatter.format(value);
  }
  if (value !== undefined && value !== null && value !== "") {
    const num = Number(value);
    if (!Number.isNaN(num)) {
      return inrCurrencyFormatter.format(num);
    }
  }
  return inrCurrencyFormatter.format(0);
}
