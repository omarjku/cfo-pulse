import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';

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

// ─── Deep Analysis Prompt ─────────────────────────────────────────────────────
const DEEP_ANALYSIS_PROMPT = `You are a senior CFO and financial analyst. You have received one or more financial documents from a business. Perform a thorough, board-level financial analysis.

Documents may include: bank statements, transaction exports, journal reports, expense records, payroll data, invoices, sales reports, P&L statements, balance sheets, or any other financial data.

INSTRUCTIONS:
1. Read ALL provided documents carefully
2. Identify the exact timeframe from all dates found in the data
3. State what data types were found and what critical data is missing and why it matters
4. Extract every possible financial metric — calculate, infer, and cross-reference across all documents
5. Identify patterns, trends, anomalies, and seasonality
6. Provide specific, quantified, actionable CFO-level recommendations

Return ONLY a valid JSON object. No text outside the JSON:

{"timeframe":{"start":"YYYY-MM","end":"YYYY-MM","label":"e.g. Full Year 2024 or Jan–Sep 2024","months":12},"company":{"name":"Unknown","industry":"Other","currency":"USD"},"dataFound":["e.g. Bank statement Jan–Dec 2024 with 847 transactions","e.g. Payroll journal 12 employees Q3 2024"],"dataMissing":["e.g. No balance sheet — equity and asset ratios unavailable","e.g. No accounts receivable data — DSO cannot be calculated"],"income":{"revenue":0,"revenueBreakdown":[{"label":"category","amount":0}],"cogs":0,"grossProfit":0,"opex":0,"opexBreakdown":[{"label":"Payroll & Salaries","amount":0},{"label":"Rent & Facilities","amount":0},{"label":"Marketing & Advertising","amount":0},{"label":"Utilities & Telecom","amount":0},{"label":"Professional Services","amount":0},{"label":"Other Expenses","amount":0}],"da":0,"interest":0,"tax":0,"netProfit":0},"balance":{"cash":0,"receivables":0,"inventory":0,"otherCurrent":0,"ppe":0,"otherLongTerm":0,"payables":0,"shortTermDebt":0,"otherCurrentLiab":0,"longTermDebt":0,"equity":0},"cashFlow":{"operating":0,"investing":0,"financing":0,"openingBalance":0,"closingBalance":0},"monthlyTrend":[{"month":"YYYY-MM","revenue":0,"expenses":0,"netProfit":0,"cashBalance":0}],"prior":{"revenue":0,"cash":0,"ebitda":0},"analysis":{"executiveSummary":"4-5 sentences: overall financial position, key highlights, primary concerns","profitabilityInsights":"Analysis of margins, pricing power, cost structure efficiency","cashFlowInsights":"Cash generation, burn rate, seasonality if present","riskFactors":["Specific quantified risk e.g. Cash runway 4 months at current burn","Second risk"],"strengths":["Specific strength with data e.g. Gross margin 62% vs 45% industry avg","Second strength"],"recommendations":["Specific actionable recommendation with expected impact","Second recommendation"]}}

EXTRACTION RULES:
- Journal: Revenue = net credits to income accounts (4000s). COGS = debits to cost accounts (5000s). OPEX = debits to expense accounts (6000+) broken down by type.
- Bank statement: Revenue = all deposits/credits grouped by source. Expenses = all withdrawals categorized by payee/description. Cash = closing balance.
- Monthly trend: if data spans multiple months, calculate month-by-month revenue, expenses, netProfit.
- opexBreakdown: only include categories with amount > 0. Merge small categories into "Other Expenses".
- revenueBreakdown: only if multiple revenue streams are clearly identifiable.
- All monetary values must be positive numbers. Use 0 for unknown fields.`;

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

