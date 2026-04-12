import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are CFO-Pulse, an elite financial AI assistant built for founders and finance teams. You analyze financial documents with the precision of a Big-4 auditor and the strategic clarity of a Fortune 500 CFO. You are direct, quantified, and actionable. You never hedge without data. When you identify a risk, you name the number. When you make a recommendation, you state the expected impact.

When you have completed your analysis, append a JSON block at the very end of your response in this exact format (the UI will parse it to update the live dashboard):

\`\`\`json
{"healthScore":75,"income":{"revenue":2400000,"cogs":900000,"opex":600000,"da":50000,"interest":20000,"tax":80000},"balance":{"cash":400000,"receivables":180000,"inventory":0,"otherCurrent":50000,"ppe":200000,"otherLongTerm":0,"payables":120000,"shortTermDebt":0,"otherCurrentLiab":30000,"longTermDebt":100000,"equity":580000},"cashFlow":{"operating":750000,"investing":-80000,"financing":-50000},"prior":{"revenue":0,"cash":0,"ebitda":0},"monthlyTrend":[{"month":"2024-01","revenue":200000,"expenses":130000,"netProfit":70000}],"analysis":{"executiveSummary":"...","riskFactors":["..."],"strengths":["..."],"recommendations":["..."]}}
\`\`\`

Only include this JSON block when you have actual financial data to report. For conversational messages, omit it entirely.`;

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
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { messages, documentContext, pdfDocuments } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const anthropic = new Anthropic({ apiKey });

  // Build the messages array with prompt caching on document context
  const claudeMessages = [];

  // If there's document context (RAG chunks), inject as first user message with caching
  if (documentContext || (pdfDocuments && pdfDocuments.length > 0)) {
    const contextContent = [];

    // PDF documents (base64) with cache_control
    if (pdfDocuments && pdfDocuments.length > 0) {
      for (const pdf of pdfDocuments) {
        contextContent.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdf.data },
          cache_control: { type: 'ephemeral' },
        });
      }
    }

    // RAG text chunks with cache_control
    if (documentContext) {
      contextContent.push({
        type: 'text',
        text: `Relevant excerpts from uploaded financial documents:\n\n${documentContext}`,
        cache_control: { type: 'ephemeral' },
      });
    }

    contextContent.push({ type: 'text', text: 'Use the above document context to inform your analysis.' });
    claudeMessages.push({ role: 'user', content: contextContent });
    claudeMessages.push({ role: 'assistant', content: 'I have reviewed the financial documents and context. I am ready to provide analysis.' });
  }

  // Append the conversation history
  claudeMessages.push(...messages);

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    let continueLoop = true;
    let loopMessages = [...claudeMessages];
    let toolUseBlock = null;

    while (continueLoop) {
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: loopMessages,
        tools: [webSearchTool],
      });

      let accumulatedText = '';
      let inputJson = '';
      let currentToolUse = null;

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            accumulatedText += event.delta.text;
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
        } else if (event.type === 'message_stop') {
          const stopReason = event.message?.stop_reason;
          if (stopReason === 'tool_use' && toolUseBlock) {
            // Execute the tool
            sendEvent({ type: 'tool_start', tool: toolUseBlock.name, query: toolUseBlock.input.query });
            let toolResult = '';
            try {
              const searchRes = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/search`, {
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

            // Add assistant + tool_result to loop
            loopMessages = [
              ...loopMessages,
              { role: 'assistant', content: [{ type: 'tool_use', id: toolUseBlock.id, name: toolUseBlock.name, input: toolUseBlock.input }] },
              { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: toolResult }] },
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
