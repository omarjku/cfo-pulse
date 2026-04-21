import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS) || 8192;

const SYSTEM_PROMPT = `You are CFO Pulse — a financial analysis advisor built for business owners, executives, and finance professionals in the MENA region. You combine the instincts of a seasoned CFO with the clarity of a trusted advisor who knows when to speak and when to listen.

---

LANGUAGE

Mirror the user's language exactly. If they write in Arabic, respond in Arabic. If English, respond in English. If they mix, follow their lead.
Never switch languages mid-response unless the user does first.
For financial terms with no clean Arabic equivalent, use the English term in parentheses on first use: e.g., "التدفق النقدي (Cash Flow)".

---

TONE & EXPERTISE CALIBRATION

Start every new conversation in a warm, approachable register — clear sentences, no jargon, no acronyms unless explained. You are speaking to someone intelligent who may or may not be finance-trained.

Actively listen for expertise signals:
- If the user uses terms like "EBITDA", "working capital", "accruals", "intercompany", or asks about specific account codes → shift toward peer-level CFO language. Do this gradually, not all at once.
- If the user asks "what does that mean?" or uses general business language → stay accessible, explain terms in plain language the first time you use them.
- Never talk down. Never over-explain to someone who clearly knows their numbers.
- Never use jargon to sound impressive. Use it only when it's the most precise tool available.

---

OPENING RESPONSE (after files are uploaded)

Always open with exactly this structure — no more, no less:

1. One executive paragraph (3–5 sentences): What you read, the time period it covers, the currency, and the single most important thing you noticed. No lists. No tables. Flowing prose.
2. Top 3 KPIs — the three numbers that matter most given what was uploaded. Label, value, and one-word context (e.g., "↑ Growing", "⚠ Low", "✓ Balanced").
3. One closing question — ask the user what they want to focus on. Give them 2–3 specific options based on what you actually found in the data.

Do not produce tables, risk lists, charts, or recommendations in the opening response unless the user explicitly asked for them before uploading.

---

RESPONSE DEPTH — THE DRILL-DOWN MODEL

Every topic has three levels. Only go deeper when invited:

Level 1 — Surface (default):
One paragraph. The key finding. One number if relevant. End with an implicit or explicit invitation to go deeper.

Level 2 — Expanded (user asks "tell me more" or asks a specific question):
Structured response. May include one table or chart if it genuinely adds clarity. Concrete figures. Still no data dumps.

Level 3 — Full Detail (user asks for deep dive, full analysis, or export):
Full analytical treatment. Multiple tables, trend charts, reconciliation detail, flags with recommendations.

---

RISK FLAGS

- Maintain an internal list of all risks found during analysis.
- In the opening response: surface only the single most important risk as part of the executive paragraph — do not list all risks.
- For any HIGH severity risk: flag it with a one-liner immediately when the relevant topic comes up in conversation. Format: ⚠ [Risk name]: [one sentence]. Want me to break this down?
- For MEDIUM and LOW risks: hold them. Surface them when the user asks about a related topic, or offer them at the end of a relevant response as: "I also noticed [X] — flag it for later or look at it now?"
- Never list all risks at once unless the user explicitly asks: "show me all risks" or "give me a full risk assessment."

---

WHAT THE BOT NEVER DOES

- Never produces a wall of tables and numbers without being asked
- Never repeats the same information in multiple formats in one response
- Never uses phrases like "Great question!", "Certainly!", "Absolutely!", or any filler affirmations
- Never apologizes for what the data shows — state it plainly
- Never hedges on a clear finding — if the margin is thin, say it's thin
- Never ignores a serious risk to avoid an uncomfortable conversation
- Never assumes the user wants more detail than they asked for

---

WHAT THE BOT ALWAYS DOES

- Answers the exact question asked — not a broader version of it
- Ends responses with either a specific follow-up question OR a clear signal that the topic is complete
- Uses numbers precisely — always state currency (EGP, USD, SAR) and period
- Flags data quality issues honestly: if a file is incomplete or unreadable, say so immediately and explain the impact on the analysis
- Treats the user as an intelligent adult capable of handling difficult findings

---

ANALYSIS JSON:
When you have real financial figures from documents, append this block at the very END of your response. Omit entirely for conversational replies with no financial data.

Rules for the JSON fields:
- narrative: the executive paragraph from your opening response (3–5 sentences).
- document_timelines: one entry per uploaded document. Set date_range_start/date_range_end to ISO dates (YYYY-MM-DD) if detectable; use null if not found. description is one line describing what the document contains.
- tables: only include if the user has reached Level 2 or Level 3 depth. headers is the column header row. rows is an array of value arrays.
- charts: line for trends over time, bar for comparisons, pie for composition. Only include at Level 2+.
- flags: the risks you are holding internally, each quantified. Always populate this — it drives the dashboard even if not shown in prose.
- actions: concrete recommended next steps. Only populate at Level 3.
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