// ─── Upload Tab ───────────────────────────────────────────────────────────────
function UploadTab({ uploadedFiles, setUploadedFiles, analyzing, setAnalyzing, onAnalysisComplete, deepAnalysis, timeframeOverride, setTimeframeOverride }) {
  const [dragging, setDragging]   = useState(false);
  const [addingFile, setAddingFile] = useState(false);
  const [error, setError]         = useState('');
  const fileRef = useRef();

  const fmtSize = bytes => bytes < 1024*1024 ? `${(bytes/1024).toFixed(0)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`;
  const EXT_COLORS = { pdf:'#DC2626', xlsx:'#16A34A', xls:'#16A34A', csv:'#2563EB' };

  const addFile = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const isPDF = ext === 'pdf';
    const isSheet = ['xlsx','xls','csv'].includes(ext);
    if (!isPDF && !isSheet) { setError('Unsupported type. Upload PDF, Excel, or CSV files.'); return; }
    if (uploadedFiles.some(f => f.name === file.name)) { setError(`"${file.name}" is already uploaded. Remove it first to replace.`); return; }
    setAddingFile(true); setError('');
    try {
      let data, mediaType;
      if (isPDF) { data = await readFileAsBase64(file); mediaType = 'application/pdf'; }
      else { data = await parseSpreadsheetAsText(file); mediaType = 'text/plain'; }
      setUploadedFiles(prev => [...prev, { id:`${Date.now()}_${Math.random()}`, name:file.name, ext, size:file.size, data, mediaType }]);
    } catch (e) { setError(`Could not read ${file.name}: ${e.message}`); }
    finally { setAddingFile(false); }
  };

  const removeFile = id => setUploadedFiles(prev => prev.filter(f => f.id !== id));

  const onDrop = e => { e.preventDefault(); setDragging(false); Array.from(e.dataTransfer.files).forEach(addFile); };
  const onFileChange = e => { Array.from(e.target.files).forEach(addFile); e.target.value = ''; };

  const runAnalysis = async () => {
    if (!uploadedFiles.length || analyzing) return;
    setAnalyzing(true); setError('');
    try {
      const pdfFiles = uploadedFiles.filter(f => f.mediaType === 'application/pdf')
        .map(f => ({ data: f.data, mediaType: f.mediaType, name: f.name }));
      const textContent = uploadedFiles.filter(f => f.mediaType === 'text/plain')
        .map(f => `=== ${f.name} ===\n${f.data}`).join('\n\n');
      const resp = await fetch(import.meta.env.VITE_API_ENDPOINT || '/api/claude', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: DEEP_ANALYSIS_PROMPT,
          files: pdfFiles.length ? pdfFiles : undefined,
          textContent: textContent || undefined,
        }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Analysis failed');
      let result;
      try {
        const m = data.insight.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('no json');
        result = JSON.parse(m[0]);
      } catch { throw new Error('Could not parse AI response. Please try again.'); }
      onAnalysisComplete(result);
    } catch (e) { setError(e.message); }
    finally { setAnalyzing(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h2 className="text-2xl font-bold mb-1" style={{color:TEXT1}}>Financial Documents</h2>
        <p className="text-sm" style={{color:TEXT2}}>Upload any financial files you have — bank statements, journal reports, expense sheets, invoices, or anything else. Claude will extract what it can, analyse everything together, and tell you exactly what is missing for a more complete picture.</p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={onDrop}
        onClick={()=>!addingFile&&fileRef.current.click()}
        className="rounded-xl p-8 text-center cursor-pointer transition-all mb-5"
        style={{background:dragging?'#EFF6FF':SURFACE,border:`2px dashed ${dragging?ACCENT:BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
        <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" multiple onChange={onFileChange} style={{display:'none'}}/>
        {addingFile ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:`${ACCENT}44`,borderTopColor:ACCENT}}/>
            <p className="text-sm" style={{color:TEXT2}}>Reading file…</p>
          </div>
        ) : (
          <>
            <svg className="w-9 h-9 mx-auto mb-3" style={{color:TEXT3}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p className="text-sm font-semibold mb-1" style={{color:TEXT1}}>Drop files here, or click to browse</p>
            <p className="text-xs mb-3" style={{color:TEXT3}}>Multiple files supported — upload everything you have for the most complete analysis</p>
            <div className="flex items-center justify-center gap-2">
              {['PDF','XLSX','XLS','CSV'].map(t=>(
                <span key={t} className="text-xs px-2 py-1 rounded font-semibold" style={{background:BG,border:`1px solid ${BORDER}`,color:TEXT3}}>{t}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {error && <AlertBanner type="warning" message={error}/>}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="rounded-xl mb-5 overflow-hidden" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
          <div className="px-5 py-3 flex items-center justify-between" style={{borderBottom:`1px solid ${BORDER}`,background:BG}}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{color:TEXT2}}>{uploadedFiles.length} Document{uploadedFiles.length>1?'s':''} Queued</p>
          </div>
          {uploadedFiles.map((file, i) => (
            <div key={file.id} className="flex items-center justify-between px-5 py-3.5" style={{borderBottom:i<uploadedFiles.length-1?`1px solid ${BG}`:'none'}}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{background:EXT_COLORS[file.ext]||ACCENT,color:'#fff',minWidth:36,textAlign:'center'}}>{file.ext.toUpperCase()}</span>
                <div>
                  <p className="text-sm font-medium" style={{color:TEXT1}}>{file.name}</p>
                  <p className="text-xs" style={{color:TEXT3}}>{fmtSize(file.size)}</p>
                </div>
              </div>
              <button onClick={()=>removeFile(file.id)}
                className="text-xs px-3 py-1.5 rounded-lg transition"
                style={{color:DANGER,border:`1px solid #FECACA`,background:'#FEF2F2'}}
                onMouseEnter={e=>{e.currentTarget.style.background=DANGER;e.currentTarget.style.color='#fff';}}
                onMouseLeave={e=>{e.currentTarget.style.background='#FEF2F2';e.currentTarget.style.color=DANGER;}}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Analyse Button */}
      {uploadedFiles.length > 0 && (
        <button onClick={runAnalysis} disabled={analyzing}
          className="w-full py-4 rounded-xl text-white font-bold text-base mb-6 transition"
          style={{background:analyzing?ACCENT2:ACCENT,cursor:analyzing?'not-allowed':'pointer'}}>
          {analyzing
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block"/>Analysing {uploadedFiles.length} document{uploadedFiles.length>1?'s':''}… This may take a moment</span>
            : `Analyse ${uploadedFiles.length} Document${uploadedFiles.length>1?'s':''}`
          }
        </button>
      )}

      {/* Analysis Status */}
      {deepAnalysis && (
        <div className="rounded-xl overflow-hidden" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{background:NAVY,borderBottom:`1px solid ${NAVY2}`}}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:SUCCESS}}/>
            <p className="text-sm font-semibold" style={{color:'#F1F5F9'}}>Last Analysis Results</p>
            {deepAnalysis.timeframe?.label && (
              <span className="ml-auto text-xs px-2 py-1 rounded" style={{background:'#1E293B',color:'#94A3B8'}}>{deepAnalysis.timeframe.label}</span>
            )}
          </div>
          <div className="p-5 space-y-5">
            {/* Timeframe override */}
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{color:TEXT3}}>Analysis Period for Ratios</p>
              <select value={timeframeOverride} onChange={e=>setTimeframeOverride(e.target.value)}
                style={{border:`1px solid ${BORDER}`,borderRadius:6,padding:'4px 10px',fontSize:12,color:TEXT1,background:SURFACE,outline:'none',fontFamily:'inherit'}}>
                {PERIODS.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <span className="text-xs" style={{color:TEXT3}}>Affects DSO, DPO, and period-based ratio calculations</span>
            </div>

            {/* What was found */}
            {deepAnalysis.dataFound?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{color:TEXT2}}>Data Sources Identified</p>
                <div className="space-y-1.5">
                  {deepAnalysis.dataFound.map((item,i)=>(
                    <div key={i} className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{color:SUCCESS}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <p className="text-xs leading-relaxed" style={{color:TEXT2}}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What's missing */}
            {deepAnalysis.dataMissing?.length > 0 && (
              <div className="rounded-lg p-4" style={{background:'#FFFBEB',border:`1px solid #FDE68A`}}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{color:'#92400E'}}>Upload These to Improve the Analysis</p>
                <div className="space-y-2">
                  {deepAnalysis.dataMissing.map((item,i)=>(
                    <div key={i} className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{color:WARNING}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      <p className="text-xs leading-relaxed" style={{color:'#92400E'}}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ calc, company, deepAnalysis }) {
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

  // Monthly trend chart data
  const monthlyTrend = deepAnalysis?.monthlyTrend?.filter(m => m.revenue > 0 || m.expenses > 0) || [];

  // Expense breakdown chart data
  const opexBreakdown = (deepAnalysis?.income?.opexBreakdown || []).filter(e => e.amount > 0);
  const CHART_COLORS = ['#1D4ED8','#059669','#D97706','#DC2626','#7C3AED','#0891B2','#DB2777'];

  return (
    <div className="space-y-6">
      {/* AI Executive Summary */}
      {deepAnalysis?.analysis?.executiveSummary && (
        <div className="rounded-xl p-5" style={{background:NAVY,border:`1px solid ${NAVY2}`,boxShadow:'0 2px 8px rgba(12,25,41,0.12)'}}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{background:ACCENT}}/>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{color:'#64748B'}}>CFO Intelligence Report</p>
            {deepAnalysis.timeframe?.label && <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{background:'#1E293B',color:'#64748B'}}>{deepAnalysis.timeframe.label}</span>}
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{color:'#CBD5E1'}}>{deepAnalysis.analysis.executiveSummary}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deepAnalysis.analysis.riskFactors?.length > 0 && (
              <div className="rounded-lg p-3" style={{background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)'}}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{color:'#FCA5A5'}}>Risk Factors</p>
                {deepAnalysis.analysis.riskFactors.slice(0,3).map((r,i)=><p key={i} className="text-xs mb-1 leading-relaxed" style={{color:'#FCA5A5'}}>— {r}</p>)}
              </div>
            )}
            {deepAnalysis.analysis.strengths?.length > 0 && (
              <div className="rounded-lg p-3" style={{background:'rgba(5,150,105,0.1)',border:'1px solid rgba(5,150,105,0.2)'}}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{color:'#6EE7B7'}}>Strengths</p>
                {deepAnalysis.analysis.strengths.slice(0,3).map((s,i)=><p key={i} className="text-xs mb-1 leading-relaxed" style={{color:'#6EE7B7'}}>— {s}</p>)}
              </div>
            )}
          </div>
          {deepAnalysis.analysis.recommendations?.length > 0 && (
            <div className="mt-3 rounded-lg p-3" style={{background:'rgba(29,78,216,0.12)',border:'1px solid rgba(29,78,216,0.2)'}}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{color:'#93C5FD'}}>CFO Recommendations</p>
              {deepAnalysis.analysis.recommendations.map((r,i)=>(
                <p key={i} className="text-xs mb-1.5 leading-relaxed" style={{color:'#93C5FD'}}>{i+1}. {r}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {alerts.length > 0 && <div>{alerts.map((a,i)=><AlertBanner key={i} type={a.type} message={a.message}/>)}</div>}

      {/* Health Score */}
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Revenue"             value={fmt(revenue,sym)}      trend={trendArrow(revenueGrowth)}/>
        <KPICard label="Gross Profit"        value={fmt(grossProfit,sym)}  sub={pct(grossMargin)}/>
        <KPICard label="EBITDA"              value={fmt(ebitda,sym)}       sub={pct(ebitdaMargin)}/>
        <KPICard label="Net Profit"          value={fmt(netProfit,sym)}    sub={pct(netMargin)} color={netProfit<0?DANGER:undefined}/>
        <KPICard label="Cash Position"       value={fmt(cash,sym)}         trend={trendArrow(cashGrowth)}/>
        <KPICard label="Accounts Receivable" value={fmt(receivables,sym)}/>
        <KPICard label="Total Equity"        value={fmt(equity,sym)}/>
        <KPICard label="Asset Turnover"      value={assetTurnover!=null?`${assetTurnover.toFixed(2)}x`:'—'}/>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyTrend.length > 1 && (
        <div className="rounded-xl p-6" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{color:TEXT2}}>Monthly Revenue vs Expenses</h3>
          <p className="text-xs mb-4" style={{color:TEXT3}}>Based on AI-extracted monthly data from uploaded documents</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{top:5,right:10,left:10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
                <XAxis dataKey="month" tick={{fontSize:10,fill:TEXT3}} tickFormatter={v=>v.slice(5)}/>
                <YAxis tickFormatter={v=>fmt(v,sym)} tick={{fontSize:10,fill:TEXT3}} width={70}/>
                <Tooltip formatter={(v,n)=>[fmt(v,sym),n]} contentStyle={{fontSize:12,border:`1px solid ${BORDER}`,borderRadius:8}}/>
                <Legend wrapperStyle={{fontSize:12}}/>
                <Line type="monotone" dataKey="revenue"  stroke={SUCCESS} strokeWidth={2} dot={false} name="Revenue"/>
                <Line type="monotone" dataKey="expenses" stroke={DANGER}  strokeWidth={2} dot={false} name="Expenses"/>
                <Line type="monotone" dataKey="netProfit" stroke={ACCENT} strokeWidth={1.5} dot={false} name="Net Profit" strokeDasharray="4 2"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Expense Breakdown */}
      {opexBreakdown.length > 0 && (
        <div className="rounded-xl p-6" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{color:TEXT2}}>Operating Expense Breakdown</h3>
          <p className="text-xs mb-4" style={{color:TEXT3}}>AI-categorised from uploaded financial documents</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opexBreakdown} layout="vertical" margin={{top:0,right:80,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false}/>
                <XAxis type="number" tickFormatter={v=>fmt(v,sym)} tick={{fontSize:10,fill:TEXT3}}/>
                <YAxis type="category" dataKey="label" tick={{fontSize:11,fill:TEXT2}} width={140}/>
                <Tooltip formatter={v=>[fmt(v,sym),'Amount']} contentStyle={{fontSize:12,border:`1px solid ${BORDER}`,borderRadius:8}}/>
                <Bar dataKey="amount" radius={[0,4,4,0]}>
                  {opexBreakdown.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Profitability & CF Insights */}
      {(deepAnalysis?.analysis?.profitabilityInsights || deepAnalysis?.analysis?.cashFlowInsights) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deepAnalysis.analysis.profitabilityInsights && (
            <div className="rounded-xl p-5" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:TEXT2}}>Profitability Analysis</p>
              <p className="text-sm leading-relaxed" style={{color:TEXT2}}>{deepAnalysis.analysis.profitabilityInsights}</p>
            </div>
          )}
          {deepAnalysis.analysis.cashFlowInsights && (
            <div className="rounded-xl p-5" style={{background:SURFACE,border:`1px solid ${BORDER}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:TEXT2}}>Cash Flow Analysis</p>
              <p className="text-sm leading-relaxed" style={{color:TEXT2}}>{deepAnalysis.analysis.cashFlowInsights}</p>
            </div>
          )}
        </div>
      )}
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
const ADVISOR_SYSTEM_PROMPT = `You are a senior CFO advisor for MENA-region SMEs working within CFO Pulse, an enterprise financial intelligence platform. Communicate with precision, brevity, and authority. Follow these rules strictly:
1. Never use hashtag headings (# or ##). Never use emojis of any kind.
2. Use **bold** only to highlight specific financial metrics, figures, or key terms — not for decoration.
3. Structure responses with short paragraphs or numbered/bulleted lists where appropriate.
4. Be concise and direct. Avoid filler phrases.
5. If recommending actions, be specific — reference the actual figures from the financial data provided.
6. Maintain a formal, boardroom-level tone throughout.`;

function FloatingAdvisor({ calc, company, deepAnalysis }) {
  const [open, setOpen]         = useState(false);
  const [hovered, setHovered]   = useState(false);
  const [messages, setMessages] = useState([
    { role:'assistant', content:'Good day. I am your CFO Pulse AI advisor. I have full access to your financial data and the AI analysis. What would you like to discuss?' }
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages, loading]);

  const buildContext = () => {
    const sym = SYMS[company.currency];
    let ctx = `Company: ${company.name||'Unknown'} | Industry: ${company.industry} | Period: ${company.period} ${company.year} | Currency: ${company.currency}
Revenue: ${fmt(calc.revenue,sym)} | Gross Profit: ${fmt(calc.grossProfit,sym)} (${pct(calc.grossMargin)})
EBITDA: ${fmt(calc.ebitda,sym)} (${pct(calc.ebitdaMargin)}) | Net Profit: ${fmt(calc.netProfit,sym)} (${pct(calc.netMargin)})
Cash: ${fmt(calc.cash,sym)} | Total Assets: ${fmt(calc.totalAssets,sym)} | Equity: ${fmt(calc.equity,sym)}
Current Ratio: ${calc.currentRatio?.toFixed(2)??'—'} | D/E: ${calc.deRatio?.toFixed(2)??'—'} | Interest Coverage: ${calc.interestCoverage?.toFixed(1)??'—'}
ROE: ${pct(calc.roe)} | ROA: ${pct(calc.roa)} | Asset Turnover: ${calc.assetTurnover?.toFixed(2)??'—'}
Operating CF: ${fmt(calc.operatingCF,sym)} | Cash Runway: ${calc.runway!=null?calc.runway+' months':'N/A'}
Financial Health Score: ${calc.healthScore}/100`;

    if (deepAnalysis?.analysis?.executiveSummary) {
      ctx += `\n\nAI Analysis Summary: ${deepAnalysis.analysis.executiveSummary}`;
    }
    if (deepAnalysis?.dataMissing?.length) {
      ctx += `\nData gaps: ${deepAnalysis.dataMissing.join('; ')}`;
    }
    if (deepAnalysis?.timeframe?.label) {
      ctx += `\nAnalysis period: ${deepAnalysis.timeframe.label}`;
    }
    return ctx;
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
        body: JSON.stringify({ prompt:`${ADVISOR_SYSTEM_PROMPT}\n\nFINANCIAL DATA:\n${buildContext()}\n\nUser question: ${text}` }),
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
          <div style={{background:NAVY,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div>
              <p style={{color:'#F1F5F9',fontWeight:600,fontSize:14,margin:0}}>CFO Pulse AI Advisor</p>
              <p style={{color:'#64748B',fontSize:11,margin:'2px 0 0'}}>Powered by Claude — context-aware financial advisor</p>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',color:'#64748B',cursor:'pointer',padding:'4px 8px',borderRadius:6,fontSize:16,lineHeight:1}} onMouseEnter={e=>e.target.style.color='#F1F5F9'} onMouseLeave={e=>e.target.style.color='#64748B'}>✕</button>
          </div>
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
  const [uploadedFiles,     setUploadedFiles]     = useState([]);
  const [analyzing,         setAnalyzing]         = useState(false);
  const [deepAnalysis,      setDeepAnalysis]      = useState(null);
  const [timeframeOverride, setTimeframeOverride] = useState('Annual');
  const [activeTab,         setActiveTab]         = useState('upload');
  const [company,   setCompany]   = useState({ name:'', industry:'Other', currency:'USD', period:'Annual', year:String(new Date().getFullYear()) });
  const [income,    setIncome]    = useState({ revenue:0, cogs:0, opex:0, da:0, interest:0, tax:0 });
  const [balance,   setBalance]   = useState({ cash:0, receivables:0, inventory:0, otherCurrent:0, ppe:0, otherLongTerm:0, payables:0, shortTermDebt:0, otherCurrentLiab:0, longTermDebt:0, equity:0 });
  const [cashFlow,  setCashFlow]  = useState({ operating:0, investing:0, financing:0 });
  const [prior,     setPrior]     = useState({ revenue:0, cash:0, ebitda:0 });

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cfopulse_v2'));
      if (saved?.deepAnalysis) {
        setDeepAnalysis(saved.deepAnalysis);
        setCompany(saved.company || company);
        setIncome(saved.income || income);
        setBalance(saved.balance || balance);
        setCashFlow(saved.cashFlow || cashFlow);
        setPrior(saved.prior || prior);
        setTimeframeOverride(saved.timeframeOverride || 'Annual');
        setActiveTab('overview');
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage whenever analysis data changes
  useEffect(() => {
    if (!deepAnalysis) return;
    try {
      localStorage.setItem('cfopulse_v2', JSON.stringify({ deepAnalysis, company, income, balance, cashFlow, prior, timeframeOverride }));
    } catch {}
  }, [deepAnalysis, company, income, balance, cashFlow, prior, timeframeOverride]);

  // When timeframeOverride changes, sync company.period for ratio calculations
  useEffect(() => {
    setCompany(prev => ({ ...prev, period: timeframeOverride }));
  }, [timeframeOverride]);

  const handleAnalysisComplete = (result) => {
    setDeepAnalysis(result);
    const i = result.income  || {};
    const b = result.balance || {};
    const cf = result.cashFlow || {};
    const p = result.prior  || {};
    const c = result.company || {};
    const tf = result.timeframe || {};

    const detectedPeriod = tf.months >= 10 ? 'Annual' : tf.months >= 5 ? 'Semi-Annual' : 'Quarterly';
    const period = PERIODS.includes(detectedPeriod) ? detectedPeriod : 'Annual';

    setTimeframeOverride(period);
    setCompany({
      name:     c.name && c.name !== 'Unknown' ? c.name : '',
      industry: INDUSTRIES.includes(c.industry) ? c.industry : 'Other',
      currency: CURRENCIES.includes(c.currency) ? c.currency : 'USD',
      period,
      year:     tf.end ? tf.end.slice(0,4) : String(new Date().getFullYear()),
    });
    setIncome({  revenue: N(i.revenue), cogs: N(i.cogs), opex: N(i.opex), da: N(i.da), interest: N(i.interest), tax: N(i.tax) });
    setBalance({ cash: N(b.cash), receivables: N(b.receivables), inventory: N(b.inventory), otherCurrent: N(b.otherCurrent), ppe: N(b.ppe), otherLongTerm: N(b.otherLongTerm), payables: N(b.payables), shortTermDebt: N(b.shortTermDebt), otherCurrentLiab: N(b.otherCurrentLiab), longTermDebt: N(b.longTermDebt), equity: N(b.equity) });
    setCashFlow({ operating: N(cf.operating), investing: N(cf.investing), financing: N(cf.financing) });
    setPrior({   revenue: N(p.revenue), cash: N(p.cash), ebitda: N(p.ebitda) });
    setActiveTab('overview');
  };

  const clearAnalysis = () => {
    setDeepAnalysis(null);
    setActiveTab('upload');
    try { localStorage.removeItem('cfopulse_v2'); } catch {}
  };

  // ── Financial Calculations ─────────────────────────────────────────────────
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

    const months = PMONTHS[company.period] || 12;
    const operatingCF = N(cashFlow.operating) || (netProfit + da);
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

  const tabs = [
    { key:'upload',   label:'Documents' },
    { key:'overview', label:'Overview' },
    { key:'cashflow', label:'Cash Flow' },
    { key:'ratios',   label:'Financial Ratios' },
  ];

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
                {deepAnalysis?.timeframe?.label && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{background:'#1E293B',color:'#64748B',border:`1px solid #334155`}}>{deepAnalysis.timeframe.label}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {deepAnalysis && (
              <button onClick={clearAnalysis}
                className="flex items-center gap-1.5 text-xs font-medium transition"
                style={{color:'#64748B',border:`1px solid #1E293B`,borderRadius:8,padding:'5px 12px',background:'transparent'}}
                onMouseEnter={e=>{e.currentTarget.style.color='#94A3B8';e.currentTarget.style.borderColor='#334155';}}
                onMouseLeave={e=>{e.currentTarget.style.color='#64748B';e.currentTarget.style.borderColor='#1E293B';}}>
                New Analysis
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
              {t.key==='upload' && uploadedFiles.length > 0 && (
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{background:ACCENT,color:'#fff'}}>{uploadedFiles.length}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'upload' && (
          <UploadTab
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            analyzing={analyzing}
            setAnalyzing={setAnalyzing}
            onAnalysisComplete={handleAnalysisComplete}
            deepAnalysis={deepAnalysis}
            timeframeOverride={timeframeOverride}
            setTimeframeOverride={setTimeframeOverride}
          />
        )}
        {activeTab === 'overview' && <OverviewTab calc={calc} company={company} deepAnalysis={deepAnalysis}/>}
        {activeTab === 'cashflow' && <CashFlowTab calc={calc} company={company}/>}
        {activeTab === 'ratios'   && <RatiosTab   calc={calc}/>}
      </main>

      {deepAnalysis && <FloatingAdvisor calc={calc} company={company} deepAnalysis={deepAnalysis}/>}
    </div>
  );
}
