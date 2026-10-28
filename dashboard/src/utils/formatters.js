import { format } from 'date-fns'

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'MMM dd, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
}

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';
    return format(d, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return 'Invalid date';
  }
}

export const getOrderStatusColor = (status) => {
  const colors = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    processing: 'badge-info',
    shipped: 'badge-info',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
    declined: 'badge-danger',
    returned: 'badge-danger',
    refunded: 'badge-gray',
  }
  return colors[status] || 'badge-gray'
}

export const truncateText = (text, maxLength = 50) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}
