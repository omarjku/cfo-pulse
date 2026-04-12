import { supabase } from '../lib/supabase';

export async function retrieveChunks(query, documentIds, topK = 5) {
  if (!supabase || !documentIds.length || !query.trim()) return '';
  try {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('content')
      .in('document_id', documentIds)
      .textSearch('fts', query, { type: 'websearch' })
      .limit(topK);
    if (error || !data) return '';
    return data.map((c) => c.content).join('\n\n---\n\n');
  } catch {
    return '';
  }
}

export function useRAG(documentIds) {
  return {
    retrieve: (query) => retrieveChunks(query, documentIds),
  };
}
