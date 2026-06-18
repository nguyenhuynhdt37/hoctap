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
export const formatDate = (date: string | Date, formatStr?: string): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (formatStr === 'HH:mm • DD/MM/YYYY') {
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} • ${day}/${month}/${year}`;
  }
  return d.toLocaleDateString('vi-VN');
};
