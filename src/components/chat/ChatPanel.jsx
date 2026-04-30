import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { T, metalBg } from '../../lib/tokens';

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
      {/* Logo mark */}
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        ...metalBg(3),
        border: `1px solid ${T.EDGE_SEP}`,
        boxShadow: T.MACHINED,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 22, height: 22,
          background: T.AMBER,
          clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
        }} />
      </div>

      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <p style={{
          color: T.TEXT2, fontWeight: 600, fontSize: 15,
          margin: '0 0 7px',
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '1px', textTransform: 'uppercase',
        }}>
          CFO-Pulse ready
        </p>
        <p style={{ color: T.TEXT3, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          Upload financial documents from the sidebar,<br />then ask anything about your numbers.
        </p>
      </div>

      {/* Suggestion chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 7,
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
              ...metalBg(2),
              border: `1px solid ${T.EDGE_SEP}`,
              boxShadow: `inset 0 1px 0 ${T.EDGE_HI}, 0 1px 3px rgba(0,0,0,0.3)`,
              borderRadius: 100, padding: '5px 13px',
              fontSize: 11, color: T.TEXT3, cursor: 'pointer',
              fontFamily: "'Figtree', sans-serif",
              transition: 'color 0.15s, background-color 0.12s',
            }}
            whileHover={{ backgroundColor: T.SURFACE4, color: T.TEXT2, scale: 1.02 }}
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', ...metalBg(2) }}>
      {messages.length === 0 ? (
        <EmptyState onSend={onSend} />
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
              thinking={msg.thinking ?? null}
              citations={msg.citations ?? null}
              artifacts={msg.artifacts ?? null}
              toolStatus={msg.toolStatus ?? null}
            />
          ))}
        </AnimatePresence>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
