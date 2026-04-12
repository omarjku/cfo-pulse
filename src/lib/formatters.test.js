import { describe, it, expect } from 'vitest';
import { fmt, pct, N, safeDiv } from './formatters';

describe('fmt', () => {
  it('formats billions', () => expect(fmt(1_500_000_000, '$')).toBe('$1.50B'));
  it('formats millions', () => expect(fmt(2_400_000, '$')).toBe('$2.4M'));
  it('formats thousands', () => expect(fmt(45_000, '$')).toBe('$45K'));
  it('formats small numbers', () => expect(fmt(500, '$')).toBe('$500'));
  it('handles negatives', () => expect(fmt(-1_200_000, '$')).toBe('-$1.2M'));
  it('handles null', () => expect(fmt(null, '$')).toBe('—'));
  it('uses default symbol', () => expect(fmt(1000)).toBe('$1K'));
});

describe('pct', () => {
  it('formats decimal as percent', () => expect(pct(0.342)).toBe('34.2%'));
  it('handles null', () => expect(pct(null)).toBe('—'));
});

describe('N', () => {
  it('parses float', () => expect(N('3.14')).toBe(3.14));
  it('returns 0 for invalid', () => expect(N('abc')).toBe(0));
});

describe('safeDiv', () => {
  it('divides safely', () => expect(safeDiv(10, 2)).toBe(5));
  it('returns null on zero denominator', () => expect(safeDiv(10, 0)).toBeNull());
  it('returns null on null denominator', () => expect(safeDiv(10, null)).toBeNull());
});
