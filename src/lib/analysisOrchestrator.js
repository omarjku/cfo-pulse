import { extractDocument, DOC_TYPES } from './fileExtractor.js';

/**
 * Spreadsheet extensions handled by the financial analysis pipeline.
 * Other file types (PDF, images, DOCX, TXT) go through the existing chat flow.
 */
const SPREADSHEET_EXTS = new Set(['xlsx', 'xls', 'csv']);

/**
 * @param {string} fileName
 * @returns {boolean}
 */
export function isSpreadsheet(fileName) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return SPREADSHEET_EXTS.has(ext);
}

/**
 * Build document_timelines entries from analyzed docs.
 * @param {object[]} analyzedDocs
 * @param {import('./fileExtractor').ExtractedDoc[]} extractedDocs
 * @returns {object[]}
 */
function buildDocumentTimelines(analyzedDocs, extractedDocs) {
  return analyzedDocs.map((doc, i) => {
    const extracted = extractedDocs[i] || {};
    return {
      filename:         doc.fileName || extracted.fileName || `Document ${i + 1}`,
      date_range_start: extracted.periodStart || null,
      date_range_end:   extracted.periodEnd   || null,
      description:      `${doc.docType} — ${doc.period || 'period unknown'}`,
    };
  });
}

/**
 * Build Recharts-compatible chart objects from monthly trend data.
 * @param {object[]} analyzedDocs
 * @returns {object[]}
 */
function buildCharts(analyzedDocs) {
  const charts = [];

  for (const doc of analyzedDocs) {
    const trend = doc.monthlyTrend;
    if (!trend?.length) continue;

    const labels = trend.map(t => t.month);

    if (doc.docType === DOC_TYPES.BANK_STATEMENT) {
      charts.push({
        title: `${doc.fileName} — Monthly Cash Flow`,
        type: 'bar',
        labels,
        datasets: [
          { label: 'Credits', data: trend.map(t => t.credits || 0) },
          { label: 'Debits',  data: trend.map(t => t.debits  || 0) },
        ],
      });
    } else if (doc.docType === DOC_TYPES.EWALLET_REPORT) {
      charts.push({
        title: `${doc.fileName} — Monthly Disbursements`,
        type: 'line',
        labels,
        datasets: [{ label: 'Amount', data: trend.map(t => t.amount || 0) }],
      });
    } else if (doc.docType === DOC_TYPES.SALES_REGISTER) {
      charts.push({
        title: `${doc.fileName} — Monthly Revenue vs COGS`,
        type: 'bar',
        labels,
        datasets: [
          { label: 'Revenue', data: trend.map(t => t.revenue || 0) },
          { label: 'COGS',    data: trend.map(t => t.cogs    || 0) },
        ],
      });
    } else if (doc.docType === DOC_TYPES.GL_JOURNAL) {
      charts.push({
        title: `${doc.fileName} — Monthly GL Activity`,
        type: 'line',
        labels,
        datasets: [
          { label: 'Debits',  data: trend.map(t => t.debits  || 0) },
          { label: 'Credits', data: trend.map(t => t.credits || 0) },
        ],
      });
    }
  }

  return charts;
}

/**
 * Merge flags from all docs into a flat array of strings for RichResponse.
 * @param {object} synthesis
 * @param {object[]} analyzedDocs
 * @returns {string[]}
 */
function buildFlags(synthesis, analyzedDocs) {
  const flags = [];

  for (const f of (synthesis?.crossDocFlags || [])) {
    flags.push(`[${f.severity}] ${f.title} — ${f.detail}`);
  }

  for (const doc of analyzedDocs) {
    for (const f of (doc.flags || [])) {
      flags.push(`[${f.severity}] ${doc.fileName}: ${f.title} — ${f.detail}`);
    }
  }

  return flags;
}

/**
 * Build actions array from synthesis recommended actions.
 * @param {object} synthesis
 * @returns {string[]}
 */
function buildActions(synthesis) {
  return (synthesis?.recommendedActions || [])
    .sort((a, b) => (a.priority || 3) - (b.priority || 3))
    .map(a => `[P${a.priority}] ${a.action} — Owner: ${a.owner}, By: ${a.deadline}`);
}

/**
 * Map synthesis + analyzedDocs into the RichResponse superset schema.
 * Preserves all existing dashboard fields (healthScore, income, balance, cashFlow, etc.).
 * @param {object|null} synthesis
 * @param {object[]} analyzedDocs
 * @param {import('./fileExtractor').ExtractedDoc[]} extractedDocs
 * @returns {object}
 */
