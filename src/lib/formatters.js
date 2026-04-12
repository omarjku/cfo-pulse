export const fmt = (val, sym = '$') => {
  if (val == null || isNaN(val)) return '—';
  const sign = val < 0 ? '-' : '';
  const v = Math.abs(val);
  if (v >= 1e9) return `${sign}${sym}${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${sign}${sym}${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${sign}${sym}${Math.round(v / 1e3)}K`;
  return `${sign}${sym}${Math.round(v).toLocaleString()}`;
};

export const pct = (v) =>
  v == null || isNaN(v) ? '—' : `${(v * 100).toFixed(1)}%`;

export const N = (v) => parseFloat(v) || 0;

export const safeDiv = (a, b) =>
  b != null && b !== 0 ? a / b : null;
