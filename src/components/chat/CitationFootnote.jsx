import { T } from '../../lib/tokens';

/**
 * citations: Array<{ document_title?: string, page_number?: number, cited_text?: string }>
 */
export function CitationFootnotes({ citations }) {
  if (!citations?.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
      {citations.map((c, i) => (
        <span
          key={i}
          title={c.cited_text || ''}
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 3,
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: T.AMBER,
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          {c.document_title || 'Source'}{c.page_number ? ` p.${c.page_number}` : ''}
        </span>
      ))}
    </div>
  );
}
