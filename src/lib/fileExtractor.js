import * as XLSX from 'xlsx';

/**
 * @typedef {'BANK_STATEMENT'|'SALES_REGISTER'|'GL_JOURNAL'|'EWALLET_REPORT'|'TRIAL_BALANCE'|'PAYROLL'|'INCOME_STATEMENT'|'UNKNOWN'} DocType
 */

/**
 * @typedef {{
 *   fileName: string,
 *   fileType: string,
 *   docType: DocType,
 *   confidence: number,
 *   currency: string|null,
 *   entityName: string|null,
 *   periodStart: string|null,
 *   periodEnd: string|null,
 *   columns: string[],
 *   sampleRows: object[],
 *   rowCount: number,
 *   aggregates: object,
 *   anomalies: {type:string, description:string, rowIndex?:number}[]
 * }} ExtractedDoc
 */

export const DOC_TYPES = {
  BANK_STATEMENT:   'BANK_STATEMENT',
  SALES_REGISTER:   'SALES_REGISTER',
  GL_JOURNAL:       'GL_JOURNAL',
  EWALLET_REPORT:   'EWALLET_REPORT',
  TRIAL_BALANCE:    'TRIAL_BALANCE',
  PAYROLL:          'PAYROLL',
  INCOME_STATEMENT: 'INCOME_STATEMENT',
  UNKNOWN:          'UNKNOWN',
};

const ARABIC_COLUMN_MAP = {
  'التاريخ':     'date',
  'العميل':      'client',
  'سعر الشراء':  'purchase_price',
  'هامش ربح':   'margin',
  'سعر البيع':   'sale_price',
  'عيار':        'karat',
  'مدين':        'debit',
  'دائن':        'credit',
  'الرصيد':      'balance',
  'الوصف':       'description',
  'رقم الفاتورة':'invoice_no',
};

const TAX_PORTAL_UNBILLED = 'لم تتم الفوترة';
const TAX_PORTAL_MISMATCH  = 'غير مطابقة';

const CLASSIFICATION_RULES = {
  BANK_STATEMENT: {
    required:   [['balance', 'running balance', 'closing balance']],
    supporting: ['debit', 'credit', 'date', 'description', 'reference'],
    minScore:   3,
  },
  GL_JOURNAL: {
    required:   [['account_code', 'account code', 'account']],
    supporting: ['debit', 'credit', 'date', 'description', 'journal'],
    minScore:   4,
  },
  EWALLET_REPORT: {
    required:   [['transaction id', 'transaction_id', 'txn id']],
    supporting: ['amount', 'fees', 'status', 'issuer', 'recipient', 'wallet'],
    minScore:   3,
  },
  SALES_REGISTER: {
    required:   [['invoice', 'invoice no', 'invoice_no', 'invoice number']],
    supporting: ['client', 'amount', 'margin', 'date', 'sale', 'purchase'],
    minScore:   3,
  },
  TRIAL_BALANCE: {
    required:   [['account']],
    supporting: ['debit', 'credit', 'balance'],
    minScore:   3,
    noDate:     true,
  },
  PAYROLL: {
    required:   [['employee', 'staff', 'employee name']],
    supporting: ['gross', 'net', 'deduction', 'salary', 'insurance'],
    minScore:   3,
  },
};

// ─── utilities ────────────────────────────────────────────────────────────────

function normalizeHeader(h) {
  if (h == null) return '';
  const str = String(h).trim();
  return ARABIC_COLUMN_MAP[str] || str.toLowerCase();
}

function parseNum(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val).replace(/[,\s]/g, ''));
  return isNaN(n) ? null : n;
}

