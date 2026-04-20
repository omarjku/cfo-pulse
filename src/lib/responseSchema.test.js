import { describe, it, expect } from 'vitest';
import { parseRichResponse, isRich, stripJsonBlock } from './responseSchema';

const BASE_RICH = {
  narrative: 'Q4 shows strong revenue growth of 18% YoY.',
  document_timelines: [
    { filename: 'q4.pdf', date_range_start: '2025-10-01', date_range_end: '2025-12-31', description: 'Q4 P&L' },
  ],
  tables: [{ title: 'Revenue', headers: ['Month', 'Revenue'], rows: [['Oct', '120000']] }],
  charts: [{
    title: 'Revenue Trend', type: 'line',
    labels: ['Oct', 'Nov', 'Dec'],
    datasets: [{ label: 'Revenue', data: [120000, 135000, 142000] }],
  }],
  flags: ['Cash runway < 6 months'],
  actions: ['Accelerate receivables collection'],
};

const DASHBOARD_ONLY = {
  healthScore: 72,
  income: { revenue: 397000, cogs: 0, opex: 0, da: 0, interest: 0, tax: 0 },
  balance: { cash: 0, receivables: 0, inventory: 0, otherCurrent: 0, ppe: 0, otherLongTerm: 0, payables: 0, shortTermDebt: 0, otherCurrentLiab: 0, longTermDebt: 0, equity: 0 },
  cashFlow: { operating: 0, investing: 0, financing: 0 },
  prior: { revenue: 0, cash: 0, ebitda: 0 },
  monthlyTrend: [],
  analysis: { executiveSummary: '', riskFactors: [], strengths: [], recommendations: [] },
};

function fence(obj) {
  return '```json\n' + JSON.stringify(obj) + '\n```';
}

describe('parseRichResponse', () => {
  it('parses a valid rich response embedded in prose', () => {
    const text = 'Some analysis.\n\n' + fence(BASE_RICH);
    const result = parseRichResponse(text);
    expect(result).not.toBeNull();
    expect(result.narrative).toBe('Q4 shows strong revenue growth of 18% YoY.');
    expect(result.document_timelines).toHaveLength(1);
    expect(result.flags).toContain('Cash runway < 6 months');
  });

  it('preserves existing dashboard fields when present in superset block', () => {
    const superset = { ...BASE_RICH, ...DASHBOARD_ONLY };
    const result = parseRichResponse(fence(superset));
    expect(result).not.toBeNull();
    expect(result.healthScore).toBe(72);
    expect(result.income.revenue).toBe(397000);
  });

  it('returns null when no JSON block is present', () => {
    expect(parseRichResponse('Just some conversational text')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseRichResponse('```json\n{broken json}\n```')).toBeNull();
  });

  it('returns null for a valid JSON block with no narrative (legacy dashboard-only)', () => {
    expect(parseRichResponse(fence(DASHBOARD_ONLY))).toBeNull();
  });

  it('returns null for empty string narrative', () => {
    expect(parseRichResponse(fence({ ...BASE_RICH, narrative: '' }))).toBeNull();
  });

  it('accepts minimal rich response (narrative only, no arrays)', () => {
    const result = parseRichResponse(fence({ narrative: 'Revenue up 18%.' }));
    expect(result).not.toBeNull();
    expect(result.narrative).toBe('Revenue up 18%.');
  });

  it('returns null for empty string input', () => {
    expect(parseRichResponse('')).toBeNull();
  });
});

describe('isRich', () => {
  it('returns true for object with non-empty narrative', () => {
    expect(isRich({ narrative: 'hello' })).toBe(true);
  });
  it('returns false for null', () => {
    expect(isRich(null)).toBe(false);
  });
  it('returns false when narrative is missing', () => {
    expect(isRich({ healthScore: 72 })).toBe(false);
  });
  it('returns false when narrative is empty string', () => {
    expect(isRich({ narrative: '' })).toBe(false);
  });
});

describe('stripJsonBlock', () => {
  it('removes the json fence and trims surrounding whitespace', () => {
    const text = 'analysis here.\n\n```json\n{"healthScore":72}\n```';
    expect(stripJsonBlock(text)).toBe('analysis here.');
  });
  it('is a no-op for text with no fence', () => {
    expect(stripJsonBlock('hello world')).toBe('hello world');
  });
  it('removes multiple fences', () => {
    const text = '```json\n{}\n``` middle ```json\n{}\n```';
    expect(stripJsonBlock(text)).toBe('middle');
  });
});
