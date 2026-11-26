export function formatRs(amount: number, compact = false): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (compact) {
    if (abs >= 1_000_000) {
      return `${sign}Rs. ${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 100_000) {
      return `${sign}Rs. ${(abs / 1_000).toFixed(0)}k`;
    }
  }
  return `${sign}Rs. ${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatPercent(val: number): string {
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
}
