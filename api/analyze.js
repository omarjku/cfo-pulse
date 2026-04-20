import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 30 };

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

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
- Related party payables (account names containing 'Sanaddak', 'related party', 'intercompany', 'parent'): flag as HIGH if net balance > 1,000,000 — transfer pricing risk
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
- Unmatched tax portal invoices (Arabic: 'لم تتم الفوترة' or 'غير مطابقة'): HIGH flag — tax compliance risk, count them
- Any invoice where sale_price < purchase_price: HIGH flag — loss-making transaction
- Revenue concentration: if top 3 clients > 60% of revenue: MEDIUM flag
- Karat/grade breakdown: note which grade has highest volume and highest margin`,

  TRIAL_BALANCE: `You are a senior CFO analyst reviewing a trial balance.
Your job is to assess balance sheet health and identify unusual positions.

Rules:
- Check that total debits equal total credits — flag any difference
- Large receivables relative to revenue: flag as collection risk
- Negative equity: flag as HIGH — insolvency signal
- Large suspense or clearing account balances: flag for investigation`,

  PAYROLL: `You are a senior CFO analyst reviewing a payroll register.
Your job is to assess headcount costs and identify anomalies.

Rules:
- Identify total gross payroll, total deductions, total net payroll
- Flag any employee with net pay = 0 or negative
- Flag unusually large individual salaries relative to the average
- Note total headcount and average salary`,

  UNKNOWN: `You are a senior CFO analyst reviewing an unclassified financial document.
Describe what you can determine about the document's purpose, key financial figures,
date range, and any risks or anomalies visible in the data.`,
};

function buildUserMessage(extractedDoc) {
  const { docType, fileName, entityName, periodStart, periodEnd, currency,
          columns, sampleRows, rowCount, aggregates, anomalies } = extractedDoc;

  const parts = [
    `Document: ${fileName}`,
    entityName  ? `Entity: ${entityName}`  : null,
    periodStart ? `Period: ${periodStart} to ${periodEnd || 'unknown'}` : null,
    currency    ? `Currency: ${currency}`  : null,
    `Rows: ${rowCount}`,
    `Columns: ${columns.join(', ')}`,
    '',
    'AGGREGATED SUMMARY:',
    JSON.stringify(aggregates, null, 2),
  ];

  if (anomalies?.length) {
    parts.push('', 'CLIENT-SIDE ANOMALIES DETECTED:', ...anomalies.map(a => `- [${a.type}] ${a.description}`));
  }

  if (sampleRows?.length) {
    parts.push('', 'SAMPLE ROWS (first 5):', JSON.stringify(sampleRows, null, 2));
  }

  parts.push('', 'Return ONLY valid JSON matching the AnalyzedDoc schema. No markdown, no explanation outside the JSON.');

  return parts.filter(p => p !== null).join('\n');
}

const RESPONSE_SCHEMA = `
Return a single JSON object with this exact shape:
{
  "docType": string,
  "fileName": string,
  "entityName": string | null,
  "period": string,
  "currency": string,
  "confidence": number,
  "kpis": [{ "label": string, "value": number | string, "format": "currency"|"percent"|"number"|"text" }],
  "monthlyTrend": [{ "month": string, ...additionalFields }],
  "flags": [{
    "severity": "HIGH"|"MEDIUM"|"LOW",
    "category": string,
    "title": string,
    "detail": string,
    "recommendation": string
  }],
  "tables": [{ "title": string, "headers": string[], "rows": (string|number)[][] }],
  "narrative": string
}
No markdown fences. Raw JSON only.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { extractedDoc } = req.body;
  if (!extractedDoc) return res.status(400).json({ error: 'extractedDoc required' });

  const docType = extractedDoc.docType || 'UNKNOWN';
  const systemPrompt = (SYSTEM_PROMPTS[docType] || SYSTEM_PROMPTS.UNKNOWN) + '\n\n' + RESPONSE_SCHEMA;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: buildUserMessage(extractedDoc) }],
    });

    const raw = message.content[0]?.text || '';

    // Strip markdown fences if Claude wrapped anyway
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let analyzedDoc;
    try {
      analyzedDoc = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: 'Claude returned invalid JSON', raw, fallback: true });
    }

    // Ensure required top-level fields are present
    analyzedDoc.docType   = analyzedDoc.docType   || docType;
    analyzedDoc.fileName  = analyzedDoc.fileName  || extractedDoc.fileName;
    analyzedDoc.kpis      = analyzedDoc.kpis      || [];
    analyzedDoc.flags     = analyzedDoc.flags      || [];
    analyzedDoc.tables    = analyzedDoc.tables     || [];
    analyzedDoc.monthlyTrend = analyzedDoc.monthlyTrend || extractedDoc.aggregates?.monthlyTrend || [];

    return res.status(200).json(analyzedDoc);
  } catch (err) {
    console.error('[api/analyze] Error:', err.message);
    return res.status(500).json({
      error: err.message,
      docType,
      fallback: true,
    });
  }
}
