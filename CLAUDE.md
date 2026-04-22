# CLAUDE.md — CFO Pulse Development Master Context
> Read this file fully before touching any code. Every architectural decision, constraint, and task is here.

---

## 1. PROJECT OVERVIEW

**CFO Pulse** is a React-based financial analysis web app for Hazem Kassem / Axcell.
It allows a CFO/consultant to upload financial documents (spreadsheets, bank statements, GL exports)
and receive structured, audit-quality financial analysis powered by Claude AI.

- **Repo:** omarjku/cfo-pulse
- **Hosting:** Vercel
- **Auth:** Supabase (single admin account)
- **Stack:** React (JSX only — NO TypeScript), Vite, Recharts, framer-motion,
  react-markdown, lucide-react, xlsx, mammoth, date-fns, Quill editor

---

## 2. ABSOLUTE CONSTRAINTS — NEVER VIOLATE

```
❌ No TypeScript — .jsx and .js only
❌ No new npm packages except what is already installed
❌ Never touch: supabase.js, auth.js, App.jsx routing, DashboardPanel,
   KPICard, HealthGauge, TrendChart, useHistory, useRAG,
   or any supabase.from() call
❌ No localStorage or sessionStorage — use Supabase session only
❌ All Supabase calls go through /lib/supabase.js only
❌ Schema is always a superset — never replace existing JSON fields
✅ npm run build must pass after every task (one pre-existing chunk size
   warning is acceptable — ignore it)
```

---

## 3. WHAT IS ALREADY BUILT (DO NOT REDO)

### 3.1 Rich Response Rendering
Claude Sonnet returns structured JSON with these fields:
```json
{
  "narrative": "string",
  "document_timelines": [...],
  "tables": [...],
  "charts": [...],
  "flags": [...],
  "actions": [...],
  "healthScore": 0,
  "income": {},
  "balance": {},
  "cashFlow": {},
  "prior": {},
  "monthlyTrend": [...],
  "analysis": "string"
}
```
The new fields (narrative, document_timelines, tables, charts, flags, actions)
are a SUPERSET of the existing dashboard JSON. Both must coexist.

### 3.2 File Upload
Accepts: PDF, XLSX, XLS, CSV, TXT, DOCX, PNG, JPG, JPEG, WEBP, GIF

### 3.3 Document Timeline Gantt
Horizontal Recharts bar chart shown first in every rich response.
Overlap color-coded, "Unknown period" gray rows for undated docs.

### 3.4 RichResponse Component
Renders in this order: Timeline → Narrative → Tables → Charts → Flags → Actions

### 3.5 FileTypeBadge
Pill showing file extension next to uploaded doc name.

### 3.6 HTML Artifact Rendering (CURRENT OPEN TASK — finish this first)
When Claude returns a self-contained HTML artifact inside a fenced code block
(```html <!DOCTYPE html>...```), render it in a sandboxed iframe instead of raw text.

**Spec:**
- Detect: fenced code block with lang="html" AND content starts with
  `<!DOCTYPE html>` or `<html>`
- Render as: `<iframe srcDoc={rawHtml} sandbox="allow-scripts"
  style={{ width:'100%', height:'480px', border:'none', borderRadius:'8px' }}
  title="artifact" />`
- Toolbar above iframe: "ARTIFACT" label (amber monospace) + Copy button +
  Expand button (opens in new tab via Blob URL)
- Non-full-HTML code blocks → keep existing `<pre><code>` rendering
- Files to touch: MessageBubble.jsx and optionally parseRichResponse.js
- No new packages. Confirm before each file edit.

---

## 4. THE FINANCIAL ANALYSIS ENGINE — WHAT WE ARE BUILDING

### 4.1 Why This Exists
The goal is for CFO Pulse to perform the same multi-document financial analysis
that a skilled CFO analyst does manually:
- Identify what each document IS (bank statement, sales register, GL journal, eWallet report)
- Extract and aggregate the right numbers per document type
- Cross-reference across documents (does bank statement closing balance match GL?)
- Produce CFO-quality flags, KPIs, trends, and an implied P&L

