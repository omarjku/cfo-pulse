import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { supabase, AUTH_ENABLED } from './supabase.js';

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

// ─── Excel Field Aliases ──────────────────────────────────────────────────────
const FIELD_ALIASES = {
  'income.revenue':         ['revenue','sales','net sales','total revenue','net revenue','total sales','turnover'],
  'income.cogs':            ['cost of goods sold','cost of goods sold (cogs)','cogs','cost of sales','cost of revenue','direct costs'],
  'income.opex':            ['operating expenses','operating expenses (opex)','opex','total operating expenses','sg&a','overheads'],
  'income.da':              ['depreciation & amortisation','depreciation & amortization','depreciation and amortisation','d&a','depreciation','amortisation','amortization'],
  'income.interest':        ['interest expense','interest','finance costs','finance charges','interest charges'],
  'income.tax':             ['income tax','tax','income taxes','tax expense','income tax expense','corporation tax'],
  'balance.cash':           ['cash & equivalents','cash and equivalents','cash & cash equivalents','cash and cash equivalents','cash','cash position'],
  'balance.receivables':    ['accounts receivable','trade receivables','receivables','debtors','trade debtors','net receivables'],
  'balance.inventory':      ['inventory','inventories','stock'],
  'balance.otherCurrent':   ['other current assets','prepaid expenses','prepayments'],
  'balance.ppe':            ["pp&e (net)","property, plant & equipment","property plant and equipment","net ppe","fixed assets (net)","tangible fixed assets"],
  'balance.otherLongTerm':  ['other long-term assets','other non-current assets','intangible assets','goodwill'],
  'balance.payables':       ['accounts payable','trade payables','payables','creditors','trade creditors'],
  'balance.shortTermDebt':  ['short-term debt','short term debt','current borrowings','notes payable','bank overdraft'],
  'balance.otherCurrentLiab':['other current liabilities','accrued liabilities','accrued expenses','deferred revenue'],
  'balance.longTermDebt':   ['long-term debt','long term debt','non-current borrowings','long-term borrowings','bonds payable'],
  'balance.equity':         ["shareholders' equity","shareholders equity","stockholders equity","total equity","equity","net assets"],
  'cashflow.operating':     ['operating cash flow','cash from operations','net cash from operating activities','operating activities'],
  'cashflow.investing':     ['investing cash flow','cash from investing','net cash from investing activities','investing activities'],
  'cashflow.financing':     ['financing cash flow','cash from financing','net cash from financing activities','financing activities'],
  'prior.revenue':          ['prior period revenue','prior revenue','previous period revenue','previous year revenue'],
  'prior.cash':             ['prior period cash','prior cash','previous period cash','previous year cash'],
  'prior.ebitda':           ['prior period ebitda','prior ebitda','previous period ebitda','previous year ebitda'],
  'company.name':           ['company name','company','entity name','business name'],
  'company.industry':       ['industry','sector','business sector'],
  'company.currency':       ['currency','reporting currency','functional currency'],
  'company.period':         ['reporting period','period','fiscal period'],
  'company.year':           ['year','fiscal year','financial year'],
};

const FIELD_MAP = {};
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) FIELD_MAP[alias] = field;
}

// ─── Excel Template Download ──────────────────────────────────────────────────
function downloadTemplate() {
  const rows = [
    ['CFO Pulse Financial Data Template', '', ''],
    ['Fill in column B. Fields marked REQUIRED must have a value.', '', ''],
    ['Save the file, then upload it to CFO Pulse.', '', ''],
    ['', '', ''],
    ['--- COMPANY INFORMATION ---', '', ''],
    ['Company Name', '', 'REQUIRED'],
    ['Industry', 'Technology', 'Retail / Technology / Manufacturing / Healthcare / Financial Services / Real Estate / Hospitality / Construction / Education / Professional Services / Other'],
    ['Currency', 'USD', 'USD / EGP / AED / SAR / EUR / GBP'],
    ['Reporting Period', 'Annual', 'Annual / Semi-Annual / Quarterly'],
    ['Year', String(new Date().getFullYear()), ''],
    ['', '', ''],
    ['--- INCOME STATEMENT ---', '', ''],
    ['Revenue', '', 'REQUIRED'],
    ['Cost of Goods Sold (COGS)', '', 'REQUIRED'],
    ['Operating Expenses (OPEX)', '', 'REQUIRED'],
    ['Depreciation & Amortisation', '', 'optional'],
    ['Interest Expense', '', 'optional'],
    ['Income Tax', '', 'optional'],
    ['', '', ''],
    ['--- BALANCE SHEET ---', '', ''],
    ['Cash & Equivalents', '', 'REQUIRED'],
    ['Accounts Receivable', '', 'REQUIRED'],
    ['Inventory', '', 'optional'],
    ['Other Current Assets', '', 'optional'],
    ['PP&E (Net)', '', 'optional'],
    ['Other Long-Term Assets', '', 'optional'],
    ['Accounts Payable', '', 'REQUIRED'],
    ['Short-Term Debt', '', 'optional'],
    ['Other Current Liabilities', '', 'optional'],
    ['Long-Term Debt', '', 'optional'],
    ["Shareholders' Equity", '', 'REQUIRED'],
    ['', '', ''],
    ['--- CASH FLOW STATEMENT (OPTIONAL) ---', '', ''],
    ['Operating Cash Flow', '', 'optional — auto-estimated if blank'],
    ['Investing Cash Flow', '', 'optional'],
    ['Financing Cash Flow', '', 'optional'],
    ['', '', ''],
    ['--- PRIOR PERIOD (OPTIONAL) ---', '', ''],
    ['Prior Period Revenue', '', 'optional — enables YoY analysis'],
    ['Prior Period Cash', '', 'optional'],
    ['Prior Period EBITDA', '', 'optional'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ width: 42 }, { width: 22 }, { width: 55 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Financial Data');
  XLSX.writeFile(wb, 'CFO_Pulse_Template.xlsx');
}

// ─── Excel Parsing ────────────────────────────────────────────────────────────
function parseNumericValue(raw) {
  if (typeof raw === 'number') return Math.abs(raw); // abs for expense lines shown negative
  if (!raw) return '';
  const s = String(raw).replace(/[$£€,\s]/g, '').replace(/\((.+)\)/, '-$1');
  const n = parseFloat(s);
  return isNaN(n) ? '' : String(Math.abs(n)); // store positives; calculations handle signs
}

function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const result = {
          company:  { name: '', industry: 'Technology', currency: 'USD', period: 'Annual', year: String(new Date().getFullYear()) },
          income:   { revenue: '', cogs: '', opex: '', da: '', interest: '', tax: '' },
          balance:  { cash: '', receivables: '', inventory: '', otherCurrent: '', ppe: '', otherLongTerm: '', payables: '', shortTermDebt: '', otherCurrentLiab: '', longTermDebt: '', equity: '' },
          cashFlow: { operating: '', investing: '', financing: '' },
          prior:    { revenue: '', cash: '', ebitda: '' },
        };

        let matched = 0;
        for (const row of rows) {
          if (!row || row.length < 2) continue;
          const rawLabel = String(row[0] ?? '').trim();
          const rawVal   = row[1];
          if (!rawLabel || rawVal === '' || rawVal === null || rawVal === undefined) continue;
          // Normalise: lowercase, strip asterisks / "(REQUIRED)" / "(optional)"
          const label = rawLabel.toLowerCase()
            .replace(/\s*\*+\s*$/, '').replace(/\(required\)/i, '').replace(/\(optional\)/i, '').trim();
          // Skip section headers
          if (label.startsWith('---') || label.startsWith('cfo pulse') || label.startsWith('fill in') || label.startsWith('save')) continue;

          const fieldPath = FIELD_MAP[label];
          if (!fieldPath) continue;

          const [section, field] = fieldPath.split('.');
          const sectionObj = section === 'cashflow' ? result.cashFlow : result[section];
          if (!sectionObj || !(field in sectionObj)) continue;

          if (section === 'company') {
            sectionObj[field] = String(rawVal).trim();
          } else {
            const num = parseNumericValue(rawVal);
            if (num !== '') { sectionObj[field] = num; matched++; }
          }
        }

        if (matched < 2) {
          resolve({ ok: false, error: 'Could not read financial data from this file. Please use the CFO Pulse template.' });
        } else {
          resolve({ ok: true, company: result.company, income: result.income, balance: result.balance, cashFlow: result.cashFlow, prior: result.prior, matched });
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

// ─── MarkdownText ─────────────────────────────────────────────────────────────
function InlineText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (<>{parts.map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i} style={{ fontWeight: 600 }}>{p.slice(2,-2)}</strong> : <span key={i}>{p}</span>)}</>);
}
function MarkdownText({ children }) {
  if (!children) return null;
  const blocks = children.split(/\n{2,}/);
  return (
    <div style={{ lineHeight: 1.65 }}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter(l => l.trim());
        if (!lines.length) return null;
        const isBullet   = lines[0].match(/^[-•]\s/);
        const isNumbered = lines[0].match(/^\d+\.\s/);
        if (isBullet) return <ul key={bi} style={{ listStyleType:'disc', paddingLeft:'1.25rem', margin:'0.4rem 0' }}>{lines.map((l,i)=>{const t=l.replace(/^[-•]\s+/,'');return t?<li key={i} style={{marginBottom:'0.2rem'}}><InlineText text={t}/></li>:null;})}</ul>;
        if (isNumbered) return <ol key={bi} style={{ listStyleType:'decimal', paddingLeft:'1.25rem', margin:'0.4rem 0' }}>{lines.map((l,i)=>{const t=l.replace(/^\d+\.\s+/,'');return t?<li key={i} style={{marginBottom:'0.2rem'}}><InlineText text={t}/></li>:null;})}</ol>;
        return <p key={bi} style={{ margin:'0.3rem 0' }}>{lines.map((l,i)=><React.Fragment key={i}>{i>0&&<br/>}<InlineText text={l}/></React.Fragment>)}</p>;
      })}
    </div>
  );
}

