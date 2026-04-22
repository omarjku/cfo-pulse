import { motion, AnimatePresence } from 'framer-motion';
import { HealthGauge } from './HealthGauge';
import { KPICard } from './KPICard';
import { TrendChart } from './TrendChart';
import { useFinancialCalcs } from '../../hooks/useFinancialCalcs';
import { fmt, pct } from '../../lib/formatters';
import { T, metalBg } from '../../lib/tokens';

const SECTION_LABEL = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 8, fontWeight: 700,
  letterSpacing: '3px', textTransform: 'uppercase',
  color: T.TEXT4, margin: '0 0 8px',
};

function RiskItem({ text, color, bg, bd }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '6px 9px', marginBottom: 5,
      borderRadius: 5,
      background: bg,
      border: `1px solid ${bd}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4 }} />
      <p style={{ fontSize: 11, color: T.TEXT2, lineHeight: 1.45, margin: 0, flex: 1 }}>{text}</p>
    </div>
  );
}

export function DashboardPanel({ analysis }) {
  const { income, balance, cashFlow, prior, healthScore, monthlyTrend, analysis: insights } = analysis;

  const calc = useFinancialCalcs({
    income: income || {},
    balance: balance || {},
    cashFlow: cashFlow || {},
    prior: prior || {},
    period: 'Annual',
  });

  const hasData =
    (income?.revenue || 0) > 0 ||
    (balance?.cash || 0) > 0 ||
    Math.abs(cashFlow?.operating || 0) > 0;

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${T.EDGE_SEP}`,
        boxShadow: `inset 0 1px 0 ${T.EDGE_HI}, 0 1px 0 rgba(0,0,0,0.2)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9, fontWeight: 700,
          color: T.AMBER, letterSpacing: '2.5px', textTransform: 'uppercase',
        }}>
          LIVE ANALYSIS
        </span>
        {hasData && (
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: T.SUCCESS,
            boxShadow: `0 0 5px rgba(56,160,80,0.35)`,
          }} />
        )}
      </div>

      <div style={{ padding: 14, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Health Score */}
        <AnimatePresence>
          {hasData && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <HealthGauge score={healthScore || calc.healthScore} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          <KPICard label="Revenue" rawValue={calc.revenue} format={(v) => fmt(v)} value={fmt(calc.revenue)} />
          <KPICard label="Gross Margin" value={pct(calc.grossMargin)} />
          <KPICard
            label="Net Profit"
            rawValue={calc.netProfit}
            format={(v) => fmt(v)}
            value={fmt(calc.netProfit)}
            trendColor={calc.netProfit >= 0 ? T.SUCCESS : T.DANGER}
          />
          <KPICard
            label="Cash Runway"
            value={calc.runway ? `${calc.runway}mo` : '—'}
            trendColor={calc.runway && calc.runway < 6 ? T.DANGER : T.SUCCESS}
          />
          <KPICard label="EBITDA" rawValue={calc.ebitda} format={(v) => fmt(v)} value={fmt(calc.ebitda)} />
          <KPICard label="Burn Rate" value={calc.monthlyBurn > 0 ? fmt(calc.monthlyBurn) + '/mo' : '—'} trendColor={T.DANGER} />
        </div>

        {/* Monthly Trend */}
        {monthlyTrend && monthlyTrend.length > 0 && (
          <div>
            <p style={SECTION_LABEL}>Monthly Trend</p>
            <TrendChart data={monthlyTrend} />
          </div>
        )}

        {/* Risk Factors */}
        {insights?.riskFactors?.length > 0 && (
          <div>
            <p style={{ ...SECTION_LABEL, color: T.DANGER }}>Risk Factors</p>
            {insights.riskFactors.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <RiskItem text={r} color={T.DANGER} bg={T.DANGER_BG} bd={T.DANGER_BD} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Strengths */}
        {insights?.strengths?.length > 0 && (
          <div>
            <p style={{ ...SECTION_LABEL, color: T.SUCCESS }}>Strengths</p>
            {insights.strengths.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <RiskItem text={s} color={T.SUCCESS} bg="rgba(56,160,80,0.07)" bd="rgba(56,160,80,0.18)" />
              </motion.div>
            ))}
          </div>
        )}

        {!hasData && (
          <div style={{ textAlign: 'center', padding: '32px 12px' }}>
            <p style={{ color: T.TEXT3, fontSize: 11, lineHeight: 1.6 }}>
              Upload financial documents and ask CFO-Pulse to analyze them.<br />
              KPIs and charts will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
