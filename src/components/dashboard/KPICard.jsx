import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { T } from '../../lib/tokens';

function AnimatedNumber({ value, format }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => format(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.0, ease: 'easeOut' });
    return controls.stop;
  }, [value]);

  return <motion.span>{display}</motion.span>;
}

export function KPICard({ label, value, rawValue, format, trend, trendColor, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: T.SURFACE2, border: `1px solid ${T.BORDER}`,
        borderTop: `1px solid ${T.AMBER}`,
        borderRadius: 8, padding: '10px 12px',
      }}
    >
      <p style={{ fontSize: 9, fontWeight: 700, color: T.TEXT3, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 800, color: T.TEXT1, margin: '0 0 2px', fontFamily: 'monospace' }}>
        {rawValue != null
          ? <AnimatedNumber value={rawValue} format={format} />
          : value}
      </p>
      {(trend || sub) && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {trend && <span style={{ fontSize: 10, fontWeight: 600, color: trendColor || T.SUCCESS }}>{trend}</span>}
          {sub && <span style={{ fontSize: 10, color: T.TEXT3 }}>{sub}</span>}
        </div>
      )}
    </motion.div>
  );
}
