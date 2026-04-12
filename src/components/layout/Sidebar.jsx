import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Trash2, LogOut } from 'lucide-react';
import { UploadZone } from '../documents/UploadZone';
import { DocumentLibrary } from '../documents/DocumentLibrary';
import { T } from '../../lib/tokens';

function HistoryItem({ item, active, onLoad, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const date = new Date(item.createdAt);
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        borderRadius: 5,
        background: active ? 'rgba(245,158,11,0.08)' : hovered ? T.SURFACE2 : 'transparent',
        border: active ? `1px solid ${T.BORDER_A}` : '1px solid transparent',
        transition: 'background 0.15s, border-color 0.15s',
        cursor: 'pointer',
        padding: '5px 7px',
      }}
    >
      <div
        onClick={() => onLoad(item)}
        style={{ flex: 1, minWidth: 0 }}
      >
        <p style={{
          fontSize: 11, color: active ? T.AMBER : T.TEXT2,
          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.title || 'Untitled'}
        </p>
        <p style={{ fontSize: 9, color: T.TEXT3, margin: 0, fontFamily: 'monospace' }}>{label}</p>
      </div>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.TEXT3, padding: 2, flexShrink: 0, display: 'flex' }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.DANGER}
          onMouseLeave={(e) => e.currentTarget.style.color = T.TEXT3}
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}

export function Sidebar({
  collapsed, onToggle,
  documents, onAddDocument, onRemoveDocument,
  onNewChat, onLogout,
  history, activeConvId, onLoadHistory, onDeleteHistory,
  username,
}) {
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
          onMouseEnter={(e) => { e.currentTarget.style.color = T.AMBER; e.currentTarget.style.borderColor = T.BORDER_A; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.TEXT3; e.currentTarget.style.borderColor = T.BORDER; }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Expanded sidebar content */}
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
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.BORDER_A; e.currentTarget.style.color = T.AMBER; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.BORDER; e.currentTarget.style.color = T.TEXT2; }}
            >
              <Plus size={11} /> New Chat
            </button>

            {/* Conversation history */}
            {history.length > 0 && (
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: T.TEXT3, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 5px', fontFamily: 'monospace' }}>
                  HISTORY
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {history.map((item) => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      active={item.id === activeConvId}
                      onLoad={onLoadHistory}
                      onDelete={onDeleteHistory}
                    />
                  ))}
                </div>
              </div>
            )}

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
            onMouseEnter={(e) => e.currentTarget.style.color = T.AMBER}
            onMouseLeave={(e) => e.currentTarget.style.color = T.TEXT3}
            title="New Chat"
          >
            <MessageSquare size={16} />
          </button>
          <button
            onClick={() => document.querySelector('input[type=file]')?.click()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.TEXT3, padding: 6 }}
            onMouseEnter={(e) => e.currentTarget.style.color = T.AMBER}
            onMouseLeave={(e) => e.currentTarget.style.color = T.TEXT3}
            title="Upload document"
          >
            <Plus size={16} />
          </button>
          {documents.slice(0, 5).map((doc) => (
            <div key={doc.id} style={{ width: 8, height: 8, borderRadius: 2, background: doc.status === 'ready' ? '#22c55e' : T.BORDER }} title={doc.name} />
          ))}
        </div>
      )}

      {/* Footer: user + logout */}
      <div style={{
        borderTop: `1px solid ${T.BORDER}`, padding: collapsed ? '10px 0' : '8px 10px',
        flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <span style={{ fontSize: 10, color: T.TEXT3, fontFamily: 'monospace' }}>
            {username}
          </span>
        )}
        <button
          onClick={onLogout}
          title="Sign out"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.TEXT3, padding: 4, display: 'flex' }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.DANGER}
          onMouseLeave={(e) => e.currentTarget.style.color = T.TEXT3}
        >
          <LogOut size={13} />
        </button>
      </div>
    </motion.div>
  );
}
