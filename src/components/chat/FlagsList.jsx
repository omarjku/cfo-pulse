import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { T } from '../../lib/tokens';

export function FlagsList({ flags }) {
  if (!flags?.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{
        fontSize: 9, fontWeight: 700, color: T.DANGER,
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: '2.5px', textTransform: 'uppercase',
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <AlertTriangle size={10} /> RISKS &amp; FLAGS
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {flags.map((flag, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: T.DANGER_BG,
              border: `1px solid ${T.DANGER_BD}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
              borderRadius: 5, padding: '6px 9px',
            }}
          >
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: T.DANGER, flexShrink: 0, marginTop: 4,
            }} />
            <span style={{ fontSize: 12, color: T.TEXT2, lineHeight: 1.55 }}>{flag}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