function parseDate(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') {
    // Excel serial date — XLSX stores as number when cellDates:false
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toMonthKey(date) {
  if (!date) return null;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${MONTHS[date.getMonth()]}-${String(date.getFullYear()).slice(2)}`;
}

function findCol(normHeaders, candidates) {
  for (const c of candidates) {
    const idx = normHeaders.findIndex(h => h === c || h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

function getColValues(rows, idx) {
  if (idx === -1) return [];
  return rows.map(r => r[idx]).filter(v => v != null && v !== '');
}

// ─── classification ───────────────────────────────────────────────────────────

function scoreClassification(normHeaders, rules) {
  const { required, supporting, minScore } = rules;
  for (const group of required) {
    const matched = group.some(alt => normHeaders.some(h => h === alt || h.includes(alt)));
    if (!matched) return 0;
  }
  let score = required.length;
  for (const sup of supporting) {
    if (normHeaders.some(h => h === sup || h.includes(sup))) score++;
  }
  return score >= minScore ? score : 0;
}

function classifyDocument(headers) {
  const normalized = headers.map(normalizeHeader).filter(Boolean);
  let bestType = DOC_TYPES.UNKNOWN;
  let bestScore = 0;
  let maxPossible = 0;

  for (const [docType, rules] of Object.entries(CLASSIFICATION_RULES)) {
    const score = scoreClassification(normalized, rules);
    const possible = rules.required.length + rules.supporting.length;
    if (score > bestScore) { bestScore = score; bestType = docType; maxPossible = possible; }
  }

  const confidence = bestScore > 0 ? Math.min(bestScore / maxPossible, 1.0) : 0;
  return { docType: bestType, confidence };
}

// ─── metadata detection ───────────────────────────────────────────────────────

function detectCurrency(headers, rows) {
  const sample = [...headers, ...rows.slice(0, 10).flat()].map(v => String(v ?? ''));
  for (const v of sample) {
    if (/EGP|جنيه/i.test(v))  return 'EGP';
    if (/USD|\$/i.test(v))     return 'USD';
    if (/EUR|€/i.test(v))      return 'EUR';
    if (/SAR|ريال/i.test(v))   return 'SAR';
  }
  return null;
}

function detectEntityAndPeriod(allRows, dataStartRow) {
  let entityName = null;
  let periodStart = null;
  let periodEnd   = null;

  for (let i = 0; i < Math.min(dataStartRow, 10); i++) {
    const text = (allRows[i] || []).filter(Boolean).map(v => String(v)).join(' ').trim();
    if (!entityName && text && !/^\d/.test(text) && text.length > 2) {
      entityName = text.slice(0, 80);
    }
    const range = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s*[-–to]+\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
    if (range) {
      const d1 = parseDate(range[1]);
      const d2 = parseDate(range[2]);
      if (d1) periodStart = d1.toISOString().slice(0, 10);
      if (d2) periodEnd   = d2.toISOString().slice(0, 10);
    }
  }

  return { entityName, periodStart, periodEnd };
}

// ─── aggregators ──────────────────────────────────────────────────────────────

function aggregateBankStatement(rows, normHeaders) {
  const debitIdx   = findCol(normHeaders, ['debit', 'withdrawals', 'dr']);
  const creditIdx  = findCol(normHeaders, ['credit', 'deposits', 'cr']);
  const balanceIdx = findCol(normHeaders, ['balance', 'running balance', 'closing balance']);
  const dateIdx    = findCol(normHeaders, ['date', 'value date', 'transaction date']);

  let totalDebits = 0, totalCredits = 0;
  const monthMap = {};

  for (const row of rows) {
    const d = parseNum(row[debitIdx]);
    const c = parseNum(row[creditIdx]);
    if (d != null && d > 0) totalDebits  += d;
    if (c != null && c > 0) totalCredits += c;

    const date = dateIdx !== -1 ? parseDate(row[dateIdx]) : null;
    const key  = toMonthKey(date);
    if (key) {
      if (!monthMap[key]) monthMap[key] = { month: key, credits: 0, debits: 0, net: 0 };
      if (d != null && d > 0) monthMap[key].debits  += d;
      if (c != null && c > 0) monthMap[key].credits += c;
    }
  }

  for (const m of Object.values(monthMap)) m.net = m.credits - m.debits;

  const balances      = getColValues(rows, balanceIdx).map(parseNum).filter(v => v != null);
  const openingBalance = balances[0]                    ?? null;
  const closingBalance = balances[balances.length - 1]  ?? null;

  return {
    totalCredits:  Math.round(totalCredits * 100) / 100,
    totalDebits:   Math.round(totalDebits  * 100) / 100,
    openingBalance,
    closingBalance,
    monthlyTrend:  Object.values(monthMap),
  };
}

function aggregateGLJournal(rows, normHeaders) {
  const debitIdx   = findCol(normHeaders, ['debit', 'dr', 'مدين']);
  const creditIdx  = findCol(normHeaders, ['credit', 'cr', 'دائن']);
  const accountIdx = findCol(normHeaders, ['account_code', 'account code', 'account', 'account name']);
  const dateIdx    = findCol(normHeaders, ['date', 'posting date', 'transaction date']);

  let totalDebitsGL = 0, totalCreditsGL = 0;
  const accountMap = {};
  const monthMap   = {};

  for (const row of rows) {
    const d   = parseNum(row[debitIdx]);
    const c   = parseNum(row[creditIdx]);
    const acc = row[accountIdx] != null ? String(row[accountIdx]).trim() : 'Unknown';

    if (d != null && d > 0) totalDebitsGL  += d;
    if (c != null && c > 0) totalCreditsGL += c;

    if (!accountMap[acc]) accountMap[acc] = { account: acc, debit: 0, credit: 0 };
    if (d != null && d > 0) accountMap[acc].debit  += d;
    if (c != null && c > 0) accountMap[acc].credit += c;

    const date = dateIdx !== -1 ? parseDate(row[dateIdx]) : null;
    const key  = toMonthKey(date);
    if (key) {
      if (!monthMap[key]) monthMap[key] = { month: key, debits: 0, credits: 0 };
      if (d != null && d > 0) monthMap[key].debits  += d;
      if (c != null && c > 0) monthMap[key].credits += c;
    }
  }

  const topAccountsByVolume = Object.values(accountMap)
    .map(a => ({ ...a, net: a.debit - a.credit }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 10);

  return {
    totalDebitsGL:       Math.round(totalDebitsGL  * 100) / 100,
    totalCreditsGL:      Math.round(totalCreditsGL * 100) / 100,
    isBalanced:          Math.abs(totalDebitsGL - totalCreditsGL) < 1,
    topAccountsByVolume,
    monthlyTrend:        Object.values(monthMap),
  };
}

function aggregateEWallet(rows, normHeaders) {
  const amountIdx = findCol(normHeaders, ['amount', 'disbursed amount', 'transaction amount']);
  const feeIdx    = findCol(normHeaders, ['fees', 'fee', 'charges']);
  const statusIdx = findCol(normHeaders, ['status', 'transaction status']);
  const issuerIdx = findCol(normHeaders, ['issuer', 'bank', 'wallet', 'provider']);
  const dateIdx   = findCol(normHeaders, ['date', 'transaction date', 'created at']);

  let totalAmount = 0, totalFees = 0, successCount = 0, failCount = 0;
  const issuerMap = {};
  const monthMap  = {};

  for (const row of rows) {
    const amt    = parseNum(row[amountIdx]);
    const fee    = parseNum(row[feeIdx]);
    const status = statusIdx !== -1 ? String(row[statusIdx] ?? '').toLowerCase() : '';
    const issuer = issuerIdx !== -1 ? String(row[issuerIdx] ?? '').trim() : 'Unknown';

    if (amt != null && amt > 0) totalAmount += amt;
    if (fee != null && fee > 0) totalFees   += fee;

    if (status.includes('success') || status === 'ناجح') {
      successCount++;
    } else if (status) {
      failCount++;
    }

    if (issuer) {
      if (!issuerMap[issuer]) issuerMap[issuer] = { issuer, count: 0, amount: 0 };
      issuerMap[issuer].count++;
      if (amt != null) issuerMap[issuer].amount += amt;
    }

    const date = dateIdx !== -1 ? parseDate(row[dateIdx]) : null;
    const key  = toMonthKey(date);
    if (key) {
      if (!monthMap[key]) monthMap[key] = { month: key, amount: 0, count: 0 };
      if (amt != null) monthMap[key].amount += amt;
      monthMap[key].count++;
    }
  }

  const total = successCount + failCount;
  return {
    totalAmount:  Math.round(totalAmount * 100) / 100,
    totalFees:    Math.round(totalFees   * 100) / 100,
    successCount,
    failCount,
    successRate:  total > 0 ? Math.round((successCount / total) * 1000) / 1000 : null,
    byIssuer:     Object.values(issuerMap).sort((a, b) => b.amount - a.amount),
    monthlyTrend: Object.values(monthMap),
  };
}

function aggregateSalesRegister(rows, normHeaders) {
  const salePriceIdx = findCol(normHeaders, ['sale_price', 'sale price', 'سعر البيع', 'selling price', 'unit price', 'price']);
  const costPriceIdx = findCol(normHeaders, ['purchase_price', 'purchase price', 'سعر الشراء', 'cost price', 'cost']);
  const dateIdx      = findCol(normHeaders, ['date', 'invoice date', 'التاريخ']);
  const karatIdx     = findCol(normHeaders, ['karat', 'عيار', 'grade', 'type']);

  let totalRevenue = 0, totalCOGS = 0;
  const monthMap = {};
  const karatMap = {};

  for (const row of rows) {
    const sale = parseNum(row[salePriceIdx]);
    const cost = parseNum(row[costPriceIdx]);

    if (sale != null && sale > 0) totalRevenue += sale;
    if (cost != null && cost > 0) totalCOGS    += cost;

    const date = dateIdx !== -1 ? parseDate(row[dateIdx]) : null;
    const key  = toMonthKey(date);
    if (key) {
      if (!monthMap[key]) monthMap[key] = { month: key, revenue: 0, cogs: 0 };
      if (sale != null) monthMap[key].revenue += sale;
      if (cost != null) monthMap[key].cogs    += cost;
    }

    if (karatIdx !== -1) {
      const karat = String(row[karatIdx] ?? '').trim();
      if (karat) {
        if (!karatMap[karat]) karatMap[karat] = { karat, revenue: 0, cogs: 0, count: 0 };
        karatMap[karat].count++;
        if (sale != null) karatMap[karat].revenue += sale;
        if (cost != null) karatMap[karat].cogs    += cost;
      }
    }
  }

  const grossMargin = totalRevenue - totalCOGS;
  return {
    totalRevenue:   Math.round(totalRevenue * 100) / 100,
    totalCOGS:      Math.round(totalCOGS    * 100) / 100,
    grossMargin:    Math.round(grossMargin  * 100) / 100,
    grossMarginPct: totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 10000) / 10000 : null,
    invoiceCount:   rows.length,
    byKarat:        Object.values(karatMap),
    monthlyTrend:   Object.values(monthMap),
  };
}

// ─── anomaly detectors ────────────────────────────────────────────────────────

function anomaliesBankStatement(rows, normHeaders, agg) {
  const anomalies = [];
  const { closingBalance, totalCredits, monthlyTrend } = agg;

  if (closingBalance != null && totalCredits > 0 && closingBalance < totalCredits * 0.05) {
    anomalies.push({
      type: 'LOW_BALANCE',
      description: `Low closing balance (${closingBalance.toLocaleString()}) vs total credits (${totalCredits.toLocaleString()}) — possible transit/clearing account`,
    });
  }
  for (const m of (monthlyTrend || [])) {
    if (m.credits > 0 && m.debits > m.credits) {
      anomalies.push({ type: 'NET_OUTFLOW', description: `Net outflow month: ${m.month} (debits ${m.debits.toLocaleString()} > credits ${m.credits.toLocaleString()})` });
    }
  }
  return anomalies;
}

function anomaliesGLJournal(rows, normHeaders, agg) {
  const anomalies = [];
  if (!agg.isBalanced) {
    const diff = Math.abs(agg.totalDebitsGL - agg.totalCreditsGL);
    anomalies.push({ type: 'UNBALANCED', description: `Journal not balanced: difference = ${diff.toLocaleString()}` });
  }
  for (const acc of (agg.topAccountsByVolume || [])) {
    if (/sanaddak|related.?party|intercompany|parent|^3\d{3}/i.test(String(acc.account)) && acc.debit > 1_000_000) {
      anomalies.push({ type: 'RELATED_PARTY', description: `Large related-party payable: ${acc.account} — net debit ${acc.debit.toLocaleString()}` });
    }
  }
  return anomalies;
}

function anomaliesEWallet(rows, normHeaders, agg) {
  const anomalies = [];
  if (agg.successRate != null && agg.successRate < 0.90) {
    anomalies.push({ type: 'LOW_SUCCESS_RATE', description: `Low success rate: ${(agg.successRate * 100).toFixed(1)}%` });
  }
  if (agg.totalAmount > 0 && agg.totalFees / agg.totalAmount > 0.005) {
    anomalies.push({ type: 'HIGH_FEES', description: `Fee rate ${((agg.totalFees / agg.totalAmount) * 100).toFixed(2)}% exceeds 0.5% threshold` });
  }
  return anomalies;
}

function anomaliesSalesRegister(rows, normHeaders, agg) {
  const anomalies = [];
  const salePriceIdx = findCol(normHeaders, ['sale_price', 'sale price', 'سعر البيع', 'selling price', 'unit price', 'price']);
  const costPriceIdx = findCol(normHeaders, ['purchase_price', 'purchase price', 'سعر الشراء', 'cost price', 'cost']);
  const taxPortalIdx = findCol(normHeaders, ['tax portal', 'tax_portal', 'portal', 'الفاتورة', 'fatura']);

  let taxMismatchCount = 0;
  rows.forEach((row, i) => {
    const sale = parseNum(row[salePriceIdx]);
    const cost = parseNum(row[costPriceIdx]);
    if (sale != null && cost != null && sale < cost) {
      anomalies.push({ type: 'SALE_BELOW_COST', description: `Sale below cost on row ${i + 1}`, rowIndex: i });
    }
    if (taxPortalIdx !== -1) {
      const v = String(row[taxPortalIdx] ?? '');
      if (v.includes(TAX_PORTAL_UNBILLED) || v.includes(TAX_PORTAL_MISMATCH)) taxMismatchCount++;
    }
  });

  if (taxMismatchCount > 0) {
    anomalies.push({ type: 'TAX_PORTAL_MISMATCH', description: `${taxMismatchCount} invoices unmatched/unbilled on tax portal — compliance risk` });
  }
  if (agg.grossMarginPct != null && agg.grossMarginPct < 0.02) {
    anomalies.push({ type: 'LOW_MARGIN', description: `Gross margin ${(agg.grossMarginPct * 100).toFixed(2)}% — spread/trading business model` });
  }
  return anomalies;
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Extract, classify, aggregate and anomaly-scan a spreadsheet file.
 * Never throws — returns UNKNOWN docType on parse errors.
 * @param {File} file
 * @returns {Promise<ExtractedDoc>}
 */
export async function extractDocument(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  try {
    const buffer   = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const raw      = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

    if (!raw.length) throw new Error('Empty sheet');

    // Find best header row: row with most non-numeric string cells in first 10 rows
    let headerRowIdx = 0;
    let bestScore    = -1;
    for (let i = 0; i < Math.min(10, raw.length); i++) {
      const score = (raw[i] || []).filter(v => v != null && typeof v === 'string' && isNaN(parseFloat(v))).length;
      if (score > bestScore) { bestScore = score; headerRowIdx = i; }
    }

    const headers     = (raw[headerRowIdx] || []).map(h => h != null ? String(h) : '');
    const dataRows    = raw.slice(headerRowIdx + 1).filter(r => r.some(v => v != null && v !== ''));
    const normHeaders = headers.map(normalizeHeader);

    const { docType, confidence }            = classifyDocument(headers);
    const { entityName, periodStart: ps, periodEnd: pe } = detectEntityAndPeriod(raw, headerRowIdx);
    const currency                            = detectCurrency(headers, dataRows);

    // Refine period from actual date column if header scan missed it
    let periodStart = ps;
    let periodEnd   = pe;
    if (!periodStart || !periodEnd) {
      const dateIdx = findCol(normHeaders, ['date', 'transaction date', 'value date', 'التاريخ', 'invoice date', 'posting date', 'created at']);
      if (dateIdx !== -1) {
        const dates = dataRows.map(r => parseDate(r[dateIdx])).filter(Boolean).sort((a, b) => a - b);
        if (dates.length) {
          periodStart = periodStart || dates[0].toISOString().slice(0, 10);
          periodEnd   = periodEnd   || dates[dates.length - 1].toISOString().slice(0, 10);
        }
      }
    }

    let aggregates = {};
    let anomalies  = [];
    if (docType === DOC_TYPES.BANK_STATEMENT) {
      aggregates = aggregateBankStatement(dataRows, normHeaders);
      anomalies  = anomaliesBankStatement(dataRows, normHeaders, aggregates);
    } else if (docType === DOC_TYPES.GL_JOURNAL) {
      aggregates = aggregateGLJournal(dataRows, normHeaders);
      anomalies  = anomaliesGLJournal(dataRows, normHeaders, aggregates);
    } else if (docType === DOC_TYPES.EWALLET_REPORT) {
      aggregates = aggregateEWallet(dataRows, normHeaders);
      anomalies  = anomaliesEWallet(dataRows, normHeaders, aggregates);
    } else if (docType === DOC_TYPES.SALES_REGISTER) {
      aggregates = aggregateSalesRegister(dataRows, normHeaders);
      anomalies  = anomaliesSalesRegister(dataRows, normHeaders, aggregates);
    }

    return {
      fileName:    file.name,
      fileType:    ext,
      docType,
      confidence:  Math.round(confidence * 100) / 100,
      currency,
      entityName,
      periodStart,
      periodEnd,
      columns:     headers.filter(Boolean),
      sampleRows:  dataRows.slice(0, 5).map(row =>
        Object.fromEntries(headers.map((h, i) => [h || `col${i}`, row[i]]))
      ),
      rowCount:    dataRows.length,
      aggregates,
      anomalies,
    };
  } catch (err) {
    return {
      fileName:    file.name,
      fileType:    ext,
      docType:     DOC_TYPES.UNKNOWN,
      confidence:  0,
      currency:    null,
      entityName:  null,
      periodStart: null,
      periodEnd:   null,
      columns:     [],
      sampleRows:  [],
      rowCount:    0,
      aggregates:  {},
      anomalies:   [{ type: 'PARSE_ERROR', description: err.message }],
    };
  }
}
