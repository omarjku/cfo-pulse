import Anthropic from '@anthropic-ai/sdk';

const PROMPT = `Extract every financial fact from this document into a structured fact sheet. Be exhaustive with numbers. Use this exact format:

**Period**: [date range, or "Not specified"]
**Document Type**: [Bank statement / P&L / Balance sheet / Cash flow / Invoice / Other]

### Key Figures
- [metric label]: [value with currency and units]

### Line Items (transactions, revenue lines, expense categories, etc.)
- [date if present] [description]: [amount]

### Totals & Summaries
- [e.g. Total credits / Total debits / Net change / Closing balance / etc.]: [value]

### Missing Statements
- [List any of these that are NOT present: P&L, Balance Sheet, Cash Flow Statement, Income breakdown, Expense breakdown]
  If none are missing, write "None — document is complete."

Rules:
- Copy exact numbers from the document — do not round or estimate
- Include currency symbols and period labels exactly as written
- Do not add interpretations, recommendations, or ratios
- If a field is truly not in the document, omit it rather than guessing`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not set' });

  const { pdfBase64, plainText, fileName } = req.body;
  if (!pdfBase64 && !plainText) return res.status(400).json({ error: 'pdfBase64 or plainText required' });

  const anthropic = new Anthropic({ apiKey });

  try {
    // Build content blocks depending on whether this is a PDF or extracted spreadsheet text
    const contentBlocks = pdfBase64
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: `Document name: ${fileName || 'Unknown'}\n\n${PROMPT}` },
        ]
      : [
          { type: 'text', text: `Document name: ${fileName || 'Unknown'}\n\nContent:\n${plainText.slice(0, 40000)}\n\n${PROMPT}` },
        ];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const summary = response.content[0]?.text || '';
    res.status(200).json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
