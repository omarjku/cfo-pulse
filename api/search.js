export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return res.status(200).json({ results: [] }); // graceful degradation

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 3,
        include_answer: false,
      }),
    });
    const data = await response.json();
    const results = (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content?.slice(0, 500),
    }));
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(200).json({ results: [] }); // graceful degradation
  }
}
