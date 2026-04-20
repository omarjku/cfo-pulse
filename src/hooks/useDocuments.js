import { useState } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { supabase } from '../lib/supabase';
import { chunkText } from '../lib/chunker';

const SUPPORTED_EXTS = new Set(['pdf', 'xlsx', 'xls', 'csv', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'gif']);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

const MIME_MAP = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
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
    if (!SUPPORTED_EXTS.has(ext)) {
      setError(`Unsupported file type ".${ext}". Supported: PDF, XLSX, XLS, CSV, DOCX, TXT, PNG, JPG, JPEG, WEBP, GIF.`);
      return;
    }
    if (documents.some((d) => d.name === file.name)) {
      setError(`"${file.name}" already uploaded.`);
      return;
    }

    const isPDF = ext === 'pdf';
    const isSheet = ['xlsx', 'xls', 'csv'].includes(ext);
    const isImage = IMAGE_EXTS.has(ext);
    const isDocx = ext === 'docx';
    const isTxt = ext === 'txt';

    const docId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setDocuments((prev) => [...prev, { id: docId, name: file.name, ext, size: file.size, status: 'processing' }]);
    setError('');

    try {
      let base64 = null;
      let mimeType = null;
      let text = '';

      if (isPDF) {
        base64 = await readAsBase64(file);
        try {
          const extractRes = await fetch('/api/extract-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfBase64: base64, fileName: file.name }),
          });
          const extracted = await extractRes.json();
          text = extracted.text || `[PDF Document: ${file.name}]`;
        } catch {
          text = `[PDF Document: ${file.name}]`;
        }
      } else if (isSheet) {
        text = await readSpreadsheetAsText(file);
      } else if (isImage) {
        base64 = await readAsBase64(file);
        mimeType = MIME_MAP[ext] || 'image/jpeg';
        text = `[Image: ${file.name}]`;
      } else if (isDocx) {
        const arrayBuffer = await readAsArrayBuffer(file);
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value.slice(0, 50000) || `[DOCX Document: ${file.name}]`;
      } else if (isTxt) {
        text = (await readAsText(file)).slice(0, 50000);
      }

      let dbId = docId;
      if (supabase && !isImage) {
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
        prev.map((d) => d.id === docId ? {
          ...d, id: dbId, base64, mimeType, text, status: 'ready',
          // Keep raw File reference for spreadsheets so analysisOrchestrator can call arrayBuffer()
          ...(isSheet ? { _file: file } : {}),
        } : d)
      );

      // Async summary for non-image documents
      if (!isImage) {
        const summarizeBody = isPDF && base64
          ? { pdfBase64: base64, fileName: file.name }
          : text
            ? { plainText: text, fileName: file.name }
            : null;

        if (summarizeBody) {
          fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summarizeBody),
          })
            .then((r) => r.json())
            .then(({ summary }) => {
              if (summary) {
                setDocuments((prev) =>
                  prev.map((d) => d.id === dbId ? { ...d, summary } : d)
                );
              }
            })
            .catch(() => { /* silent — direct text fallback still works */ });
        }
      }
    } catch (err) {
      setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, status: 'error' } : d));
      setError(`Failed to process ${file.name}: ${err.message}`);
    }
  };

  const removeDocument = (id) => setDocuments((prev) => prev.filter((d) => d.id !== id));

  return { documents, error, setError, addDocument, removeDocument };
}