// ─── HealthGauge ──────────────────────────────────────────────────────────────
function HealthGauge({ score }) {
  const color = score >= 70 ? SUCCESS : score >= 40 ? WARNING : DANGER;
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical';
  const rad = Math.PI - (score/100)*Math.PI;
  const ex = 90 + 70*Math.cos(rad), ey = 90 - 70*Math.sin(rad);
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 110" width="180" height="110">
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke={BORDER} strokeWidth="14" strokeLinecap="round"/>
        {score > 0 && <path d={`M 20 90 A 70 70 0 ${score>50?1:0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"/>}
        <text x="90" y="82" textAnchor="middle" fontSize="26" fontWeight="700" fill={TEXT1}>{score}</text>
        <text x="90" y="98" textAnchor="middle" fontSize="10" fill={TEXT3}>/ 100</text>
      </svg>
      <span className="text-sm font-semibold mt-1" style={{color}}>{label}</span>
    </div>
  );
}

// ─── KPICard ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, trend, color }) {
  return (
    <div className="rounded-xl p-4" style={{ background:SURFACE, border:`1px solid ${BORDER}`, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{color:TEXT3}}>{label}</p>
      <p className="text-xl font-bold leading-tight" style={{color:TEXT1}}>{value}</p>
      {(sub||trend) && <div className="flex items-center gap-1 mt-1">{trend&&<span className="text-xs font-semibold" style={{color:color||(trend.startsWith('+')?SUCCESS:DANGER)}}>{trend}</span>}{sub&&<span className="text-xs" style={{color:TEXT3}}>{sub}</span>}</div>}
    </div>
  );
}

// ─── AlertBanner ──────────────────────────────────────────────────────────────
function AlertBanner({ type, message }) {
  const s = {
    danger:  { bg:'#FEF2F2', border:'#FECACA', text:DANGER,  d:'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    warning: { bg:'#FFFBEB', border:'#FDE68A', text:WARNING, d:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    success: { bg:'#ECFDF5', border:'#A7F3D0', text:SUCCESS, d:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  }[type] || { bg:'#FFFBEB', border:'#FDE68A', text:WARNING };
  return (
    <div className="flex items-start gap-2.5 rounded-lg p-3 border mb-2" style={{background:s.bg,borderColor:s.border}}>
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{color:s.text}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.d}/></svg>
      <span className="text-sm" style={{color:s.text}}>{message}</span>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuthenticated }) {
  const [step, setStep]       = useState('email'); // 'email' | 'code'
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  const inputStyle = {
    width:'100%', border:`1.5px solid ${BORDER}`, borderRadius:10,
    padding:'11px 14px', fontSize:14, outline:'none',
    background:SURFACE, color:TEXT1, fontFamily:'inherit',
    transition:'border-color 0.15s',
  };

  const sendCode = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true); setError(''); setInfo('');
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (err) throw err;
      setStep('code');
      setInfo('A sign-in code has been sent to your email. Enter it below.');
    } catch (e) {
      setError(e.message || 'Failed to send code. Please try again.');
    } finally { setLoading(false); }
  };

  const verifyCode = async () => {
    if (!code.trim()) { setError('Please enter the code from your email.'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (err) throw err;
      onAuthenticated(data.session);
    } catch (e) {
      setError(e.message || 'Invalid code. Please check and try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{background:BG}}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div style={{width:8,height:8,borderRadius:'50%',background:ACCENT}}/>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{color:NAVY}}>CFO Pulse</h1>
          </div>
          <p className="text-sm" style={{color:TEXT3}}>by Axcell — Enterprise Financial Intelligence Platform</p>
        </div>

        <div className="rounded-2xl p-8" style={{background:SURFACE,boxShadow:'0 4px 24px rgba(12,25,41,0.09)',border:`1px solid ${BORDER}`}}>
          {step === 'email' ? (
            <>
              <h2 className="text-lg font-bold mb-1" style={{color:TEXT1}}>Sign in to your account</h2>
              <p className="text-sm mb-6" style={{color:TEXT2}}>Enter your work email. We will send you a one-time sign-in code. No password required.</p>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{color:TEXT2}}>Email Address</label>
              <input
                type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('');}}
                onKeyDown={e=>e.key==='Enter'&&sendCode()}
                placeholder="you@company.com"
                style={inputStyle}
                onFocus={e=>e.target.style.borderColor=ACCENT}
                onBlur={e=>e.target.style.borderColor=BORDER}
              />
              {error && <p className="text-xs mt-2" style={{color:DANGER}}>{error}</p>}
              <button onClick={sendCode} disabled={loading}
                className="w-full mt-5 py-3 rounded-xl text-white font-semibold text-sm transition"
                style={{background:loading?ACCENT2:ACCENT,cursor:loading?'not-allowed':'pointer'}}>
                {loading ? 'Sending…' : 'Send Sign-in Code'}
              </button>
              <p className="text-center text-xs mt-5" style={{color:TEXT3}}>
                New to CFO Pulse? Entering your email automatically creates an account.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold mb-1" style={{color:TEXT1}}>Enter your sign-in code</h2>
              <p className="text-sm mb-1" style={{color:TEXT2}}>A 6-digit code was sent to</p>
              <p className="text-sm font-semibold mb-5" style={{color:ACCENT}}>{email}</p>
              {info && <div className="rounded-lg p-3 mb-4 text-xs" style={{background:'#EFF6FF',border:`1px solid #BFDBFE`,color:ACCENT2}}>{info}</div>}
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{color:TEXT2}}>Confirmation Code</label>
              <input
                type="text" value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,'').slice(0,6));setError('');}}
                onKeyDown={e=>e.key==='Enter'&&verifyCode()}
                placeholder="000000" maxLength={6}
                style={{...inputStyle,fontSize:24,letterSpacing:'0.3em',textAlign:'center',fontWeight:700}}
                onFocus={e=>e.target.style.borderColor=ACCENT}
                onBlur={e=>e.target.style.borderColor=BORDER}
              />
              {error && <p className="text-xs mt-2" style={{color:DANGER}}>{error}</p>}
              <button onClick={verifyCode} disabled={loading||code.length<4}
                className="w-full mt-5 py-3 rounded-xl text-white font-semibold text-sm transition"
                style={{background:loading||code.length<4?ACCENT2:ACCENT,cursor:loading||code.length<4?'not-allowed':'pointer'}}>
                {loading ? 'Verifying…' : 'Confirm & Sign In'}
              </button>
              <button onClick={()=>{setStep('email');setCode('');setError('');}} className="w-full mt-3 py-2 text-sm" style={{color:TEXT3,background:'none',border:'none',cursor:'pointer'}}>
                Use a different email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Upload Screen ────────────────────────────────────────────────────────────
