import { motion } from 'framer-motion';
import { T } from '../../lib/tokens';

export function HealthGauge({ score }) {
  const color = score >= 70 ? T.SUCCESS : score >= 40 ? T.WARNING : T.DANGER;
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical';
  const rad = Math.PI - (score / 100) * Math.PI;
  const ex = 90 + 70 * Math.cos(rad);
  const ey = 90 - 70 * Math.sin(rad);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 180 110" width="160" height="98">
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke={T.BORDER} strokeWidth="12" strokeLinecap="round" />
        {score > 0 && (
          <motion.path
            d={`M 20 90 A 70 70 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`}
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        )}
        <text x="90" y="84" textAnchor="middle" fontSize="24" fontWeight="800" fill={T.TEXT1}>
          {score}
        </text>
        <text x="90" y="98" textAnchor="middle" fontSize="9" fill={T.TEXT3}>/ 100</text>
      </svg>
      <span style={{ fontSize: 11, fontWeight: 600, color, marginTop: -4 }}>{label}</span>
    </div>
  );
}
