/**
 * Formats a number or string into a currency-style format with thousands separators (dots)
 * Example: 1000000 -> "1.000.000"
 */
export const formatCurrency = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  
  let numericValue: number;
  
  if (typeof val === 'string') {
    // Remove all non-digit characters
    const cleanString = val.replace(/\D/g, '');
    numericValue = parseInt(cleanString, 10);
  } else {
    numericValue = Math.round(val);
  }

  if (isNaN(numericValue)) return '';

  // Use German locale as it uses dots for thousands separators
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
};

/**
 * Parses a formatted currency string back to a raw number
 * Example: "1.000.000" -> 1000000
 */
export const parseCurrency = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.round(val);
  
  // Remove all non-digit characters
  const cleanString = val.replace(/\D/g, '');
  return parseInt(cleanString, 10) || 0;
};
