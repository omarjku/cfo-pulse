import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import { AlertCircle } from 'lucide-react';
import { T } from '../../lib/tokens';

const MS_PER_DAY = 86400000;

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function buildGanttData(timelines) {
  // Separate known and unknown-period docs
  const known = timelines.filter((t) => parseDate(t.date_range_start) && parseDate(t.date_range_end));
  const unknown = timelines.filter((t) => !parseDate(t.date_range_start) || !parseDate(t.date_range_end));

  if (known.length === 0) {
    // All unknown — show them all as gray placeholders
    return {
      rows: timelines.map((t) => ({ name: t.filename, offset: 0, duration: 1, unknown: true, description: t.description })),
      minMs: 0,
      totalDays: 1,
      hasUnknown: true,
      hasOverlap: false,
    };
  }

  const allStarts = known.map((t) => parseDate(t.date_range_start).getTime());
  const allEnds = known.map((t) => parseDate(t.date_range_end).getTime());
  const minMs = Math.min(...allStarts);
  const maxMs = Math.max(...allEnds);
  const totalDays = Math.max(1, (maxMs - minMs) / MS_PER_DAY);

  // Detect overlaps — a doc overlaps if any other doc's range intersects it
  const overlapping = new Set();
  for (let i = 0; i < known.length; i++) {
    const si = parseDate(known[i].date_range_start).getTime();
    const ei = parseDate(known[i].date_range_end).getTime();
    for (let j = i + 1; j < known.length; j++) {
      const sj = parseDate(known[j].date_range_start).getTime();
      const ej = parseDate(known[j].date_range_end).getTime();
      if (si < ej && ei > sj) {
        overlapping.add(i);
        overlapping.add(j);
      }
    }
  }

  const knownRows = known.map((t, i) => {
    const start = parseDate(t.date_range_start).getTime();
    const end = parseDate(t.date_range_end).getTime();
    return {
      name: t.filename,
      offset: (start - minMs) / MS_PER_DAY,
      duration: Math.max(1, (end - start) / MS_PER_DAY),
      unknown: false,
      overlap: overlapping.has(i),
      description: t.description,
    };
  });

  const unknownRows = unknown.map((t) => ({
    name: t.filename,
    offset: 0,
    duration: totalDays,
    unknown: true,
    description: t.description,
  }));

  return {
    rows: [...knownRows, ...unknownRows],
    minMs,
    totalDays,
    hasUnknown: unknown.length > 0,
    hasOverlap: overlapping.size > 0,
  };
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div style={{
      backgroundColor: T.SURFACE2, border: `1px solid ${T.EDGE_SEP}`,
      borderRadius: 6, padding: '8px 12px', fontSize: 12, maxWidth: 240,
    }}>
      <p style={{ margin: '0 0 3px', fontWeight: 700, color: T.TEXT1 }}>{row.name}</p>
      {row.unknown
        ? <p style={{ margin: 0, color: T.TEXT3 }}>No date range detected</p>
        : <p style={{ margin: 0, color: T.TEXT2 }}>{row.description}</p>}
    </div>
  );
};

export function DocumentTimeline({ timelines }) {
  if (!timelines?.length) return null;

  const { rows, totalDays, hasUnknown, hasOverlap } = buildGanttData(timelines);
  const rowHeight = 32;
  const chartHeight = rows.length * rowHeight + 40;

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        fontSize: 9, fontWeight: 700, color: T.AMBER,
        fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        DOCUMENT TIMELINE
        {hasUnknown && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: T.AMBER_BG, border: `1px solid ${T.BORDER_A}`,
            borderRadius: 4, padding: '1px 6px', fontSize: 9, color: T.AMBER,
          }}>
            <AlertCircle size={9} /> some dates missing
          </span>
        )}
      </p>

      <div style={{
        backgroundColor: T.SURFACE2,
        border: `1px solid ${T.EDGE_SEP}`,
        borderRadius: 8, padding: '12px 8px 4px',
      }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={rows}
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="20%"
          >
            <XAxis
              type="number"
              domain={[0, totalDays]}
              tick={{ fontSize: 9, fill: T.TEXT3 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v === 0 ? '' : `+${Math.round(v)}d`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: T.TEXT2 }}
              axisLine={false}
              tickLine={false}
              width={120}
              tickFormatter={(v) => v.length > 18 ? v.slice(0, 16) + '…' : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

            {/* Invisible spacer bar — pushes the visible bar to the right start position */}
            <Bar dataKey="offset" stackId="gantt" fill="transparent" isAnimationActive={false} />

            {/* Visible duration bar */}
            <Bar dataKey="duration" stackId="gantt" radius={[3, 3, 3, 3]} isAnimationActive={false}>
              {rows.map((row, i) => (
                <Cell
                  key={i}
                  fill={
                    row.unknown
                      ? 'rgba(100,116,139,0.35)'
                      : row.overlap
                        ? T.AMBER
                        : T.SUCCESS
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p style={{ fontSize: 10, color: T.TEXT3, marginTop: 6, lineHeight: 1.5 }}>
        {hasUnknown
          ? 'Documents with gaps or no overlap may cause incomplete analysis. Gray bars = no date range detected in file.'
          : hasOverlap
            ? 'Amber bars indicate overlapping document periods — cross-period analysis available.'
            : 'Documents with gaps or no overlap may cause incomplete analysis.'}
      </p>
    </div>
  );
}
