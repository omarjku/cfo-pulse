import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 60 };

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are a senior CFO analyst performing cross-document financial synthesis.
You have received structured analysis results from multiple financial documents belonging to the same entity.
Your job is to reconcile, cross-reference, and produce a unified CFO-quality synthesis.

Cross-document reconciliation checks to perform:

1. BANK-GL RECONCILIATION
   If BANK_STATEMENT + GL_JOURNAL both present:
   - Compare bank statement closing balance to GL bank account net balance
   - Flag any difference > 100 as reconciliation variance (HIGH if > 10,000)

2. REVENUE CONSISTENCY
   If SALES_REGISTER + GL_JOURNAL both present:
   - Compare total sales register revenue to GL revenue account credits
   - Flag if difference > 1% of total revenue

3. EWALLET-BANK LINKAGE
   If EWALLET_REPORT + BANK_STATEMENT both present:
   - Check if eWallet total disbursements are reflected as bank debits
   - Note timing differences if present

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

Return a single JSON object with this exact shape — no markdown fences, raw JSON only:
{
  "entityName": string,
  "period": string,
  "documentsAnalyzed": number,
  "executiveSummary": string,
  "crossDocFlags": [{
    "severity": "HIGH"|"MEDIUM"|"LOW",
    "category": string,
    "title": string,
    "detail": string,
    "affectedDocuments": string[],
    "recommendation": string
  }],
  "impliedPL": {
    "revenue": number | null,
    "cogs": number | null,
    "grossProfit": number | null,
    "grossMarginPct": number | null,
    "operatingExpenses": number | null,
    "ebit": number | null,
    "otherIncome": number | null,
    "netIncome": number | null,
    "currency": string,
    "note": string
  } | null,
  "kpiSummary": [{ "label": string, "value": number|string, "format": string, "source": string }],
  "recommendedActions": [{
    "priority": 1|2|3,
    "action": string,
    "owner": string,
    "deadline": string
  }],
  "monthlyTrend": [],
  "tables": [{ "title": string, "headers": string[], "rows": (string|number)[][] }],
  "narrative": string
}`;

function buildUserMessage(analyzedDocs, entityName) {
  const parts = [
    entityName ? `Entity: ${entityName}` : null,
    `Documents analyzed: ${analyzedDocs.length}`,
    '',
    'INDIVIDUAL DOCUMENT ANALYSES:',
    '',
  ];

  for (const doc of analyzedDocs) {
    parts.push(
      `--- ${doc.fileName} (${doc.docType}) ---`,
      `Period: ${doc.period || 'unknown'}`,
      `Currency: ${doc.currency || 'unknown'}`,
      `KPIs: ${JSON.stringify(doc.kpis || [])}`,
      `Flags: ${JSON.stringify(doc.flags || [])}`,
      `Monthly trend rows: ${(doc.monthlyTrend || []).length}`,
      doc.tables?.length ? `Tables: ${JSON.stringify(doc.tables.map(t => t.title))}` : null,
      '',
    );
  }

  parts.push('Perform all cross-document reconciliation checks. Return only the JSON synthesis object.');

  return parts.filter(p => p !== null).join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { analyzedDocs, entityName } = req.body;
  if (!analyzedDocs?.length) return res.status(400).json({ error: 'analyzedDocs array required' });
  if (analyzedDocs.length < 2) return res.status(400).json({ error: 'synthesize requires 2+ documents' });

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(analyzedDocs, entityName) }],
    });

    const raw     = message.content[0]?.text || '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let synthesis;
    try {
      synthesis = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: 'Claude returned invalid JSON', raw, fallback: true });
    }

    // Ensure required fields
    synthesis.entityName        = synthesis.entityName        || entityName || 'Unknown Entity';
    synthesis.documentsAnalyzed = synthesis.documentsAnalyzed || analyzedDocs.length;
    synthesis.crossDocFlags     = synthesis.crossDocFlags     || [];
    synthesis.kpiSummary        = synthesis.kpiSummary        || [];
    synthesis.recommendedActions= synthesis.recommendedActions|| [];
    synthesis.tables            = synthesis.tables            || [];
    synthesis.monthlyTrend      = synthesis.monthlyTrend      || [];
    synthesis.narrative         = synthesis.narrative         || synthesis.executiveSummary || '';

    return res.status(200).json(synthesis);
  } catch (err) {
    console.error('[api/synthesize] Error:', err.message);
    return res.status(500).json({ error: err.message, fallback: true });
  }
}
