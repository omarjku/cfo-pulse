import { useState, useRef } from 'react';
import { logout } from '../../lib/auth';
import { ParticleField } from '../ambient/ParticleField';
import { Sidebar } from './Sidebar';
import { ChatPanel } from '../chat/ChatPanel';
import { InputBar } from '../chat/InputBar';
import { DashboardPanel } from '../dashboard/DashboardPanel';
import { useDocuments } from '../../hooks/useDocuments';
import { useConversation } from '../../hooks/useConversation';
import { useHistory } from '../../hooks/useHistory';
import { T } from '../../lib/tokens';

export function AppShell({ user, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);
  const fileInputRef = useRef();

  const { history, save: saveHistory, remove: removeHistory } = useHistory();
  const { documents, error: docError, addDocument, removeDocument } = useDocuments();
  const { messages, streaming, analysis, send, clear, restore } = useConversation({
    onSave: (id, title, msgs, anal) => {
      setActiveConvId(id);
      saveHistory(id, title, msgs, anal);
    },
  });

  const handleSend = (text) => send({ text, documents });

  const handleAttach = () => fileInputRef.current?.click();

  const handleNewChat = () => {
    clear();
    setActiveConvId(null);
  };

  const handleLoadHistory = (item) => {
    restore(item.messages, item.analysis);
    setActiveConvId(item.id);
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const readyDocs = documents.filter((d) => d.status === 'ready');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', background: T.BG }}>
      <ParticleField />

      <input
        ref={fileInputRef} type="file" multiple hidden
        accept=".pdf,.xlsx,.xls,.csv"
        onChange={(e) => Array.from(e.target.files).forEach(addDocument)}
      />

      {/* Sidebar */}
      <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          documents={documents}
          onAddDocument={addDocument}
          onRemoveDocument={removeDocument}
          onNewChat={handleNewChat}
          onLogout={handleLogout}
          history={history}
          activeConvId={activeConvId}
          onLoadHistory={handleLoadHistory}
          onDeleteHistory={removeHistory}
          username={user}
        />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Chat panel */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRight: `1px solid ${T.BORDER}`,
        }}>
          <ChatPanel messages={messages} streaming={streaming} onSend={handleSend} />
          {docError && (
            <div style={{ padding: '4px 16px', fontSize: 11, color: T.DANGER, background: 'rgba(239,68,68,0.1)' }}>
              {docError}
            </div>
          )}
          <InputBar
            onSend={handleSend}
            onAttach={handleAttach}
            streaming={streaming}
            attachedDocs={readyDocs}
          />
        </div>

        {/* Dashboard panel */}
        <div style={{ width: 320, flexShrink: 0, overflow: 'hidden', background: T.SURFACE }}>
          <DashboardPanel analysis={analysis} />
        </div>
      </div>
    </div>
  );
}
