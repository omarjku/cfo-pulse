import { motion, AnimatePresence } from 'framer-motion';
import { HealthGauge } from './HealthGauge';
import { KPICard } from './KPICard';
import { TrendChart } from './TrendChart';
import { useFinancialCalcs } from '../../hooks/useFinancialCalcs';
import { fmt, pct } from '../../lib/formatters';
import { T } from '../../lib/tokens';

export function DashboardPanel({ analysis }) {
  const { income, balance, cashFlow, prior, healthScore, monthlyTrend, analysis: insights } = analysis;

  const calc = useFinancialCalcs({
    income: income || {},
    balance: balance || {},
    cashFlow: cashFlow || {},
    prior: prior || {},
    period: 'Annual',
  });

  const hasData = (income?.revenue || 0) > 0;

  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: `1px solid ${T.BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.AMBER, fontFamily: 'monospace', letterSpacing: '1px' }}>
          LIVE ANALYSIS
        </span>
        {hasData && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: T.SUCCESS,
            boxShadow: `0 0 6px ${T.SUCCESS}`,
          }} />
        )}
      </div>

      <div style={{ padding: 16, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
            <p style={{ fontSize: 9, fontWeight: 700, color: T.TEXT3, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 8px', fontFamily: 'monospace' }}>
              MONTHLY TREND
            </p>
            <TrendChart data={monthlyTrend} />
          </div>
        )}

        {/* Risk Factors */}
        {insights?.riskFactors?.length > 0 && (
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: T.DANGER, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 8px', fontFamily: 'monospace' }}>
              RISK FACTORS
            </p>
            {insights.riskFactors.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: T.SURFACE2, borderLeft: `2px solid ${T.DANGER}`,
                  borderRadius: '0 6px 6px 0', padding: '5px 8px', marginBottom: 5,
                  fontSize: 11, color: T.TEXT2, lineHeight: 1.4,
                }}
              >
                {r}
              </motion.div>
            ))}
          </div>
        )}

        {/* Strengths */}
        {insights?.strengths?.length > 0 && (
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: T.SUCCESS, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 8px', fontFamily: 'monospace' }}>
              STRENGTHS
            </p>
            {insights.strengths.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: T.SURFACE2, borderLeft: `2px solid ${T.SUCCESS}`,
                  borderRadius: '0 6px 6px 0', padding: '5px 8px', marginBottom: 5,
                  fontSize: 11, color: T.TEXT2, lineHeight: 1.4,
                }}
              >
                {s}
              </motion.div>
            ))}
          </div>
        )}

        {!hasData && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ color: T.TEXT3, fontSize: 12, lineHeight: 1.6 }}>
              Upload financial documents and ask CFO-Pulse to analyze them.<br />
              KPIs and charts will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
