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
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [analysis, setAnalysis] = useState(EMPTY_ANALYSIS);

  const send = useCallback(async ({ text, documents }) => {
    if (!text.trim() || streaming) return;
    setStreaming(true);

    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    const docIds = documents.filter((d) => d.status === 'ready').map((d) => d.id);
    const documentContext = await retrieveChunks(text, docIds);

    // Only send raw PDFs on the first message — subsequent turns use conversation history.
    // Re-sending a 30-page PDF every turn burns the 30k input tokens/minute rate limit.
    const isFirstMessage = !messages.some((m) => m.role === 'assistant');
    const pdfDocuments = isFirstMessage
      ? documents
          .filter((d) => d.ext === 'pdf' && d.base64 && d.status === 'ready')
          .map((d) => ({ data: d.base64 }))
      : [];

    // Cap history to 6 messages and truncate very long assistant responses to ~4000 chars
    // to keep follow-up requests well under the per-minute token budget.
    const MAX_MSG_CHARS = 4000;
    const history = [...messages, userMsg]
      .slice(-6)
      .map(({ role, content }) => {
        const stripped = stripJsonBlock(content);
        return {
          role,
          content: stripped.length > MAX_MSG_CHARS
            ? stripped.slice(0, MAX_MSG_CHARS) + '\n\n[...analysis truncated for token efficiency...]'
            : stripped,
        };
      });

    const assistantId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    const setAssistantContent = (content) =>
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content } : m));

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, documentContext, pdfDocuments }),
      });

      // Surface HTTP-level errors immediately with clean message
      if (!response.ok) {
        const errText = await response.text();
        let friendlyMsg = `Server error ${response.status}`;
        try {
          const parsed = JSON.parse(errText);
          const msg = parsed?.error?.message || parsed?.message;
          if (msg) friendlyMsg = msg;
        } catch { /* not JSON */ }
        throw new Error(friendlyMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let lineBuffer = ''; // accumulate partial SSE lines across chunks

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Stream-decode to handle multi-byte chars correctly
        lineBuffer += decoder.decode(value, { stream: true });

        // Split by newline but keep trailing incomplete line in buffer
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? ''; // last element may be incomplete

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw);

            if (event.type === 'text') {
              fullText += event.text;
              setAssistantContent(fullText);

            } else if (event.type === 'done') {
              const json = extractJsonBlock(fullText);
              if (json) {
                setAnalysis((prev) => ({ ...prev, ...json }));
                setAssistantContent(stripJsonBlock(fullText));
              }

            } else if (event.type === 'error') {
              // Surface API-level errors — parse JSON blob if present
              let errMsg = event.message || 'Unknown error';
              try {
                const parsed = JSON.parse(errMsg);
                errMsg = parsed?.error?.message || parsed?.message || errMsg;
              } catch { /* already plain text */ }
              setAssistantContent(`⚠️ ${errMsg}`);
            }
          } catch {
            // Incomplete JSON fragment — will be retried via lineBuffer on next chunk
          }
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
      setAssistantContent(`⚠️ ${err.message}`);
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
