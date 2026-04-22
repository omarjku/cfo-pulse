import { motion } from 'framer-motion';
import { T } from '../../lib/tokens';

export function ActionsList({ actions }) {
  if (!actions?.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{
        fontSize: 9, fontWeight: 700, color: T.AMBER,
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: '2.5px', textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        RECOMMENDED ACTIONS
      </p>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {actions.map((action, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0,
              background: T.AMBER_BG, border: `1px solid ${T.BORDER_A}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: T.AMBER,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 12, color: T.TEXT2, lineHeight: 1.55, paddingTop: 2 }}>{action}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
