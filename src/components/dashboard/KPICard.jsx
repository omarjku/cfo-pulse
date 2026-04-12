import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { T } from '../../lib/tokens';

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
        background: hovered
          ? 'rgba(13,14,31,0.95)'
          : 'rgba(10,11,26,0.8)',
        border: `1px solid ${hovered ? 'rgba(245,158,11,0.3)' : T.BORDER}`,
        borderRadius: 10,
        padding: '12px 14px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.2s, border-color 0.2s',
        boxShadow: hovered
          ? '0 0 20px rgba(245,158,11,0.12), 0 4px 16px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'default',
      }}
    >
      {/* Top amber gradient bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${T.AMBER}, rgba(245,158,11,0.3), transparent)`,
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 0.2s',
      }} />

      <p style={{
        fontSize: 9, fontWeight: 700, color: T.TEXT3,
        textTransform: 'uppercase', letterSpacing: '1px',
        margin: '0 0 6px', fontFamily: 'monospace',
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 20, fontWeight: 800, color: T.TEXT1,
        margin: '0 0 4px', fontFamily: 'monospace',
        letterSpacing: '-0.5px',
      }}>
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
