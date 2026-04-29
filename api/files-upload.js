import Anthropic from '@anthropic-ai/sdk';

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { base64, mimeType, fileName } = req.body;
  if (!base64 || !mimeType || !fileName) {
    res.status(400).json({ error: 'base64, mimeType, and fileName are required' });
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const buffer = Buffer.from(base64, 'base64');
  const blob = new Blob([buffer], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });

  try {
    const uploaded = await anthropic.beta.files.upload({ file });
    res.status(200).json({ file_id: uploaded.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
