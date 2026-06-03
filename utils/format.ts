export function formatCurrency(amount: number): string {
  if (amount === 0) return '0원';
  if (amount >= 10000) {
    const man = Math.floor(amount / 10000);
    const rest = amount % 10000;
    return rest === 0 ? `${man}만원` : `${man.toLocaleString()}만 ${rest.toLocaleString()}원`;
  }
  return `${amount.toLocaleString()}원`;
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 10000) return `${Math.round(amount / 10000)}만`;
  return amount.toLocaleString();
}
