import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { T } from '../../lib/tokens';

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 12, padding: 32,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: T.GRAD_AMBER, boxShadow: T.SHADOW_AMBER,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 800, color: '#05060f', fontFamily: 'monospace',
      }}>
        CF
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: T.TEXT1, fontWeight: 600, fontSize: 15, margin: '0 0 6px' }}>
          CFO-Pulse is ready
        </p>
        <p style={{ color: T.TEXT3, fontSize: 13, margin: 0, maxWidth: 280, lineHeight: 1.5 }}>
          Upload financial documents from the sidebar, then ask anything about your numbers.
        </p>
      </div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8,
      }}>
        {[
          'What is my burn rate?',
          'Analyze cash flow trends',
          'What are my biggest risks?',
          'Compare to industry benchmarks',
        ].map((suggestion) => (
          <div key={suggestion} style={{
            background: T.SURFACE2, border: `1px solid ${T.BORDER}`,
            borderRadius: 8, padding: '5px 10px', fontSize: 11, color: T.TEXT3,
            cursor: 'default',
          }}>
            {suggestion}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatPanel({ messages, streaming }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '16px 20px',
    }}>
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
        </AnimatePresence>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
