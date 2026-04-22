import { motion } from 'framer-motion';
import { DocumentTimeline } from './DocumentTimeline';
import { StructuredTable } from './StructuredTable';
import { InlineChart } from './InlineChart';
import { FlagsList } from './FlagsList';
import { ActionsList } from './ActionsList';
import { T } from '../../lib/tokens';

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  }),
};

function fmt(value, format) {
  if (value == null) return '—';
  if (format === 'currency') return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (format === 'percent')  return `${(Number(value) * (Math.abs(value) <= 1 ? 100 : 1)).toFixed(1)}%`;
  if (format === 'number')   return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(value);
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 700, color: T.AMBER,
      fontFamily: "'Barlow Condensed', sans-serif",
      letterSpacing: '2.5px', textTransform: 'uppercase',
      margin: '0 0 8px',
    }}>
      {children}
    </p>
  );
}

function KpiGrid({ kpis }) {
  if (!kpis?.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel>KEY METRICS</SectionLabel>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 8,
      }}>
        {kpis.slice(0, 8).map((kpi, i) => (
          <div key={i} style={{
            backgroundColor: T.SURFACE3,
            backgroundImage: T.NOISE,
            backgroundBlendMode: 'overlay',
            backgroundSize: '256px 256px',
            border: `1px solid ${T.EDGE_SEP}`,
            boxShadow: T.MACHINED_SM,
            borderRadius: 6,
            padding: '8px 10px',
          }}>
            <p style={{ fontSize: 10, color: T.TEXT3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', margin: '0 0 3px', textTransform: 'uppercase' }}>
              {kpi.label}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.TEXT1, margin: 0, lineHeight: 1.2 }}>
              {fmt(kpi.value, kpi.format)}
            </p>
            {kpi.source && (
              <p style={{ fontSize: 9, color: T.TEXT3, margin: '2px 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
                {kpi.source}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpliedPL({ pl }) {
  if (!pl) return null;
  const hasData = pl.revenue != null || pl.netIncome != null;
  if (!hasData) return null;

  const netPositive = pl.netIncome != null && pl.netIncome >= 0;
  const netColor    = pl.netIncome == null ? T.TEXT2 : netPositive ? T.SUCCESS : T.DANGER;

  const rows = [
    { label: 'Revenue',             value: pl.revenue,            indent: false, bold: false },
    { label: 'Cost of Goods Sold',  value: pl.cogs != null ? -Math.abs(pl.cogs) : null, indent: true, bold: false },
    { label: 'Gross Profit',        value: pl.grossProfit,        indent: false, bold: true,
      suffix: pl.grossMarginPct != null ? ` (${(pl.grossMarginPct * 100).toFixed(1)}%)` : '' },
    { label: 'Operating Expenses',  value: pl.operatingExpenses != null ? -Math.abs(pl.operatingExpenses) : null, indent: true, bold: false },
    { label: 'EBIT',                value: pl.ebit,               indent: false, bold: true },
    { label: 'Other Income / (Exp)',value: pl.otherIncome,        indent: true,  bold: false },
    { label: 'Net Income / (Loss)', value: pl.netIncome,          indent: false, bold: true, color: netColor },
  ].filter(r => r.value != null);

  if (!rows.length) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel>IMPLIED P&amp;L{pl.currency ? ` (${pl.currency})` : ''}</SectionLabel>
      <div style={{
        backgroundColor: T.SURFACE2,
        border: `1px solid ${T.EDGE_SEP}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        {rows.map((row, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 12px',
            borderTop: i > 0 ? `1px solid ${T.EDGE_SEP}` : 'none',
            background: row.bold ? 'rgba(210,138,22,0.04)' : 'transparent',
          }}>
            <span style={{
              fontSize: 12,
              color: row.color || (row.bold ? T.TEXT1 : T.TEXT2),
              fontWeight: row.bold ? 700 : 400,
              paddingLeft: row.indent ? 12 : 0,
              fontFamily: row.indent ? 'inherit' : 'monospace',
            }}>
              {row.label}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: row.bold ? 700 : 400,
              color: row.color || (row.value < 0 ? T.DANGER : row.bold ? T.TEXT1 : T.TEXT2),
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {row.value < 0
                ? `(${Math.abs(row.value).toLocaleString(undefined, { maximumFractionDigits: 0 })})`
                : row.value.toLocaleString(undefined, { maximumFractionDigits: 0 })
              }{row.suffix || ''}
            </span>
          </div>
        ))}
      </div>
      {pl.note && (
        <p style={{ fontSize: 10, color: T.TEXT3, fontFamily: "'JetBrains Mono', monospace", margin: '4px 0 0', fontStyle: 'italic' }}>
          {pl.note}
        </p>
      )}
    </div>
  );
}

export function RichResponse({ rich }) {
  if (!rich) return null;

  const { narrative, document_timelines, tables, charts, flags, actions, kpiSummary, impliedPL } = rich;

  return (
    <div>
      {/* 1. Document Timeline — always first */}
      {document_timelines?.length > 0 && (
        <motion.div custom={0} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <DocumentTimeline timelines={document_timelines} />
        </motion.div>
      )}

      {/* 2. KPI Summary grid */}
      {kpiSummary?.length > 0 && (
        <motion.div custom={1} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <KpiGrid kpis={kpiSummary} />
        </motion.div>
      )}

      {/* 3. Narrative */}
      {narrative && (
        <motion.div custom={2} variants={SECTION_VARIANTS} initial="hidden" animate="visible"
          style={{ marginBottom: 16 }}
        >
          <SectionLabel>EXECUTIVE SUMMARY</SectionLabel>
          <p style={{ fontSize: 13, color: T.TEXT2, lineHeight: 1.72, margin: 0 }}>
            {narrative}
          </p>
        </motion.div>
      )}

      {/* 4. Implied P&L */}
      {impliedPL && (
        <motion.div custom={3} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <ImpliedPL pl={impliedPL} />
        </motion.div>
      )}

      {/* 5. Tables */}
      {tables?.filter((t) => t.headers?.length > 0).map((table, i) => (
        <motion.div key={i} custom={4 + i} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <StructuredTable {...table} />
        </motion.div>
      ))}

      {/* 6. Charts */}
      {charts?.filter((c) => c.labels?.length > 0).map((chart, i) => (
        <motion.div key={i} custom={5 + i} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <InlineChart {...chart} />
        </motion.div>
      ))}

      {/* 7. Flags */}
      {flags?.length > 0 && (
        <motion.div custom={6} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <FlagsList flags={flags} />
        </motion.div>
      )}

      {/* 8. Actions */}
      {actions?.length > 0 && (
        <motion.div custom={7} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <ActionsList actions={actions} />
        </motion.div>
      )}
    </div>
  );
}
