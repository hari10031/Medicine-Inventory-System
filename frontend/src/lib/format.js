export const fmtDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  return date.toISOString().slice(0, 10);
};

export const daysUntil = (d) => {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
};

export const expiryStatus = (d) => {
  const days = daysUntil(d);
  if (days === null) return { label: '-', cls: 'badge' };
  if (days < 0) return { label: 'Expired', cls: 'badge-red' };
  if (days <= 30) return { label: `${days}d left`, cls: 'badge-yellow' };
  return { label: `${days}d left`, cls: 'badge-green' };
};

export const stockStatus = (q) => {
  if (q <= 0) return { label: 'Out', cls: 'badge-red' };
  if (q <= 10) return { label: 'Low', cls: 'badge-yellow' };
  return { label: 'OK', cls: 'badge-green' };
};
