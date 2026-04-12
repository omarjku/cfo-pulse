import { useState, useCallback } from 'react';

const STORAGE_KEY = 'cfo_history';
const MAX_ITEMS = 30;

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function useHistory() {
  const [history, setHistory] = useState(load);

  const save = useCallback((id, title, messages, analysis) => {
    // Strip base64 from saved messages to keep localStorage lean
    const cleanMessages = messages.map((m) => ({ ...m, docIds: undefined }));
    const item = { id, title, createdAt: Date.now(), messages: cleanMessages, analysis };

    setHistory((prev) => {
      const without = prev.filter((h) => h.id !== id);
      const next = [item, ...without].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage full */ }
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, save, remove, clear };
}
