import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MessageSquare, Plus } from 'lucide-react';
import { UploadZone } from '../documents/UploadZone';
import { DocumentLibrary } from '../documents/DocumentLibrary';
import { T } from '../../lib/tokens';

export function Sidebar({ collapsed, onToggle, documents, onAddDocument, onRemoveDocument, onNewChat }) {
  return (
    <motion.div
      animate={{ width: collapsed ? 52 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        height: '100%', background: T.SURFACE, borderRight: `1px solid ${T.BORDER}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, position: 'relative',
      }}
    >
      {/* Logo + collapse toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '14px 0' : '14px 12px',
        borderBottom: `1px solid ${T.BORDER}`, flexShrink: 0,
      }}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 6, background: T.GRAD_AMBER,
                boxShadow: T.SHADOW_AMBER_SM, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#05060f', fontFamily: 'monospace',
              }}>CF</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.AMBER, fontFamily: 'monospace', letterSpacing: '1px' }}>
                CFO-PULSE
              </span>
            </motion.div>
          )}
          {collapsed && (
            <motion.div
              key="logo-icon"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                width: 24, height: 24, borderRadius: 6, background: T.GRAD_AMBER,
                boxShadow: T.SHADOW_AMBER_SM,
              }}
            />
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          style={{
            background: 'none', border: `1px solid ${T.BORDER}`, borderRadius: 5,
            cursor: 'pointer', color: T.TEXT3, padding: 3, display: 'flex',
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.AMBER; e.currentTarget.style.borderColor = T.BORDER_A; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.TEXT3; e.currentTarget.style.borderColor = T.BORDER; }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {/* New Chat */}
            <button
              onClick={onNewChat}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: T.SURFACE2,
                border: `1px solid ${T.BORDER}`, borderRadius: 6, padding: '7px 10px',
                cursor: 'pointer', color: T.TEXT2, fontSize: 11, width: '100%',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.BORDER_A; e.currentTarget.style.color = T.AMBER; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.BORDER; e.currentTarget.style.color = T.TEXT2; }}
            >
              <Plus size={11} /> New Chat
            </button>

            {/* Documents section */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: T.TEXT3, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 6px', fontFamily: 'monospace' }}>
                DOCUMENTS
              </p>
              <UploadZone onFiles={onAddDocument} />
              {documents.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <DocumentLibrary documents={documents} onRemove={onRemoveDocument} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed: icon-only actions */}
      {collapsed && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 8 }}>
          <button
            onClick={onNewChat}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.TEXT3, padding: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = T.AMBER}
            onMouseLeave={e => e.currentTarget.style.color = T.TEXT3}
            title="New Chat"
          >
            <MessageSquare size={16} />
          </button>
          <button
            onClick={() => document.querySelector('input[type=file]')?.click()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.TEXT3, padding: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = T.AMBER}
            onMouseLeave={e => e.currentTarget.style.color = T.TEXT3}
            title="Upload document"
          >
            <Plus size={16} />
          </button>
          {documents.slice(0, 5).map((doc) => (
            <div key={doc.id} style={{ width: 8, height: 8, borderRadius: 2, background: doc.status === 'ready' ? '#22c55e' : T.BORDER }} title={doc.name} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