This was demonstrated live with 4 Bullion Bridge Egypt files:
- eWallet report (270 rows) → disbursement trend, channel split, fee analysis
- Al Baraka bank statement (183 txns) → monthly cash flow, liquidity flag
- Bullion sales register (296 invoices, 3 sheets) → margin by karat, tax portal gaps
- Zoho GL journal (691 rows) → balance sheet positions, OpEx breakdown, implied P&L

The output was a 5-sheet Excel workbook with EGP 8.2M throughput tracked,
22 unmatched tax portal invoices flagged, EGP 9.48M related-party payable flagged,
and a net operating loss of ~EGP 1.83M derived from the GL.

### 4.2 Core Insight
**Never send raw spreadsheet rows to Claude.**
Pre-aggregate on the client using the existing `xlsx` package.
Claude receives ~15 lines of structured JSON summaries, not 10,000 rows.
Claude is used for REASONING and FLAGGING, not for summing columns.

---

## 5. TARGET ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                  CLIENT (React/Vite)                     │
│                                                          │
│  FileUpload → [fileExtractor.js] → AnalysisOrchestrator  │
│                     ↓                      ↓             │
│              DocumentStore          RichResponse         │
│              (session state)        Renderer             │
└──────────────────────┬──────────────────────────────────┘
                       │ fetch() calls
