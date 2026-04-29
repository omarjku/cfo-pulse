import Anthropic from '@anthropic-ai/sdk';

const SUBAGENT_MODEL = 'claude-haiku-4-5-20251001';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { task, document_file_ids = [] } = req.body;
  if (!task) { res.status(400).json({ error: 'task required' }); return; }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contextContent = document_file_ids.map((fileId) => ({
    type: 'document',
    source: { type: 'file', file_id: fileId },
    citations: { enabled: true },
  }));

  if (contextContent.length > 0) {
    contextContent.push({ type: 'text', text: 'Use the above documents to complete the task.' });
  }

  const messages = [
    ...(contextContent.length > 0
      ? [{ role: 'user', content: contextContent }, { role: 'assistant', content: 'Documents reviewed.' }]
      : []),
    { role: 'user', content: task },
  ];

  try {
    const response = await anthropic.messages.create({
      model: SUBAGENT_MODEL,
      max_tokens: 4096,
      system: 'You are a focused financial document analyst. Complete the assigned task concisely and accurately. Return only the analysis — no preamble.',
      messages,
    });

    const result = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
