import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL = '#00A896';
const INDUSTRIES = ['Retail','Technology','Manufacturing','Healthcare','Financial Services','Real Estate','Hospitality','Construction','Education','Professional Services','Other'];
const CURRENCIES = ['USD','EGP','AED','SAR','EUR','GBP'];
const SYMS = {USD:'$',EGP:'E£',AED:'AED ',SAR:'SAR ',EUR:'€',GBP:'£'};
const PERIODS = ['Annual','Semi-Annual','Quarterly'];
const PDAYS = {Annual:365,'Semi-Annual':182,Quarterly:91};
const PMONTHS = {Annual:12,'Semi-Annual':6,Quarterly:3};
const YEARS = Array.from({length:6},(_,i)=>`${new Date().getFullYear()-i}`);

// ─── Formatting Helpers ───────────────────────────────────────────────────────
const fmt = (val, sym='$') => {
  if (val == null || isNaN(val)) return '—';
  const sign = val < 0 ? '-' : '';
  const v = Math.abs(val);
  if (v >= 1e9) return `${sign}${sym}${(v/1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${sign}${sym}${(v/1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${sign}${sym}${Math.round(v/1e3)}K`;
  return `${sign}${sym}${Math.round(v).toLocaleString()}`;
};
const pct = v => (v == null || isNaN(v)) ? '—' : `${(v*100).toFixed(1)}%`;
const N = v => parseFloat(v) || 0;
const safeDiv = (a, b) => (b != null && b !== 0) ? a / b : null;

// ─── HealthGauge ──────────────────────────────────────────────────────────────
function HealthGauge({ score }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical';
  const angleRad = Math.PI - (score / 100) * Math.PI;
  const endX = 90 + 70 * Math.cos(angleRad);
  const endY = 90 - 70 * Math.sin(angleRad);
  const largeArc = score > 50 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 110" width="180" height="110">
        {/* Background track */}
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Score arc */}
        {score > 0 && (
          <path
            d={`M 20 90 A 70 70 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
          />
        )}
        {/* Score number */}
        <text x="90" y="82" textAnchor="middle" fontSize="26" fontWeight="bold" fill="#1f2937">
          {score}
        </text>
        <text x="90" y="98" textAnchor="middle" fontSize="10" fill="#6b7280">
          / 100
        </text>
      </svg>
      <span className="text-sm font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, sym, hint, optional, isText }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="relative flex items-center">
        {sym && !isText && (
          <span className="absolute left-3 text-gray-500 text-sm font-medium select-none">{sym}</span>
        )}
        <input
          type={isText ? 'text' : 'number'}
          step="any"
          min={isText ? undefined : '0'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full border border-gray-300 rounded-lg py-2 pr-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition ${sym && !isText ? 'pl-10' : 'pl-3'}`}
          style={{ '--tw-ring-color': TEAL }}
          onFocus={e => { e.target.style.borderColor = TEAL; e.target.style.boxShadow = `0 0 0 2px ${TEAL}33`; }}
          onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
    </div>
  );
}