┌──────────────────────▼──────────────────────────────────┐
│            VERCEL SERVERLESS FUNCTIONS (/api/)           │
│                                                          │
│  /api/analyze.js   → classify + per-doc analysis (1 call)│
│  /api/synthesize.js → cross-doc synthesis (2+ docs only) │
└─────────────────────────────────────────────────────────┘
```

**Two API endpoints only** (not four — combined classify+analyze for simplicity):
1. `/api/analyze.js` — takes one document's extracted summary, returns structured analysis JSON
2. `/api/synthesize.js` — takes array of analysis JSONs, returns cross-doc synthesis

Both call `claude-sonnet-4-20250514`. Max tokens: 2000 per analyze call, 3000 for synthesize.

---

## 6. DOCUMENT TYPE TAXONOMY

```javascript
const DOC_TYPES = {
  BANK_STATEMENT:  'BANK_STATEMENT',   // date, debit, credit, balance columns
  SALES_REGISTER:  'SALES_REGISTER',   // invoice, client, amount, margin columns
  GL_JOURNAL:      'GL_JOURNAL',       // date, account_code, debit, credit columns
  EWALLET_REPORT:  'EWALLET_REPORT',   // transaction_id, amount, fees, status columns
  TRIAL_BALANCE:   'TRIAL_BALANCE',    // account, debit, credit (no date)
  PAYROLL:         'PAYROLL',          // employee, gross, deductions, net
  INCOME_STATEMENT:'INCOME_STATEMENT', // revenue, expense line items
  UNKNOWN:         'UNKNOWN'
};
```

Classification is done CLIENT-SIDE by inspecting column headers (no API call needed for this).
Column header matching rules are in Section 8 below.

---

## 7. THE PIPELINE — STEP BY STEP

### Step 1: User uploads file(s)
Existing file upload handles this. No changes needed.

### Step 2: fileExtractor.js (CLIENT-SIDE, no API)
For each uploaded file:
1. Detect file type from extension
2. Parse using `xlsx` (already installed)
3. Classify doc type by inspecting column headers
4. Extract: sampleRows (first 5), aggregates (totals, date range, counts), anomalies
5. Return structured `ExtractedDoc` object

### Step 3: /api/analyze.js (one call per doc, run in parallel)
Input: `ExtractedDoc` object
Output: `AnalyzedDoc` JSON with kpis, flags, tables, monthlyTrend, narrative

### Step 4: /api/synthesize.js (only when 2+ docs uploaded)
Input: array of `AnalyzedDoc` objects
Output: synthesis JSON with executiveSummary, crossDocFlags, impliedPL, recommendedActions

### Step 5: Render
Wire synthesis output into existing RichResponse component.
New fields added to the existing JSON superset schema.

---

## 8. fileExtractor.js — FULL SPECIFICATION

### File: `src/lib/fileExtractor.js`

```javascript
// CLASSIFICATION RULES — match against lowercased column headers
const CLASSIFICATION_RULES = {
  BANK_STATEMENT: {
    required: [['balance', 'running balance', 'closing balance']],
    supporting: ['debit', 'credit', 'date', 'description', 'reference'],
    minScore: 3
  },
  GL_JOURNAL: {
    required: [['account_code', 'account code', 'account']],
    supporting: ['debit', 'credit', 'date', 'description', 'journal'],
    minScore: 4
  },
  EWALLET_REPORT: {
    required: [['transaction id', 'transaction_id', 'txn id']],
    supporting: ['amount', 'fees', 'status', 'issuer', 'recipient', 'wallet'],
    minScore: 3
  },
  SALES_REGISTER: {
    required: [['invoice', 'invoice no', 'invoice_no', 'invoice number']],
    supporting: ['client', 'amount', 'margin', 'date', 'sale', 'purchase'],
    minScore: 3
  },
  TRIAL_BALANCE: {
    required: [['account']],
    supporting: ['debit', 'credit', 'balance'],
    minScore: 3,
    noDate: true  // trial balances have no date column
  },
  PAYROLL: {
    required: [['employee', 'staff', 'employee name']],
    supporting: ['gross', 'net', 'deduction', 'salary', 'insurance'],
    minScore: 3
  }
};
```

### ExtractedDoc output schema:
```javascript
{
  fileName: string,
  fileType: 'xlsx' | 'xls' | 'csv',
  docType: DOC_TYPES value,
  confidence: 0.0–1.0,
  currency: string | null,   // detected from headers or cell values
  entityName: string | null, // detected from header rows if present
  periodStart: string | null,
  periodEnd: string | null,
  columns: string[],         // actual column names from file
  sampleRows: object[],      // first 5 data rows
  rowCount: number,
  aggregates: {
    // BANK_STATEMENT specific:
    totalCredits?: number,
    totalDebits?: number,
    closingBalance?: number,
    openingBalance?: number,
    // GL_JOURNAL specific:
    totalDebitsGL?: number,
    totalCreditsGL?: number,
    isBalanced?: boolean,    // debits === credits
    topAccountsByVolume?: [{account, debit, credit, net}], // top 10
    // EWALLET_REPORT specific:
    totalAmount?: number,
    totalFees?: number,
    successCount?: number,
    failCount?: number,
    successRate?: number,
    byIssuer?: [{issuer, count, amount}],
    // SALES_REGISTER specific:
    totalRevenue?: number,
    totalCOGS?: number,
    grossMargin?: number,
    grossMarginPct?: number,
    invoiceCount?: number,
    // ALL types:
    monthlyTrend?: [{month: 'MMM-YY', amount: number, ...}]
  },
  anomalies: [
    { type: string, description: string, rowIndex?: number }
  ]
}
```

### Anomaly detection rules (run client-side):
```
BANK_STATEMENT:
  - closingBalance < (totalCredits * 0.05) → "Low closing balance vs throughput"
  - any month where debits > credits → "Net outflow month: {month}"

GL_JOURNAL:
  - totalDebits !== totalCredits → "Journal not balanced: difference = {n}"
  - any account_code starting with 3xxx with net debit > 1,000,000 → "Large related-party payable"

EWALLET_REPORT:
  - successRate < 0.90 → "Low success rate: {n}%"
  - any transaction with status not in ['Successful','successful'] → collect count

