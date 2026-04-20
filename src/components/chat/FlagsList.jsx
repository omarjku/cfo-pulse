import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { T } from '../../lib/tokens';

const DANGER_BG = 'rgba(239,68,68,0.08)';
const DANGER_BORDER = 'rgba(239,68,68,0.2)';

export function FlagsList({ flags }) {
  if (!flags?.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{
        fontSize: 10, fontWeight: 800, color: T.DANGER,
        fontFamily: 'monospace', letterSpacing: '1.5px',
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <AlertTriangle size={11} /> RISKS &amp; FLAGS
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {flags.map((flag, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: DANGER_BG,
              border: `1px solid ${DANGER_BORDER}`,
              borderRadius: 6, padding: '7px 10px',
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: T.DANGER, flexShrink: 0, marginTop: 4,
            }} />
            <span style={{ fontSize: 13, color: T.TEXT2, lineHeight: 1.55 }}>{flag}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