// ─── WizardProgress ───────────────────────────────────────────────────────────
function WizardProgress({ step }) {
  const steps = ['Company', 'Income', 'Balance Sheet', 'Cash Flow', 'Prior Period'];
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {steps.map((label, i) => {
        const num = i + 1;
        const active = num === step;
        const done = num < step;
        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 transition-all"
                style={{
                  backgroundColor: active || done ? TEAL : '#e5e7eb',
                  color: active || done ? '#fff' : '#9ca3af',
                }}
              >
                {done ? '✓' : num}
              </div>
              <span
                className="text-xs text-center hidden sm:block"
                style={{ color: active ? TEAL : done ? '#6b7280' : '#9ca3af', fontWeight: active ? 600 : 400 }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-0.5 flex-1 mx-1 transition-all"
                style={{ backgroundColor: done ? TEAL : '#e5e7eb' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Company ──────────────────────────────────────────────────────────
function Step1Company({ data, setData, onNext }) {
  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Company Information</h2>
      <p className="text-gray-500 text-sm mb-6">Tell us about your company to personalise your financial analysis.</p>
      <Field
        label="Company Name"
        value={data.name}
        onChange={v => set('name', v)}
        isText
      />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
        <select
          value={data.industry}
          onChange={e => set('industry', e.target.value)}
          className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none"
          onFocus={e => { e.target.style.borderColor = TEAL; }}
          onBlur={e => { e.target.style.borderColor = '#d1d5db'; }}
        >
          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={data.currency}
            onChange={e => set('currency', e.target.value)}
            className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Period</label>
          <select
            value={data.period}
            onChange={e => set('period', e.target.value)}
            className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none"
          >
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
        <select
          value={data.year}
          onChange={e => set('year', e.target.value)}
          className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 mb-6">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-gray-500">Your data stays in your browser and is never stored.</p>
      </div>
      <button
        onClick={onNext}
        disabled={!data.name.trim()}
        className="w-full py-3 rounded-lg text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
        style={{ backgroundColor: TEAL }}
      >
        Continue →
      </button>
    </div>
  );
}

// ─── Step 2: Income ───────────────────────────────────────────────────────────
function Step2Income({ data, setData, sym, onNext, onBack }) {
  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const revenue = N(data.revenue);
  const cogs = N(data.cogs);
  const opex = N(data.opex);
  const da = N(data.da);
  const interest = N(data.interest);
  const tax = N(data.tax);
  const grossProfit = revenue - cogs;
  const ebitda = grossProfit - opex;
  const ebit = ebitda - da;
  const netProfit = ebit - interest - tax;

  const MetricRow = ({ label, value, margin }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${value < 0 ? 'text-red-600' : 'text-gray-800'}`}>
          {fmt(value, sym)}
        </span>
        {margin != null && !isNaN(margin) && (
          <span className="text-xs text-gray-400 ml-2">{pct(margin)}</span>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Income Statement</h2>
      <p className="text-gray-500 text-sm mb-6">Enter your income statement figures for the period.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Field label="Revenue" value={data.revenue} onChange={v => set('revenue', v)} sym={sym} />
          <Field label="Cost of Goods Sold (COGS)" value={data.cogs} onChange={v => set('cogs', v)} sym={sym} />
          <Field label="Operating Expenses (OPEX)" value={data.opex} onChange={v => set('opex', v)} sym={sym} />
          <Field label="Depreciation & Amortisation" value={data.da} onChange={v => set('da', v)} sym={sym} />
          <Field label="Interest Expense" value={data.interest} onChange={v => set('interest', v)} sym={sym} />
          <Field label="Income Tax" value={data.tax} onChange={v => set('tax', v)} sym={sym} />
        </div>
        <div className="bg-gray-50 rounded-xl p-5 h-fit">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Live Preview</h3>
          <MetricRow label="Gross Profit" value={grossProfit} margin={revenue ? safeDiv(grossProfit, revenue) : null} />
          <MetricRow label="EBITDA" value={ebitda} margin={revenue ? safeDiv(ebitda, revenue) : null} />
          <MetricRow label="EBIT" value={ebit} margin={revenue ? safeDiv(ebit, revenue) : null} />
          <div className="mt-2 pt-2 border-t-2 border-gray-200">
            <MetricRow label="Net Profit" value={netProfit} margin={revenue ? safeDiv(netProfit, revenue) : null} />
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">← Back</button>
        <button onClick={onNext} className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition" style={{ backgroundColor: TEAL }}>Continue →</button>
      </div>
    </div>
  );
}

// ─── Step 3: Balance Sheet ────────────────────────────────────────────────────
function Step3Balance({ data, setData, sym, onNext, onBack }) {
  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const cash = N(data.cash);
  const receivables = N(data.receivables);
  const inventory = N(data.inventory);
  const otherCurrent = N(data.otherCurrent);
  const ppe = N(data.ppe);
  const otherLongTerm = N(data.otherLongTerm);
  const payables = N(data.payables);
  const shortTermDebt = N(data.shortTermDebt);
  const otherCurrentLiab = N(data.otherCurrentLiab);
  const longTermDebt = N(data.longTermDebt);
  const equity = N(data.equity);

  const currentAssets = cash + receivables + inventory + otherCurrent;
  const totalAssets = currentAssets + ppe + otherLongTerm;
  const currentLiabilities = payables + shortTermDebt + otherCurrentLiab;
  const totalLiabilities = currentLiabilities + longTermDebt;
  const totalLE = totalLiabilities + equity;
  const diff = totalAssets - totalLE;
  const balanced = Math.abs(diff) < 1;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Balance Sheet</h2>
      <p className="text-gray-500 text-sm mb-6">Enter your balance sheet figures at period end.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Assets</h3>
          <Field label="Cash & Equivalents" value={data.cash} onChange={v => set('cash', v)} sym={sym} />
          <Field label="Accounts Receivable" value={data.receivables} onChange={v => set('receivables', v)} sym={sym} />
          <Field label="Inventory" value={data.inventory} onChange={v => set('inventory', v)} sym={sym} />
          <Field label="Other Current Assets" value={data.otherCurrent} onChange={v => set('otherCurrent', v)} sym={sym} optional />
          <Field label="PP&E (Net)" value={data.ppe} onChange={v => set('ppe', v)} sym={sym} />
          <Field label="Other Long-Term Assets" value={data.otherLongTerm} onChange={v => set('otherLongTerm', v)} sym={sym} optional />
          <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm">
            <span className="text-gray-600 font-medium">Total Assets</span>
            <span className="font-bold text-gray-800">{fmt(totalAssets, sym)}</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Liabilities & Equity</h3>
          <Field label="Accounts Payable" value={data.payables} onChange={v => set('payables', v)} sym={sym} />
          <Field label="Short-Term Debt" value={data.shortTermDebt} onChange={v => set('shortTermDebt', v)} sym={sym} />
          <Field label="Other Current Liabilities" value={data.otherCurrentLiab} onChange={v => set('otherCurrentLiab', v)} sym={sym} optional />
          <Field label="Long-Term Debt" value={data.longTermDebt} onChange={v => set('longTermDebt', v)} sym={sym} />
          <Field label="Shareholders' Equity" value={data.equity} onChange={v => set('equity', v)} sym={sym} />
          <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm">
            <span className="text-gray-600 font-medium">Total Liabilities + Equity</span>
            <span className="font-bold text-gray-800">{fmt(totalLE, sym)}</span>
          </div>
        </div>
      </div>
      {/* Balance Checker */}
      <div className={`mt-4 rounded-lg p-3 flex items-center gap-2 ${balanced ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <span className={`text-lg ${balanced ? 'text-green-600' : 'text-yellow-600'}`}>{balanced ? '✓' : '⚠'}</span>
        <span className={`text-sm font-medium ${balanced ? 'text-green-700' : 'text-yellow-700'}`}>
          {balanced
            ? 'Assets = Liabilities + Equity ✓ Balance sheet is balanced.'
            : `Discrepancy: ${fmt(Math.abs(diff), sym)} — Assets ${diff > 0 ? 'exceed' : 'are less than'} Liabilities + Equity.`}
        </span>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">← Back</button>
        <button onClick={onNext} className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition" style={{ backgroundColor: TEAL }}>Continue →</button>
      </div>
    </div>
  );
}

// ─── Step 4: Cash Flow ────────────────────────────────────────────────────────
function Step4CashFlow({ data, setData, sym, income, balance, period, onNext, onBack }) {
  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const netProfit = N(income.revenue) - N(income.cogs) - N(income.opex) - N(income.da) - N(income.interest) - N(income.tax);
  const autoOperating = netProfit + N(income.da);
  const months = PMONTHS[period];

  const operatingCF = data.operating !== '' ? N(data.operating) : autoOperating;
  const monthlyBurn = operatingCF < 0 ? Math.abs(operatingCF / months) : 0;
  const runway = monthlyBurn > 0 ? Math.round(N(balance.cash) / monthlyBurn) : null;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Cash Flow Statement</h2>
      <p className="text-gray-500 text-sm mb-2">Enter your cash flow figures, or leave blank to auto-estimate.</p>
      <div className="bg-blue-50 rounded-lg p-3 mb-5 text-xs text-blue-700">
        Leave blank to auto-estimate from your income statement data.
      </div>
      <Field label="Operating Cash Flow" value={data.operating} onChange={v => set('operating', v)} sym={sym} optional />
      <Field label="Investing Cash Flow" value={data.investing} onChange={v => set('investing', v)} sym={sym} optional />
      <Field label="Financing Cash Flow" value={data.financing} onChange={v => set('financing', v)} sym={sym} optional />

      {/* Live calculations */}
      <div className="bg-gray-50 rounded-xl p-4 mt-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Live Estimates</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs text-gray-500">Monthly Burn Rate</p>
            <p className={`text-lg font-bold mt-1 ${monthlyBurn > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {monthlyBurn > 0 ? fmt(monthlyBurn, sym) : 'Positive CF'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs text-gray-500">Cash Runway</p>
            <p className={`text-lg font-bold mt-1 ${runway != null && runway < 6 ? 'text-red-600' : 'text-green-600'}`}>
              {runway != null ? `${runway} months` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">← Back</button>
        <button onClick={onNext} className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition" style={{ backgroundColor: TEAL }}>Continue →</button>
      </div>
    </div>
  );
}

// ─── Step 5: Prior Period ─────────────────────────────────────────────────────
function Step5Prior({ data, setData, sym, income, balance, onNext, onBack }) {
  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const revenue = N(income.revenue);
  const cash = N(balance.cash);
  const grossProfit = revenue - N(income.cogs);
  const ebitda = grossProfit - N(income.opex);

  const revenueGrowth = N(data.revenue) > 0 ? (revenue - N(data.revenue)) / N(data.revenue) : null;
  const cashGrowth = N(data.cash) > 0 ? (cash - N(data.cash)) / N(data.cash) : null;
  const ebitdaGrowth = N(data.ebitda) > 0 ? (ebitda - N(data.ebitda)) / N(data.ebitda) : null;

  const GrowthBadge = ({ val }) => {
    if (val == null) return null;
    const pos = val >= 0;
    return (
      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${pos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {pos ? '▲' : '▼'} {pct(Math.abs(val))} YoY
      </span>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Prior Period Comparison</h2>
      <p className="text-gray-500 text-sm mb-2">Optional: Enter prior period data for YoY analysis.</p>
      <div className="bg-blue-50 rounded-lg p-3 mb-5 text-xs text-blue-700">
        Leave blank to skip year-over-year comparisons.
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Field label="Prior Period Revenue" value={data.revenue} onChange={v => set('revenue', v)} sym={sym} optional />
          </div>
          <div className="pt-5"><GrowthBadge val={revenueGrowth} /></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Field label="Prior Period Cash" value={data.cash} onChange={v => set('cash', v)} sym={sym} optional />
          </div>
          <div className="pt-5"><GrowthBadge val={cashGrowth} /></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Field label="Prior Period EBITDA" value={data.ebitda} onChange={v => set('ebitda', v)} sym={sym} optional />
          </div>
          <div className="pt-5"><GrowthBadge val={ebitdaGrowth} /></div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">← Back</button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition"
          style={{ backgroundColor: TEAL }}
        >
          Generate Dashboard →
        </button>
      </div>
    </div>
  );
}

// ─── KPICard ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, trend, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
      {(sub || trend) && (
        <div className="flex items-center gap-1 mt-1">
          {trend && (
            <span className={`text-xs font-semibold ${color || (trend.startsWith('▲') ? 'text-green-600' : 'text-red-600')}`}>
              {trend}
            </span>
          )}
          {sub && <span className="text-xs text-gray-400">{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ─── AlertBanner ──────────────────────────────────────────────────────────────
function AlertBanner({ type, message }) {
  const styles = {
    danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: '🔴' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: '⚠️' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '✅' },
  };
  const s = styles[type] || styles.warning;
  return (
    <div className={`flex items-start gap-2 rounded-lg p-3 border ${s.bg} ${s.border} mb-2`}>
      <span className="flex-shrink-0">{s.icon}</span>
      <span className={`text-sm ${s.text}`}>{message}</span>
    </div>
  );
}

// ─── OverviewTab ──────────────────────────────────────────────────────────────
function OverviewTab({ calc, company }) {
  const sym = SYMS[company.currency];
  const {
    revenue, grossProfit, ebitda, netProfit, cash, receivables, equity, assetTurnover,
    healthScore, runway, currentRatio, deRatio, grossMargin, ebitdaMargin, netMargin,
    revenueGrowth, cashGrowth,
  } = calc;

  const alerts = [];
  if (runway != null && runway < 3) alerts.push({ type: 'danger', message: `Cash runway is critically low (${runway} months)` });
  else if (runway != null && runway < 6) alerts.push({ type: 'warning', message: `Cash runway below 6 months (${runway} months)` });
  if (currentRatio != null && currentRatio < 1.5) alerts.push({ type: 'warning', message: `Current ratio below benchmark (1.5x) — currently ${currentRatio.toFixed(2)}x` });
  if (deRatio != null && deRatio > 2.0) alerts.push({ type: 'warning', message: `High leverage: D/E ratio is ${deRatio.toFixed(2)}x` });

  const scoreLabel = healthScore >= 70 ? 'Your financials meet most benchmarks. Focus on sustaining performance and targeted improvements.'
    : healthScore >= 40 ? 'Several financial metrics need attention. Review leverage, margins, and liquidity carefully.'
    : 'Multiple financial metrics are below benchmark. Immediate action recommended on key risk areas.';

  const trendArrow = (val) => {
    if (val == null || isNaN(val)) return null;
    return val >= 0 ? `▲ ${pct(val)} YoY` : `▼ ${pct(Math.abs(val))} YoY`;
  };

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Financial Health Score</h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <HealthGauge score={healthScore} />
          <div className="flex-1">
            <p className="text-gray-600 text-sm leading-relaxed">{scoreLabel}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-xs text-green-700 font-medium">Healthy</p>
                <p className="text-xs text-green-600">Score ≥ 70</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2">
                <p className="text-xs text-yellow-700 font-medium">Needs Attention</p>
                <p className="text-xs text-yellow-600">Score 40–69</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xs text-red-700 font-medium">Critical</p>
                <p className="text-xs text-red-600">Score &lt; 40</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          {alerts.map((a, i) => <AlertBanner key={i} type={a.type} message={a.message} />)}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Revenue"
          value={fmt(revenue, sym)}
          trend={trendArrow(revenueGrowth)}
        />
        <KPICard
          label="Gross Profit"
          value={fmt(grossProfit, sym)}
          sub={pct(grossMargin)}
        />
        <KPICard
          label="EBITDA"
          value={fmt(ebitda, sym)}
          sub={pct(ebitdaMargin)}
        />
        <KPICard
          label="Net Profit"
          value={fmt(netProfit, sym)}
          sub={pct(netMargin)}
          color={netProfit < 0 ? 'text-red-600' : undefined}
        />
        <KPICard
          label="Cash Position"
          value={fmt(cash, sym)}
          trend={trendArrow(cashGrowth)}
        />
        <KPICard
          label="Accounts Receivable"
          value={fmt(receivables, sym)}
        />
        <KPICard
          label="Total Equity"
          value={fmt(equity, sym)}
        />
        <KPICard
          label="Asset Turnover"
          value={assetTurnover != null ? `${assetTurnover.toFixed(2)}x` : '—'}
        />
      </div>
    </div>
  );
}

// ─── CashFlowTab ──────────────────────────────────────────────────────────────
function CashFlowTab({ calc, company }) {
  const sym = SYMS[company.currency];
  const { operatingCF, investingCF, financingCF, freeCF, monthlyBurn, runway, weeks13, cash } = calc;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Operating CF"
          value={fmt(operatingCF, sym)}
          color={operatingCF < 0 ? 'text-red-600' : 'text-green-600'}
        />
        <KPICard
          label="Free Cash Flow"
          value={fmt(freeCF, sym)}
          color={freeCF < 0 ? 'text-red-600' : 'text-green-600'}
        />
        <KPICard
          label="Monthly Burn"
          value={monthlyBurn > 0 ? fmt(monthlyBurn, sym) : 'Positive CF'}
          color={monthlyBurn > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <KPICard
          label="Cash Runway"
          value={runway != null ? `${runway} mo` : 'N/A'}
          color={runway != null && runway < 6 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      {runway != null && runway < 6 && (
        <AlertBanner
          type={runway < 3 ? 'danger' : 'warning'}
          message={`Cash runway is ${runway} months. ${runway < 3 ? 'Immediate action required.' : 'Monitor closely and consider fundraising or cost cuts.'}`}
        />
      )}

      {/* 13-week projection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-1">13-Week Cash Projection</h3>
        <p className="text-xs text-gray-400 mb-4">Based on current operating cash flow run-rate</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks13} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmt(v, sym)} tick={{ fontSize: 10 }} width={70} />
              <Tooltip formatter={v => [fmt(v, sym), 'Cash Balance']} />
              <Bar dataKey="balance" radius={[3,3,0,0]}>
                {weeks13.map((entry, index) => (
                  <Cell key={index} fill={entry.balance >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CF breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Cash Flow Summary</h3>
        <div className="space-y-3">
          {[
            { label: 'Operating Activities', val: operatingCF },
            { label: 'Investing Activities', val: investingCF },
            { label: 'Financing Activities', val: financingCF },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-48">{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${val >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(100, Math.abs(val) / (Math.abs(operatingCF) + 1) * 100)}%` }}
                />
              </div>
              <span className={`text-sm font-semibold w-24 text-right ${val < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(val, sym)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RatiosTab ────────────────────────────────────────────────────────────────
function RatiosTab({ calc }) {
  const panels = [
    {
      title: 'Liquidity',
      ratios: [
        { label: 'Current Ratio', val: calc.currentRatio, fmt: v => `${v.toFixed(2)}x`, bench: '≥ 1.5x', pass: v => v >= 1.5 },
        { label: 'Cash Ratio', val: calc.cashRatio, fmt: v => `${v.toFixed(2)}x`, bench: '≥ 0.2x', pass: v => v >= 0.2 },
        { label: 'Days Sales Outstanding', val: calc.dso, fmt: v => `${Math.round(v)} days`, bench: '≤ 45 days', pass: v => v <= 45 },
        { label: 'Days Payables Outstanding', val: calc.dpo, fmt: v => `${Math.round(v)} days`, bench: '≥ 20 days', pass: v => v >= 20 },
      ],
    },
    {
      title: 'Profitability',
      ratios: [
        { label: 'Gross Margin', val: calc.grossMargin, fmt: v => pct(v), bench: '≥ 30%', pass: v => v >= 0.30 },
        { label: 'EBITDA Margin', val: calc.ebitdaMargin, fmt: v => pct(v), bench: '≥ 10%', pass: v => v >= 0.10 },
        { label: 'Net Profit Margin', val: calc.netMargin, fmt: v => pct(v), bench: '≥ 5%', pass: v => v >= 0.05 },
        { label: 'Return on Equity', val: calc.roe, fmt: v => pct(v), bench: '≥ 10%', pass: v => v >= 0.10 },
      ],
    },
    {
      title: 'Leverage',
      ratios: [
        { label: 'Debt / Equity', val: calc.deRatio, fmt: v => `${v.toFixed(2)}x`, bench: '≤ 2.0x', pass: v => v <= 2.0 },
        { label: 'Debt / Assets', val: calc.debtAssets, fmt: v => pct(v), bench: '≤ 60%', pass: v => v <= 0.60 },
        { label: 'Interest Coverage', val: calc.interestCoverage, fmt: v => `${v.toFixed(1)}x`, bench: '≥ 2.0x', pass: v => v >= 2.0 },
        { label: 'Equity Ratio', val: calc.equityRatio, fmt: v => pct(v), bench: '≥ 30%', pass: v => v >= 0.30 },
      ],
    },
    {
      title: 'Efficiency & Growth',
      ratios: [
        { label: 'Asset Turnover', val: calc.assetTurnover, fmt: v => `${v.toFixed(2)}x`, bench: '≥ 0.5x', pass: v => v >= 0.50 },
        { label: 'Return on Assets', val: calc.roa, fmt: v => pct(v), bench: '≥ 3%', pass: v => v >= 0.03 },
        { label: 'Revenue Growth (YoY)', val: calc.revenueGrowth, fmt: v => pct(v), bench: '≥ 5%', pass: v => v >= 0.05 },
        { label: 'Cash Growth (YoY)', val: calc.cashGrowth, fmt: v => pct(v), bench: '≥ 0%', pass: v => v >= 0 },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {panels.map(panel => (
        <div key={panel.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{panel.title}</h3>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Metric</th>
                <th className="text-right pb-2 font-medium">Value</th>
                <th className="text-right pb-2 font-medium">Benchmark</th>
                <th className="text-right pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {panel.ratios.map(r => {
                const hasVal = r.val != null && !isNaN(r.val);
                const passes = hasVal ? r.pass(r.val) : null;
                return (
                  <tr key={r.label} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-sm text-gray-600">{r.label}</td>
                    <td className="py-2 text-sm font-semibold text-gray-800 text-right">
                      {hasVal ? r.fmt(r.val) : '—'}
                    </td>
                    <td className="py-2 text-xs text-gray-400 text-right">{r.bench}</td>
                    <td className="py-2 text-right">
                      {passes === null ? (
                        <span className="text-gray-300 text-sm">—</span>
                      ) : passes ? (
                        <span className="text-green-500 font-bold">✓</span>
                      ) : (
                        <span className="text-red-500 font-bold">✗</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── AdvisorTab ───────────────────────────────────────────────────────────────
function AdvisorTab({ calc, company, aiLoading, aiResults, customQuestion, setCustomQuestion, askClaude }) {
  const presets = [
    { key: 'board', icon: '📋', label: 'Board Summary', desc: 'Board-ready financial narrative with key findings' },
    { key: 'cash', icon: '⚠️', label: 'Cash Risk Analysis', desc: '90-day cash flow risk assessment with mitigation actions' },
    { key: 'growth', icon: '📈', label: 'Growth Plan', desc: '3 CFO-level growth strategies for MENA markets' },
  ];

  const Spinner = () => (
    <svg className="animate-spin h-4 w-4 text-white inline-block ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-base font-semibold text-gray-700 mb-1">AI Financial Advisor</h3>
        <p className="text-sm text-gray-400 mb-5">Powered by Claude — get instant CFO-level insights based on your financial data.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map(p => (
            <div key={p.key} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <div className="text-2xl mb-1">{p.icon}</div>
                <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
              </div>
              <button
                onClick={() => askClaude(p.key)}
                disabled={aiLoading !== null}
                className="mt-auto py-2 px-4 rounded-lg text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition"
                style={{ backgroundColor: TEAL }}
              >
                {aiLoading === p.key ? (<>Analysing<Spinner /></>) : 'Generate'}
              </button>
              {aiResults[p.key] && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {aiResults[p.key]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom question */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-base font-semibold text-gray-700 mb-1">Ask a Custom Question</h3>
        <p className="text-sm text-gray-400 mb-4">Ask Claude anything about your financials.</p>
        <textarea
          value={customQuestion}
          onChange={e => setCustomQuestion(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none resize-none"
          placeholder="e.g. What are the top 3 things I should focus on to improve profitability this quarter?"
          onFocus={e => { e.target.style.borderColor = TEAL; e.target.style.boxShadow = `0 0 0 2px ${TEAL}33`; }}
          onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
        />
        <button
          onClick={() => askClaude('custom')}
          disabled={!customQuestion.trim() || aiLoading !== null}
          className="mt-3 py-2 px-6 rounded-lg text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
          style={{ backgroundColor: TEAL }}
        >
          {aiLoading === 'custom' ? 'Asking Claude…' : 'Ask Claude'}
        </button>
        {aiResults.custom && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {aiResults.custom}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('wizard');
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');

  const [company, setCompany] = useState({
    name: '', industry: 'Technology', currency: 'USD', period: 'Annual', year: String(new Date().getFullYear()),
  });
  const [income, setIncome] = useState({
    revenue: '', cogs: '', opex: '', da: '', interest: '', tax: '',
  });
  const [balance, setBalance] = useState({
    cash: '', receivables: '', inventory: '', otherCurrent: '', ppe: '', otherLongTerm: '',
    payables: '', shortTermDebt: '', otherCurrentLiab: '', longTermDebt: '', equity: '',
  });
  const [cashFlow, setCashFlow] = useState({ operating: '', investing: '', financing: '' });
  const [prior, setPrior] = useState({ revenue: '', cash: '', ebitda: '' });

  const [aiLoading, setAiLoading] = useState(null);
  const [aiResults, setAiResults] = useState({ board: '', cash: '', growth: '', custom: '' });
  const [customQuestion, setCustomQuestion] = useState('');

  // ─── Calculations ──────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const revenue = N(income.revenue);
    const cogs = N(income.cogs);
    const opex = N(income.opex);
    const da = N(income.da);
    const interest = N(income.interest);
    const tax = N(income.tax);
    const grossProfit = revenue - cogs;
    const ebitda = grossProfit - opex;
    const ebit = ebitda - da;
    const netProfit = ebit - interest - tax;

    const cash = N(balance.cash);
    const receivables = N(balance.receivables);
    const inventory = N(balance.inventory);
    const otherCurrent = N(balance.otherCurrent);
    const ppe = N(balance.ppe);
    const otherLongTerm = N(balance.otherLongTerm);
    const payables = N(balance.payables);
    const shortTermDebt = N(balance.shortTermDebt);
    const otherCurrentLiab = N(balance.otherCurrentLiab);
    const longTermDebt = N(balance.longTermDebt);
    const equity = N(balance.equity);

    const currentAssets = cash + receivables + inventory + otherCurrent;
    const totalAssets = currentAssets + ppe + otherLongTerm;
    const currentLiabilities = payables + shortTermDebt + otherCurrentLiab;
    const totalDebt = shortTermDebt + longTermDebt;
    const totalLiabilities = currentLiabilities + longTermDebt;
    const totalLE = totalLiabilities + equity;
    const balanceDiff = totalAssets - totalLE;

    const months = PMONTHS[company.period];
    const operatingCF = cashFlow.operating !== '' ? N(cashFlow.operating) : netProfit + da;
    const investingCF = N(cashFlow.investing);
    const financingCF = N(cashFlow.financing);
    const freeCF = operatingCF + investingCF;
    const monthlyBurn = operatingCF < 0 ? Math.abs(operatingCF / months) : 0;
    const runway = monthlyBurn > 0 ? Math.round(cash / monthlyBurn) : null;

    const period = company.period;
    const currentRatio = safeDiv(currentAssets, currentLiabilities);
    const cashRatio = safeDiv(cash, currentLiabilities);
    const dso = safeDiv(receivables * PDAYS[period], revenue);
    const dpo = safeDiv(payables * PDAYS[period], cogs);
    const grossMargin = safeDiv(grossProfit, revenue);
    const ebitdaMargin = safeDiv(ebitda, revenue);
    const netMargin = safeDiv(netProfit, revenue);
    const roe = safeDiv(netProfit, equity);
    const deRatio = safeDiv(totalDebt, equity);
    const debtAssets = safeDiv(totalDebt, totalAssets);
    const interestCoverage = interest > 0 ? safeDiv(ebitda, interest) : null;
    const equityRatio = safeDiv(equity, totalAssets);
    const assetTurnover = safeDiv(revenue, totalAssets);
    const roa = safeDiv(netProfit, totalAssets);
    const revenueGrowth = N(prior.revenue) > 0 ? (revenue - N(prior.revenue)) / N(prior.revenue) : null;
    const cashGrowth = N(prior.cash) > 0 ? (cash - N(prior.cash)) / N(prior.cash) : null;

    const benchmarks = [
      [currentRatio, v => v >= 1.5],
      [cashRatio, v => v >= 0.2],
      [dso, v => v <= 45],
      [dpo, v => v >= 20],
      [grossMargin, v => v >= 0.30],
      [ebitdaMargin, v => v >= 0.10],
      [netMargin, v => v >= 0.05],
      [roe, v => v >= 0.10],
      [deRatio, v => v <= 2.0],
      [debtAssets, v => v <= 0.60],
      [interestCoverage, v => v >= 2.0],
      [equityRatio, v => v >= 0.30],
      [assetTurnover, v => v >= 0.50],
      [roa, v => v >= 0.03],
      [revenueGrowth, v => v >= 0.05],
      [cashGrowth, v => v >= 0],
    ];
    const validBenchmarks = benchmarks.filter(([v]) => v != null && !isNaN(v));
    const passing = validBenchmarks.filter(([v, fn]) => fn(v)).length;
    const healthScore = validBenchmarks.length > 0 ? Math.round((passing / validBenchmarks.length) * 100) : 0;

    const weeklyChange = operatingCF / (months * 4.333);
    const weeks13 = Array.from({ length: 13 }, (_, i) => ({
      week: `W${i+1}`,
      balance: Math.round(cash + weeklyChange * (i + 1)),
      change: Math.round(weeklyChange),
    }));

    return {
      revenue, cogs, opex, da, interest, tax,
      grossProfit, ebitda, ebit, netProfit,
      cash, receivables, inventory, otherCurrent, ppe, otherLongTerm,
      payables, shortTermDebt, otherCurrentLiab, longTermDebt, equity,
      currentAssets, totalAssets, currentLiabilities, totalDebt, totalLiabilities, totalLE, balanceDiff,
      operatingCF, investingCF, financingCF, freeCF, monthlyBurn, runway,
      currentRatio, cashRatio, dso, dpo, grossMargin, ebitdaMargin, netMargin, roe,
      deRatio, debtAssets, interestCoverage, equityRatio, assetTurnover, roa,
      revenueGrowth, cashGrowth, healthScore, weeks13,
    };
  }, [income, balance, cashFlow, prior, company.period]);

  // ─── askClaude ─────────────────────────────────────────────────────────────
  const askClaude = async (type) => {
    setAiLoading(type);
    const sym = SYMS[company.currency];
    const context = `
Company: ${company.name} | Industry: ${company.industry} | Period: ${company.period} ${company.year} | Currency: ${company.currency}
Revenue: ${fmt(calc.revenue, sym)} | Gross Profit: ${fmt(calc.grossProfit, sym)} (${pct(calc.grossMargin)})
EBITDA: ${fmt(calc.ebitda, sym)} (${pct(calc.ebitdaMargin)}) | Net Profit: ${fmt(calc.netProfit, sym)} (${pct(calc.netMargin)})
Cash: ${fmt(calc.cash, sym)} | Total Assets: ${fmt(calc.totalAssets, sym)} | Equity: ${fmt(calc.equity, sym)}
Current Ratio: ${calc.currentRatio?.toFixed(2) ?? '—'} | D/E: ${calc.deRatio?.toFixed(2) ?? '—'} | Interest Coverage: ${calc.interestCoverage?.toFixed(1) ?? '—'}
ROE: ${pct(calc.roe)} | ROA: ${pct(calc.roa)} | Asset Turnover: ${calc.assetTurnover?.toFixed(2) ?? '—'}
Operating CF: ${fmt(calc.operatingCF, sym)} | Cash Runway: ${calc.runway ? calc.runway + ' months' : 'N/A'}
Financial Health Score: ${calc.healthScore}/100
    `.trim();

    const prompts = {
      board: `You are a senior CFO advisor for a MENA-region SME. Write a concise board-ready financial narrative (3-4 paragraphs) with key findings and recommendations based on this data:\n\n${context}`,
      cash: `You are a CFO advisor. Provide a 90-day cash flow risk assessment with specific risks and mitigation actions based on this financial data:\n\n${context}`,
      growth: `You are a CFO advisor specializing in MENA markets. Provide 3 specific CFO-level growth strategies with implementation steps based on this data:\n\n${context}`,
      custom: `You are a CFO advisor. The user asks: "${customQuestion}"\n\nFinancial data:\n${context}\n\nProvide a clear, professional answer.`,
    };

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompts[type] }),
      });
      const data = await res.json();
      setAiResults(prev => ({ ...prev, [type]: data.success ? data.insight : `Error: ${data.error}` }));
    } catch (e) {
      setAiResults(prev => ({ ...prev, [type]: `Error: ${e.message}` }));
    } finally {
      setAiLoading(null);
    }
  };

  const sym = SYMS[company.currency];

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'cashflow', label: 'Cash Flow' },
    { key: 'ratios', label: 'Ratios' },
    { key: 'advisor', label: 'AI Advisor' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  if (screen === 'wizard') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-8 px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: TEAL }}>CFO Pulse</h1>
          <p className="text-gray-400 text-sm mt-1">by Axcell — Financial Intelligence Platform</p>
        </div>

        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
          <WizardProgress step={step} />
          {step === 1 && <Step1Company data={company} setData={setCompany} onNext={() => setStep(2)} />}
          {step === 2 && <Step2Income data={income} setData={setIncome} sym={sym} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <Step3Balance data={balance} setData={setBalance} sym={sym} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && (
            <Step4CashFlow
              data={cashFlow} setData={setCashFlow} sym={sym}
              income={income} balance={balance} period={company.period}
              onNext={() => setStep(5)} onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <Step5Prior
              data={prior} setData={setPrior} sym={sym}
              income={income} balance={balance}
              onNext={() => { setScreen('dashboard'); setActiveTab('overview'); }}
              onBack={() => setStep(4)}
            />
          )}
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: TEAL }}>CFO Pulse</h1>
            {company.name && (
              <div className="hidden sm:flex items-center gap-1 text-gray-400">
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-600 font-medium">{company.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">
                  {company.period} {company.year}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setScreen('wizard')}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
          >
            ✏️ <span>Edit Data</span>
          </button>
        </div>
        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-0 border-t border-gray-100">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === t.key
                  ? 'border-current font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
              style={activeTab === t.key ? { color: TEAL, borderColor: TEAL } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'overview' && <OverviewTab calc={calc} company={company} />}
        {activeTab === 'cashflow' && <CashFlowTab calc={calc} company={company} />}
        {activeTab === 'ratios' && <RatiosTab calc={calc} />}
        {activeTab === 'advisor' && (
          <AdvisorTab
            calc={calc}
            company={company}
            aiLoading={aiLoading}
            aiResults={aiResults}
            customQuestion={customQuestion}
            setCustomQuestion={setCustomQuestion}
            askClaude={askClaude}
          />
        )}
      </main>
    </div>
  );
}