function UploadScreen({ onDataReady, userEmail, onSignOut }) {
  const [dragging, setDragging]   = useState(false);
  const [parsing, setParsing]     = useState(false);
  const [parseResult, setParseResult] = useState(null); // { ok, company, income, balance, cashFlow, prior, matched, error }
  const [fileName, setFileName]   = useState('');
  const fileRef = useRef();

  const selectStyle = {
    width:'100%', border:`1.5px solid ${BORDER}`, borderRadius:8,
    padding:'9px 12px', fontSize:13, background:SURFACE, color:TEXT1,
    outline:'none', fontFamily:'inherit',
  };

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) {
      setParseResult({ ok:false, error:'Unsupported file type. Please upload an .xlsx, .xls, or .csv file.' });
      return;
    }
    setFileName(file.name);
    setParsing(true);
    setParseResult(null);
    try {
      const result = await parseExcelFile(file);
      setParseResult(result);
    } catch (e) {
      setParseResult({ ok:false, error:'Could not read the file. Please check it is a valid Excel or CSV file.' });
    } finally { setParsing(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); };

  const setField = (section, key, val) => {
    setParseResult(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: val },
    }));
  };

  const requiredOk = parseResult?.ok &&
    parseResult.income?.revenue && parseResult.income?.cogs && parseResult.income?.opex &&
    parseResult.balance?.cash && parseResult.balance?.receivables &&
    parseResult.balance?.payables && parseResult.balance?.equity &&
    parseResult.company?.name;

  const CompanyField = ({ label, stateKey, type='text', options }) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{color:TEXT2}}>{label}</label>
      {options ? (
        <select value={parseResult.company[stateKey]||''} onChange={e=>setField('company',stateKey,e.target.value)} style={selectStyle}>
          {options.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={parseResult.company[stateKey]||''}
          onChange={e=>setField('company',stateKey,e.target.value)}
          style={selectStyle}
          onFocus={e=>e.target.style.borderColor=ACCENT}
          onBlur={e=>e.target.style.borderColor=BORDER}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{background:BG}}>
      {/* Header */}
      <header style={{background:NAVY,borderBottom:`1px solid ${NAVY2}`}}>
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div style={{width:6,height:6,borderRadius:'50%',background:ACCENT}}/>
            <h1 className="text-lg font-extrabold tracking-tight" style={{color:'#F1F5F9'}}>CFO Pulse</h1>
          </div>
          <div className="flex items-center gap-4">
            {userEmail && <span className="text-xs" style={{color:'#64748B'}}>{userEmail}</span>}
            {onSignOut && (
              <button onClick={onSignOut} className="text-xs px-3 py-1.5 rounded-lg transition"
                style={{color:'#64748B',border:`1px solid #1E293B`,background:'transparent'}}
                onMouseEnter={e=>{e.target.style.color='#94A3B8';e.target.style.borderColor='#334155';}}
                onMouseLeave={e=>{e.target.style.color='#64748B';e.target.style.borderColor='#1E293B';}}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1" style={{color:TEXT1}}>Upload Financial Data</h2>
          <p className="text-sm" style={{color:TEXT2}}>Upload your financial statements to generate an AI-powered CFO dashboard.</p>
        </div>

        {/* Template Download Banner */}
        <div className="rounded-xl p-5 mb-6 flex items-center justify-between gap-4" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{color:TEXT1}}>Use the CFO Pulse Template for best results</p>
            <p className="text-xs" style={{color:TEXT2}}>Pre-formatted Excel file that maps directly to all analysis fields. Also accepts standard accounting software exports.</p>
          </div>
          <button onClick={downloadTemplate}
            className="flex-shrink-0 flex items-center gap-2 py-2.5 px-5 rounded-lg text-white text-sm font-semibold transition"
            style={{background:ACCENT,whiteSpace:'nowrap'}}
            onMouseEnter={e=>e.currentTarget.style.background=ACCENT2}
            onMouseLeave={e=>e.currentTarget.style.background=ACCENT}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download Template
          </button>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={onDrop}
          onClick={()=>!parsing&&fileRef.current.click()}
          className="rounded-xl p-10 text-center cursor-pointer transition-all mb-6"
          style={{
            background:dragging?'#EFF6FF':SURFACE,
            border:`2px dashed ${dragging?ACCENT:BORDER}`,
            boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
          }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} style={{display:'none'}}/>
          {parsing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:`${ACCENT}44`,borderTopColor:ACCENT}}/>
              <p className="text-sm font-medium" style={{color:TEXT2}}>Reading {fileName}…</p>
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 mx-auto mb-3" style={{color:parseResult?.ok?SUCCESS:TEXT3}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {parseResult?.ok
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                }
              </svg>
              {parseResult?.ok ? (
                <>
                  <p className="text-sm font-semibold" style={{color:SUCCESS}}>{fileName} — {parseResult.matched} fields detected</p>
                  <p className="text-xs mt-1" style={{color:TEXT3}}>Click or drag to replace with a different file</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold mb-1" style={{color:TEXT1}}>Drag and drop your file here, or click to browse</p>
                  <p className="text-xs" style={{color:TEXT3}}>Accepts .xlsx, .xls, and .csv — QuickBooks, Xero, Wave, and standard accounting exports supported</p>
                </>
              )}
            </>
          )}
        </div>

        {/* Parse Error */}
        {parseResult && !parseResult.ok && (
          <AlertBanner type="warning" message={parseResult.error}/>
        )}

        {/* Parsed Data Review */}
        {parseResult?.ok && (
          <div className="rounded-xl p-6 mb-6" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-5" style={{color:TEXT2}}>Review & Confirm Your Data</h3>

            {/* Company Info */}
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:TEXT3}}>Company Information</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <CompanyField label="Company Name" stateKey="name"/>
                </div>
                <CompanyField label="Industry" stateKey="industry" options={INDUSTRIES}/>
                <CompanyField label="Currency" stateKey="currency" options={CURRENCIES}/>
                <CompanyField label="Reporting Period" stateKey="period" options={PERIODS}/>
                <div className="col-span-1">
                  <CompanyField label="Year" stateKey="year" options={YEARS}/>
                </div>
              </div>
            </div>

            {/* Parsed Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Income */}
              <div className="rounded-lg p-4" style={{background:BG,border:`1px solid ${BORDER}`}}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:TEXT2}}>Income Statement</p>
                {[
                  {label:'Revenue',       key:'revenue', req:true},
                  {label:'COGS',          key:'cogs',    req:true},
                  {label:'OPEX',          key:'opex',    req:true},
                  {label:'D&A',           key:'da'},
                  {label:'Interest',      key:'interest'},
                  {label:'Tax',           key:'tax'},
                ].map(f=>(
                  <div key={f.key} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{borderColor:BORDER}}>
                    <span className="text-xs" style={{color:TEXT2}}>
                      {f.label}{f.req&&<span style={{color:DANGER}}>*</span>}
                    </span>
                    <input
                      type="number" value={parseResult.income[f.key]}
                      onChange={e=>setField('income',f.key,e.target.value)}
                      style={{width:110,textAlign:'right',border:`1px solid ${parseResult.income[f.key]||!f.req?BORDER:DANGER}`,borderRadius:6,padding:'3px 8px',fontSize:12,background:SURFACE,color:TEXT1,outline:'none',fontFamily:'inherit'}}
                    />
                  </div>
                ))}
              </div>

              {/* Balance Sheet */}
              <div className="rounded-lg p-4" style={{background:BG,border:`1px solid ${BORDER}`}}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:TEXT2}}>Balance Sheet</p>
                {[
                  {label:'Cash',            key:'cash',            req:true},
                  {label:'Receivables',     key:'receivables',     req:true},
                  {label:'Inventory',       key:'inventory'},
                  {label:'PP&E (Net)',       key:'ppe'},
                  {label:'Accounts Payable',key:'payables',        req:true},
                  {label:'Short-Term Debt', key:'shortTermDebt'},
                  {label:'Long-Term Debt',  key:'longTermDebt'},
                  {label:"Equity",          key:'equity',          req:true},
                ].map(f=>(
                  <div key={f.key} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{borderColor:BORDER}}>
                    <span className="text-xs" style={{color:TEXT2}}>
                      {f.label}{f.req&&<span style={{color:DANGER}}>*</span>}
                    </span>
                    <input
                      type="number" value={parseResult.balance[f.key]}
                      onChange={e=>setField('balance',f.key,e.target.value)}
                      style={{width:110,textAlign:'right',border:`1px solid ${parseResult.balance[f.key]||!f.req?BORDER:DANGER}`,borderRadius:6,padding:'3px 8px',fontSize:12,background:SURFACE,color:TEXT1,outline:'none',fontFamily:'inherit'}}
                    />
                  </div>
                ))}
              </div>
            </div>

            {!requiredOk && (
              <p className="text-xs mt-3" style={{color:DANGER}}>Fields marked with * are required. Fill in any missing values above to continue.</p>
            )}
          </div>
        )}

        {/* Generate Dashboard Button */}
        {parseResult?.ok && (
          <button
            disabled={!requiredOk}
            onClick={()=>onDataReady({
              company:  parseResult.company,
              income:   parseResult.income,
              balance:  parseResult.balance,
              cashFlow: parseResult.cashFlow,
              prior:    parseResult.prior,
            })}
            className="w-full py-4 rounded-xl text-white font-bold text-base transition"
            style={{background:requiredOk?ACCENT:BORDER,cursor:requiredOk?'pointer':'not-allowed',color:requiredOk?'#fff':TEXT3}}>
            Generate Financial Dashboard
          </button>
        )}
      </main>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ calc, company }) {
  const sym = SYMS[company.currency];
  const { revenue, grossProfit, ebitda, netProfit, cash, receivables, equity, assetTurnover, healthScore, runway, currentRatio, deRatio, grossMargin, ebitdaMargin, netMargin, revenueGrowth, cashGrowth } = calc;

  const alerts = [];
  if (runway != null && runway < 3) alerts.push({ type:'danger',   message:`Cash runway is critically low at ${runway} months — immediate action required.` });
  else if (runway != null && runway < 6) alerts.push({ type:'warning', message:`Cash runway below 6 months (${runway} months) — monitor closely and consider contingency funding.` });
  if (currentRatio != null && currentRatio < 1.5) alerts.push({ type:'warning', message:`Current ratio is ${currentRatio.toFixed(2)}x, below the 1.5x benchmark. Liquidity warrants attention.` });
  if (deRatio != null && deRatio > 2.0) alerts.push({ type:'warning', message:`Elevated leverage: Debt/Equity ratio is ${deRatio.toFixed(2)}x, above the 2.0x benchmark.` });

  const scoreLabel = healthScore >= 70
    ? 'Financial metrics are broadly meeting benchmarks. Prioritise sustaining performance and executing on growth initiatives.'
    : healthScore >= 40
    ? 'Several financial metrics require attention. Review leverage, margin, and liquidity positions against sector benchmarks.'
    : 'Multiple metrics are below benchmark thresholds. Immediate remediation is recommended across key risk areas.';

  const trendArrow = v => (v==null||isNaN(v)) ? null : (v>=0?`+${pct(v)} YoY`:`${pct(v)} YoY`);

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{color:TEXT2}}>Financial Health Score</h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <HealthGauge score={healthScore}/>
          <div className="flex-1">
            <p className="text-sm leading-relaxed" style={{color:TEXT2}}>{scoreLabel}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[{label:'Healthy',sub:'Score ≥ 70',bg:'#ECFDF5',color:SUCCESS},{label:'Needs Attention',sub:'Score 40–69',bg:'#FFFBEB',color:WARNING},{label:'Critical',sub:'Score < 40',bg:'#FEF2F2',color:DANGER}].map(s=>(
                <div key={s.label} className="rounded-lg p-2" style={{background:s.bg}}>
                  <p className="text-xs font-medium" style={{color:s.color}}>{s.label}</p>
                  <p className="text-xs" style={{color:s.color,opacity:.75}}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {alerts.length > 0 && <div>{alerts.map((a,i)=><AlertBanner key={i} type={a.type} message={a.message}/>)}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Revenue"           value={fmt(revenue,sym)}      trend={trendArrow(revenueGrowth)}/>
        <KPICard label="Gross Profit"      value={fmt(grossProfit,sym)}  sub={pct(grossMargin)}/>
        <KPICard label="EBITDA"            value={fmt(ebitda,sym)}       sub={pct(ebitdaMargin)}/>
        <KPICard label="Net Profit"        value={fmt(netProfit,sym)}    sub={pct(netMargin)} color={netProfit<0?DANGER:undefined}/>
        <KPICard label="Cash Position"     value={fmt(cash,sym)}         trend={trendArrow(cashGrowth)}/>
        <KPICard label="Accounts Receivable" value={fmt(receivables,sym)}/>
        <KPICard label="Total Equity"      value={fmt(equity,sym)}/>
        <KPICard label="Asset Turnover"    value={assetTurnover!=null?`${assetTurnover.toFixed(2)}x`:'—'}/>
      </div>
    </div>
  );
}

// ─── CashFlow Tab ─────────────────────────────────────────────────────────────
function CashFlowTab({ calc, company }) {
  const sym = SYMS[company.currency];
  const { operatingCF, investingCF, financingCF, freeCF, monthlyBurn, runway, weeks13 } = calc;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Operating CF"   value={fmt(operatingCF,sym)} color={operatingCF<0?DANGER:SUCCESS}/>
        <KPICard label="Free Cash Flow" value={fmt(freeCF,sym)}      color={freeCF<0?DANGER:SUCCESS}/>
        <KPICard label="Monthly Burn"   value={monthlyBurn>0?fmt(monthlyBurn,sym):'Positive CF'} color={monthlyBurn>0?DANGER:SUCCESS}/>
        <KPICard label="Cash Runway"    value={runway!=null?`${runway} mo`:'N/A'} color={runway!=null&&runway<6?DANGER:SUCCESS}/>
      </div>
      {runway!=null&&runway<6&&<AlertBanner type={runway<3?'danger':'warning'} message={`Cash runway stands at ${runway} months. ${runway<3?'Immediate remediation required — explore emergency funding or rapid cost reduction.':'Consider fundraising, credit facilities, or cost rationalisation to extend runway.'}`}/>}
      <div className="rounded-xl p-6" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{color:TEXT2}}>13-Week Cash Projection</h3>
        <p className="text-xs mb-4" style={{color:TEXT3}}>Based on current operating cash flow run-rate</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks13} margin={{top:5,right:10,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
              <XAxis dataKey="week" tick={{fontSize:11,fill:TEXT3}}/>
              <YAxis tickFormatter={v=>fmt(v,sym)} tick={{fontSize:10,fill:TEXT3}} width={70}/>
              <Tooltip formatter={v=>[fmt(v,sym),'Cash Balance']} contentStyle={{fontSize:12,border:`1px solid ${BORDER}`,borderRadius:8}}/>
              <Bar dataKey="balance" radius={[3,3,0,0]}>
                {weeks13.map((e,i)=><Cell key={i} fill={e.balance>=0?SUCCESS:DANGER}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl p-6" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{color:TEXT2}}>Cash Flow Summary</h3>
        <div className="space-y-3">
          {[{label:'Operating Activities',val:operatingCF},{label:'Investing Activities',val:investingCF},{label:'Financing Activities',val:financingCF}].map(({label,val})=>(
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm w-48" style={{color:TEXT2}}>{label}</span>
              <div className="flex-1 rounded-full h-2 overflow-hidden" style={{background:BG}}>
                <div className="h-2 rounded-full" style={{width:`${Math.min(100,Math.abs(val)/(Math.abs(operatingCF)+1)*100)}%`,background:val>=0?SUCCESS:DANGER}}/>
              </div>
              <span className="text-sm font-semibold w-24 text-right" style={{color:val<0?DANGER:SUCCESS}}>{fmt(val,sym)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ratios Tab ───────────────────────────────────────────────────────────────
function RatiosTab({ calc }) {
  const panels = [
    { title:'Liquidity', ratios:[
      {label:'Current Ratio',            val:calc.currentRatio,    fmt:v=>`${v.toFixed(2)}x`, bench:'≥ 1.5x', pass:v=>v>=1.5},
      {label:'Cash Ratio',               val:calc.cashRatio,       fmt:v=>`${v.toFixed(2)}x`, bench:'≥ 0.2x', pass:v=>v>=0.2},
      {label:'Days Sales Outstanding',   val:calc.dso,             fmt:v=>`${Math.round(v)} days`, bench:'≤ 45 days', pass:v=>v<=45},
      {label:'Days Payables Outstanding',val:calc.dpo,             fmt:v=>`${Math.round(v)} days`, bench:'≥ 20 days', pass:v=>v>=20},
    ]},
    { title:'Profitability', ratios:[
      {label:'Gross Margin',     val:calc.grossMargin,   fmt:v=>pct(v), bench:'≥ 30%', pass:v=>v>=0.30},
      {label:'EBITDA Margin',    val:calc.ebitdaMargin,  fmt:v=>pct(v), bench:'≥ 10%', pass:v=>v>=0.10},
      {label:'Net Profit Margin',val:calc.netMargin,     fmt:v=>pct(v), bench:'≥ 5%',  pass:v=>v>=0.05},
      {label:'Return on Equity', val:calc.roe,           fmt:v=>pct(v), bench:'≥ 10%', pass:v=>v>=0.10},
    ]},
    { title:'Leverage', ratios:[
      {label:'Debt / Equity',    val:calc.deRatio,           fmt:v=>`${v.toFixed(2)}x`, bench:'≤ 2.0x', pass:v=>v<=2.0},
      {label:'Debt / Assets',    val:calc.debtAssets,        fmt:v=>pct(v), bench:'≤ 60%', pass:v=>v<=0.60},
      {label:'Interest Coverage',val:calc.interestCoverage,  fmt:v=>`${v.toFixed(1)}x`, bench:'≥ 2.0x', pass:v=>v>=2.0},
      {label:'Equity Ratio',     val:calc.equityRatio,       fmt:v=>pct(v), bench:'≥ 30%', pass:v=>v>=0.30},
    ]},
    { title:'Efficiency & Growth', ratios:[
      {label:'Asset Turnover',      val:calc.assetTurnover, fmt:v=>`${v.toFixed(2)}x`, bench:'≥ 0.5x', pass:v=>v>=0.50},
      {label:'Return on Assets',    val:calc.roa,           fmt:v=>pct(v), bench:'≥ 3%', pass:v=>v>=0.03},
      {label:'Revenue Growth (YoY)',val:calc.revenueGrowth, fmt:v=>pct(v), bench:'≥ 5%', pass:v=>v>=0.05},
      {label:'Cash Growth (YoY)',   val:calc.cashGrowth,    fmt:v=>pct(v), bench:'≥ 0%', pass:v=>v>=0},
    ]},
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {panels.map(panel=>(
        <div key={panel.title} className="rounded-xl p-5" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{color:TEXT2}}>{panel.title}</h3>
          <table className="w-full">
            <thead>
              <tr style={{borderBottom:`1px solid ${BORDER}`}}>
                {['Metric','Value','Benchmark','Status'].map(h=><th key={h} className={`pb-2 font-semibold text-xs ${h==='Metric'?'text-left':'text-right'}`} style={{color:TEXT3}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {panel.ratios.map(r=>{
                const hasVal = r.val!=null&&!isNaN(r.val);
                const passes = hasVal ? r.pass(r.val) : null;
                return (
                  <tr key={r.label} style={{borderBottom:`1px solid ${BG}`}}>
                    <td className="py-2 text-sm" style={{color:TEXT2}}>{r.label}</td>
                    <td className="py-2 text-sm font-semibold text-right" style={{color:TEXT1}}>{hasVal?r.fmt(r.val):'—'}</td>
                    <td className="py-2 text-xs text-right" style={{color:TEXT3}}>{r.bench}</td>
                    <td className="py-2 text-right">
                      {passes===null?<span style={{color:TEXT3}}>—</span>:passes?<span className="text-xs font-bold" style={{color:SUCCESS}}>Pass</span>:<span className="text-xs font-bold" style={{color:DANGER}}>Fail</span>}
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

// ─── Floating AI Advisor ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior CFO advisor for MENA-region SMEs working within CFO Pulse, an enterprise financial intelligence platform. Communicate with precision, brevity, and authority. Follow these rules strictly:
1. Never use hashtag headings (# or ##). Never use emojis of any kind.
2. Use **bold** only to highlight specific financial metrics, figures, or key terms — not for decoration.
3. Structure responses with short paragraphs or numbered/bulleted lists where appropriate.
4. Be concise and direct. Avoid filler phrases.
5. If recommending actions, be specific — reference the actual figures from the financial data provided.
6. Maintain a formal, boardroom-level tone throughout.`;

function FloatingAdvisor({ calc, company }) {
  const [open, setOpen]         = useState(false);
  const [hovered, setHovered]   = useState(false);
  const [messages, setMessages] = useState([
    { role:'assistant', content:'Good day. I am your CFO Pulse AI advisor. I have full access to your current financial data. What would you like to discuss?' }
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages, loading]);

  const buildContext = () => {
    const sym = SYMS[company.currency];
    return `Company: ${company.name} | Industry: ${company.industry} | Period: ${company.period} ${company.year} | Currency: ${company.currency}
Revenue: ${fmt(calc.revenue,sym)} | Gross Profit: ${fmt(calc.grossProfit,sym)} (${pct(calc.grossMargin)})
EBITDA: ${fmt(calc.ebitda,sym)} (${pct(calc.ebitdaMargin)}) | Net Profit: ${fmt(calc.netProfit,sym)} (${pct(calc.netMargin)})
Cash: ${fmt(calc.cash,sym)} | Total Assets: ${fmt(calc.totalAssets,sym)} | Equity: ${fmt(calc.equity,sym)}
Current Ratio: ${calc.currentRatio?.toFixed(2)??'—'} | D/E: ${calc.deRatio?.toFixed(2)??'—'} | Interest Coverage: ${calc.interestCoverage?.toFixed(1)??'—'}
ROE: ${pct(calc.roe)} | ROA: ${pct(calc.roa)} | Asset Turnover: ${calc.assetTurnover?.toFixed(2)??'—'}
Operating CF: ${fmt(calc.operatingCF,sym)} | Cash Runway: ${calc.runway!=null?calc.runway+' months':'N/A'}
Financial Health Score: ${calc.healthScore}/100`;
  };

  const sendMessage = async (override) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, {role:'user', content:text}]);
    setLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_ENDPOINT || '/api/claude', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ prompt:`${SYSTEM_PROMPT}\n\nFINANCIAL DATA:\n${buildContext()}\n\nUser question: ${text}` }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {role:'assistant', content:data.success?data.insight:'I was unable to process your request. Please try again.'}]);
    } catch {
      setMessages(prev => [...prev, {role:'assistant', content:'A connection error occurred. Please check your network and try again.'}]);
    } finally { setLoading(false); }
  };

  const quickActions = [
    {label:'Board Summary',   prompt:'Provide a concise board-ready financial summary with the most important findings and recommendations based on the current financial data.'},
    {label:'Cash Risk',       prompt:'Assess the 90-day cash flow risk in detail and recommend specific mitigation actions based on the current financial position.'},
    {label:'Growth Strategy', prompt:'Recommend 3 specific, actionable CFO-level growth strategies appropriate for the current financial position and industry.'},
  ];

  const btnSize = hovered && !open ? 64 : 56;

  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:1000}}>
      {open && (
        <div style={{position:'absolute',bottom:72,right:0,width:'40vw',maxWidth:620,minWidth:360,height:'65vh',minHeight:480,background:SURFACE,borderRadius:16,border:`1px solid ${BORDER}`,boxShadow:'0 20px 60px rgba(0,0,0,0.18)',display:'flex',flexDirection:'column',overflow:'hidden',transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)'}}>
          {/* Header */}
          <div style={{background:NAVY,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div>
              <p style={{color:'#F1F5F9',fontWeight:600,fontSize:14,margin:0}}>CFO Pulse AI Advisor</p>
              <p style={{color:'#64748B',fontSize:11,margin:'2px 0 0'}}>Powered by Claude — context-aware financial advisor</p>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',color:'#64748B',cursor:'pointer',padding:'4px 8px',borderRadius:6,fontSize:16,lineHeight:1}} onMouseEnter={e=>e.target.style.color='#F1F5F9'} onMouseLeave={e=>e.target.style.color='#64748B'}>✕</button>
          </div>
          {/* Quick Actions */}
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${BORDER}`,background:BG,display:'flex',gap:6,overflowX:'auto',flexShrink:0}}>
            {quickActions.map(a=>(
              <button key={a.label} onClick={()=>sendMessage(a.prompt)} disabled={loading}
                style={{flexShrink:0,fontSize:11,padding:'5px 12px',borderRadius:20,border:`1px solid ${BORDER}`,background:SURFACE,color:TEXT2,cursor:loading?'not-allowed':'pointer',fontWeight:500,transition:'all 0.15s',opacity:loading?.5:1,fontFamily:'inherit'}}
                onMouseEnter={e=>{if(!loading){e.target.style.background=ACCENT;e.target.style.color='#fff';e.target.style.borderColor=ACCENT;}}}
                onMouseLeave={e=>{e.target.style.background=SURFACE;e.target.style.color=TEXT2;e.target.style.borderColor=BORDER;}}>
                {a.label}
              </button>
            ))}
          </div>
          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:10}}>
            {messages.map((msg,i)=>(
              <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>
                <div style={{maxWidth:'88%',padding:'10px 14px',borderRadius:msg.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',background:msg.role==='user'?ACCENT:BG,color:msg.role==='user'?'#fff':TEXT1,fontSize:13,lineHeight:1.6,border:msg.role==='assistant'?`1px solid ${BORDER}`:'none'}}>
                  <MarkdownText>{msg.content}</MarkdownText>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{display:'flex',justifyContent:'flex-start'}}>
                <div style={{padding:'12px 16px',borderRadius:'14px 14px 14px 4px',background:BG,border:`1px solid ${BORDER}`,display:'flex',gap:5,alignItems:'center'}}>
                  {[0,150,300].map(d=><span key={d} style={{width:6,height:6,borderRadius:'50%',background:TEXT3,animation:'bounce 1s infinite',animationDelay:`${d}ms`,display:'inline-block'}}/>)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>
          {/* Input */}
          <div style={{padding:'12px 14px',borderTop:`1px solid ${BORDER}`,background:SURFACE,flexShrink:0}}>
            <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
              <textarea
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                rows={2} placeholder="Ask about your financials… (Enter to send, Shift+Enter for new line)"
                style={{flex:1,border:`1.5px solid ${BORDER}`,borderRadius:10,padding:'8px 12px',fontSize:13,resize:'none',outline:'none',fontFamily:'inherit',color:TEXT1,background:BG,lineHeight:1.5,transition:'border-color 0.15s'}}
                onFocus={e=>{e.target.style.borderColor=ACCENT;e.target.style.background=SURFACE;}}
                onBlur={e=>{e.target.style.borderColor=BORDER;e.target.style.background=BG;}}
              />
              <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
                style={{background:input.trim()&&!loading?ACCENT:BG,color:input.trim()&&!loading?'#fff':TEXT3,border:`1.5px solid ${input.trim()&&!loading?ACCENT:BORDER}`,borderRadius:10,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:input.trim()&&!loading?'pointer':'not-allowed',transition:'all 0.15s',fontFamily:'inherit',flexShrink:0}}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={()=>setOpen(p=>!p)}
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{width:btnSize,height:btnSize,borderRadius:'50%',background:open?NAVY2:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,border:'none',cursor:'pointer',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(29,78,216,0.4)',transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',position:'relative'}}>
        {open
          ? <svg style={{width:22,height:22}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          : <svg style={{width:24,height:24}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
        }
        {hovered && !open && (
          <span style={{position:'absolute',right:'110%',top:'50%',transform:'translateY(-50%)',background:NAVY,color:'#F1F5F9',fontSize:12,fontWeight:500,padding:'5px 10px',borderRadius:6,whiteSpace:'nowrap',pointerEvents:'none',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
            AI Financial Advisor
          </span>
        )}
      </button>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,    setScreen]    = useState('loading'); // loading | auth | upload | dashboard
  const [session,   setSession]   = useState(null);
  const [company,   setCompany]   = useState({ name:'', industry:'Technology', currency:'USD', period:'Annual', year:String(new Date().getFullYear()) });
  const [income,    setIncome]    = useState({ revenue:'', cogs:'', opex:'', da:'', interest:'', tax:'' });
  const [balance,   setBalance]   = useState({ cash:'', receivables:'', inventory:'', otherCurrent:'', ppe:'', otherLongTerm:'', payables:'', shortTermDebt:'', otherCurrentLiab:'', longTermDebt:'', equity:'' });
  const [cashFlow,  setCashFlow]  = useState({ operating:'', investing:'', financing:'' });
  const [prior,     setPrior]     = useState({ revenue:'', cash:'', ebitda:'' });
  const [activeTab, setActiveTab] = useState('overview');

  // ── Session bootstrap ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!AUTH_ENABLED) {
      setScreen('upload');
      return;
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setScreen(s ? 'upload' : 'auth');
      if (s) restoreFromStorage(s.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (!s) setScreen('auth');
    });
    return () => subscription.unsubscribe();
  }, []);

  const storageKey = useCallback(() =>
    session ? `cfopulse_${session.user.id}` : 'cfopulse_guest'
  , [session]);

  const restoreFromStorage = (userId) => {
    try {
      const raw = localStorage.getItem(`cfopulse_${userId}`);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.hasDashboard) {
        setCompany(saved.company);  setIncome(saved.income);
        setBalance(saved.balance);  setCashFlow(saved.cashFlow);
        setPrior(saved.prior);
        setScreen('dashboard');
      }
    } catch {}
  };

  // ── Persist on dashboard ────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'dashboard') return;
    try {
      localStorage.setItem(storageKey(), JSON.stringify({ hasDashboard:true, company, income, balance, cashFlow, prior }));
    } catch {}
  }, [screen, company, income, balance, cashFlow, prior, storageKey]);

  // ── Financial Calculations ──────────────────────────────────────────────────
  const calc = useMemo(() => {
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
    const totalLE = totalLiabilities + equity;

    const months = PMONTHS[company.period];
    const operatingCF = cashFlow.operating !== '' ? N(cashFlow.operating) : netProfit + da;
    const investingCF = N(cashFlow.investing), financingCF = N(cashFlow.financing);
    const freeCF = operatingCF + investingCF;
    const monthlyBurn = operatingCF < 0 ? Math.abs(operatingCF / months) : 0;
    const runway = monthlyBurn > 0 ? Math.round(cash / monthlyBurn) : null;

    const period = company.period;
    const currentRatio  = safeDiv(currentAssets, currentLiabilities);
    const cashRatio     = safeDiv(cash, currentLiabilities);
    const dso           = safeDiv(receivables * PDAYS[period], revenue);
    const dpo           = safeDiv(payables * PDAYS[period], cogs);
    const grossMargin   = safeDiv(grossProfit, revenue);
    const ebitdaMargin  = safeDiv(ebitda, revenue);
    const netMargin     = safeDiv(netProfit, revenue);
    const roe           = safeDiv(netProfit, equity);
    const deRatio       = safeDiv(totalDebt, equity);
    const debtAssets    = safeDiv(totalDebt, totalAssets);
    const interestCoverage = interest > 0 ? safeDiv(ebitda, interest) : null;
    const equityRatio   = safeDiv(equity, totalAssets);
    const assetTurnover = safeDiv(revenue, totalAssets);
    const roa           = safeDiv(netProfit, totalAssets);
    const revenueGrowth = N(prior.revenue) > 0 ? (revenue - N(prior.revenue)) / N(prior.revenue) : null;
    const cashGrowth    = N(prior.cash)    > 0 ? (cash    - N(prior.cash))    / N(prior.cash)    : null;

    const benchmarks = [
      [currentRatio,v=>v>=1.5],[cashRatio,v=>v>=0.2],[dso,v=>v<=45],[dpo,v=>v>=20],
      [grossMargin,v=>v>=0.30],[ebitdaMargin,v=>v>=0.10],[netMargin,v=>v>=0.05],[roe,v=>v>=0.10],
      [deRatio,v=>v<=2.0],[debtAssets,v=>v<=0.60],[interestCoverage,v=>v>=2.0],[equityRatio,v=>v>=0.30],
      [assetTurnover,v=>v>=0.50],[roa,v=>v>=0.03],[revenueGrowth,v=>v>=0.05],[cashGrowth,v=>v>=0],
    ];
    const valid = benchmarks.filter(([v])=>v!=null&&!isNaN(v));
    const healthScore = valid.length > 0 ? Math.round(valid.filter(([v,fn])=>fn(v)).length / valid.length * 100) : 0;

    const weeklyChange = operatingCF / (months * 4.333);
    const weeks13 = Array.from({length:13},(_,i)=>({week:`W${i+1}`,balance:Math.round(cash+weeklyChange*(i+1)),change:Math.round(weeklyChange)}));

    return {
      revenue, cogs, opex, da, interest, tax, grossProfit, ebitda, ebit, netProfit,
      cash, receivables, inventory, otherCurrent, ppe, otherLongTerm,
      payables, shortTermDebt, otherCurrentLiab, longTermDebt, equity,
      currentAssets, totalAssets, currentLiabilities, totalDebt, totalLiabilities, totalLE,
      operatingCF, investingCF, financingCF, freeCF, monthlyBurn, runway,
      currentRatio, cashRatio, dso, dpo, grossMargin, ebitdaMargin, netMargin, roe,
      deRatio, debtAssets, interestCoverage, equityRatio, assetTurnover, roa,
      revenueGrowth, cashGrowth, healthScore, weeks13,
    };
  }, [income, balance, cashFlow, prior, company.period]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAuthenticated = (sess) => {
    setSession(sess);
    restoreFromStorage(sess.user.id);
    if (screen !== 'dashboard') setScreen('upload');
  };

  const handleDataReady = ({ company: c, income: i, balance: b, cashFlow: cf, prior: p }) => {
    setCompany(c); setIncome(i); setBalance(b); setCashFlow(cf); setPrior(p);
    setActiveTab('overview');
    setScreen('dashboard');
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setScreen(AUTH_ENABLED ? 'auth' : 'upload');
  };

  const tabs = [
    {key:'overview', label:'Overview'},
    {key:'cashflow', label:'Cash Flow'},
    {key:'ratios',   label:'Financial Ratios'},
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:BG}}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:`${ACCENT}44`,borderTopColor:ACCENT}}/>
          <p className="text-sm font-medium" style={{color:TEXT3}}>Loading CFO Pulse…</p>
        </div>
      </div>
    );
  }

  if (screen === 'auth') {
    return <AuthScreen onAuthenticated={handleAuthenticated}/>;
  }

  if (screen === 'upload') {
    return (
      <UploadScreen
        onDataReady={handleDataReady}
        userEmail={session?.user?.email}
        onSignOut={AUTH_ENABLED ? handleSignOut : null}
      />
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{background:BG}}>
      <header style={{background:NAVY,borderBottom:`1px solid ${NAVY2}`,position:'sticky',top:0,zIndex:100}}>
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div style={{width:6,height:6,borderRadius:'50%',background:ACCENT}}/>
              <h1 className="text-lg font-extrabold tracking-tight" style={{color:'#F1F5F9'}}>CFO Pulse</h1>
            </div>
            {company.name && (
              <div className="hidden sm:flex items-center gap-2">
                <span style={{color:'#334155',fontSize:12}}>|</span>
                <span className="text-sm font-medium" style={{color:'#94A3B8'}}>{company.name}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{background:'#1E293B',color:'#64748B',border:`1px solid #334155`}}>{company.period} {company.year}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {session?.user?.email && <span className="hidden sm:block text-xs" style={{color:'#475569'}}>{session.user.email}</span>}
            <button onClick={()=>setScreen('upload')} className="flex items-center gap-1.5 text-sm font-medium transition"
              style={{color:'#64748B',border:`1px solid #1E293B`,borderRadius:8,padding:'6px 14px',background:'transparent'}}
              onMouseEnter={e=>{e.currentTarget.style.color='#94A3B8';e.currentTarget.style.borderColor='#334155';}}
              onMouseLeave={e=>{e.currentTarget.style.color='#64748B';e.currentTarget.style.borderColor='#1E293B';}}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              New Upload
            </button>
            {AUTH_ENABLED && (
              <button onClick={handleSignOut} className="text-xs px-3 py-1.5 rounded-lg transition"
                style={{color:'#64748B',border:`1px solid #1E293B`,background:'transparent'}}
                onMouseEnter={e=>{e.currentTarget.style.color='#94A3B8';}}
                onMouseLeave={e=>{e.currentTarget.style.color='#64748B';}}>
                Sign Out
              </button>
            )}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex" style={{borderTop:`1px solid #1A2B3C`}}>
          {tabs.map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key)} className="px-5 py-2.5 text-sm font-medium transition"
              style={{borderBottom:`2px solid ${activeTab===t.key?ACCENT:'transparent'}`,color:activeTab===t.key?'#E2E8F0':'#475569',marginBottom:-1,background:'transparent',cursor:'pointer'}}
              onMouseEnter={e=>{if(activeTab!==t.key)e.target.style.color='#94A3B8';}}
              onMouseLeave={e=>{if(activeTab!==t.key)e.target.style.color='#475569';}}>
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab==='overview' && <OverviewTab calc={calc} company={company}/>}
        {activeTab==='cashflow' && <CashFlowTab calc={calc} company={company}/>}
        {activeTab==='ratios'   && <RatiosTab   calc={calc}/>}
      </main>
      <FloatingAdvisor calc={calc} company={company}/>
    </div>
  );
}
