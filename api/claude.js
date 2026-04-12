import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are CFO-Pulse, a senior financial advisor. Communicate like a CFO texting a founder — direct, precise, brief.

STYLE:
- Lead with the key number or finding, immediately
- Bullets for lists, prose for single insights
- Max 3 short paragraphs unless user asks for a full report
- Every claim must be quantified: "$1.2M", "34% margin" — never "significant" or "substantial"
- Flag risks with the exact dollar amount or percentage at stake
- No preamble ("Great question!", "Certainly!") — start with the answer

INCOMPLETE DATA RULE (strictly enforced):
If the uploaded documents are missing standard financial statements needed for the requested analysis (e.g., only bank transactions but no P&L, or no balance sheet), do NOT produce estimates or partial analysis. Instead:
1. State exactly which statements are present
2. State exactly which statements are missing
3. Explain what analysis cannot be done without them
4. Suggest what the user should upload next

DASHBOARD JSON:
When you have real financial figures from documents, append this block at the very END of your response. The UI parses it for live KPIs. Omit entirely for conversational replies.

\`\`\`json
{"healthScore":75,"income":{"revenue":0,"cogs":0,"opex":0,"da":0,"interest":0,"tax":0},"balance":{"cash":0,"receivables":0,"inventory":0,"otherCurrent":0,"ppe":0,"otherLongTerm":0,"payables":0,"shortTermDebt":0,"otherCurrentLiab":0,"longTermDebt":0,"equity":0},"cashFlow":{"operating":0,"investing":0,"financing":0},"prior":{"revenue":0,"cash":0,"ebitda":0},"monthlyTrend":[],"analysis":{"executiveSummary":"","riskFactors":[],"strengths":[],"recommendations":[]}}
\`\`\``;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { messages, documentContext, pdfDocuments, documentSummaries } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const anthropic = new Anthropic({ apiKey });

  // Build Claude message array — inject document context as first synthetic turn
  const claudeMessages = [];
  const hasContext =
    (pdfDocuments?.length > 0) ||
    (documentSummaries?.length > 0) ||
    documentContext;

  if (hasContext) {
    const contextContent = [];

    // Raw PDFs (only sent on first appearance per doc — enforced client-side)
    if (pdfDocuments?.length > 0) {
      for (const pdf of pdfDocuments) {
        contextContent.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdf.data },
          cache_control: { type: 'ephemeral' },
        });
      }
    }

    // Condensed fact-sheet summaries for documents already analyzed (cheap follow-up context)
    if (documentSummaries?.length > 0) {
      contextContent.push({
        type: 'text',
        text: `DOCUMENT FACT SHEETS (condensed from uploaded files):\n\n${documentSummaries.join('\n\n---\n\n')}`,
        cache_control: { type: 'ephemeral' },
      });
    }

    // RAG chunks from full-text search
    if (documentContext) {
      contextContent.push({
        type: 'text',
        text: `RELEVANT EXCERPTS:\n\n${documentContext}`,
        cache_control: { type: 'ephemeral' },
      });
    }

    contextContent.push({ type: 'text', text: 'Use the above documents for your analysis.' });
    claudeMessages.push({ role: 'user', content: contextContent });
    claudeMessages.push({ role: 'assistant', content: 'Documents reviewed. Ready.' });
  }

  claudeMessages.push(...messages);

  // SSE setup — flushHeaders() starts streaming immediately on Vercel
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: claudeMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        sendEvent({ type: 'text', text: event.delta.text });
      } else if (event.type === 'message_stop') {
        sendEvent({ type: 'done' });
      }
    }
  } catch (err) {
    sendEvent({ type: 'error', message: err.message });
  }

  res.end();
}
