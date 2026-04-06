import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── Design System ────────────────────────────────────────────────────────────
const NAVY    = '#0C1929';
const NAVY2   = '#152338';
const ACCENT  = '#1D4ED8';
const ACCENT2 = '#1E40AF';
const BG      = '#EDF1F8';
const SURFACE = '#FFFFFF';
const BORDER  = '#DDE3EF';
const TEXT1   = '#0F172A';
const TEXT2   = '#475569';
const TEXT3   = '#94A3B8';
const SUCCESS = '#059669';
const WARNING = '#D97706';
const DANGER  = '#DC2626';

// ─── Constants ────────────────────────────────────────────────────────────────
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

// ─── MarkdownText ─────────────────────────────────────────────────────────────
function InlineText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

function MarkdownText({ children }) {
  if (!children) return null;
  const blocks = children.split(/\n{2,}/);
  return (
    <div style={{ lineHeight: 1.65 }}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter(l => l.trim());
        const isBullet = lines.length > 0 && lines[0].match(/^[-•]\s/);
        const isNumbered = lines.length > 0 && lines[0].match(/^\d+\.\s/);
        if (isBullet) {
          return (
            <ul key={bi} style={{ listStyleType: 'disc', paddingLeft: '1.25rem', margin: '0.4rem 0' }}>
              {lines.map((l, i) => {
                const text = l.replace(/^[-•]\s+/, '');
                return text ? <li key={i} style={{ marginBottom: '0.2rem' }}><InlineText text={text} /></li> : null;
              })}
            </ul>
          );
        }
        if (isNumbered) {
          return (
            <ol key={bi} style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', margin: '0.4rem 0' }}>
              {lines.map((l, i) => {
                const text = l.replace(/^\d+\.\s+/, '');
                return text ? <li key={i} style={{ marginBottom: '0.2rem' }}><InlineText text={text} /></li> : null;
              })}
            </ol>
          );
        }
        return (
          <p key={bi} style={{ margin: '0.3rem 0' }}>
            {lines.map((l, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                <InlineText text={l} />
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ─── HealthGauge ──────────────────────────────────────────────────────────────
function HealthGauge({ score }) {
  const color = score >= 70 ? SUCCESS : score >= 40 ? WARNING : DANGER;
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical';
  const angleRad = Math.PI - (score / 100) * Math.PI;
  const endX = 90 + 70 * Math.cos(angleRad);
  const endY = 90 - 70 * Math.sin(angleRad);
  const largeArc = score > 50 ? 1 : 0;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 110" width="180" height="110">
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke={BORDER} strokeWidth="14" strokeLinecap="round" />
        {score > 0 && (
          <path d={`M 20 90 A 70 70 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
        )}
        <text x="90" y="82" textAnchor="middle" fontSize="26" fontWeight="700" fill={TEXT1}>{score}</text>
        <text x="90" y="98" textAnchor="middle" fontSize="10" fill={TEXT3}>/ 100</text>
      </svg>
      <span className="text-sm font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, sym, hint, optional, isText, required, showError }) {
  const hasError = required && showError && !value.toString().trim();
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: hasError ? DANGER : TEXT2 }}>
        {label}
        {required && <span style={{ color: DANGER }} className="ml-0.5">*</span>}
        {optional && <span style={{ color: TEXT3 }} className="ml-1 normal-case font-normal text-xs">— optional</span>}
      </label>
      {hint && <p className="text-xs mb-1" style={{ color: TEXT3 }}>{hint}</p>}
      {hasError && <p className="text-xs mb-1" style={{ color: DANGER }}>Required — enter a value to continue.</p>}
      <div className="relative flex items-center">
        {sym && !isText && (
          <span className="absolute left-3 text-xs font-medium select-none" style={{ color: TEXT2 }}>{sym}</span>
        )}
        <input
          type={isText ? 'text' : 'number'}
          step="any"
          min={isText ? undefined : '0'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg py-2.5 pr-3 text-sm transition-all"
          style={{
            paddingLeft: sym && !isText ? '2.5rem' : '0.75rem',
            border: `1.5px solid ${hasError ? DANGER : BORDER}`,
            outline: 'none',
            background: SURFACE,
            color: TEXT1,
            fontFamily: 'inherit',
          }}
          onFocus={e => { e.target.style.borderColor = hasError ? DANGER : ACCENT; e.target.style.boxShadow = `0 0 0 3px ${hasError ? DANGER : ACCENT}22`; }}
          onBlur={e => { e.target.style.borderColor = hasError ? DANGER : BORDER; e.target.style.boxShadow = 'none'; }}
        />
      </div>
    </div>
  );
}

// ─── WizardProgress ───────────────────────────────────────────────────────────
function WizardProgress({ step }) {
  const steps = ['Company', 'Income', 'Balance Sheet', 'Cash Flow', 'Prior Period'];
  return (
    <div className="flex items-center justify-between mb-8 px-1">
      {steps.map((label, i) => {
        const num = i + 1;
        const active = num === step;
        const done = num < step;
        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all"
                style={{
                  backgroundColor: active ? ACCENT : done ? NAVY : BG,
                  color: active || done ? '#fff' : TEXT3,
                  border: `2px solid ${active ? ACCENT : done ? NAVY : BORDER}`,
                }}
              >
                {done ? '✓' : num}
              </div>
              <span className="text-xs text-center hidden sm:block" style={{ color: active ? ACCENT : done ? TEXT2 : TEXT3, fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="h-0.5 flex-1 mx-1 transition-all" style={{ backgroundColor: done ? NAVY : BORDER }} />
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
  const [showError, setShowError] = useState(false);
  const selectStyle = {
    width: '100%', border: `1.5px solid ${BORDER}`, borderRadius: '0.5rem',
    padding: '0.625rem 0.75rem', fontSize: '0.875rem', background: SURFACE,
    color: TEXT1, outline: 'none', fontFamily: 'inherit',
  };
  const handleNext = () => {
    if (!data.name.trim()) { setShowError(true); return; }
    onNext();
  };
  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: TEXT1 }}>Company Information</h2>
      <p className="text-sm mb-6" style={{ color: TEXT2 }}>Tell us about your company to personalise your financial analysis.</p>
      <Field label="Company Name" value={data.name} onChange={v => set('name', v)} isText required showError={showError} />
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: TEXT2 }}>Industry</label>
        <select value={data.industry} onChange={e => set('industry', e.target.value)} style={selectStyle}>
          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: TEXT2 }}>Currency</label>
          <select value={data.currency} onChange={e => set('currency', e.target.value)} style={selectStyle}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: TEXT2 }}>Reporting Period</label>
          <select value={data.period} onChange={e => set('period', e.target.value)} style={selectStyle}>
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: TEXT2 }}>Year</label>
        <select value={data.year} onChange={e => set('year', e.target.value)} style={selectStyle}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2 rounded-lg p-3 mb-6" style={{ background: BG, border: `1px solid ${BORDER}` }}>
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: TEXT3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs" style={{ color: TEXT3 }}>Your data stays in your browser and is never stored on our servers.</p>
      </div>
      <button onClick={handleNext} className="w-full py-3 rounded-lg text-white font-semibold text-sm transition" style={{ background: ACCENT }}>
        Continue
      </button>
    </div>
  );
}

// ─── Step 2: Income ───────────────────────────────────────────────────────────
function Step2Income({ data, setData, sym, onNext, onBack }) {
  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const [showError, setShowError] = useState(false);
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

  const handleNext = () => {
    if (!data.revenue.trim() || !data.cogs.trim() || !data.opex.trim()) { setShowError(true); return; }
    onNext();
  };

  const MetricRow = ({ label, value, margin }) => (
    <div className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: BORDER }}>
      <span className="text-sm" style={{ color: TEXT2 }}>{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{ color: value < 0 ? DANGER : TEXT1 }}>{fmt(value, sym)}</span>
        {margin != null && !isNaN(margin) && (
          <span className="text-xs ml-2" style={{ color: TEXT3 }}>{pct(margin)}</span>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: TEXT1 }}>Income Statement</h2>
      <p className="text-sm mb-2" style={{ color: TEXT2 }}>Enter your income statement figures for the period.</p>
      <div className="flex items-center gap-2 rounded-lg p-3 mb-5" style={{ background: '#EFF6FF', border: `1px solid #BFDBFE` }}>
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs" style={{ color: ACCENT2 }}>Fields marked <span style={{ color: DANGER }}>*</span> are required for accurate financial calculations.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Field label="Revenue" value={data.revenue} onChange={v => set('revenue', v)} sym={sym} required showError={showError} />
          <Field label="Cost of Goods Sold (COGS)" value={data.cogs} onChange={v => set('cogs', v)} sym={sym} required showError={showError} />
          <Field label="Operating Expenses (OPEX)" value={data.opex} onChange={v => set('opex', v)} sym={sym} required showError={showError} />
          <Field label="Depreciation & Amortisation" value={data.da} onChange={v => set('da', v)} sym={sym} optional />
          <Field label="Interest Expense" value={data.interest} onChange={v => set('interest', v)} sym={sym} optional />
          <Field label="Income Tax" value={data.tax} onChange={v => set('tax', v)} sym={sym} optional />
        </div>
        <div className="rounded-xl p-5 h-fit" style={{ background: BG, border: `1px solid ${BORDER}` }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: TEXT2 }}>Live Preview</h3>
          <MetricRow label="Gross Profit" value={grossProfit} margin={revenue ? safeDiv(grossProfit, revenue) : null} />
          <MetricRow label="EBITDA" value={ebitda} margin={revenue ? safeDiv(ebitda, revenue) : null} />
          <MetricRow label="EBIT" value={ebit} margin={revenue ? safeDiv(ebit, revenue) : null} />
          <div className="mt-2 pt-2" style={{ borderTop: `2px solid ${BORDER}` }}>
            <MetricRow label="Net Profit" value={netProfit} margin={revenue ? safeDiv(netProfit, revenue) : null} />
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-lg font-semibold text-sm transition" style={{ border: `1.5px solid ${BORDER}`, color: TEXT2, background: SURFACE }}>Back</button>
        <button onClick={handleNext} className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition" style={{ background: ACCENT }}>Continue</button>
      </div>
    </div>
  );
}

// ─── Step 3: Balance Sheet ────────────────────────────────────────────────────
function Step3Balance({ data, setData, sym, onNext, onBack }) {
  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const [showError, setShowError] = useState(false);

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

  const required = ['cash', 'receivables', 'payables', 'equity'];
  const handleNext = () => {
    const missing = required.some(k => !data[k].toString().trim());
    if (missing) { setShowError(true); return; }
    onNext();
  };

  const sectionHeader = (title) => (
    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: TEXT2 }}>{title}</h3>
  );

  const totalRow = (label, value) => (
    <div className="rounded-lg p-3 flex justify-between text-sm mt-1" style={{ background: BG, border: `1px solid ${BORDER}` }}>
      <span className="font-medium" style={{ color: TEXT2 }}>{label}</span>
      <span className="font-bold" style={{ color: TEXT1 }}>{fmt(value, sym)}</span>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: TEXT1 }}>Balance Sheet</h2>
      <p className="text-sm mb-2" style={{ color: TEXT2 }}>Enter your balance sheet figures at period end.</p>
      <div className="flex items-center gap-2 rounded-lg p-3 mb-5" style={{ background: '#EFF6FF', border: `1px solid #BFDBFE` }}>
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs" style={{ color: ACCENT2 }}>Fields marked <span style={{ color: DANGER }}>*</span> are required for key ratio calculations.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {sectionHeader('Assets')}
          <Field label="Cash & Equivalents" value={data.cash} onChange={v => set('cash', v)} sym={sym} required showError={showError} />
          <Field label="Accounts Receivable" value={data.receivables} onChange={v => set('receivables', v)} sym={sym} required showError={showError} />
          <Field label="Inventory" value={data.inventory} onChange={v => set('inventory', v)} sym={sym} optional />
          <Field label="Other Current Assets" value={data.otherCurrent} onChange={v => set('otherCurrent', v)} sym={sym} optional />
          <Field label="PP&E (Net)" value={data.ppe} onChange={v => set('ppe', v)} sym={sym} optional />
          <Field label="Other Long-Term Assets" value={data.otherLongTerm} onChange={v => set('otherLongTerm', v)} sym={sym} optional />
          {totalRow('Total Assets', totalAssets)}
        </div>
        <div>
          {sectionHeader('Liabilities & Equity')}
          <Field label="Accounts Payable" value={data.payables} onChange={v => set('payables', v)} sym={sym} required showError={showError} />
          <Field label="Short-Term Debt" value={data.shortTermDebt} onChange={v => set('shortTermDebt', v)} sym={sym} optional />
          <Field label="Other Current Liabilities" value={data.otherCurrentLiab} onChange={v => set('otherCurrentLiab', v)} sym={sym} optional />
          <Field label="Long-Term Debt" value={data.longTermDebt} onChange={v => set('longTermDebt', v)} sym={sym} optional />
          <Field label="Shareholders' Equity" value={data.equity} onChange={v => set('equity', v)} sym={sym} required showError={showError} />
          {totalRow("Total Liabilities + Equity", totalLE)}
        </div>
      </div>
      <div className="mt-4 rounded-lg p-3 flex items-center gap-2" style={{ background: balanced ? '#ECFDF5' : '#FFFBEB', border: `1px solid ${balanced ? '#A7F3D0' : '#FDE68A'}` }}>
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: balanced ? SUCCESS : WARNING }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {balanced
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          }
        </svg>
        <span className="text-sm font-medium" style={{ color: balanced ? SUCCESS : WARNING }}>
          {balanced
            ? 'Balance sheet is balanced — Assets equal Liabilities + Equity.'
            : `Discrepancy of ${fmt(Math.abs(diff), sym)} — Assets ${diff > 0 ? 'exceed' : 'are less than'} Liabilities + Equity.`}
        </span>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-lg font-semibold text-sm transition" style={{ border: `1.5px solid ${BORDER}`, color: TEXT2, background: SURFACE }}>Back</button>
        <button onClick={handleNext} className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition" style={{ background: ACCENT }}>Continue</button>
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
      <h2 className="text-xl font-bold mb-1" style={{ color: TEXT1 }}>Cash Flow Statement</h2>
      <p className="text-sm mb-2" style={{ color: TEXT2 }}>All fields are optional — leave blank to auto-estimate from your income data.</p>
      <div className="flex items-center gap-2 rounded-lg p-3 mb-5" style={{ background: BG, border: `1px solid ${BORDER}` }}>
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: TEXT3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs" style={{ color: TEXT2 }}>Operating Cash Flow will be auto-estimated as Net Profit + Depreciation if left blank.</p>
      </div>
      <Field label="Operating Cash Flow" value={data.operating} onChange={v => set('operating', v)} sym={sym} optional />
      <Field label="Investing Cash Flow" value={data.investing} onChange={v => set('investing', v)} sym={sym} optional />
      <Field label="Financing Cash Flow" value={data.financing} onChange={v => set('financing', v)} sym={sym} optional />
      <div className="rounded-xl p-4 mt-2" style={{ background: BG, border: `1px solid ${BORDER}` }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: TEXT2 }}>Live Estimates</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <p className="text-xs" style={{ color: TEXT3 }}>Monthly Burn Rate</p>
            <p className="text-lg font-bold mt-1" style={{ color: monthlyBurn > 0 ? DANGER : SUCCESS }}>
              {monthlyBurn > 0 ? fmt(monthlyBurn, sym) : 'Positive CF'}
            </p>
          </div>
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <p className="text-xs" style={{ color: TEXT3 }}>Cash Runway</p>
            <p className="text-lg font-bold mt-1" style={{ color: runway != null && runway < 6 ? DANGER : SUCCESS }}>
              {runway != null ? `${runway} months` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-lg font-semibold text-sm transition" style={{ border: `1.5px solid ${BORDER}`, color: TEXT2, background: SURFACE }}>Back</button>
        <button onClick={onNext} className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition" style={{ background: ACCENT }}>Continue</button>
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
      <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: pos ? '#ECFDF5' : '#FEF2F2', color: pos ? SUCCESS : DANGER }}>
        {pos ? '+' : ''}{pct(val)} YoY
      </span>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: TEXT1 }}>Prior Period Comparison</h2>
      <p className="text-sm mb-2" style={{ color: TEXT2 }}>All fields are optional. Enter prior period data to enable year-over-year analysis.</p>
      <div className="flex items-center gap-2 rounded-lg p-3 mb-5" style={{ background: BG, border: `1px solid ${BORDER}` }}>
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: TEXT3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs" style={{ color: TEXT2 }}>Leave blank to skip year-over-year comparisons — these fields are entirely optional.</p>
      </div>
      <div className="space-y-1">
        {[
          { key: 'revenue', label: 'Prior Period Revenue', growth: revenueGrowth },
          { key: 'cash', label: 'Prior Period Cash', growth: cashGrowth },
          { key: 'ebitda', label: 'Prior Period EBITDA', growth: ebitdaGrowth },
        ].map(({ key, label, growth }) => (
          <div key={key} className="flex items-center gap-2">
            <div className="flex-1">
              <Field label={label} value={data[key]} onChange={v => set(key, v)} sym={sym} optional />
            </div>
            <div className="pt-5"><GrowthBadge val={growth} /></div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-lg font-semibold text-sm transition" style={{ border: `1.5px solid ${BORDER}`, color: TEXT2, background: SURFACE }}>Back</button>
        <button onClick={onNext} className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition" style={{ background: ACCENT }}>
          Generate Dashboard
        </button>
      </div>
    </div>
  );
}

// ─── KPICard ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, trend, color }) {
  return (
    <div className="rounded-xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: TEXT3 }}>{label}</p>
      <p className="text-xl font-bold leading-tight" style={{ color: TEXT1 }}>{value}</p>
      {(sub || trend) && (
        <div className="flex items-center gap-1 mt-1">
          {trend && <span className="text-xs font-semibold" style={{ color: color || (trend.startsWith('+') || trend.startsWith('▲') ? SUCCESS : DANGER) }}>{trend}</span>}
          {sub && <span className="text-xs" style={{ color: TEXT3 }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ─── AlertBanner ──────────────────────────────────────────────────────────────
function AlertBanner({ type, message }) {
  const styles = {
    danger: { bg: '#FEF2F2', border: '#FECACA', text: DANGER, iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', text: WARNING, iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    success: { bg: '#ECFDF5', border: '#A7F3D0', text: SUCCESS, iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  };
  const s = styles[type] || styles.warning;
  return (
    <div className="flex items-start gap-2.5 rounded-lg p-3 border mb-2" style={{ background: s.bg, borderColor: s.border }}>
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: s.text }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.iconPath} />
      </svg>
      <span className="text-sm" style={{ color: s.text }}>{message}</span>
    </div>
  );
}

// ─── OverviewTab ──────────────────────────────────────────────────────────────
function OverviewTab({ calc, company }) {
  const sym = SYMS[company.currency];
  const { revenue, grossProfit, ebitda, netProfit, cash, receivables, equity, assetTurnover, healthScore, runway, currentRatio, deRatio, grossMargin, ebitdaMargin, netMargin, revenueGrowth, cashGrowth } = calc;

  const alerts = [];
  if (runway != null && runway < 3) alerts.push({ type: 'danger', message: `Cash runway is critically low at ${runway} months — immediate action required.` });
  else if (runway != null && runway < 6) alerts.push({ type: 'warning', message: `Cash runway below 6 months (${runway} months) — monitor closely and consider contingency funding.` });
  if (currentRatio != null && currentRatio < 1.5) alerts.push({ type: 'warning', message: `Current ratio below benchmark of 1.5x — currently at ${currentRatio.toFixed(2)}x. Liquidity position warrants attention.` });
  if (deRatio != null && deRatio > 2.0) alerts.push({ type: 'warning', message: `Elevated leverage: Debt/Equity ratio is ${deRatio.toFixed(2)}x, above the 2.0x benchmark.` });

  const scoreLabel = healthScore >= 70
    ? 'Financial metrics are broadly meeting benchmarks. Prioritise sustaining performance and executing on growth initiatives.'
    : healthScore >= 40
    ? 'Several financial metrics require attention. Review leverage, margin, and liquidity positions against sector benchmarks.'
    : 'Multiple metrics are below benchmark thresholds. Immediate remediation is recommended across key risk areas.';

  const trendArrow = (val) => {
    if (val == null || isNaN(val)) return null;
    return val >= 0 ? `+${pct(val)} YoY` : `${pct(val)} YoY`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: TEXT2 }}>Financial Health Score</h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <HealthGauge score={healthScore} />
          <div className="flex-1">
            <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>{scoreLabel}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Healthy', sub: 'Score ≥ 70', bg: '#ECFDF5', color: SUCCESS },
                { label: 'Needs Attention', sub: 'Score 40–69', bg: '#FFFBEB', color: WARNING },
                { label: 'Critical', sub: 'Score < 40', bg: '#FEF2F2', color: DANGER },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-2" style={{ background: s.bg }}>
                  <p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-xs" style={{ color: s.color, opacity: 0.75 }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {alerts.length > 0 && <div>{alerts.map((a, i) => <AlertBanner key={i} type={a.type} message={a.message} />)}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Revenue" value={fmt(revenue, sym)} trend={trendArrow(revenueGrowth)} />
        <KPICard label="Gross Profit" value={fmt(grossProfit, sym)} sub={pct(grossMargin)} />
        <KPICard label="EBITDA" value={fmt(ebitda, sym)} sub={pct(ebitdaMargin)} />
        <KPICard label="Net Profit" value={fmt(netProfit, sym)} sub={pct(netMargin)} color={netProfit < 0 ? DANGER : undefined} />
        <KPICard label="Cash Position" value={fmt(cash, sym)} trend={trendArrow(cashGrowth)} />
        <KPICard label="Accounts Receivable" value={fmt(receivables, sym)} />
        <KPICard label="Total Equity" value={fmt(equity, sym)} />
        <KPICard label="Asset Turnover" value={assetTurnover != null ? `${assetTurnover.toFixed(2)}x` : '—'} />
      </div>
    </div>
  );
}

// ─── CashFlowTab ──────────────────────────────────────────────────────────────
function CashFlowTab({ calc, company }) {
  const sym = SYMS[company.currency];
  const { operatingCF, investingCF, financingCF, freeCF, monthlyBurn, runway, weeks13 } = calc;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Operating CF" value={fmt(operatingCF, sym)} color={operatingCF < 0 ? DANGER : SUCCESS} />
        <KPICard label="Free Cash Flow" value={fmt(freeCF, sym)} color={freeCF < 0 ? DANGER : SUCCESS} />
        <KPICard label="Monthly Burn" value={monthlyBurn > 0 ? fmt(monthlyBurn, sym) : 'Positive CF'} color={monthlyBurn > 0 ? DANGER : SUCCESS} />
        <KPICard label="Cash Runway" value={runway != null ? `${runway} mo` : 'N/A'} color={runway != null && runway < 6 ? DANGER : SUCCESS} />
      </div>

      {runway != null && runway < 6 && (
        <AlertBanner type={runway < 3 ? 'danger' : 'warning'}
          message={`Cash runway stands at ${runway} months. ${runway < 3 ? 'Immediate remediation required — explore emergency funding or rapid cost reduction.' : 'Consider fundraising, credit facilities, or cost rationalisation to extend runway.'}`}
        />
      )}

      <div className="rounded-xl p-6" style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: TEXT2 }}>13-Week Cash Projection</h3>
        <p className="text-xs mb-4" style={{ color: TEXT3 }}>Based on current operating cash flow run-rate</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks13} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: TEXT3 }} />
              <YAxis tickFormatter={v => fmt(v, sym)} tick={{ fontSize: 10, fill: TEXT3 }} width={70} />
              <Tooltip formatter={v => [fmt(v, sym), 'Cash Balance']} contentStyle={{ fontSize: 12, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
              <Bar dataKey="balance" radius={[3,3,0,0]}>
                {weeks13.map((entry, i) => <Cell key={i} fill={entry.balance >= 0 ? SUCCESS : DANGER} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: TEXT2 }}>Cash Flow Summary</h3>
        <div className="space-y-3">
          {[
            { label: 'Operating Activities', val: operatingCF },
            { label: 'Investing Activities', val: investingCF },
            { label: 'Financing Activities', val: financingCF },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm w-48" style={{ color: TEXT2 }}>{label}</span>
              <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: BG }}>
                <div className="h-2 rounded-full" style={{
                  width: `${Math.min(100, Math.abs(val) / (Math.abs(operatingCF) + 1) * 100)}%`,
                  background: val >= 0 ? SUCCESS : DANGER,
                }} />
              </div>
              <span className="text-sm font-semibold w-24 text-right" style={{ color: val < 0 ? DANGER : SUCCESS }}>
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
        <div key={panel.title} className="rounded-xl p-5" style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: TEXT2 }}>{panel.title}</h3>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left pb-2 font-semibold text-xs" style={{ color: TEXT3 }}>Metric</th>
                <th className="text-right pb-2 font-semibold text-xs" style={{ color: TEXT3 }}>Value</th>
                <th className="text-right pb-2 font-semibold text-xs" style={{ color: TEXT3 }}>Benchmark</th>
                <th className="text-right pb-2 font-semibold text-xs" style={{ color: TEXT3 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {panel.ratios.map(r => {
                const hasVal = r.val != null && !isNaN(r.val);
                const passes = hasVal ? r.pass(r.val) : null;
                return (
                  <tr key={r.label} style={{ borderBottom: `1px solid ${BG}` }}>
                    <td className="py-2 text-sm" style={{ color: TEXT2 }}>{r.label}</td>
                    <td className="py-2 text-sm font-semibold text-right" style={{ color: TEXT1 }}>{hasVal ? r.fmt(r.val) : '—'}</td>
                    <td className="py-2 text-xs text-right" style={{ color: TEXT3 }}>{r.bench}</td>
                    <td className="py-2 text-right">
                      {passes === null ? (
                        <span style={{ color: TEXT3 }}>—</span>
                      ) : passes ? (
                        <span className="text-xs font-bold" style={{ color: SUCCESS }}>Pass</span>
                      ) : (
                        <span className="text-xs font-bold" style={{ color: DANGER }}>Fail</span>
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

// ─── FloatingAdvisor ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior CFO advisor for MENA-region SMEs working within CFO Pulse, an enterprise financial intelligence platform. Communicate with precision, brevity, and authority. Follow these rules strictly:

1. Never use hashtag headings (# or ##). Never use emojis of any kind.
2. Use **bold** only to highlight specific financial metrics, figures, or key terms — not for decoration.
3. Structure responses with short paragraphs or numbered/bulleted lists where appropriate.
4. Be concise and direct. Avoid filler phrases like "Great question" or "Certainly".
5. If recommending actions, be specific — reference the actual figures from the financial data provided.
6. Maintain a formal, boardroom-level tone throughout.`;

function FloatingAdvisor({ calc, company }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Good day. I am your CFO Pulse AI advisor. I have access to your current financial data. What would you like to discuss?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const buildContext = () => {
    const sym = SYMS[company.currency];
    return `Company: ${company.name} | Industry: ${company.industry} | Period: ${company.period} ${company.year} | Currency: ${company.currency}
Revenue: ${fmt(calc.revenue, sym)} | Gross Profit: ${fmt(calc.grossProfit, sym)} (${pct(calc.grossMargin)})
EBITDA: ${fmt(calc.ebitda, sym)} (${pct(calc.ebitdaMargin)}) | Net Profit: ${fmt(calc.netProfit, sym)} (${pct(calc.netMargin)})
Cash: ${fmt(calc.cash, sym)} | Total Assets: ${fmt(calc.totalAssets, sym)} | Equity: ${fmt(calc.equity, sym)}
Current Ratio: ${calc.currentRatio?.toFixed(2) ?? '—'} | D/E: ${calc.deRatio?.toFixed(2) ?? '—'} | Interest Coverage: ${calc.interestCoverage?.toFixed(1) ?? '—'}
ROE: ${pct(calc.roe)} | ROA: ${pct(calc.roa)} | Asset Turnover: ${calc.assetTurnover?.toFixed(2) ?? '—'}
Operating CF: ${fmt(calc.operatingCF, sym)} | Cash Runway: ${calc.runway != null ? calc.runway + ' months' : 'N/A'}
Financial Health Score: ${calc.healthScore}/100`;
  };

  const sendMessage = async (overrideInput) => {
    const text = (overrideInput ?? input).trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const context = buildContext();
    const prompt = `${SYSTEM_PROMPT}

FINANCIAL DATA:
${context}

User question: ${text}`;

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const reply = data.success
        ? data.insight
        : 'I was unable to process your request at this time. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'A connection error occurred. Please check your network and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'Board Summary', prompt: 'Provide a concise board-ready financial summary with the most important findings and recommendations based on the current financial data.' },
    { label: 'Cash Risk', prompt: 'Assess the 90-day cash flow risk in detail and recommend specific mitigation actions based on the current financial position.' },
    { label: 'Growth Strategy', prompt: 'Recommend 3 specific, actionable CFO-level growth strategies appropriate for the current financial position and industry.' },
  ];

  const buttonSize = hovered && !open ? 64 : 56;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      {/* Expanded chat window */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 72,
          right: 0,
          width: '40vw',
          maxWidth: 620,
          minWidth: 360,
          height: '65vh',
          minHeight: 480,
          background: SURFACE,
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Header */}
          <div style={{ background: NAVY, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <p style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14, margin: 0 }}>CFO Pulse AI Advisor</p>
              <p style={{ color: '#64748B', fontSize: 11, margin: 0, marginTop: 1 }}>Powered by Claude — Context-aware financial advisor</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: 16, lineHeight: 1, transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = '#F1F5F9'}
              onMouseLeave={e => e.target.style.color = '#64748B'}
            >
              ✕
            </button>
          </div>

          {/* Quick actions */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, background: BG, display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
            {quickActions.map(a => (
              <button
                key={a.label}
                onClick={() => sendMessage(a.prompt)}
                disabled={loading}
                style={{
                  flexShrink: 0, fontSize: 11, padding: '5px 12px', borderRadius: 20,
                  border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT2,
                  cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500,
                  transition: 'all 0.15s', opacity: loading ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!loading) { e.target.style.background = ACCENT; e.target.style.color = '#fff'; e.target.style.borderColor = ACCENT; }}}
                onMouseLeave={e => { e.target.style.background = SURFACE; e.target.style.color = TEXT2; e.target.style.borderColor = BORDER; }}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '88%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? ACCENT : BG,
                  color: msg.role === 'user' ? '#fff' : TEXT1,
                  fontSize: 13,
                  lineHeight: 1.6,
                  border: msg.role === 'assistant' ? `1px solid ${BORDER}` : 'none',
                }}>
                  <MarkdownText>{msg.content}</MarkdownText>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 4px', background: BG, border: `1px solid ${BORDER}`, display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 150, 300].map(delay => (
                    <span key={delay} style={{
                      width: 6, height: 6, borderRadius: '50%', background: TEXT3,
                      animation: 'bounce 1s infinite', animationDelay: `${delay}ms`, display: 'inline-block',
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: `1px solid ${BORDER}`, background: SURFACE, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                rows={2}
                placeholder="Ask about your financials... (Enter to send, Shift+Enter for new line)"
                style={{
                  flex: 1, border: `1.5px solid ${BORDER}`, borderRadius: 10,
                  padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none',
                  fontFamily: 'inherit', color: TEXT1, background: BG, lineHeight: 1.5,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.background = SURFACE; }}
                onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.background = BG; }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  background: input.trim() && !loading ? ACCENT : BG,
                  color: input.trim() && !loading ? '#fff' : TEXT3,
                  border: `1.5px solid ${input.trim() && !loading ? ACCENT : BORDER}`,
                  borderRadius: 10, padding: '8px 16px', fontSize: 13,
                  fontWeight: 600, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s', fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="CFO Pulse AI Advisor"
        style={{
          width: buttonSize, height: buttonSize,
          borderRadius: '50%',
          background: open ? NAVY2 : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
          border: 'none', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(29,78,216,0.4)',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          position: 'relative',
        }}
      >
        {open ? (
          <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        {/* Tooltip */}
        {hovered && !open && (
          <span style={{
            position: 'absolute', right: '110%', top: '50%', transform: 'translateY(-50%)',
            background: NAVY, color: '#F1F5F9', fontSize: 12, fontWeight: 500,
            padding: '5px 10px', borderRadius: 6, whiteSpace: 'nowrap',
            pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            AI Financial Advisor
          </span>
        )}
      </button>

      {/* Bounce animation keyframes */}
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
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
  const [income, setIncome] = useState({ revenue: '', cogs: '', opex: '', da: '', interest: '', tax: '' });
  const [balance, setBalance] = useState({
    cash: '', receivables: '', inventory: '', otherCurrent: '', ppe: '', otherLongTerm: '',
    payables: '', shortTermDebt: '', otherCurrentLiab: '', longTermDebt: '', equity: '',
  });
  const [cashFlow, setCashFlow] = useState({ operating: '', investing: '', financing: '' });
  const [prior, setPrior] = useState({ revenue: '', cash: '', ebitda: '' });

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
      [currentRatio, v => v >= 1.5], [cashRatio, v => v >= 0.2], [dso, v => v <= 45],
      [dpo, v => v >= 20], [grossMargin, v => v >= 0.30], [ebitdaMargin, v => v >= 0.10],
      [netMargin, v => v >= 0.05], [roe, v => v >= 0.10], [deRatio, v => v <= 2.0],
      [debtAssets, v => v <= 0.60], [interestCoverage, v => v >= 2.0], [equityRatio, v => v >= 0.30],
      [assetTurnover, v => v >= 0.50], [roa, v => v >= 0.03], [revenueGrowth, v => v >= 0.05],
      [cashGrowth, v => v >= 0],
    ];
    const validBenchmarks = benchmarks.filter(([v]) => v != null && !isNaN(v));
    const passing = validBenchmarks.filter(([v, fn]) => fn(v)).length;
    const healthScore = validBenchmarks.length > 0 ? Math.round((passing / validBenchmarks.length) * 100) : 0;

    const weeklyChange = operatingCF / (months * 4.333);
    const weeks13 = Array.from({ length: 13 }, (_, i) => ({
      week: `W${i+1}`, balance: Math.round(cash + weeklyChange * (i + 1)), change: Math.round(weeklyChange),
    }));

    return {
      revenue, cogs, opex, da, interest, tax, grossProfit, ebitda, ebit, netProfit,
      cash, receivables, inventory, otherCurrent, ppe, otherLongTerm,
      payables, shortTermDebt, otherCurrentLiab, longTermDebt, equity,
      currentAssets, totalAssets, currentLiabilities, totalDebt, totalLiabilities, totalLE, balanceDiff,
      operatingCF, investingCF, financingCF, freeCF, monthlyBurn, runway,
      currentRatio, cashRatio, dso, dpo, grossMargin, ebitdaMargin, netMargin, roe,
      deRatio, debtAssets, interestCoverage, equityRatio, assetTurnover, roa,
      revenueGrowth, cashGrowth, healthScore, weeks13,
    };
  }, [income, balance, cashFlow, prior, company.period]);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'cashflow', label: 'Cash Flow' },
    { key: 'ratios', label: 'Financial Ratios' },
  ];

  // ─── Wizard ──────────────────────────────────────────────────────────────────
  if (screen === 'wizard') {
    const sym = SYMS[company.currency];
    return (
      <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4" style={{ background: BG }}>
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} />
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: NAVY }}>CFO Pulse</h1>
          </div>
          <p className="text-sm" style={{ color: TEXT3 }}>by Axcell — Enterprise Financial Intelligence Platform</p>
        </div>
        <div className="w-full max-w-2xl rounded-2xl p-8" style={{ background: SURFACE, boxShadow: '0 4px 24px rgba(12,25,41,0.08)', border: `1px solid ${BORDER}` }}>
          <WizardProgress step={step} />
          {step === 1 && <Step1Company data={company} setData={setCompany} onNext={() => setStep(2)} />}
          {step === 2 && <Step2Income data={income} setData={setIncome} sym={sym} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <Step3Balance data={balance} setData={setBalance} sym={sym} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && <Step4CashFlow data={cashFlow} setData={setCashFlow} sym={sym} income={income} balance={balance} period={company.period} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
          {step === 5 && <Step5Prior data={prior} setData={setPrior} sym={sym} income={income} balance={balance} onNext={() => { setScreen('dashboard'); setActiveTab('overview'); }} onBack={() => setStep(4)} />}
        </div>
      </div>
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  const sym = SYMS[company.currency];
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Header */}
      <header style={{ background: NAVY, borderBottom: `1px solid ${NAVY2}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
              <h1 className="text-lg font-extrabold tracking-tight" style={{ color: '#F1F5F9' }}>CFO Pulse</h1>
            </div>
            {company.name && (
              <div className="hidden sm:flex items-center gap-2">
                <span style={{ color: '#334155', fontSize: 12 }}>|</span>
                <span className="text-sm font-medium" style={{ color: '#94A3B8' }}>{company.name}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1E293B', color: '#64748B', border: `1px solid #334155` }}>
                  {company.period} {company.year}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setScreen('wizard')}
            className="flex items-center gap-1.5 text-sm font-medium transition"
            style={{ color: '#64748B', border: `1px solid #1E293B`, borderRadius: 8, padding: '6px 14px', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#334155'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#1E293B'; }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Data
          </button>
        </div>
        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex" style={{ borderTop: `1px solid #1A2B3C` }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-5 py-2.5 text-sm font-medium transition"
              style={{
                borderBottom: `2px solid ${activeTab === t.key ? ACCENT : 'transparent'}`,
                color: activeTab === t.key ? '#E2E8F0' : '#475569',
                marginBottom: -1,
                background: 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (activeTab !== t.key) e.target.style.color = '#94A3B8'; }}
              onMouseLeave={e => { if (activeTab !== t.key) e.target.style.color = '#475569'; }}
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
      </main>

      {/* Floating AI Advisor */}
      <FloatingAdvisor calc={calc} company={company} />
    </div>
  );
}
