import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, fileData, fileMediaType } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: ANTHROPIC_API_KEY not set' });
    }

    const anthropic = new Anthropic({ apiKey });

    const isPDFUpload = fileData && fileMediaType === 'application/pdf';

    // Build message content — PDFs use the document content type
    let messageContent;
    if (isPDFUpload) {
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: fileData },
        },
        { type: 'text', text: prompt },
      ];
    } else {
      messageContent = prompt;
    }

    // PDF extraction needs document-capable models; chat uses fast/cheap models
    const modelsToTry = isPDFUpload
      ? ['claude-sonnet-4-6', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
      : ['claude-haiku-4-5-20251001', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];

    const maxTokens = isPDFUpload ? 2000 : 1000;

    let lastError;
    for (const model of modelsToTry) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: messageContent }],
        });
        return res.status(200).json({
          success: true,
          insight: response.content[0].text,
          modelUsed: model,
        });
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    throw lastError;

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.status ? `Status: ${error.status}` : undefined,
    });
  }
}