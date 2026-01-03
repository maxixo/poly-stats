export const formatNumber = (value: number, decimals = 2): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
};

export const formatPercent = (value: number, decimals = 1): string => {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatAddress = (address: string): string => {
  if (!address) {
    return "";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatDateTime = (value: string | number | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  });
};

export const formatDurationHours = (hours: number): string => {
  if (!Number.isFinite(hours)) {
    return "0h";
  }
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  return `${(hours / 24).toFixed(1)}d`;
};
