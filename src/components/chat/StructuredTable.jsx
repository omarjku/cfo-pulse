import { T } from '../../lib/tokens';

export function StructuredTable({ title, headers, rows }) {
  if (!headers?.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      {title && (
        <p style={{
          fontSize: 9, fontWeight: 700, color: T.AMBER,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '2.5px', marginBottom: 6,
          textTransform: 'uppercase',
        }}>
          {title}
        </p>
      )}
      <div style={{ overflowX: 'auto', borderRadius: 6, border: `1px solid ${T.EDGE_SEP}` }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', minWidth: 300 }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{
                  padding: '7px 12px',
                  background: T.AMBER_BG,
                  borderBottom: `1px solid ${T.EDGE_SEP}`,
                  color: T.AMBER,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  textAlign: 'left', fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : T.SURFACE2 }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '6px 12px',
                    borderBottom: ri < rows.length - 1 ? `1px solid ${T.EDGE_SEP}` : 'none',
                    color: T.TEXT2, fontSize: 13,
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
