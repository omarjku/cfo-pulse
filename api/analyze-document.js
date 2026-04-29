import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const dashboardTool = {
  name: 'submit_dashboard_analysis',
  description: 'Submit the structured financial dashboard analysis extracted from the document.',
  input_schema: {
    type: 'object',
    required: ['healthScore', 'income', 'balance', 'cashFlow', 'prior', 'monthlyTrend', 'analysis', 'flags', 'document_timelines'],
    properties: {
      healthScore: { type: 'number', description: 'Overall financial health score 0-100' },
      income: {
        type: 'object',
        properties: {
          revenue: { type: 'number' }, cogs: { type: 'number' }, opex: { type: 'number' },
          da: { type: 'number' }, interest: { type: 'number' }, tax: { type: 'number' },
        },
        required: ['revenue', 'cogs', 'opex', 'da', 'interest', 'tax'],
      },
      balance: {
        type: 'object',
        properties: {
          cash: { type: 'number' }, receivables: { type: 'number' }, inventory: { type: 'number' },
          otherCurrent: { type: 'number' }, ppe: { type: 'number' }, otherLongTerm: { type: 'number' },
          payables: { type: 'number' }, shortTermDebt: { type: 'number' }, otherCurrentLiab: { type: 'number' },
          longTermDebt: { type: 'number' }, equity: { type: 'number' },
        },
        required: ['cash', 'receivables', 'inventory', 'otherCurrent', 'ppe', 'otherLongTerm', 'payables', 'shortTermDebt', 'otherCurrentLiab', 'longTermDebt', 'equity'],
      },
      cashFlow: {
        type: 'object',
        properties: {
          operating: { type: 'number' }, investing: { type: 'number' }, financing: { type: 'number' },
        },
        required: ['operating', 'investing', 'financing'],
      },
      prior: {
        type: 'object',
        properties: {
          revenue: { type: 'number' }, cash: { type: 'number' }, ebitda: { type: 'number' },
        },
        required: ['revenue', 'cash', 'ebitda'],
      },
      monthlyTrend: {
        type: 'array',
        items: {
          type: 'object',
          properties: { month: { type: 'string' }, revenue: { type: 'number' }, expenses: { type: 'number' } },
        },
        description: 'Monthly revenue and expense trend data points',
      },
      analysis: {
        type: 'object',
        properties: {
          executiveSummary: { type: 'string' },
          riskFactors: { type: 'array', items: { type: 'string' } },
          strengths: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
        required: ['executiveSummary', 'riskFactors', 'strengths', 'recommendations'],
      },
      flags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Risk flags found in the document',
      },
      document_timelines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            date_range_start: { type: ['string', 'null'] },
            date_range_end: { type: ['string', 'null'] },
            description: { type: 'string' },
          },
          required: ['filename', 'date_range_start', 'date_range_end', 'description'],
        },
      },
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileId, filename } = req.body || {};
  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      tools: [dashboardTool],
      tool_choice: { type: 'tool', name: 'submit_dashboard_analysis' },
      system: 'You are a financial document analyzer. Extract financial data from the document and populate the dashboard analysis tool. Use 0 for any numeric field you cannot determine. Use empty arrays for list fields you cannot determine. Be precise with numbers — use the actual values from the document, not estimates.',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'file', file_id: fileId },
            citations: { enabled: false },
          },
          {
            type: 'text',
            text: `Analyze this document (${filename || 'document'}) and submit the dashboard analysis. Extract all financial figures you can find. Set numeric fields to 0 if the data is not present.`,
          },
        ],
      }],
    });

    const toolUseBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolUseBlock) {
      return res.status(500).json({ error: 'Model did not return structured analysis' });
    }

    res.status(200).json(toolUseBlock.input);
  } catch (err) {
    console.error('[analyze-document] error:', err);
    res.status(500).json({ error: err.message });
  }
}
