import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const REPORT_MODEL = 'claude-sonnet-4-6';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { format, title, sections } = req.body;
  if (!format || !title || !sections) {
    res.status(400).json({ error: 'format, title, and sections are required' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)' });
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Escape sections for safe embedding in Python string
  const sectionsJson = JSON.stringify(sections).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const pythonCode = format === 'xlsx'
    ? `import openpyxl, json, base64
from io import BytesIO
sections = json.loads('${sectionsJson}')
wb = openpyxl.Workbook()
wb.remove(wb.active)
for section in sections:
    ws = wb.create_sheet(title=section['heading'][:31])
    for row in section['rows']:
        ws.append(row)
buf = BytesIO()
wb.save(buf)
print(base64.b64encode(buf.getvalue()).decode())`
    : `import json, base64
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, Spacer
from reportlab.lib.styles import getSampleStyleSheet
sections = json.loads('${sectionsJson}')
buf = BytesIO()
doc = SimpleDocTemplate(buf, pagesize=A4)
styles = getSampleStyleSheet()
story = [Paragraph('${title.replace(/'/g, "\\'")}', styles['Title'])]
for section in sections:
    story.append(Paragraph(section['heading'], styles['Heading2']))
    if section['rows']:
        story.append(Table(section['rows']))
    story.append(Spacer(1, 12))
doc.build(story)
print(base64.b64encode(buf.getvalue()).decode())`;

  try {
    const response = await anthropic.messages.create({
      model: REPORT_MODEL,
      max_tokens: 4096,
      tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
      messages: [{
        role: 'user',
        content: `Run this Python code and output ONLY the base64 string, nothing else:\n\`\`\`python\n${pythonCode}\n\`\`\``,
      }],
    });

    // Extract base64 from code execution stdout (comes back in tool_result content blocks)
    let b64 = '';
    for (const block of response.content) {
      if (block.type === 'tool_result') {
        const content = Array.isArray(block.content) ? block.content : [block.content];
        for (const c of content) {
          if (c?.type === 'text') b64 += c.text;
        }
      } else if (block.type === 'text') {
        // Fallback: model may echo result as text
        b64 += block.text;
      }
    }
    b64 = b64.trim();

    if (!b64) {
      res.status(500).json({ error: 'Code execution returned no output' });
      return;
    }

    const buffer = Buffer.from(b64, 'base64');
    const mimeType = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';
    const fileName = `${Date.now()}-${title.replace(/\s+/g, '-').toLowerCase()}.${format}`;

    const { error: uploadError } = await supabase.storage
      .from('cfo-reports')
      .upload(fileName, buffer, { contentType: mimeType });

    if (uploadError) { res.status(500).json({ error: uploadError.message }); return; }

    const { data: urlData } = supabase.storage.from('cfo-reports').getPublicUrl(fileName);
    res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
