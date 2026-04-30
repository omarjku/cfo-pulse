import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { retrieveChunks } from './useRAG';
import { stripJsonBlock } from '../lib/responseSchema';
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
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', thinking: null, citations: null, artifacts: [] }]);

    const setAssistantContent = (content) =>
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId ? { ...m, content } : m
      ));

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
        setAssistantContent(narrative);

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
          const finalMessages = [...messages, userMsg, { id: assistantId, role: 'assistant', content: narrative }];
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
          fileIds: documents
            .filter((d) => d.status === 'ready' && d.anthropicFileId)
            .map((d) => d.anthropicFileId),
          documentContext,
          pdfDocuments: [...newPdfDocs, ...pendingSummaryPdfs]
            .filter((d) => !d.anthropicFileId)
            .map((d) => ({ data: d.base64 })),
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

            } else if (event.type === 'thinking') {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, thinking: event.text } : m
              ));

            } else if (event.type === 'artifact') {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId
                  ? { ...m, artifacts: [...(m.artifacts || []), { url: event.url, format: event.format, title: event.title }] }
                  : m
              ));

            } else if (event.type === 'tool_start') {
              const label = event.tool === 'dispatch_subagent'
                ? `Analyzing documents…`
                : event.tool === 'generate_report'
                ? `Generating report…`
                : event.tool === 'code_execution_20250825'
                ? `Running calculation…`
                : `Searching the web…`;
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, toolStatus: label } : m
              ));

            } else if (event.type === 'done') {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, toolStatus: null } : m
              ));
              setAssistantContent(fullText);

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
            { conversation_id: cid, role: 'assistant', content: fullText },
          ]);
        }
      }

      if (onSave) {
        const finalMessages = [...messages, userMsg, { id: assistantId, role: 'assistant', content: fullText }];
        onSave(cid || convIdRef.current, text.slice(0, 60), finalMessages, analysis);
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
        setMessages(data.map((m, i) => ({ id: i, role: m.role, content: m.content })));
      }

      // Rehydrate dashboard from the most recent document's extracted analysis
      const { data: docs } = await supabase
        .from('documents')
        .select('dashboard_analysis')
        .not('dashboard_analysis', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);
      const extracted = docs?.[0]?.dashboard_analysis;
      setAnalysis(extracted ? { ...EMPTY_ANALYSIS, ...extracted } : EMPTY_ANALYSIS);
    } else {
      setSupabaseConvId(null);
      setMessages(savedMessages || []);
      setAnalysis(savedAnalysis || EMPTY_ANALYSIS);
    }
  };

  const mergeAnalysis = useCallback((extracted) => {
    if (extracted && typeof extracted === 'object') {
      setAnalysis((prev) => ({ ...prev, ...extracted }));
    }
  }, []);

  return { messages, streaming, analysis, send, clear, restore, mergeAnalysis };
}
