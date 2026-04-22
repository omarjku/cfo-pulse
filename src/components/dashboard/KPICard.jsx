import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { T, metalBg } from '../../lib/tokens';

function AnimatedNumber({ value, format }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.2, ease: 'easeOut' });
    return controls.stop;
  }, [value]);
  return <motion.span>{display}</motion.span>;
}

export function KPICard({ label, value, rawValue, format, trend, trendColor, sub }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...metalBg(hovered ? 4 : 3),
        border: `1px solid ${T.EDGE_SEP}`,
        borderRadius: 8, padding: '10px 12px',
        boxShadow: hovered ? T.MACHINED : T.MACHINED_SM,
        transition: 'box-shadow 0.2s',
        cursor: 'default',
      }}
    >
      <p style={{
        fontSize: 8, fontWeight: 700, color: T.TEXT4,
        textTransform: 'uppercase', letterSpacing: '2px',
        margin: '0 0 5px',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 18, fontWeight: 500, color: T.TEXT1,
        margin: '0 0 3px',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '-0.5px',
      }}>
        {rawValue != null ? <AnimatedNumber value={rawValue} format={format} /> : value}
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
