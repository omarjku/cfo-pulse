import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Loader } from 'lucide-react';
import { T } from '../../lib/tokens';

const EXT_COLORS = { pdf: '#ef4444', xlsx: '#22c55e', xls: '#22c55e', csv: '#3b82f6' };

function fmtSize(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)}KB`
    : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function DocumentLibrary({ documents, onRemove }) {
  if (documents.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <AnimatePresence>
        {documents.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: T.SURFACE2, border: `1px solid ${T.EDGE_SEP}`,
              borderRadius: 6, padding: '5px 8px',
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: 1, flexShrink: 0,
              background: EXT_COLORS[doc.ext] || T.TEXT3,
            }} />
            <span style={{
              flex: 1, fontSize: 10, color: T.TEXT2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {doc.name}
            </span>
            {doc.status === 'processing' && (
              <Loader size={10} color={T.AMBER} style={{ animation: 'spin 1s linear infinite' }} />
            )}
            {doc.status === 'ready' && (
              <span style={{ fontSize: 9, color: T.SUCCESS }}>✓</span>
            )}
            {doc.status === 'error' && (
              <span style={{ fontSize: 9, color: T.DANGER }}>!</span>
            )}
            <button
              onClick={() => onRemove(doc.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.TEXT3, display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = T.DANGER}
              onMouseLeave={e => e.currentTarget.style.color = T.TEXT3}
            >
              <Trash2 size={10} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
