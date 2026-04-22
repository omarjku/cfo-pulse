import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, SendHorizontal } from 'lucide-react';
import { T, metalBg } from '../../lib/tokens';
import { FileTypeBadge } from '../documents/FileTypeBadge';

export function InputBar({ onSend, onAttach, streaming, attachedDocs = [] }) {
  const [text, setText] = useState('');
  const [sendHovered, setSendHovered] = useState(false);
  const [sendActive, setSendActive] = useState(false);
  const textareaRef = useRef(null);

  const canSend = !!text.trim() && !streaming;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; }
  };

  // Machined send button shadow states
  const sendShadow = sendActive
    ? 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,0,0,0.2)'
    : sendHovered
      ? `inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.5)`
      : `inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.5)`;

  const sendBg = sendActive ? T.SURFACE : sendHovered ? T.SURFACE5 : T.SURFACE4;

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: `1px solid ${T.EDGE_SEP}`,
      boxShadow: `inset 0 1px 0 ${T.EDGE_HI}, 0 -1px 0 rgba(0,0,0,0.2)`,
      ...metalBg(1),
    }}>
      {/* Attached doc chips */}
      <AnimatePresence>
        {attachedDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}
          >
            {attachedDocs.map((doc) => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                ...metalBg(3),
                border: `1px solid ${T.BORDER_A}`,
                boxShadow: T.MACHINED_SM,
                borderRadius: 6, padding: '3px 8px', fontSize: 11, color: T.AMBER,
              }}>
                <Paperclip size={10} />
                <FileTypeBadge ext={doc.ext} />
                <span style={{ color: T.TEXT2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <motion.div
        animate={{
          boxShadow: streaming
            ? `inset 0 1px 0 ${T.EDGE_HI}, 0 0 0 1px ${T.BORDER_A}`
            : `inset 0 1px 0 ${T.EDGE_HI}`,
        }}
        transition={{ duration: 0.35 }}
        style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          ...metalBg(2),
          border: `1px solid ${T.EDGE_SEP}`,
          borderRadius: 10, padding: '8px 12px',
        }}
      >
        {/* Attach button */}
        <button
          onClick={onAttach}
          disabled={streaming}
          style={{
            ...metalBg(3),
            border: `1px solid ${T.EDGE_SEP}`,
            boxShadow: T.MACHINED_SM,
            borderRadius: 7, width: 30, height: 30,
            cursor: streaming ? 'not-allowed' : 'pointer',
            color: T.TEXT4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'color 0.15s',
          }}
          onMouseEnter={e => !streaming && (e.currentTarget.style.color = T.TEXT3)}
          onMouseLeave={e => e.currentTarget.style.color = T.TEXT4}
          title="Attach document"
        >
          <Paperclip size={13} />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKey}
          disabled={streaming}
          placeholder="Ask CFO-Pulse anything about your financials..."
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none',
            color: T.TEXT2, fontSize: 13, lineHeight: 1.5,
            fontFamily: "'Figtree', sans-serif",
            overflowY: 'auto', maxHeight: 160, padding: 0,
          }}
        />

        {/* Machined send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          onMouseEnter={() => setSendHovered(true)}
          onMouseLeave={() => { setSendHovered(false); setSendActive(false); }}
          onMouseDown={() => setSendActive(true)}
          onMouseUp={() => setSendActive(false)}
          style={{
            height: 32, minWidth: 32, padding: '0 12px',
            borderRadius: 7, flexShrink: 0,
            backgroundColor: sendBg,
            border: `1px solid rgba(255,255,255,0.09)`,
            borderBottomColor: 'rgba(0,0,0,0.4)',
            boxShadow: sendShadow,
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'Figtree', sans-serif",
            fontSize: 12, fontWeight: 500,
            color: canSend ? T.TEXT2 : T.TEXT4,
            cursor: canSend ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.12s, color 0.12s',
          }}
        >
          <SendHorizontal size={13} style={{ opacity: canSend ? 0.75 : 0.3 }} />
        </button>
      </motion.div>
    </div>
  );
}
