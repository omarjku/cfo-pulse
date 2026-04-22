import { motion } from 'framer-motion';

export function StreamingCursor() {
  return (
    <motion.span
      style={{
        display: 'inline-block',
        width: 2,
        height: '1em',
        background: 'rgba(210,138,22,0.90)',
        borderRadius: 1,
        marginLeft: 2,
        verticalAlign: 'text-bottom',
      }}
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
    />
  );
}
