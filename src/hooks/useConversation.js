import { useState, useRef, useCallback } from 'react';
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

// Each conversation gets a unique ID generated on the first send
function newConvId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function useConversation({ onSave } = {}) {
  const [supabaseConvId, setSupabaseConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [analysis, setAnalysis] = useState(EMPTY_ANALYSIS);

  // Tracks which doc IDs have already been sent as raw PDFs — avoids re-sending each turn
  const sentDocIdsRef = useRef(new Set());
  // Stable conversation ID for history (created on first send, reset on clear)
  const convIdRef = useRef(null);

  const send = useCallback(async ({ text, documents }) => {
    if (!text.trim() || streaming) return;
    setStreaming(true);

    if (!convIdRef.current) convIdRef.current = newConvId();

    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    const docIds = documents.filter((d) => d.status === 'ready').map((d) => d.id);
    const documentContext = await retrieveChunks(text, docIds);

    // New PDFs not yet seen by Claude — send raw for accurate first-read
    const newPdfDocs = documents.filter(
      (d) => d.ext === 'pdf' && d.base64 && d.status === 'ready' && !sentDocIdsRef.current.has(d.id)
    );

    // Condensed summaries for PDFs already sent — cheap follow-up context
    const existingSummaries = documents
      .filter((d) => d.status === 'ready' && d.summary && sentDocIdsRef.current.has(d.id))
      .map((d) => d.summary);

    // Cap history to 6 messages and strip the JSON dashboard block from assistant content
    // to keep follow-up requests well under the per-minute token budget
    const MAX_MSG_CHARS = 3000;
    const history = [...messages, userMsg]
      .slice(-6)
      .map(({ role, content }) => {
        const stripped = stripJsonBlock(content);
        return {
          role,
          content: stripped.length > MAX_MSG_CHARS
            ? stripped.slice(0, MAX_MSG_CHARS) + '\n\n[...truncated]'
            : stripped,
        };
      });

    const assistantId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    const setAssistantContent = (content) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content } : m)));

    // Mark new PDFs as sent before the request
    newPdfDocs.forEach((d) => sentDocIdsRef.current.add(d.id));

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          documentContext,
          pdfDocuments: newPdfDocs.map((d) => ({ data: d.base64 })),
          documentSummaries: existingSummaries,
        }),
      });

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
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

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
              let errMsg = event.message || 'Unknown error';
              try {
                const parsed = JSON.parse(errMsg);
                errMsg = parsed?.error?.message || parsed?.message || errMsg;
              } catch { /* plain text */ }
              setAssistantContent(`Error: ${errMsg}`);
            }
          } catch { /* partial JSON fragment — next chunk will complete it */ }
        }
      }

      // Persist to Supabase
      if (supabase) {
        let cid = supabaseConvId;
        if (!cid) {
          const { data } = await supabase
            .from('conversations')
            .insert({ title: text.slice(0, 60) })
            .select('id')
            .single();
          if (data) { cid = data.id; setSupabaseConvId(cid); }
        }
        if (cid) {
          await supabase.from('messages').insert([
            { conversation_id: cid, role: 'user', content: text },
            { conversation_id: cid, role: 'assistant', content: stripJsonBlock(fullText) },
          ]);
        }
      }

      // Save to local history
      if (onSave) {
        const finalMessages = [...messages, userMsg, { id: assistantId, role: 'assistant', content: stripJsonBlock(fullText) }];
        onSave(convIdRef.current, text.slice(0, 60), finalMessages, analysis);
      }

    } catch (err) {
      newPdfDocs.forEach((d) => sentDocIdsRef.current.delete(d.id));
      setAssistantContent(`Error: ${err.message}`);
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, supabaseConvId, analysis, onSave]);

  const clear = () => {
    setMessages([]);
    setSupabaseConvId(null);
    setAnalysis(EMPTY_ANALYSIS);
    sentDocIdsRef.current = new Set();
    convIdRef.current = null;
  };

  const restore = (savedMessages, savedAnalysis) => {
    setMessages(savedMessages);
    setAnalysis(savedAnalysis || EMPTY_ANALYSIS);
    setSupabaseConvId(null);
    sentDocIdsRef.current = new Set();
    convIdRef.current = null;
  };

  return { messages, streaming, analysis, send, clear, restore };
}
