import { useMemo } from 'react';
import { N, safeDiv } from '../lib/formatters';

const PMONTHS = { Annual: 12, 'Semi-Annual': 6, Quarterly: 3 };
const PDAYS   = { Annual: 365, 'Semi-Annual': 182, Quarterly: 91 };

/**
 * Pure calculation function — exported for unit testing.
 * useFinancialCalcs wraps this with useMemo.
 */
export function calcFinancials({ income = {}, balance = {}, cashFlow = {}, prior = {}, period = 'Annual' }) {
  const revenue = N(income.revenue), cogs = N(income.cogs), opex = N(income.opex);
  const da = N(income.da), interest = N(income.interest), tax = N(income.tax);
  const grossProfit = revenue - cogs, ebitda = grossProfit - opex;
  const ebit = ebitda - da, netProfit = ebit - interest - tax;

  const cash = N(balance.cash), receivables = N(balance.receivables);
  const inventory = N(balance.inventory), otherCurrent = N(balance.otherCurrent);
  const ppe = N(balance.ppe), otherLongTerm = N(balance.otherLongTerm);
  const payables = N(balance.payables), shortTermDebt = N(balance.shortTermDebt);
  const otherCurrentLiab = N(balance.otherCurrentLiab), longTermDebt = N(balance.longTermDebt);
  const equity = N(balance.equity);

  const currentAssets = cash + receivables + inventory + otherCurrent;
  const totalAssets = currentAssets + ppe + otherLongTerm;
  const currentLiabilities = payables + shortTermDebt + otherCurrentLiab;
  const totalDebt = shortTermDebt + longTermDebt;
  const totalLiabilities = currentLiabilities + longTermDebt;

  const months = PMONTHS[period] || 12;

  // Use explicit null/undefined check so a real operating CF of 0 isn't discarded.
  const hasOperatingCF = cashFlow.operating != null && cashFlow.operating !== '';
  const operatingCF = hasOperatingCF ? N(cashFlow.operating) : (netProfit + da);
  const investingCF = N(cashFlow.investing), financingCF = N(cashFlow.financing);
  const freeCF = operatingCF + investingCF;
  const monthlyBurn = operatingCF < 0 ? Math.abs(operatingCF / months) : 0;
  const runway = monthlyBurn > 0 ? Math.round(cash / monthlyBurn) : null;

  const grossMargin  = safeDiv(grossProfit, revenue);
  const ebitdaMargin = safeDiv(ebitda, revenue);
  const netMargin    = safeDiv(netProfit, revenue);
  const currentRatio = safeDiv(currentAssets, currentLiabilities);
  const cashRatio    = safeDiv(cash, currentLiabilities);
  const dso          = safeDiv(receivables * PDAYS[period], revenue);
  const dpo          = safeDiv(payables * PDAYS[period], cogs);
  const roe          = safeDiv(netProfit, equity);
  const deRatio      = safeDiv(totalDebt, equity);
  const debtAssets   = safeDiv(totalDebt, totalAssets);
  const interestCoverage = interest > 0 ? safeDiv(ebitda, interest) : null;
  const equityRatio  = safeDiv(equity, totalAssets);
  const assetTurnover = safeDiv(revenue, totalAssets);
  const roa          = safeDiv(netProfit, totalAssets);
  const revenueGrowth = N(prior.revenue) > 0 ? (revenue - N(prior.revenue)) / N(prior.revenue) : null;
  const cashGrowth   = N(prior.cash) > 0 ? (cash - N(prior.cash)) / N(prior.cash) : null;

  const benchmarks = [
    [currentRatio, v => v >= 1.5], [cashRatio, v => v >= 0.2],
    [dso, v => v <= 45], [dpo, v => v >= 20],
    [grossMargin, v => v >= 0.3], [ebitdaMargin, v => v >= 0.1],
    [netMargin, v => v >= 0.05], [roe, v => v >= 0.1],
    [deRatio, v => v <= 2.0], [debtAssets, v => v <= 0.6],
    [interestCoverage, v => v >= 2.0], [equityRatio, v => v >= 0.3],
    [assetTurnover, v => v >= 0.5], [roa, v => v >= 0.03],
    [revenueGrowth, v => v >= 0.05], [cashGrowth, v => v >= 0],
  ];
  const valid = benchmarks.filter(([v]) => v != null && !isNaN(v));
  const healthScore = valid.length > 0
    ? Math.round(valid.filter(([v, fn]) => fn(v)).length / valid.length * 100)
    : 0;

  return {
    revenue, cogs, opex, da, interest, tax, grossProfit, ebitda, ebit, netProfit,
    cash, receivables, inventory, otherCurrent, ppe, otherLongTerm,
    payables, shortTermDebt, otherCurrentLiab, longTermDebt, equity,
    currentAssets, totalAssets, currentLiabilities, totalDebt, totalLiabilities,
    operatingCF, investingCF, financingCF, freeCF, monthlyBurn, runway,
    grossMargin, ebitdaMargin, netMargin, currentRatio, cashRatio, dso, dpo,
    roe, deRatio, debtAssets, interestCoverage, equityRatio, assetTurnover, roa,
    revenueGrowth, cashGrowth, healthScore,
  };
}

export function useFinancialCalcs({ income, balance, cashFlow, prior, period }) {
  return useMemo(
    () => calcFinancials({ income, balance, cashFlow, prior, period }),
    [income, balance, cashFlow, prior, period],
  );
}