SALES_REGISTER:
  - any row where sale_price < purchase_price → "Sale below cost: {invoice}"
  - rows where tax_portal field contains 'لم تتم' or 'غير مطابقة' → count and flag
  - grossMarginPct < 0.02 → "Gross margin below 2% — spread business risk"
```

---

## 9. /api/analyze.js — FULL SPECIFICATION

### File: `api/analyze.js`

```javascript
export const config = { maxDuration: 30 };  // Vercel: extend timeout

export default async function handler(req, res) {
  // POST only
  // Body: { extractedDoc: ExtractedDoc }
  // Returns: AnalyzedDoc JSON
}
```

### System prompt (build this in the handler, varies by docType):

```javascript
const SYSTEM_PROMPTS = {
  BANK_STATEMENT: `You are a senior CFO analyst reviewing a bank account statement.
Your job is to identify financial risks, liquidity issues, and anomalies.

Rules:
- Flag closing balance < 5% of total monthly throughput as HIGH liquidity risk
- Flag any month where net flow is negative as MEDIUM risk
- Flag bank charges > 0.1% of total credits as LOW inefficiency
- Identify the largest single debit transaction and assess if it is unusual
- Note if the account appears to be a transit/clearing account (high throughput, low balance)

Currency context: If currency is EGP, note that 1 USD ≈ 50 EGP for context.`,

  GL_JOURNAL: `You are a senior CFO analyst reviewing a general ledger journal export.
Your job is to assess financial position, identify P&L implications, and flag risks.

Rules:
- If debits ≠ credits: flag as HIGH — journal integrity failure
- Related party payables (account names containing 'Sanaddak', 'related party', 
  'intercompany', 'parent'): flag as HIGH if net balance > 1,000,000 — transfer pricing risk
- Expense accounts (codes 6xxx, 7xxx, 8xxx): summarize into OpEx total
- Revenue accounts (codes 4xxx, 5xxx): identify gross revenue
- If both revenue and expense accounts present: compute implied gross margin
- PayMob/eWallet asset accounts with large net debit: flag for reconciliation
- Capex items (equipment, furniture, setup): note as non-recurring`,

  EWALLET_REPORT: `You are a senior CFO analyst reviewing an eWallet/payment disbursement report.
Your job is to assess operational efficiency and identify payment issues.

Rules:
- Success rate < 90%: HIGH flag — payment reliability risk
- Fee rate > 0.5% of disbursed amount: MEDIUM flag — cost efficiency
- Month-on-month growth > 100%: note as significant volume ramp
- Month-on-month drop > 30%: flag as MEDIUM — operational disruption
- Channel concentration > 80% on single issuer: LOW flag — dependency risk`,

  SALES_REGISTER: `You are a senior CFO analyst reviewing a sales and invoice register.
Your job is to assess revenue quality, margin performance, and compliance gaps.

Rules:
- Gross margin < 2%: note as spread/trading business model (not a flaw, just context)
- Unmatched tax portal invoices (Arabic: 'لم تتم الفوترة' or 'غير مطابقة'): 
  HIGH flag — tax compliance risk, count them
- Any invoice where sale_price < purchase_price: HIGH flag — loss-making transaction
- Revenue concentration: if top 3 clients > 60% of revenue: MEDIUM flag
- Karat/grade breakdown: note which grade has highest volume and highest margin`,

  UNKNOWN: `You are a senior CFO analyst reviewing an unclassified financial document.
Describe what you can determine about the document's purpose, key financial figures,
date range, and any risks or anomalies visible in the data.`
};
```

### AnalyzedDoc output schema (strict JSON, no markdown):
```javascript
{
  "docType": string,
  "fileName": string,
  "entityName": string | null,
  "period": string,           // e.g., "Jun–Dec 2025"
  "currency": string,         // e.g., "EGP"
  "confidence": number,
  "kpis": [
    { "label": string, "value": number | string, "format": "currency"|"percent"|"number"|"text" }
  ],
  "monthlyTrend": [
    { "month": string, ...docTypeSpecificFields }
  ],
  "flags": [
    {
      "severity": "HIGH"|"MEDIUM"|"LOW",
      "category": string,     // e.g., "Liquidity", "Tax Compliance", "Transfer Pricing"
      "title": string,        // one line
      "detail": string,       // 1-2 sentences
      "recommendation": string // concrete action
    }
  ],
  "tables": [
    {
      "title": string,
      "headers": string[],
      "rows": (string|number)[][]
    }
  ],
  "narrative": string         // 2-3 paragraph CFO-level summary
}
```

---

## 10. /api/synthesize.js — FULL SPECIFICATION

### File: `api/synthesize.js`
Only called when 2 or more documents have been analyzed.

```javascript
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // POST only
  // Body: { analyzedDocs: AnalyzedDoc[], entityName?: string }
  // Returns: SynthesisResult JSON
}
```

### Cross-document reconciliation checks (instruct Claude to perform these):
```
1. BANK-GL RECONCILIATION
   If BANK_STATEMENT + GL_JOURNAL both present:
   - Compare bank statement closing balance to GL bank account net balance
   - Flag any difference > 100 as reconciliation variance

