import { motion } from 'framer-motion';
import { T } from '../../lib/tokens';

export function ActionsList({ actions }) {
  if (!actions?.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{
        fontSize: 10, fontWeight: 800, color: T.AMBER,
        fontFamily: 'monospace', letterSpacing: '1.5px', marginBottom: 8,
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
              background: 'rgba(245,158,11,0.15)', border: `1px solid rgba(245,158,11,0.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: T.AMBER, fontFamily: 'monospace',
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 13, color: T.TEXT1, lineHeight: 1.55, paddingTop: 2 }}>{action}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
