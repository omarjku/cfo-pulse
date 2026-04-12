import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { chunkText } from '../lib/chunker';

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readSpreadsheetAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        let text = '';
        for (const name of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
          text += `Sheet: ${name}\n`;
          for (const row of rows.slice(0, 500)) {
            if (row.some((c) => c !== '')) text += row.map((c) => String(c ?? '')).join('\t') + '\n';
          }
          text += '\n';
        }
        resolve(text.slice(0, 50000));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');

  const addDocument = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const isPDF = ext === 'pdf';
    const isSheet = ['xlsx', 'xls', 'csv'].includes(ext);
    if (!isPDF && !isSheet) { setError('Unsupported file type. Upload PDF, XLSX, XLS, or CSV.'); return; }
    if (documents.some((d) => d.name === file.name)) { setError(`"${file.name}" already uploaded.`); return; }

    const docId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setDocuments((prev) => [...prev, { id: docId, name: file.name, ext, size: file.size, status: 'processing' }]);
    setError('');

    try {
      let base64 = null;
      let text = '';
      if (isPDF) {
        base64 = await readAsBase64(file);
        text = `[PDF Document: ${file.name}]`;
      } else {
        text = await readSpreadsheetAsText(file);
      }

      let dbId = docId;
      if (supabase) {
        const { data: doc } = await supabase
          .from('documents')
          .insert({ name: file.name, size_bytes: file.size, file_type: ext })
          .select('id')
          .single();
        if (doc) {
          dbId = doc.id;
          const chunks = chunkText(text);
          if (chunks.length > 0) {
            await supabase.from('document_chunks').insert(
              chunks.map((content, chunk_index) => ({ document_id: dbId, chunk_index, content }))
            );
          }
        }
      }

      setDocuments((prev) =>
        prev.map((d) => d.id === docId ? { ...d, id: dbId, base64, text, status: 'ready' } : d)
      );
    } catch (err) {
      setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, status: 'error' } : d));
      setError(`Failed to process ${file.name}: ${err.message}`);
    }
  };

  const removeDocument = (id) => setDocuments((prev) => prev.filter((d) => d.id !== id));

  return { documents, error, setError, addDocument, removeDocument };
}
