export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rate);
}

export function formatDate(date: string): string {
  return date;
}

export function formatDateForInput(date: string): string {
  const [year, month, day] = date.split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parseDateFromInput(date: string): string {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${year}.${month}.${day}`;
}