2. REVENUE CONSISTENCY
   If SALES_REGISTER + GL_JOURNAL both present:
   - Compare total sales register revenue to GL revenue account credits
   - Flag if difference > 1% of total revenue

3. EWALLET-BANK LINKAGE
   If EWALLET_REPORT + BANK_STATEMENT both present:
   - Check if eWallet total disbursements are reflected as bank debits
   - Note if timing differences exist

4. ENTITY COVERAGE
   - List all entities mentioned across documents
   - Flag if entities in sales register are not in GL (missing intercompany entries)

5. IMPLIED P&L (only if GL_JOURNAL present with both revenue and expense accounts)
   Revenue (4xxx/5xxx credits net of debits)
   - COGS (7xxx net debits)
   = Gross Profit / Gross Margin %
   - OpEx (6xxx, 8xxx net debits, excluding depreciation)
   - Depreciation (from depreciation accounts)
   = EBIT
   +/- Other income/expense
   = Net Income / (Loss)
```

### SynthesisResult output schema:
```javascript
{
  "entityName": string,
  "period": string,
  "documentsAnalyzed": number,
  "executiveSummary": string,  // 3-4 paragraph CFO-level synthesis
  "crossDocFlags": [
    {
      "severity": "HIGH"|"MEDIUM"|"LOW",
      "category": string,
      "title": string,
      "detail": string,
      "affectedDocuments": string[],
      "recommendation": string
    }
  ],
  "impliedPL": {               // null if insufficient data
    "revenue": number | null,
    "cogs": number | null,
    "grossProfit": number | null,
    "grossMarginPct": number | null,
    "operatingExpenses": number | null,
    "ebit": number | null,
    "otherIncome": number | null,
    "netIncome": number | null,
    "currency": string,
    "note": string             // e.g., "Derived from GL journal; unaudited"
  },
  "kpiSummary": [              // top 6-8 KPIs across all documents
    { "label": string, "value": number|string, "format": string, "source": string }
  ],
  "recommendedActions": [
    {
      "priority": 1|2|3,       // 1=urgent, 2=important, 3=monitor
      "action": string,
      "owner": string,         // e.g., "CFO", "Accounting Team", "External Auditor"
      "deadline": string       // e.g., "Before next audit", "Within 30 days"
    }
  ],
  "monthlyTrend": [...],       // merged trend from all docs if possible
  "tables": [...],             // summary tables
  "narrative": string          // same as executiveSummary, for RichResponse compatibility
}
```

---

## 11. ORCHESTRATION — AnalysisOrchestrator.js

### File: `src/lib/analysisOrchestrator.js`

This is the client-side coordinator. It:
1. Calls `fileExtractor.js` for each uploaded file
2. Calls `/api/analyze` in parallel for all docs
3. If 2+ docs, calls `/api/synthesize`
4. Returns the final result in the existing RichResponse JSON superset schema

```javascript
export async function runFinancialAnalysis(uploadedFiles) {
  // Step 1: Extract all documents
  const extractedDocs = await Promise.all(
    uploadedFiles.map(file => extractDocument(file))
  );

  // Step 2: Analyze all documents in parallel
  const analyzedDocs = await Promise.all(
    extractedDocs.map(doc =>
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedDoc: doc })
      }).then(r => r.json())
    )
  );

  // Step 3: Synthesize if multiple documents
  if (analyzedDocs.length >= 2) {
    const synthesis = await fetch('/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analyzedDocs })
    }).then(r => r.json());

    return mapToRichResponseSchema(synthesis, analyzedDocs);
  }

  return mapToRichResponseSchema(null, analyzedDocs);
}

