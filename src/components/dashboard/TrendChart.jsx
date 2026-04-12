import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { T } from '../../lib/tokens';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.SURFACE, border: `1px solid ${T.BORDER_A}`, borderRadius: 6,
      padding: '6px 10px', fontSize: 11,
    }}>
      <p style={{ color: T.TEXT3, margin: '0 0 4px' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: '1px 0', fontFamily: 'monospace' }}>
          {p.name}: {typeof p.value === 'number' ? `$${(p.value / 1000).toFixed(0)}K` : p.value}
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
        <p style={{ color: T.TEXT3, fontSize: 12 }}>No trend data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} />
        <XAxis dataKey="month" tick={{ fontSize: 9, fill: T.TEXT3 }} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: T.TEXT3 }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="revenue" stroke={T.AMBER} strokeWidth={1.5} dot={false} name="Revenue" />
        <Line type="monotone" dataKey="netProfit" stroke={T.SUCCESS} strokeWidth={1.5} dot={false} name="Net Profit" />
      </LineChart>
    </ResponsiveContainer>
  );
}