function mapToRichResponseSchema(synthesis, analyzedDocs, extractedDocs) {
  const primary = synthesis || analyzedDocs[0] || {};

  // Derive a rough healthScore: start at 80, deduct per HIGH flag
  const allHighFlags = [
    ...(synthesis?.crossDocFlags || []).filter(f => f.severity === 'HIGH'),
    ...analyzedDocs.flatMap(d => (d.flags || []).filter(f => f.severity === 'HIGH')),
  ];
  const healthScore = Math.max(0, 80 - allHighFlags.length * 10);

  // Attempt to pull income statement values from impliedPL
  const pl = synthesis?.impliedPL;
  const income = {
    revenue:  pl?.revenue  || 0,
    cogs:     pl?.cogs     || 0,
    opex:     pl?.operatingExpenses || 0,
    da:       0,
    interest: 0,
    tax:      0,
  };

  // Pull cash from bank statement if available
  const bankDoc = analyzedDocs.find(d => d.docType === DOC_TYPES.BANK_STATEMENT);
  const ewalletDoc = analyzedDocs.find(d => d.docType === DOC_TYPES.EWALLET_REPORT);
  const salesDoc   = analyzedDocs.find(d => d.docType === DOC_TYPES.SALES_REGISTER);

  const bankAgg   = extractedDocs.find(d => d.docType === DOC_TYPES.BANK_STATEMENT)?.aggregates  || {};
  const salesAgg  = extractedDocs.find(d => d.docType === DOC_TYPES.SALES_REGISTER)?.aggregates  || {};

  const balance = {
    cash:             bankAgg.closingBalance   || 0,
    receivables:      0,
    inventory:        0,
    otherCurrent:     0,
    ppe:              0,
    otherLongTerm:    0,
    payables:         0,
    shortTermDebt:    0,
    otherCurrentLiab: 0,
    longTermDebt:     0,
    equity:           0,
  };

  const cashFlow = {
    operating: bankAgg.totalCredits ? bankAgg.totalCredits - bankAgg.totalDebits : 0,
    investing:  0,
    financing:  0,
  };

  const allTables = [
    ...(synthesis?.tables    || []),
    ...analyzedDocs.flatMap(d => d.tables || []),
  ];

  return {
    // ── existing dashboard fields (preserved) ──────────────────────────────
    healthScore,
    income,
    balance,
    cashFlow,
    prior:        { revenue: 0, cash: 0, ebitda: 0 },
    monthlyTrend: synthesis?.monthlyTrend || analyzedDocs[0]?.monthlyTrend || [],
    analysis: {
      executiveSummary:  primary.narrative || primary.executiveSummary || '',
      riskFactors:       (synthesis?.crossDocFlags || []).filter(f => f.severity === 'HIGH').map(f => f.title),
      strengths:         [],
      recommendations:   (synthesis?.recommendedActions || []).map(a => a.action),
    },

    // ── new rich fields ────────────────────────────────────────────────────
    narrative:          primary.narrative || primary.executiveSummary || '',
    document_timelines: buildDocumentTimelines(analyzedDocs, extractedDocs),
    tables:             allTables,
    charts:             buildCharts(analyzedDocs),
    flags:              buildFlags(synthesis, analyzedDocs),
    actions:            buildActions(synthesis),
    impliedPL:          synthesis?.impliedPL || null,
    kpiSummary:         synthesis?.kpiSummary || analyzedDocs.flatMap(d => d.kpis || []),
    documentsAnalyzed:  analyzedDocs.length,
  };
}

/**
 * Main orchestration entry point.
 * Call this with all uploaded spreadsheet File objects.
 * Returns a RichResponse-compatible JSON object ready for the chat renderer.
 *
 * @param {File[]} uploadedFiles  — only spreadsheet files (.xlsx/.xls/.csv)
 * @param {string} [baseUrl]      — origin for API calls (defaults to window.location.origin)
 * @returns {Promise<object>}
 */
export async function runFinancialAnalysis(uploadedFiles, baseUrl) {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  // Step 1: Extract all documents client-side
  const extractedDocs = await Promise.all(
    uploadedFiles.map(file => extractDocument(file))
  );

  // Step 2: Analyze each document in parallel via /api/analyze
  const analyzedDocs = await Promise.all(
    extractedDocs.map(async (doc) => {
      try {
        const res = await fetch(`${origin}/api/analyze`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ extractedDoc: doc }),
        });
        if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
        return await res.json();
      } catch (err) {
        // Degrade gracefully — return a minimal stub so synthesis can still run
        return {
          docType:      doc.docType,
          fileName:     doc.fileName,
          period:       `${doc.periodStart || '?'} to ${doc.periodEnd || '?'}`,
          currency:     doc.currency || 'unknown',
          confidence:   doc.confidence,
          kpis:         [],
          flags:        (doc.anomalies || []).map(a => ({ severity: 'MEDIUM', category: 'Data', title: a.type, detail: a.description, recommendation: '' })),
          tables:       [],
          monthlyTrend: doc.aggregates?.monthlyTrend || [],
          narrative:    `Could not analyze ${doc.fileName}: ${err.message}`,
        };
      }
    })
  );

  // Step 3: Synthesize if 2+ documents
  let synthesis = null;
  if (analyzedDocs.length >= 2) {
    try {
      const entityName = extractedDocs.find(d => d.entityName)?.entityName;
      const res = await fetch(`${origin}/api/synthesize`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analyzedDocs, entityName }),
      });
      if (res.ok) synthesis = await res.json();
    } catch {
      // synthesis is optional — single-doc output is still useful
    }
  }

  return mapToRichResponseSchema(synthesis, analyzedDocs, extractedDocs);
}
