import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, SendHorizontal } from 'lucide-react';
import { T } from '../../lib/tokens';
import { FileTypeBadge } from '../documents/FileTypeBadge';

export function InputBar({ onSend, onAttach, streaming, attachedDocs = [] }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || streaming) return;
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
    // auto-resize
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; }
  };

  return (
    <div style={{ padding: '14px 20px', borderTop: `1px solid ${T.BORDER}`, background: 'rgba(8,9,24,0.95)', backdropFilter: 'blur(20px)' }}>
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
                background: T.SURFACE2, border: `1px solid ${T.BORDER_A}`,
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

      <motion.div
        animate={{
          boxShadow: streaming
            ? `0 0 0 1px rgba(245,158,11,0.4), 0 0 24px rgba(245,158,11,0.2)`
            : `0 0 0 1px rgba(245,158,11,0.15), 0 0 0px rgba(245,158,11,0)`,
        }}
        transition={{ duration: 0.4 }}
        style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: 'rgba(10,11,26,0.9)',
          border: `1px solid rgba(245,158,11,0.18)`,
          borderRadius: 14, padding: '10px 14px',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onClick={onAttach}
          disabled={streaming}
          style={{
            background: 'none', border: 'none', cursor: streaming ? 'not-allowed' : 'pointer',
            color: T.TEXT3, padding: 4, display: 'flex', alignItems: 'center',
            flexShrink: 0, transition: 'color 0.2s',
          }}
          onMouseEnter={e => !streaming && (e.currentTarget.style.color = T.AMBER)}
          onMouseLeave={e => e.currentTarget.style.color = T.TEXT3}
          title="Attach document"
        >
          <Paperclip size={16} />
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
            color: T.TEXT1, fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit',
            overflowY: 'auto', maxHeight: 160, padding: 0,
          }}
        />

        <motion.button
          onClick={handleSend}
          disabled={!text.trim() || streaming}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none', flexShrink: 0,
            background: text.trim() && !streaming ? T.GRAD_AMBER : T.SURFACE3,
            cursor: text.trim() && !streaming ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
            boxShadow: text.trim() && !streaming ? T.SHADOW_AMBER_SM : 'none',
          }}
        >
          <SendHorizontal size={15} color={text.trim() && !streaming ? '#05060f' : T.TEXT3} />
        </motion.button>
      </motion.div>
    </div>
  );
}
