import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS) || 16000;
const MAX_TOOL_TURNS = 10;

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

FORMATTING

Respond in markdown. Use tables, numbered lists, headers, and code blocks only when they genuinely serve the answer — not as a default structure. A direct paragraph is often better than a table. Let the question shape the response, not a template.`;

const THINKING_TRIGGERS = /\b(should\s+we|compare|model|forecast|acquisition|accretive|dilutive|valuation|scenarios?|sensitivity|recommend|decide|strategy|worth\s+it)\b/i;

function shouldThink(messages, docCount) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const text = typeof lastUser?.content === 'string' ? lastUser.content : '';
  return THINKING_TRIGGERS.test(text) || docCount > 2;
}

const dispatchSubagentTool = {
  name: 'dispatch_subagent',
  description: 'Dispatch a focused sub-agent to analyze a specific subset of documents. Use when a task is document-heavy and can be parallelized (e.g., summarize 5 different board decks).',
  input_schema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'The focused task for the sub-agent to perform' },
      document_file_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Anthropic file IDs of the documents this sub-agent should focus on',
      },
    },
    required: ['task', 'document_file_ids'],
  },
};

const generateReportTool = {
  name: 'generate_report',
  description: 'Generate a downloadable XLSX or PDF report from financial data. Returns a download URL.',
  input_schema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['xlsx', 'pdf'], description: 'Output format' },
      title: { type: 'string', description: 'Report title' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            rows: { type: 'array', items: { type: 'array' } },
          },
        },
        description: 'Sections of tabular data to include',
      },
    },
    required: ['format', 'title', 'sections'],
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY not configured.' } });

  const { messages, fileIds = [], documentContext, pdfDocuments, documentSummaries, imageDocuments } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const anthropic = new Anthropic({ apiKey });

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  // Build document context for Claude
  const claudeMessages = [];
  const totalDocCount = (fileIds?.length || 0) + (pdfDocuments?.length || 0);
  const hasContext = totalDocCount > 0 || imageDocuments?.length > 0 || documentSummaries?.length > 0 || documentContext;

  if (hasContext) {
    const contextContent = [];

    // Files API documents (preferred — reuses uploaded file, no per-turn token cost)
    for (const fileId of (fileIds || [])) {
      contextContent.push({
        type: 'document',
        source: { type: 'file', file_id: fileId },
        citations: { enabled: true },
        cache_control: { type: 'ephemeral' },
      });
    }

    // Fallback: raw base64 PDFs for docs not yet in Files API
    for (const pdf of (pdfDocuments || [])) {
      contextContent.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdf.data },
        citations: { enabled: true },
        cache_control: { type: 'ephemeral' },
      });
    }

    // Images
    for (const img of (imageDocuments || [])) {
      contextContent.push({
        type: 'image',
        source: { type: 'base64', media_type: img.mimeType, data: img.data },
      });
    }

    if (documentSummaries?.length > 0) {
      contextContent.push({
        type: 'text',
        text: `DOCUMENT FACT SHEETS:\n\n${documentSummaries.join('\n\n---\n\n')}`,
        cache_control: { type: 'ephemeral' },
      });
    }

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

  const useThinking = shouldThink(messages, totalDocCount);

  const tools = [
    { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
    { type: 'code_execution_20250825', name: 'code_execution' },
    { type: 'memory_20250818', name: 'memory' },
    dispatchSubagentTool,
    generateReportTool,
  ];

  try {
    let continueLoop = true;
    let loopMessages = [...claudeMessages];
    let toolUseBlock = null;
    let toolTurns = 0;

    while (continueLoop && toolTurns < MAX_TOOL_TURNS) {
      const streamParams = {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: loopMessages,
        tools,
      };

      if (useThinking) {
        streamParams.thinking = { type: 'enabled', budget_tokens: 16000 };
      }

      const stream = anthropic.messages.stream(streamParams);

      let inputJson = '';
      let currentToolUse = null;
      let stopReason = null;
      let thinkingBuffer = '';
      let inThinking = false;

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'thinking') {
            inThinking = true;
            thinkingBuffer = '';
          } else if (event.content_block.type === 'tool_use') {
            inThinking = false;
            currentToolUse = { id: event.content_block.id, name: event.content_block.name };
            inputJson = '';
          } else {
            inThinking = false;
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'thinking_delta') {
            thinkingBuffer += event.delta.thinking;
          } else if (event.delta.type === 'text_delta') {
            sendEvent({ type: 'text', text: event.delta.text });
          } else if (event.delta.type === 'input_json_delta') {
            inputJson += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          if (inThinking && thinkingBuffer) {
            sendEvent({ type: 'thinking', text: thinkingBuffer });
            thinkingBuffer = '';
            inThinking = false;
          }
          if (currentToolUse) {
            toolUseBlock = { ...currentToolUse, input: JSON.parse(inputJson || '{}') };
            currentToolUse = null;
          }
        } else if (event.type === 'message_delta') {
          stopReason = event.delta?.stop_reason;
        } else if (event.type === 'message_stop') {
          if (stopReason === 'tool_use' && toolUseBlock) {
            toolTurns++;
            sendEvent({
              type: 'tool_start',
              tool: toolUseBlock.name,
              query: toolUseBlock.input?.query || toolUseBlock.input?.task || '',
            });

            let toolResult = '';

            if (toolUseBlock.name === 'dispatch_subagent') {
              try {
                const subRes = await fetch(`${baseUrl}/api/subagent`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    task: toolUseBlock.input.task,
                    document_file_ids: toolUseBlock.input.document_file_ids,
                  }),
                });
                const subData = await subRes.json();
                toolResult = subData.result || 'Sub-agent returned no result.';
              } catch {
                toolResult = 'Sub-agent dispatch failed.';
              }
            } else if (toolUseBlock.name === 'generate_report') {
              try {
                const reportRes = await fetch(`${baseUrl}/api/generate-report`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(toolUseBlock.input),
                });
                const reportData = await reportRes.json();
                if (reportData.url) {
                  sendEvent({
                    type: 'artifact',
                    url: reportData.url,
                    format: toolUseBlock.input.format,
                    title: toolUseBlock.input.title,
                  });
                  toolResult = `Report generated. Download URL: ${reportData.url}`;
                } else {
                  toolResult = reportData.error || 'Report generation failed.';
                }
              } catch {
                toolResult = 'Report generation failed.';
              }
            }
            // Hosted tools (web_search, code_execution, memory) resolve server-side;
            // if they somehow surface here, pass empty result to unblock loop.

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
            if (toolTurns >= MAX_TOOL_TURNS) {
              sendEvent({ type: 'text', text: '\n\n*Analysis stopped after maximum tool iterations.*' });
            }
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