function mapToRichResponseSchema(synthesis, analyzedDocs) {
  // Maps to existing RichResponse JSON superset
  // Preserves all existing fields (healthScore, income, balance, cashFlow, etc.)
  // Adds new fields from synthesis/analysis
  return {
    // Existing fields (preserved)
    healthScore: synthesis?.healthScore || 0,
    income: {},
    balance: {},
    cashFlow: {},
    prior: {},
    monthlyTrend: synthesis?.monthlyTrend || analyzedDocs[0]?.monthlyTrend || [],
    analysis: synthesis?.executiveSummary || analyzedDocs[0]?.narrative || '',
    // New fields (additive)
    narrative: synthesis?.executiveSummary || analyzedDocs[0]?.narrative || '',
    document_timelines: buildDocumentTimelines(analyzedDocs),
    tables: synthesis?.tables || analyzedDocs.flatMap(d => d.tables || []),
    charts: buildCharts(analyzedDocs),
    flags: [
      ...(synthesis?.crossDocFlags || []),
      ...analyzedDocs.flatMap(d => d.flags || [])
    ],
    actions: synthesis?.recommendedActions?.map(a => ({
      label: a.action,
      priority: a.priority,
      owner: a.owner,
      deadline: a.deadline
    })) || [],
    impliedPL: synthesis?.impliedPL || null,
    kpiSummary: synthesis?.kpiSummary || analyzedDocs.flatMap(d => d.kpis || []),
    documentsAnalyzed: analyzedDocs.length
  };
}
```

---

## 12. RENDERING — What Needs to Be Added to RichResponse

The existing RichResponse component already renders:
- document_timelines ✅
- narrative ✅
- tables ✅
- charts ✅
- flags ✅
- actions ✅

New rendering needed (add to RichResponse.jsx):
- `impliedPL` block — a simple income statement table with color-coded net income
- `kpiSummary` grid — 2-column KPI cards above the narrative
- Per-document `confidence` badge on the timeline (already has document_timelines)

---

## 13. SPRINT PLAN — EXECUTE IN THIS ORDER

### TASK 0 (OPEN — FINISH FIRST): HTML Artifact iFrame Rendering
Files: MessageBubble.jsx, optionally parseRichResponse.js
Spec: Section 3.6 above
Gate: Upload a message containing ```html <!DOCTYPE html>... ``` → renders in iframe with toolbar

---

### TASK 1: fileExtractor.js
File to create: `src/lib/fileExtractor.js`
Dependencies: `xlsx` (already installed)
No API calls. Pure client-side.

Steps:
1. Read first sheet of xlsx/xls/csv
2. Detect column headers (handle Arabic headers too — check for English equivalents)
3. Run classification rules (Section 8) → assign docType + confidence
4. Run aggregation logic per docType
5. Run anomaly detection per docType
6. Return ExtractedDoc object

Test: Import in browser console, pass each of the 4 Bullion Bridge file types, verify output.

Gate: Given a 270-row eWallet XLS, returns:
```json
{
  "docType": "EWALLET_REPORT",
  "rowCount": 270,
  "aggregates": {
    "totalAmount": 4460454.44,
    "successCount": 244,
    "successRate": 0.904
  }
}
```

---

### TASK 2: /api/analyze.js
File to create: `api/analyze.js`
Dependencies: Anthropic API key (from ANTHROPIC_API_KEY env var)

Steps:
1. Receive ExtractedDoc via POST
2. Build docType-specific system prompt (Section 9)
3. Build user message from aggregates + sampleRows + anomalies
4. Call claude-sonnet-4-20250514, max_tokens: 2000
5. Parse response as JSON
6. Return AnalyzedDoc

Gate: POST with Bullion Bridge eWallet ExtractedDoc → returns AnalyzedDoc with:
- 3+ kpis including totalAmount
- 1+ flag (success rate or fee rate)
- narrative string

---

### TASK 3: /api/synthesize.js
File to create: `api/synthesize.js`
Dependencies: Anthropic API key

Steps:
1. Receive array of AnalyzedDoc via POST
2. Build synthesis prompt listing all docs and cross-doc checks (Section 10)
3. Call claude-sonnet-4-20250514, max_tokens: 3000
4. Parse response as JSON
5. Return SynthesisResult

Gate: POST with 2+ AnalyzedDocs → returns SynthesisResult with:
- executiveSummary
- crossDocFlags (at least 1 cross-doc flag if bank + GL both present)
- impliedPL (if GL present with revenue + expense accounts)

---

### TASK 4: analysisOrchestrator.js
File to create: `src/lib/analysisOrchestrator.js`
Dependencies: fileExtractor.js, /api/analyze, /api/synthesize

Steps:
1. Implement runFinancialAnalysis(uploadedFiles)
2. Implement mapToRichResponseSchema()
3. Implement buildDocumentTimelines() from analyzedDocs
4. Implement buildCharts() from monthlyTrend data

Gate: Call runFinancialAnalysis with 4 Bullion Bridge files → returns valid
RichResponse-compatible JSON with all required fields.

---

### TASK 5: Wire Orchestrator into Existing Chat Flow
Files to touch: The component that currently calls the Claude API for chat responses.
Find the component that calls the Anthropic API with uploaded files and replace/augment
it to call runFinancialAnalysis when spreadsheet/CSV files are detected.

Logic:
- If uploaded files include at least one of: .xlsx, .xls, .csv → use financial analysis pipeline
- Otherwise → use existing chat API flow (no change)

Gate: Upload 4 Bullion Bridge files → full CFO analysis renders in RichResponse
with flags, KPIs, implied P&L, and recommended actions.

---

### TASK 6: ImpliedPL Renderer + KPI Grid (RichResponse additions)
File to touch: RichResponse.jsx (or its sub-components)
Add:
1. KPI summary grid (2 columns, above narrative)
2. ImpliedPL component — income statement format, red for losses, green for profits

Gate: When synthesis contains impliedPL, it renders as a formatted income statement.

---

## 14. ENVIRONMENT VARIABLES

Required in Vercel (and local .env):
```
ANTHROPIC_API_KEY=sk-ant-...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

