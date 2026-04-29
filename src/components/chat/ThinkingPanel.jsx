import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { T } from '../../lib/tokens';

export function ThinkingPanel({ thinking }) {
  const [open, setOpen] = useState(false);
  if (!thinking) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.TEXT3, fontSize: 11, padding: '2px 0',
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Brain size={12} style={{ opacity: 0.6 }} />
        <span>Reasoning</span>
      </button>
      {open && (
        <div style={{
          marginTop: 6,
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.02)',
          borderLeft: `2px solid ${T.BORDER}`,
          borderRadius: 4,
          color: T.TEXT3,
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          maxHeight: 300,
          overflowY: 'auto',
        }}>
          {thinking}
        </div>
      )}
    </div>
  );
}
