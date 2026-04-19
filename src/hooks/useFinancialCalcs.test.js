import { describe, it, expect } from 'vitest';
import { calcFinancials } from './useFinancialCalcs';

const income = (o = {}) => ({ revenue: 1200000, cogs: 480000, opex: 240000, da: 60000, interest: 12000, tax: 48000, ...o });
const balance = (o = {}) => ({ cash: 300000, receivables: 150000, inventory: 60000, otherCurrent: 30000, ppe: 400000, otherLongTerm: 50000, payables: 90000, shortTermDebt: 40000, otherCurrentLiab: 20000, longTermDebt: 200000, equity: 640000, ...o });
const cf = (o = {}) => ({ operating: 180000, investing: -120000, financing: -40000, ...o });
const pr = (o = {}) => ({ revenue: 1000000, cash: 250000, ebitda: 450000, ...o });

describe('income statement', () => {
  it('calculates grossProfit', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.grossProfit).toBe(720000);
  });
  it('calculates ebitda', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.ebitda).toBe(480000);
  });
  it('calculates netProfit', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.netProfit).toBe(360000);
  });
  it('negative netProfit when expenses exceed revenue', () => {
    const r = calcFinancials({ income: income({ revenue: 100000, cogs: 80000, opex: 50000 }), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.netProfit).toBeLessThan(0);
  });
  it('zero revenue returns null margins', () => {
    const r = calcFinancials({ income: income({ revenue: 0 }), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.grossMargin).toBeNull();
    expect(r.netMargin).toBeNull();
  });
});

describe('balance sheet aggregates', () => {
  it('calculates currentAssets', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.currentAssets).toBe(540000);
  });
  it('calculates totalAssets', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.totalAssets).toBe(990000);
  });
  it('calculates currentLiabilities', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.currentLiabilities).toBe(150000);
  });
  it('calculates totalDebt', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.totalDebt).toBe(240000);
  });
});

describe('operatingCF and runway', () => {
  it('uses provided operatingCF', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf({ operating: 200000 }), prior: pr() });
    expect(r.operatingCF).toBe(200000);
  });
  it('falls back to netProfit+da when operating not provided', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: { investing: -120000, financing: -40000 }, prior: pr() });
    expect(r.operatingCF).toBe(420000);
  });
  it('respects real operatingCF of exactly 0 - does not fall back', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf({ operating: 0 }), prior: pr() });
    expect(r.operatingCF).toBe(0);
    expect(r.monthlyBurn).toBe(0);
    expect(r.runway).toBeNull();
  });
  it('calculates monthlyBurn for negative operatingCF (annual)', () => {
    const r = calcFinancials({ income: income(), balance: balance({ cash: 500000 }), cashFlow: cf({ operating: -120000 }), prior: pr(), period: 'Annual' });
    expect(r.monthlyBurn).toBeCloseTo(10000);
    expect(r.runway).toBe(50);
  });
  it('calculates runway for quarterly period', () => {
    const r = calcFinancials({ income: income(), balance: balance({ cash: 500000 }), cashFlow: cf({ operating: -30000 }), prior: pr(), period: 'Quarterly' });
    expect(r.monthlyBurn).toBeCloseTo(10000);
    expect(r.runway).toBe(50);
  });
  it('null runway when operatingCF is positive', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.runway).toBeNull();
    expect(r.monthlyBurn).toBe(0);
  });
  it('calculates freeCF', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.freeCF).toBe(60000);
  });
});

describe('financial ratios', () => {
  it('calculates grossMargin', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.grossMargin).toBeCloseTo(0.6);
  });
  it('calculates ebitdaMargin', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.ebitdaMargin).toBeCloseTo(0.4);
  });
  it('calculates netMargin', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.netMargin).toBeCloseTo(0.3);
  });
  it('calculates currentRatio', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.currentRatio).toBeCloseTo(3.6);
  });
  it('calculates DSO for annual period', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.dso).toBeCloseTo(45.625);
  });
  it('calculates interestCoverage', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.interestCoverage).toBeCloseTo(40);
  });
  it('null interestCoverage when interest is 0', () => {
    const r = calcFinancials({ income: income({ interest: 0 }), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.interestCoverage).toBeNull();
  });
  it('calculates revenueGrowth', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.revenueGrowth).toBeCloseTo(0.2);
  });
  it('null revenueGrowth when prior.revenue is 0', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr({ revenue: 0 }) });
    expect(r.revenueGrowth).toBeNull();
  });
});

describe('healthScore', () => {
  it('returns 0 when all inputs are zero', () => {
    const r = calcFinancials({ income: {}, balance: {}, cashFlow: {}, prior: {} });
    expect(r.healthScore).toBe(0);
  });
  it('returns value between 0 and 100', () => {
    const r = calcFinancials({ income: income(), balance: balance(), cashFlow: cf(), prior: pr() });
    expect(r.healthScore).toBeGreaterThanOrEqual(0);
    expect(r.healthScore).toBeLessThanOrEqual(100);
  });
  it('high score for healthy company', () => {
    const r = calcFinancials({
      income: income({ revenue: 10000000, cogs: 3000000, opex: 1000000, da: 200000, interest: 50000, tax: 300000 }),
      balance: balance({ cash: 5000000, receivables: 800000, payables: 400000, shortTermDebt: 100000, longTermDebt: 200000, equity: 8000000, ppe: 2000000 }),
      cashFlow: cf({ operating: 2000000, investing: -300000 }),
      prior: pr({ revenue: 8000000, cash: 4000000 }),
    });
    expect(r.healthScore).toBeGreaterThan(70);
  });
  it('low score for distressed company', () => {
    const r = calcFinancials({
      income: income({ revenue: 500000, cogs: 500000, opex: 200000 }),
      balance: balance({ cash: 10000, payables: 300000, shortTermDebt: 200000, equity: -50000 }),
      cashFlow: cf({ operating: -100000 }),
      prior: pr({ revenue: 700000, cash: 50000 }),
    });
    expect(r.healthScore).toBeLessThan(40);
  });
});

describe('period handling', () => {
  it('defaults to Annual for unknown period', () => {
    const r = calcFinancials({ income: income(), balance: balance({ cash: 120000 }), cashFlow: cf({ operating: -120000 }), prior: pr(), period: 'Monthly' });
    expect(r.monthlyBurn).toBeCloseTo(10000);
  });
  it('uses Semi-Annual (6 months) correctly', () => {
    const r = calcFinancials({ income: income(), balance: balance({ cash: 120000 }), cashFlow: cf({ operating: -60000 }), prior: pr(), period: 'Semi-Annual' });
    expect(r.monthlyBurn).toBeCloseTo(10000);
  });
});