In Vercel serverless functions, access as:
```javascript
const apiKey = process.env.ANTHROPIC_API_KEY;
```

In client-side React, access as:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```
NEVER expose ANTHROPIC_API_KEY to the client. It must only be used in /api/ functions.

---

## 15. TOKEN BUDGET (for cost awareness)

Per analysis session with 4 documents:
| Call | Input tokens | Output tokens | Cost (Sonnet) |
|------|-------------|---------------|---------------|
| analyze × 4 | ~1,500 × 4 = 6,000 | ~800 × 4 = 3,200 | ~$0.05 |
| synthesize × 1 | ~4,000 | ~3,000 | ~$0.035 |
| **Total** | **~10,000** | **~6,200** | **~$0.085** |

Each full 4-document analysis costs approximately $0.08–$0.10. Acceptable.

---

## 16. ERROR HANDLING STANDARDS

Every API endpoint must:
```javascript
try {
  // ... logic
} catch (err) {
  console.error('[api/analyze] Error:', err.message);
  return res.status(500).json({
    error: err.message,
    docType: body?.extractedDoc?.docType || 'UNKNOWN',
    fallback: true
  });
}
```

fileExtractor.js must:
- Never throw on malformed files — return `{ docType: 'UNKNOWN', confidence: 0, ... }`
- Handle Arabic column headers gracefully (check for keywords in both directions)
- Handle files with merged header rows (Al Baraka bank statement style)

---

## 17. ARABIC LANGUAGE HANDLING

Several Bullion Bridge documents use Arabic headers and values.
The following Arabic terms map to English concepts:

```javascript
const ARABIC_COLUMN_MAP = {
  'التاريخ': 'date',
  'العميل': 'client',
  'سعر الشراء': 'purchase_price',
  'هامش ربح': 'margin',
  'سعر البيع': 'sale_price',
  'عيار': 'karat',
  'مدين': 'debit',
  'دائن': 'credit',
  'الرصيد': 'balance',
  'الوصف': 'description',
  'رقم الفاتورة': 'invoice_no'
};

