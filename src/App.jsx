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

// ─── File Helpers ─────────────────────────────────────────────────────────────
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseSpreadsheetAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        let text = '';
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          text += `Sheet: ${sheetName}\n`;
          for (const row of rows.slice(0, 500)) {
            if (row.some(cell => cell !== '')) {
              text += row.map(c => String(c ?? '')).join('\t') + '\n';
            }
          }
          text += '\n';
        }
        resolve(text.slice(0, 20000));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

// ─── AI Extraction Prompt ─────────────────────────────────────────────────────
const EXTRACTION_PROMPT = `You are a financial data extraction specialist. Analyze the provided financial document carefully. The document may be a bank account statement, journal report, transaction list, ledger, or any financial record.

For JOURNAL REPORTS: Revenue = total credits to income/sales/revenue accounts. COGS = total debits to cost-of-goods accounts. OPEX = total debits to all operating expense accounts (rent, salaries, utilities, admin, marketing, etc.). Cash = net ending balance of cash/bank accounts. Receivables = net debit balance in accounts receivable. Payables = net credit balance in accounts payable.

For BANK STATEMENTS: Revenue = sum of all credits/deposits. OPEX = sum of all debits/withdrawals (excluding loan repayments). Cash = final/ending balance shown.

Return ONLY a valid JSON object with no other text before or after it:

{"company":{"name":"Unknown","industry":"Other","currency":"USD","period":"Annual","year":"2024"},"income":{"revenue":0,"cogs":0,"opex":0,"da":0,"interest":0,"tax":0},"balance":{"cash":0,"receivables":0,"inventory":0,"otherCurrent":0,"ppe":0,"otherLongTerm":0,"payables":0,"shortTermDebt":0,"otherCurrentLiab":0,"longTermDebt":0,"equity":0},"cashFlow":{"operating":0,"investing":0,"financing":0},"prior":{"revenue":0,"cash":0,"ebitda":0},"summary":"2-3 sentence executive summary of financial health based on this data.","notes":"What data was available and any key assumptions made."}

All monetary values must be positive numbers. Use 0 for fields that cannot be determined.`;

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
function AuthScreen() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const inputStyle = {
    width:'100%', border:`1.5px solid ${BORDER}`, borderRadius:10,
    padding:'11px 14px', fontSize:14, outline:'none',
    background:SURFACE, color:TEXT1, fontFamily:'inherit',
    transition:'border-color 0.15s',
  };

  const sendLink = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      setError(e.message || 'Failed to send link. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{background:BG}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div style={{width:8,height:8,borderRadius:'50%',background:ACCENT}}/>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{color:NAVY}}>CFO Pulse</h1>
          </div>
          <p className="text-sm" style={{color:TEXT3}}>by Axcell — Enterprise Financial Intelligence Platform</p>
        </div>

        <div className="rounded-2xl p-8" style={{background:SURFACE,boxShadow:'0 4px 24px rgba(12,25,41,0.09)',border:`1px solid ${BORDER}`}}>
          {!sent ? (
            <>
              <h2 className="text-lg font-bold mb-1" style={{color:TEXT1}}>Sign in to your account</h2>
              <p className="text-sm mb-6" style={{color:TEXT2}}>Enter your work email. We will send you a secure sign-in link. No password required.</p>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{color:TEXT2}}>Email Address</label>
              <input
                type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('');}}
                onKeyDown={e=>e.key==='Enter'&&sendLink()}
                placeholder="you@company.com"
                style={inputStyle}
                onFocus={e=>e.target.style.borderColor=ACCENT}
                onBlur={e=>e.target.style.borderColor=BORDER}
              />
              {error && <p className="text-xs mt-2" style={{color:DANGER}}>{error}</p>}
              <button onClick={sendLink} disabled={loading}
                className="w-full mt-5 py-3 rounded-xl text-white font-semibold text-sm transition"
                style={{background:loading?ACCENT2:ACCENT,cursor:loading?'not-allowed':'pointer'}}>
                {loading ? 'Sending…' : 'Send Sign-in Link'}
              </button>
              <p className="text-center text-xs mt-5" style={{color:TEXT3}}>
                New to CFO Pulse? Entering your email automatically creates an account.
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{background:'#EFF6FF'}}>
                  <svg className="w-7 h-7" style={{color:ACCENT}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h2 className="text-lg font-bold mb-1" style={{color:TEXT1}}>Check your inbox</h2>
                <p className="text-sm" style={{color:TEXT2}}>A sign-in link has been sent to</p>
                <p className="text-sm font-semibold mt-1" style={{color:ACCENT}}>{email}</p>
              </div>
              <div className="rounded-lg p-3 mt-5" style={{background:'#F0FDF4',border:`1px solid #BBF7D0`}}>
                <p className="text-xs" style={{color:'#166534'}}>Click the link in the email to sign in automatically. Keep this tab open — you will be redirected here once authenticated.</p>
              </div>
              <button onClick={()=>{setSent(false);setEmail('');setError('');}} className="w-full mt-4 py-2 text-sm" style={{color:TEXT3,background:'none',border:'none',cursor:'pointer'}}>
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
  const [dragging, setDragging]     = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName]     = useState('');
  const [extracted, setExtracted]   = useState(null);
  const [error, setError]           = useState('');
  const [company, setCompany]       = useState({ name:'', industry:'Other', currency:'USD', period:'Annual', year:String(new Date().getFullYear()) });
  const fileRef = useRef();

  const selectStyle = {
    width:'100%', border:`1.5px solid ${BORDER}`, borderRadius:8,
    padding:'9px 12px', fontSize:13, background:SURFACE, color:TEXT1,
    outline:'none', fontFamily:'inherit',
  };

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const isPDF = ext === 'pdf';
    const isSpreadsheet = ['xlsx','xls','csv'].includes(ext);
    if (!isPDF && !isSpreadsheet) {
      setError('Please upload a PDF bank statement or an Excel/CSV transaction file.');
      return;
    }
    setFileName(file.name);
    setProcessing(true);
    setError('');
    setExtracted(null);
    try {
      let requestBody;
      if (isPDF) {
        const base64 = await readFileAsBase64(file);
        requestBody = { prompt: EXTRACTION_PROMPT, fileData: base64, fileMediaType: 'application/pdf' };
      } else {
        const textContent = await parseSpreadsheetAsText(file);
        requestBody = { prompt: `${EXTRACTION_PROMPT}\n\nFinancial data to analyze:\n\n${textContent}` };
      }
      const apiUrl = import.meta.env.VITE_API_ENDPOINT || '/api/claude';
      const resp = await fetch(apiUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(requestBody) });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Analysis failed');
      let parsed;
      try {
        const jsonMatch = data.insight.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('no json');
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Could not parse financial data from the AI response. Please try a different file or format.');
      }
      setExtracted(parsed);
      setCompany(prev => ({
        ...prev,
        name: parsed.company?.name && parsed.company.name !== 'Unknown' ? parsed.company.name : prev.name,
        industry: INDUSTRIES.includes(parsed.company?.industry) ? parsed.company.industry : prev.industry,
        currency: CURRENCIES.includes(parsed.company?.currency) ? parsed.company.currency : prev.currency,
        period: PERIODS.includes(parsed.company?.period) ? parsed.company.period : prev.period,
        year: parsed.company?.year || prev.year,
      }));
    } catch (e) {
      setError(e.message);
    } finally { setProcessing(false); }
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f); };
  const onFileChange = (e) => { if(e.target.files[0]) handleFile(e.target.files[0]); };

  const sym = SYMS[company.currency] || '$';
  const canGenerate = extracted && (
    (extracted.income?.revenue||0) > 0 ||
    (extracted.balance?.cash||0)   > 0 ||
    (extracted.income?.opex||0)    > 0 ||
    (extracted.income?.cogs||0)    > 0
  );

  const CompanyField = ({ label, stateKey, options }) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{color:TEXT2}}>{label}</label>
      {options ? (
        <select value={company[stateKey]} onChange={e=>setCompany(p=>({...p,[stateKey]:e.target.value}))} style={selectStyle}>
          {options.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type="text" value={company[stateKey]} onChange={e=>setCompany(p=>({...p,[stateKey]:e.target.value}))}
          style={selectStyle}
          onFocus={e=>e.target.style.borderColor=ACCENT}
          onBlur={e=>e.target.style.borderColor=BORDER}/>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{background:BG}}>
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
          <p className="text-sm" style={{color:TEXT2}}>Upload your bank statement or accounting export. AI will extract and analyse the financial data automatically — no template required.</p>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={onDrop}
          onClick={()=>!processing&&fileRef.current.click()}
          className="rounded-xl p-10 text-center cursor-pointer transition-all mb-6"
          style={{background:dragging?'#EFF6FF':SURFACE,border:`2px dashed ${dragging?ACCENT:BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
          <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={onFileChange} style={{display:'none'}}/>
          {processing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:`${ACCENT}44`,borderTopColor:ACCENT}}/>
              <p className="text-sm font-medium" style={{color:TEXT2}}>Analysing {fileName} with AI…</p>
              <p className="text-xs" style={{color:TEXT3}}>Extracting financial data from your document</p>
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 mx-auto mb-3" style={{color:extracted?SUCCESS:TEXT3}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {extracted
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                }
              </svg>
              {extracted ? (
                <>
                  <p className="text-sm font-semibold" style={{color:SUCCESS}}>{fileName} — analysis complete</p>
                  <p className="text-xs mt-1" style={{color:TEXT3}}>Click or drag to upload a different file</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold mb-1" style={{color:TEXT1}}>Drop your file here, or click to browse</p>
                  <p className="text-xs mb-3" style={{color:TEXT3}}>PDF bank statements, Excel journal reports, CSV transaction files — any raw export from your bank or accounting software</p>
                  <div className="flex items-center justify-center gap-3">
                    {['PDF','XLSX','XLS','CSV'].map(t=>(
                      <span key={t} className="text-xs px-2 py-1 rounded" style={{background:BG,border:`1px solid ${BORDER}`,color:TEXT3,fontWeight:600}}>{t}</span>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {error && <AlertBanner type="warning" message={error}/>}

        {/* AI Extracted Summary */}
        {extracted && (
          <div className="rounded-xl p-6 mb-6" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:SUCCESS}}/>
              <h3 className="text-sm font-semibold uppercase tracking-wide" style={{color:TEXT2}}>AI Analysis Complete</h3>
            </div>

            {extracted.summary && (
              <p className="text-sm leading-relaxed mb-5" style={{color:TEXT1}}>{extracted.summary}</p>
            )}

            {/* Key Numbers */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                {label:'Revenue / Income',  val:extracted.income?.revenue||0},
                {label:'Total Expenses',    val:(extracted.income?.cogs||0)+(extracted.income?.opex||0)},
                {label:'Cash Position',     val:extracted.balance?.cash||0},
              ].map(({label,val})=>(
                <div key={label} className="rounded-lg p-3 text-center" style={{background:BG,border:`1px solid ${BORDER}`}}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{color:TEXT3}}>{label}</p>
                  <p className="text-lg font-bold" style={{color:TEXT1}}>{val>0?fmt(val,sym):'—'}</p>
                </div>
              ))}
            </div>

            {extracted.notes && (
              <div className="rounded-lg p-3 mb-5" style={{background:'#FFFBEB',border:`1px solid #FDE68A`}}>
                <p className="text-xs" style={{color:'#92400E'}}>{extracted.notes}</p>
              </div>
            )}

            {/* Company Info */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:TEXT3}}>Confirm Company Details</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <CompanyField label="Company Name" stateKey="name"/>
                </div>
                <CompanyField label="Industry" stateKey="industry" options={INDUSTRIES}/>
                <CompanyField label="Currency" stateKey="currency" options={CURRENCIES}/>
                <CompanyField label="Reporting Period" stateKey="period" options={PERIODS}/>
                <CompanyField label="Year" stateKey="year" options={YEARS}/>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        {extracted && (
          <>
            <button
              disabled={!canGenerate}
              onClick={()=>onDataReady({
                company,
                income:   extracted.income,
                balance:  extracted.balance,
                cashFlow: extracted.cashFlow,
                prior:    extracted.prior,
              })}
              className="w-full py-4 rounded-xl text-white font-bold text-base transition"
              style={{background:canGenerate?ACCENT:BORDER,cursor:canGenerate?'pointer':'not-allowed',color:canGenerate?'#fff':TEXT3}}>
              Generate Financial Dashboard
            </button>
            {!canGenerate && (
              <p className="text-xs text-center mt-2" style={{color:DANGER}}>No usable financial data found. Please try a different file.</p>
            )}
          </>
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s && event === 'SIGNED_IN') {
        setScreen('upload');
        restoreFromStorage(s.user.id);
      } else if (!s) {
        setScreen('auth');
      }
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
    return <AuthScreen/>;
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
