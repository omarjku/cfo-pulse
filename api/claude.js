import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS) || 8192;

const SYSTEM_PROMPT = `You are CFO-Pulse, a senior financial advisor. Communicate like a CFO texting a founder — direct, precise, brief.

STYLE:
- Lead with the key number or finding, immediately
- Bullets for lists, prose for single insights
- Max 3 short paragraphs unless user asks for a full report
- Every claim must be quantified: "$1.2M", "34% margin" — never "significant" or "substantial"
- Flag risks with the exact dollar amount or percentage at stake
- No preamble ("Great question!", "Certainly!") — start with the answer
- Hard limit: under 150 words unless the user explicitly requests a full report or breakdown

PARTIAL DATA RULE:
Always append the JSON block, even with incomplete documents. Populate every field you can compute from available data; use 0 only for fields with genuinely no data. Examples: a bank statement gives balance.cash (ending balance) and cashFlow.operating (net cash movement). A P&L gives income fields. Fill what you have. In the prose response, briefly state which statements are present and what additional documents would unlock deeper analysis.

ANALYSIS JSON:
When you have real financial figures from documents, append this block at the very END of your response. Omit entirely for conversational replies with no financial data.

Rules for the new fields:
- narrative: 3-5 sentence executive summary of the analysis.
- document_timelines: one entry per uploaded document. Set date_range_start/date_range_end to ISO dates (YYYY-MM-DD) if detectable from the document content; use null if not found. description is one line describing what the document contains.
- tables: extract key financial tables (e.g. income summary, cash flow summary). headers is the column header row. rows is an array of value arrays matching the headers.
- charts: line for trends over time, bar for comparisons, pie for composition. labels = X-axis labels or segment names. datasets = one object per series with label and data arrays of equal length to labels.
- flags: bullet-point risks or critical insights, each quantified (e.g. "Burn rate $180K/mo -- runway 4.2 months").
- actions: concrete recommended next steps.
- All existing KPI fields (healthScore, income, balance, cashFlow, prior, monthlyTrend, analysis) are REQUIRED alongside the new fields so the dashboard panel keeps working.

\`\`\`json
{"narrative":"","document_timelines":[{"filename":"","date_range_start":null,"date_range_end":null,"description":""}],"tables":[{"title":"","headers":[],"rows":[]}],"charts":[{"title":"","type":"line","labels":[],"datasets":[{"label":"","data":[]}]}],"flags":[],"actions":[],"healthScore":0,"income":{"revenue":0,"cogs":0,"opex":0,"da":0,"interest":0,"tax":0},"balance":{"cash":0,"receivables":0,"inventory":0,"otherCurrent":0,"ppe":0,"otherLongTerm":0,"payables":0,"shortTermDebt":0,"otherCurrentLiab":0,"longTermDebt":0,"equity":0},"cashFlow":{"operating":0,"investing":0,"financing":0},"prior":{"revenue":0,"cash":0,"ebitda":0},"monthlyTrend":[],"analysis":{"executiveSummary":"","riskFactors":[],"strengths":[],"recommendations":[]}}
\`\`\``;

const webSearchTool = {
  name: 'web_search',
  description: 'Search the web for current financial data, market rates, industry benchmarks, or news relevant to the financial analysis.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY is not configured on the server. Set it in your Vercel project settings (or .env.local for local dev).' } });

  const { messages, documentContext, pdfDocuments, documentSummaries, imageDocuments } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const anthropic = new Anthropic({ apiKey });

  // Build Claude message array — inject document context as first synthetic turn
  const claudeMessages = [];
  const hasContext =
    (pdfDocuments?.length > 0) ||
    (imageDocuments?.length > 0) ||
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

    // Images (PNG, JPG, JPEG, WEBP, GIF) sent as image content blocks
    if (imageDocuments?.length > 0) {
      for (const img of imageDocuments) {
        contextContent.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mimeType, data: img.data },
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

  // Build base URL for internal API calls — use forwarded headers for Vercel
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  try {
    let continueLoop = true;
    let loopMessages = [...claudeMessages];
    let toolUseBlock = null;

    while (continueLoop) {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: loopMessages,
        tools: [webSearchTool],
      });

      let inputJson = '';
      let currentToolUse = null;
      let stopReason = null;

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            sendEvent({ type: 'text', text: event.delta.text });
          } else if (event.delta.type === 'input_json_delta') {
            inputJson += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolUse = { id: event.content_block.id, name: event.content_block.name };
            inputJson = '';
          }
        } else if (event.type === 'content_block_stop' && currentToolUse) {
          toolUseBlock = { ...currentToolUse, input: JSON.parse(inputJson || '{}') };
          currentToolUse = null;
        } else if (event.type === 'message_delta') {
          // Capture stop_reason here — message_stop event doesn't carry it
          stopReason = event.delta?.stop_reason;
        } else if (event.type === 'message_stop') {
          if (stopReason === 'tool_use' && toolUseBlock) {
            sendEvent({ type: 'tool_start', tool: toolUseBlock.name, query: toolUseBlock.input.query });

            let toolResult = '';
            try {
              const searchRes = await fetch(`${baseUrl}/api/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: toolUseBlock.input.query }),
              });
              const searchData = await searchRes.json();
              toolResult = searchData.results
                .map((r) => `${r.title}\n${r.url}\n${r.content}`)
                .join('\n\n---\n\n');
            } catch {
              toolResult = 'Search unavailable.';
            }

            // Append tool exchange and re-enter loop
            loopMessages = [
              ...loopMessages,
              {
                role: 'assistant',
                content: [{ type: 'tool_use', id: toolUseBlock.id, name: toolUseBlock.name, input: toolUseBlock.input }],
              },
              {
                role: 'user',
                content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: toolResult }],
              },
            ];
            toolUseBlock = null;
          } else {
            continueLoop = false;
            sendEvent({ type: 'done' });
          }
        }
      }
    }
  } catch (err) {
    sendEvent({ type: 'error', message: err.message });
  }

  res.end();
}
