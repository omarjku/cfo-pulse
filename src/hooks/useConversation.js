import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { retrieveChunks } from './useRAG';
import { parseRichResponse, isRich, stripJsonBlock } from '../lib/responseSchema';
import { runFinancialAnalysis, isSpreadsheet } from '../lib/analysisOrchestrator';

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

function newConvId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function useConversation({ onSave } = {}) {
  const [supabaseConvId, setSupabaseConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [analysis, setAnalysis] = useState(EMPTY_ANALYSIS);

  const sentDocIdsRef = useRef(new Set());
  const convIdRef = useRef(null);

  const send = useCallback(async ({ text, documents }) => {
    if (!text.trim() || streaming) return;
    setStreaming(true);

    if (!convIdRef.current) convIdRef.current = newConvId();

    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    const docIds = documents.filter((d) => d.status === 'ready').map((d) => d.id);
    const ragContext = await retrieveChunks(text, docIds);

    const spreadsheetContext = documents
      .filter((d) => d.status === 'ready' && d.text && d.ext !== 'pdf' && !['png','jpg','jpeg','webp','gif'].includes(d.ext))
      .map((d) => `**${d.name}**\n\n${d.text.slice(0, 8000)}`)
      .join('\n\n---\n\n');

    const documentContext = [ragContext, spreadsheetContext].filter(Boolean).join('\n\n---\n\n');

    const newPdfDocs = documents.filter(
      (d) => d.ext === 'pdf' && d.base64 && d.status === 'ready' && !sentDocIdsRef.current.has(d.id)
    );

    const pendingSummaryPdfs = documents.filter(
      (d) => d.ext === 'pdf' && d.base64 && d.status === 'ready' && sentDocIdsRef.current.has(d.id) && !d.summary
    );

    const existingSummaries = documents
      .filter((d) => d.ext === 'pdf' && d.status === 'ready' && sentDocIdsRef.current.has(d.id) && d.summary)
      .map((d) => d.summary);

    // Images are always re-sent each turn (no caching — Claude needs to see them)
    const imageDocuments = documents
      .filter((d) => d.status === 'ready' && d.mimeType && d.base64)
      .map((d) => ({ data: d.base64, mimeType: d.mimeType, name: d.name }));

    const MAX_MSG_CHARS = 3000;
    const history = [...messages, userMsg]
      .slice(-6)
      .map(({ role, content }) => {
        const stripped = stripJsonBlock(content || '');
        return {
          role,
          content: stripped.length > MAX_MSG_CHARS
            ? stripped.slice(0, MAX_MSG_CHARS) + '\n\n[...truncated]'
            : stripped,
        };
      });

    const assistantId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', rich: null }]);

    const setAssistantContent = (content, rich = undefined) =>
      setMessages((prev) => prev.map((m) => {
        if (m.id !== assistantId) return m;
        return rich !== undefined ? { ...m, content, rich } : { ...m, content };
      }));

    newPdfDocs.forEach((d) => sentDocIdsRef.current.add(d.id));

    // ── Financial analysis pipeline ───────────────────────────────────────
    // If any ready document is a spreadsheet, bypass the chat API and run
    // the full extract → analyze → synthesize pipeline instead.
    const spreadsheetFiles = documents
      .filter((d) => d.status === 'ready' && d._file && isSpreadsheet(d.name))
      .map((d) => d._file);

    if (spreadsheetFiles.length > 0) {
      try {
        const rich = await runFinancialAnalysis(spreadsheetFiles);
        setAnalysis((prev) => ({ ...prev, ...rich }));
        const narrative = rich.narrative || '';
        setAssistantContent(narrative, rich);

        // Persist to Supabase
        let cid = supabaseConvId;
        if (supabase) {
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
              { conversation_id: cid, role: 'user',      content: text },
              { conversation_id: cid, role: 'assistant', content: narrative },
            ]);
          }
        }

        if (onSave) {
          const finalMessages = [...messages, userMsg, { id: assistantId, role: 'assistant', content: narrative, rich }];
          onSave(cid || convIdRef.current, text.slice(0, 60), finalMessages, rich);
        }
      } catch (err) {
        setAssistantContent(`Analysis error: ${err.message}`);
      } finally {
        setStreaming(false);
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          documentContext,
          pdfDocuments: [...newPdfDocs, ...pendingSummaryPdfs].map((d) => ({ data: d.base64 })),
          documentSummaries: existingSummaries,
          imageDocuments,
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
      let freshAnalysis = null;

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

            } else if (event.type === 'tool_start') {
              fullText += `\n\n*Searching the web for "${event.query}"...*\n\n`;
              setAssistantContent(fullText);

            } else if (event.type === 'done') {
              const rich = parseRichResponse(fullText);
              const stripped = stripJsonBlock(fullText);

              if (isRich(rich)) {
                // Rich response — store parsed data + strip JSON block from displayed text
                setAnalysis((prev) => {
                  freshAnalysis = { ...prev, ...rich };
                  return freshAnalysis;
                });
                setAssistantContent(stripped, rich);
              } else {
                // Legacy dashboard-only or plain text
                const json = extractJsonBlock(fullText);
                if (json) {
                  setAnalysis((prev) => {
                    freshAnalysis = { ...prev, ...json };
                    return freshAnalysis;
                  });
                }
                setAssistantContent(stripped);
              }

            } else if (event.type === 'error') {
              let errMsg = event.message || 'Unknown error';
              try {
                const parsed = JSON.parse(errMsg);
                errMsg = parsed?.error?.message || parsed?.message || errMsg;
              } catch { /* plain text */ }
              setAssistantContent(`Error: ${errMsg}`);
            }
          } catch { /* partial JSON fragment */ }
        }
      }

      // Persist to Supabase
      let cid = supabaseConvId;
      if (supabase) {
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

      if (onSave) {
        const finalMessages = [...messages, userMsg, { id: assistantId, role: 'assistant', content: stripJsonBlock(fullText) }];
        onSave(cid || convIdRef.current, text.slice(0, 60), finalMessages, freshAnalysis ?? analysis);
      }

    } catch (err) {
      newPdfDocs.forEach((d) => sentDocIdsRef.current.delete(d.id));
      setAssistantContent(`Error: ${err.message}`);
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, supabaseConvId, onSave]);

  const clear = () => {
    setMessages([]);
    setSupabaseConvId(null);
    setAnalysis(EMPTY_ANALYSIS);
    sentDocIdsRef.current = new Set();
    convIdRef.current = null;
  };

  const restore = async (id, savedMessages, savedAnalysis) => {
    sentDocIdsRef.current = new Set();
    convIdRef.current = null;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID && supabase) {
      setSupabaseConvId(id);
      const { data } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      if (data) {
        const msgs = data.map((m, i) => ({ id: i, role: m.role, content: m.content }));
        setMessages(msgs);
        const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
        if (lastAssistant) {
          const json = extractJsonBlock(lastAssistant.content);
          setAnalysis(json ? { ...EMPTY_ANALYSIS, ...json } : EMPTY_ANALYSIS);
        } else {
          setAnalysis(EMPTY_ANALYSIS);
        }
      }
    } else {
      setSupabaseConvId(null);
      setMessages(savedMessages || []);
      setAnalysis(savedAnalysis || EMPTY_ANALYSIS);
    }
  };

  return { messages, streaming, analysis, send, clear, restore };
}
