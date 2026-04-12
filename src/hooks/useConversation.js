import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { retrieveChunks } from './useRAG';

const EMPTY_ANALYSIS = {
  healthScore: 0,
  income: { revenue: 0, cogs: 0, opex: 0, da: 0, interest: 0, tax: 0 },
  balance: { cash: 0, receivables: 0, inventory: 0, otherCurrent: 0, ppe: 0, otherLongTerm: 0, payables: 0, shortTermDebt: 0, otherCurrentLiab: 0, longTermDebt: 0, equity: 0 },
  cashFlow: { operating: 0, investing: 0, financing: 0 },
  prior: { revenue: 0, cash: 0, ebitda: 0 },
  monthlyTrend: [],
  analysis: null,
};

function extractJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function stripJsonBlock(text) {
  return text.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
}

export function useConversation() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);      // [{ role, content, id }]
  const [streaming, setStreaming] = useState(false);
  const [analysis, setAnalysis] = useState(EMPTY_ANALYSIS);

  const send = useCallback(async ({ text, documents }) => {
    if (!text.trim() || streaming) return;
    setStreaming(true);

    // Build user message
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    // RAG: retrieve relevant chunks
    const docIds = documents.filter((d) => d.status === 'ready').map((d) => d.id);
    const documentContext = await retrieveChunks(text, docIds);

    // PDF documents for vision
    const pdfDocuments = documents
      .filter((d) => d.ext === 'pdf' && d.base64 && d.status === 'ready')
      .map((d) => ({ data: d.base64 }));

    // Build messages array (last 10 to avoid context overflow)
    const history = [...messages, userMsg]
      .slice(-10)
      .map(({ role, content }) => ({ role, content: stripJsonBlock(content) }));

    // Add placeholder assistant message
    const assistantId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, documentContext, pdfDocuments }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'text') {
              fullText += event.text;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m)
              );
            } else if (event.type === 'done') {
              // Extract JSON block for dashboard
              const json = extractJsonBlock(fullText);
              if (json) {
                setAnalysis((prev) => ({ ...prev, ...json }));
                // Strip JSON from displayed message
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantId ? { ...m, content: stripJsonBlock(fullText) } : m)
                );
              }
            }
          } catch { /* ignore parse errors on incomplete chunks */ }
        }
      }

      // Persist to Supabase
      if (supabase) {
        let cid = conversationId;
        if (!cid) {
          const { data } = await supabase
            .from('conversations')
            .insert({ title: text.slice(0, 60) })
            .select('id')
            .single();
          if (data) { cid = data.id; setConversationId(cid); }
        }
        if (cid) {
          await supabase.from('messages').insert([
            { conversation_id: cid, role: 'user', content: text },
            { conversation_id: cid, role: 'assistant', content: stripJsonBlock(fullText) },
          ]);
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId
          ? { ...m, content: `Error: ${err.message}` }
          : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, conversationId]);

  const clear = () => {
    setMessages([]);
    setConversationId(null);
    setAnalysis(EMPTY_ANALYSIS);
  };

  return { messages, streaming, analysis, send, clear };
}
