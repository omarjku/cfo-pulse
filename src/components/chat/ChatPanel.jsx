import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { T } from '../../lib/tokens';

const SUGGESTIONS = [
  'What is my burn rate?',
  'Analyze cash flow trends',
  'What are my biggest risks?',
  'Compare to industry benchmarks',
];

function EmptyState({ onSend }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 20, padding: 40,
    }}>
      {/* Avatar with animated glow ring */}
      <div style={{ position: 'relative' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', inset: -5, borderRadius: 18,
            background: 'conic-gradient(from 0deg, rgba(245,158,11,0.5), transparent, rgba(245,158,11,0.5))',
          }}
        />
        <div style={{
          position: 'relative',
          width: 64, height: 64, borderRadius: 16,
          background: T.GRAD_AMBER,
          boxShadow: '0 0 30px rgba(245,158,11,0.5), 0 0 60px rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 900, color: '#05060f', fontFamily: 'monospace',
          letterSpacing: '1px',
        }}>
          CF
        </div>
      </div>

      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{
          color: T.TEXT1, fontWeight: 700, fontSize: 17,
          margin: '0 0 8px', letterSpacing: '-0.3px',
        }}>
          CFO-Pulse is ready
        </p>
        <p style={{ color: T.TEXT3, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          Upload financial documents from the sidebar,<br />then ask anything about your numbers.
        </p>
      </div>

      {/* Suggestion chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8,
        justifyContent: 'center', marginTop: 4, maxWidth: 380,
      }}>
        {SUGGESTIONS.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
            onClick={() => onSend(s)}
            style={{
              background: 'rgba(10,11,26,0.8)',
              border: `1px solid ${T.BORDER}`,
              borderRadius: 20, padding: '6px 14px',
              fontSize: 12, color: T.TEXT2,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            whileHover={{ borderColor: 'rgba(245,158,11,0.35)', color: T.TEXT1, scale: 1.02 }}
          >
            {s}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ChatPanel({ messages, streaming, onSend }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      {messages.length === 0 ? (
        <EmptyState onSend={onSend} />
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              rich={msg.rich ?? null}
              isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
        </AnimatePresence>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
