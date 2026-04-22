import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Trash2, LogOut } from 'lucide-react';
import { UploadZone } from '../documents/UploadZone';
import { DocumentLibrary } from '../documents/DocumentLibrary';
import { T, metalBg } from '../../lib/tokens';

const LABEL_STYLE = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 8, fontWeight: 700,
  letterSpacing: '3px', textTransform: 'uppercase',
  color: T.TEXT4, margin: '0 0 4px',
};

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
        background: active ? 'rgba(255,255,255,0.055)' : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: active ? `1px solid ${T.EDGE_SEP}` : '1px solid transparent',
        boxShadow: active ? T.MACHINED_SM : 'none',
        transition: 'background 0.12s, border-color 0.12s',
        cursor: 'pointer',
        padding: '5px 7px',
      }}
    >
      <div style={{ width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
        background: active ? T.AMBER : T.TEXT4,
        boxShadow: active ? `0 0 4px rgba(210,138,22,0.4)` : 'none',
      }} />
      <div onClick={() => onLoad(item)} style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 11, color: active ? T.TEXT2 : T.TEXT3,
          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: "'Figtree', sans-serif",
        }}>
          {item.title || 'Untitled'}
        </p>
        <p style={{
          fontSize: 9, color: T.TEXT4, margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{label}</p>
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
        height: '100%',
        ...metalBg(1),
        borderRight: `1px solid ${T.EDGE_SEP}`,
        boxShadow: `inset -1px 0 0 rgba(0,0,0,0.3), 1px 0 0 ${T.EDGE_HI}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, position: 'relative',
      }}
    >
      {/* Logo + collapse toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '14px 0' : '14px 12px',
        borderBottom: `1px solid ${T.EDGE_SEP}`,
        boxShadow: `inset 0 1px 0 ${T.EDGE_HI}, 0 1px 0 rgba(0,0,0,0.2)`,
        flexShrink: 0,
      }}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 9 }}
            >
              {/* Hex mark */}
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: T.AMBER_BG,
                border: `1px solid ${T.BORDER_A}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.4)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 11, height: 11,
                  background: T.AMBER,
                  clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
                }} />
              </div>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 13, fontWeight: 700,
                letterSpacing: '2px', textTransform: 'uppercase',
                color: T.TEXT2,
              }}>
                CFO-PULSE
              </span>
            </motion.div>
          )}
          {collapsed && (
            <motion.div
              key="logo-icon"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                width: 26, height: 26, borderRadius: 6,
                background: T.AMBER_BG, border: `1px solid ${T.BORDER_A}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.4)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{
                width: 11, height: 11, background: T.AMBER,
                clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
              }} />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${T.EDGE_SEP}`,
            boxShadow: T.MACHINED_SM,
            borderRadius: 5, cursor: 'pointer',
            color: T.TEXT3, padding: 3, display: 'flex',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.TEXT2}
          onMouseLeave={(e) => e.currentTarget.style.color = T.TEXT3}
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
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${T.EDGE_SEP}`,
                boxShadow: T.MACHINED_SM,
                borderRadius: 6, padding: '7px 10px',
                cursor: 'pointer', color: T.TEXT3, fontSize: 12,
                fontFamily: "'Figtree', sans-serif",
                width: '100%', transition: 'color 0.15s, background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = T.TEXT2; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = T.TEXT3; }}
            >
              <Plus size={11} /> New Chat
            </button>

            {/* Conversation history */}
            {history.length > 0 && (
              <div>
                <p style={LABEL_STYLE}>History</p>
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
              <p style={LABEL_STYLE}>Documents</p>
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
            onMouseEnter={(e) => e.currentTarget.style.color = T.TEXT2}
            onMouseLeave={(e) => e.currentTarget.style.color = T.TEXT3}
            title="New Chat"
          >
            <MessageSquare size={16} />
          </button>
          <button
            onClick={() => document.querySelector('input[type=file]')?.click()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.TEXT3, padding: 6 }}
            onMouseEnter={(e) => e.currentTarget.style.color = T.TEXT2}
            onMouseLeave={(e) => e.currentTarget.style.color = T.TEXT3}
            title="Upload document"
          >
            <Plus size={16} />
          </button>
          {documents.slice(0, 5).map((doc) => (
            <div key={doc.id} style={{
              width: 8, height: 8, borderRadius: 2,
              background: doc.status === 'ready' ? T.SUCCESS : T.EDGE_SEP,
            }} title={doc.name} />
          ))}
        </div>
      )}

      {/* Footer: user + logout */}
      <div style={{
        borderTop: `1px solid ${T.EDGE_SEP}`,
        boxShadow: `0 -1px 0 rgba(0,0,0,0.2)`,
        padding: collapsed ? '10px 0' : '8px 10px',
        flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <span style={{
            fontSize: 10, color: T.TEXT3,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
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
