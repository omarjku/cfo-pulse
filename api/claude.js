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
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get API key from environment variable (server-side)
    // Try ANTHROPIC_API_KEY first, then VITE_ANTHROPIC_API_KEY
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('API key not configured on server');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC')));
      return res.status(500).json({
        error: 'Server configuration error: ANTHROPIC_API_KEY not set',
        availableEnvVars: Object.keys(process.env).filter(k => k.includes('ANTHROPIC'))
      });
    }

    console.log('Using API key (first 12 chars):', apiKey.substring(0, 12) + '...');

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    console.log('Making Claude API call with model: claude-3-sonnet-20240229');

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    res.status(200).json({
      success: true,
      insight: response.content[0].text
    });

  } catch (error) {
    console.error('Claude API error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      error: error.error
    });

    res.status(500).json({
      success: false,
      error: error.message,
      details: error.status ? `Status: ${error.status}` : undefined,
      errorType: error.type,
      anthropicError: error.error
    });
  }
}