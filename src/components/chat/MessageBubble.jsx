import { motion } from 'framer-motion';
import { StreamingCursor } from './StreamingCursor';
import { T } from '../../lib/tokens';

function CFOAvatar() {
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 34, height: 34 }}>
      {/* Glow ring */}
      <div style={{
        position: 'absolute', inset: -3, borderRadius: 10,
        background: 'conic-gradient(from 0deg, rgba(245,158,11,0.6), rgba(245,158,11,0.1), rgba(245,158,11,0.6))',
        animation: 'spin 4s linear infinite',
      }} />
      <div style={{
        position: 'relative', width: 34, height: 34, borderRadius: 9,
        background: T.GRAD_AMBER,
        boxShadow: '0 0 16px rgba(245,158,11,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 900, color: '#05060f', fontFamily: 'monospace',
        letterSpacing: '0.5px',
      }}>
        CF
      </div>
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
      background: 'linear-gradient(135deg, #1e2040, #0d0e1f)',
      border: `1px solid ${T.BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: T.TEXT2, letterSpacing: '0.5px',
    }}>
      U
    </div>
  );
}

export function MessageBubble({ role, content, isStreaming }) {
  const isAssistant = role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        gap: 12,
        flexDirection: isAssistant ? 'row' : 'row-reverse',
        marginBottom: 20,
        alignItems: 'flex-start',
      }}
    >
      {isAssistant ? <CFOAvatar /> : <UserAvatar />}

      <div style={{
        maxWidth: '76%',
        background: isAssistant
          ? 'rgba(8,9,24,0.82)'
          : 'rgba(13,14,31,0.9)',
        border: `1px solid ${isAssistant ? 'rgba(245,158,11,0.22)' : T.BORDER}`,
        borderRadius: isAssistant ? '2px 12px 12px 12px' : '12px 2px 12px 12px',
        padding: '12px 16px',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: isAssistant
          ? '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.08) inset'
          : '0 4px 16px rgba(0,0,0,0.3)',
        borderLeft: isAssistant ? `3px solid ${T.AMBER}` : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle amber shimmer top */}
        {isAssistant && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, rgba(245,158,11,0.6), rgba(245,158,11,0.1), transparent)',
          }} />
        )}

        {isAssistant && (
          <div style={{
            fontSize: 9, fontWeight: 800, color: T.AMBER,
            fontFamily: 'monospace', letterSpacing: '1.5px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            CFO-PULSE
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: T.SUCCESS, boxShadow: `0 0 6px ${T.SUCCESS}` }} />
          </div>
        )}
        <p style={{
          margin: 0, fontSize: 14, lineHeight: 1.7,
          color: isAssistant ? T.TEXT1 : T.TEXT2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontWeight: 400,
        }}>
          {content || (isStreaming && '')}
          {isAssistant && isStreaming && <StreamingCursor />}
        </p>
      </div>
    </motion.div>
  );
}
