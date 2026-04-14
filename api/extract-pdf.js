import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pdfBase64, fileName } = req.body;
  if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 required' });

  try {
    const buffer = Buffer.from(pdfBase64, 'base64');
    const data = await pdfParse(buffer);
    // Cap at 100k chars to stay within reasonable context limits
    const text = (data.text || '').slice(0, 100000).trim();
    res.json({ text, pages: data.numpages });
  } catch (err) {
    // Return empty text rather than an error — caller falls back to base64 document block
    res.json({ text: '', pages: 0, error: err.message });
  }
}