// Tax portal match values
const TAX_PORTAL_MATCH = 'مطابقة';           // matched
const TAX_PORTAL_UNBILLED = 'لم تتم الفوترة'; // not billed on portal
const TAX_PORTAL_MISMATCH = 'غير مطابقة';    // mismatched
```

When classifying, check both English and Arabic column names.

---

## 18. NOTES FOR CLAUDE CODE

When working on this project:

1. **Read the repo structure first** — `ls -la src/`, `ls -la api/`, `cat package.json`
2. **Check what already exists** before creating any file
3. **Run `npm run build` after every task** and fix any errors before moving on
4. **One file at a time** — confirm the task and file before editing
5. **Never modify** the files listed in Section 2 constraints
6. **Start with TASK 0** (iframe artifact rendering) if it is not yet complete,
   then proceed in sprint order
7. **Ask before proceeding** if you encounter an architectural decision not covered here

---

## DESIGN CONTEXT

### Users
Mixed audience — business owners who read their P&L once a month, and CFOs/finance directors who live inside spreadsheets. The interface serves both; it adapts depth on demand. MENA-region finance professionals (Arabic + English).

**Context of use:** Late nights, staring at documents with uncomfortable truths. People who need answers fast and distrust dashboards that look prettier than they are useful.

### Brand Personality
**Three words:** Dense. Precise. Adaptive.

Not "modern." Not "elegant." Dense like a well-organized trading terminal. Precise like a signed audit report. Adaptive like a senior CFO who can talk to a founder and a board in the same afternoon.

### Aesthetic Direction
- **Theme:** Dark always — finance professionals work at night
- **Palette:** Deep navy (#05060f–#0d0e1f) + amber accent (#f59e0b) only. Do not add more accent colors.
- **Anti-references:** Generic SaaS card grids, teal/purple gradients, consumer finance apps (Mint/Copilot), Bloomberg information walls
- **Reference feel:** Bloomberg terminal with a UX designer in the room. Reuters trading desk: purposeful density, nothing decorative.

### Design Principles
1. **Information density is a feature.** Pack in data, control hierarchy ruthlessly. Not everything needs a card.
2. **Every element earns its place.** No decorative glassmorphism, no border-left accent stripes, no chrome.
3. **Amber is the one point of warmth.** Single accent signal — resist adding more.
4. **Progressive depth.** Surface for owners, drill-down for CFOs — same interface, on-demand complexity.
5. **Monospace for numbers, always.** Financial figures in monospace ensure column alignment and signal precision.
6. **Honest hierarchy.** If the margin is thin, the design should reflect that — not soften it.

---

*Last updated: April 2026 | Maintained by: Hazem Kassem / Axcell*
*This file is the authoritative development context for CFO Pulse.*
