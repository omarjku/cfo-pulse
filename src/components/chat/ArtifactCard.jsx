import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { T, metalBg } from '../../lib/tokens';

/**
 * artifacts: Array<{ url: string, format: 'xlsx'|'pdf', title: string }>
 */
export function ArtifactCards({ artifacts }) {
  if (!artifacts?.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
      {artifacts.map((a, i) => (
        <a
          key={i}
          href={a.url}
          download={`${a.title}.${a.format}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px',
            borderRadius: 6,
            ...metalBg(3),
            border: `1px solid ${T.BORDER_A}`,
            textDecoration: 'none',
            color: T.TEXT1,
            transition: 'border-color 0.15s',
          }}
        >
          {a.format === 'xlsx'
            ? <FileSpreadsheet size={16} color={T.AMBER} />
            : <FileText size={16} color={T.AMBER} />}
          <span style={{ fontSize: 13, flex: 1 }}>{a.title}.{a.format}</span>
          <Download size={14} color={T.TEXT3} />
        </a>
      ))}
    </div>
  );
}
