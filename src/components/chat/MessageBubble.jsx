import { motion } from 'framer-motion';
import { StreamingCursor } from './StreamingCursor';
import { T } from '../../lib/tokens';

function CFOAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
      background: T.GRAD_AMBER,
      boxShadow: T.SHADOW_AMBER_SM,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 800, color: '#05060f', fontFamily: 'monospace',
    }}>
      CF
    </div>
  );
}

export function MessageBubble({ role, content, isStreaming }) {
  const isAssistant = role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        display: 'flex',
        gap: 10,
        flexDirection: isAssistant ? 'row' : 'row-reverse',
        marginBottom: 16,
        alignItems: 'flex-start',
      }}
    >
      {isAssistant ? <CFOAvatar /> : (
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: T.SURFACE3, border: `1px solid ${T.BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: T.TEXT3,
        }}>
          U
        </div>
      )}

      <div style={{
        maxWidth: '78%',
        background: isAssistant
          ? 'rgba(8,9,24,0.75)'
          : T.SURFACE3,
        border: `1px solid ${isAssistant ? T.BORDER_A : T.BORDER}`,
        borderRadius: isAssistant ? '0 10px 10px 10px' : '10px 0 10px 10px',
        padding: '10px 14px',
        backdropFilter: isAssistant ? 'blur(8px)' : 'none',
        boxShadow: isAssistant ? `0 0 20px rgba(245,158,11,0.06)` : 'none',
        borderLeft: isAssistant ? `2px solid ${T.AMBER}` : undefined,
      }}>
        {isAssistant && (
          <div style={{
            fontSize: 9, fontWeight: 700, color: T.AMBER,
            fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 6,
          }}>
            CFO-PULSE
          </div>
        )}
        <p style={{
          margin: 0, fontSize: 14, lineHeight: 1.65,
          color: isAssistant ? T.TEXT1 : T.TEXT2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {content || (isStreaming && '')}
          {isAssistant && isStreaming && <StreamingCursor />}
        </p>
      </div>
    </motion.div>
  );
}
