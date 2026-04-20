import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { T } from '../../lib/tokens';

const PALETTE = [T.AMBER, T.SUCCESS, '#60a5fa', '#c084fc', '#f472b6', '#34d399'];

function buildData(labels, datasets) {
  return labels.map((label, i) => {
    const point = { label };
    datasets.forEach((ds) => { point[ds.label] = ds.data[i] ?? 0; });
    return point;
  });
}

function buildPieData(labels, datasets) {
  const ds = datasets[0] || { data: [] };
  return labels.map((label, i) => ({ name: label, value: ds.data[i] ?? 0 }));
}

const TOOLTIP_STYLE = {
  background: T.SURFACE2,
  border: `1px solid ${T.BORDER}`,
  borderRadius: 6,
  fontSize: 12,
  color: T.TEXT1,
};

const AXIS_STYLE = { fontSize: 11, fill: T.TEXT3 };

export function InlineChart({ title, type, labels, datasets }) {
  if (!labels?.length || !datasets?.length) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      {title && (
        <p style={{
          fontSize: 10, fontWeight: 800, color: T.AMBER,
          fontFamily: 'monospace', letterSpacing: '1.5px', marginBottom: 8,
          textTransform: 'uppercase',
        }}>
          {title}
        </p>
      )}

      {type === 'pie' ? (
        <ResponsiveContainer width="100%" aspect={2}>
          <PieChart>
            <Pie
              data={buildPieData(labels, datasets)}
              dataKey="value"
              nameKey="name"
              cx="50%" cy="50%"
              outerRadius="70%"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {labels.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: T.TEXT2 }} />
          </PieChart>
        </ResponsiveContainer>
      ) : type === 'bar' ? (
        <ResponsiveContainer width="100%" aspect={2.5}>
          <BarChart data={buildData(labels, datasets)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {datasets.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: T.TEXT2 }} />}
            {datasets.map((ds, i) => (
              <Bar key={ds.label} dataKey={ds.label} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} maxBarSize={48} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        /* default: line */
        <ResponsiveContainer width="100%" aspect={2.5}>
          <LineChart data={buildData(labels, datasets)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {datasets.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: T.TEXT2 }} />}
            {datasets.map((ds, i) => (
              <Line
                key={ds.label}
                type="monotone"
                dataKey={ds.label}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: PALETTE[i % PALETTE.length] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
