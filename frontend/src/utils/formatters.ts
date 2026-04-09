/**
 * Formats a number or string into a currency-style format with thousands separators (dots)
 * Example: 1000000 -> "1.000.000"
 */
export const formatCurrency = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  
  const numericValue = typeof val === 'string' ? parseFloat(val) : val;

  if (isNaN(numericValue)) return '';

  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(numericValue));
};

/**
 * Parses a formatted currency string back to a raw number
 */
export const parseCurrency = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.round(val);
  
  // Remove all non-digit characters to get the raw number
  // but keep the sign if it exists
  const cleanString = val.toString().replace(/[^\d]/g, '');
  return parseInt(cleanString, 10) || 0;
};
