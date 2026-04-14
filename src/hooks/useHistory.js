import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'cfo_history';
const MAX_ITEMS = 30;

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

const isUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function useHistory() {
  const [history, setHistory] = useState(load);

  // If Supabase is configured, load conversation list from DB on mount
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('conversations')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS)
      .then(({ data }) => {
        if (data?.length > 0) {
          setHistory(data.map((c) => ({
            id: c.id,
            title: c.title,
            createdAt: new Date(c.created_at).getTime(),
            // messages/analysis fetched on demand in useConversation.restore()
          })));
        }
      });
  }, []);

  const save = useCallback((id, title, messages, analysis) => {
    // Strip base64 to keep localStorage lean
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
    // Delete from Supabase when the ID is a UUID (Supabase-persisted conversation)
    if (isUUID(id) && supabase) {
      supabase.from('conversations').delete().eq('id', id).then(() => {});
    }

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
