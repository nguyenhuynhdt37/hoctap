/**
 * Format number to VND currency string
 * @param amount Number to format
 * @returns Formatted string (e.g., 500.000 VND)
 */
export const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null) return '0 VND';
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount).replace('₫', 'VND');
};

/**
 * Format date to local string
 * @param date ISO string or Date object
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN');
};
