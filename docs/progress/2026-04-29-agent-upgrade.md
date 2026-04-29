# CFO-Pulse Agent Capability Upgrade — Progress

**Date:** 2026-04-29
**Branch:** `feature/agent-upgrade`
**Status:** Implementation complete — pending Supabase migration apply + smoke tests

---

## What Was Done

All 15 implementation tasks completed in one session.

### Phase 1 — Foundation
- SDK upgraded from `0.24.0` → `0.91.1`
- `api/search.js` (Tavily) deleted
- `api/files-upload.js` created — proxies files to Anthropic Files API, returns `file_id`
- `supabase/migrations/004_anthropic_file_id.sql` — adds `anthropic_file_id` column to `documents`
- `src/hooks/useDocuments.js` — uploads PDFs/spreadsheets to Files API on add; stores `anthropicFileId` in state and Supabase

### Phase 2 — Compute
- `src/lib/thinking-heuristic.js` — `shouldThink(message, docCount)` pure function
- `api/claude.js` — full rewrite:
  - `web_search_20250305` (hosted, replaces Tavily)
  - `code_execution_20250825` (Anthropic-hosted Python sandbox)
  - `memory_20250818` (Anthropic-hosted memory)
  - `dispatch_subagent` (custom — calls `/api/subagent`)
  - `generate_report` (custom — calls `/api/generate-report`)
  - Extended thinking (auto-triggered by heuristic)
  - Citations on all document blocks
  - 10-turn loop cap

### Phase 3 — Memory + Sub-agents
- `api/subagent.js` — Haiku sub-agent dispatcher for focused doc tasks
- `src/hooks/useConversation.js` — passes `fileIds[]` to API; handles `thinking`, `artifact`, `tool_start` SSE events

### Phase 4 — Deliverables
- `supabase/migrations/005_cfo_reports_bucket.sql` — creates `cfo-reports` storage bucket
- `api/generate-report.js` — uses code_execution to run Python (openpyxl/reportlab), uploads to Supabase Storage
- `src/components/chat/ThinkingPanel.jsx` — collapsible reasoning view
- `src/components/chat/CitationFootnote.jsx` — amber citation chips
- `src/components/chat/ArtifactCard.jsx` — XLSX/PDF download cards
- `src/components/chat/MessageBubble.jsx` — renders all three new components
- `src/components/chat/ChatPanel.jsx` — passes `thinking`/`citations`/`artifacts` props

---

## What's Next

### Before merging
1. **Apply DB migrations** — run via Supabase dashboard SQL editor (or `npx supabase db push` if CLI is set up):
   - `supabase/migrations/004_anthropic_file_id.sql`
   - `supabase/migrations/005_cfo_reports_bucket.sql`
2. **Add env vars to Vercel:**
   - `SUPABASE_URL` (same value as `VITE_SUPABASE_URL`, no VITE_ prefix — server-side only)
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → Settings → API)
   - Remove `TAVILY_API_KEY`
3. **Smoke test** on Vercel preview — see verification checklist in the design spec

### Deferred (v2)
- QuickBooks integration (teammate's branch)
- Tier 4 cost/quality plumbing (cache hit rate audit, batch API, model routing)

---

## Files Changed Summary

| File | Change |
|---|---|
| `api/claude.js` | Full rewrite |
| `api/files-upload.js` | New |
| `api/subagent.js` | New |
| `api/generate-report.js` | New |
| `api/search.js` | Deleted |
| `src/hooks/useDocuments.js` | Modified |
| `src/hooks/useConversation.js` | Modified |
| `src/lib/thinking-heuristic.js` | New |
| `src/components/chat/ThinkingPanel.jsx` | New |
| `src/components/chat/CitationFootnote.jsx` | New |
| `src/components/chat/ArtifactCard.jsx` | New |
| `src/components/chat/MessageBubble.jsx` | Modified |
| `src/components/chat/ChatPanel.jsx` | Modified |
| `supabase/migrations/004_anthropic_file_id.sql` | New |
| `supabase/migrations/005_cfo_reports_bucket.sql` | New |
