import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { T } from '../../lib/tokens';

export function UploadZone({ onFiles, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFiles = (files) => {
    Array.from(files).forEach((f) => onFiles(f));
  };

  return (
    <motion.div
      animate={{ borderColor: dragging ? T.AMBER : T.BORDER_A }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        border: `1px dashed ${T.BORDER_A}`, borderRadius: 8,
        padding: '14px 10px', textAlign: 'center', cursor: disabled ? 'not-allowed' : 'pointer',
        background: dragging ? 'rgba(245,158,11,0.05)' : 'transparent',
        transition: 'background 0.2s',
      }}
    >
      <Upload size={14} color={T.AMBER} style={{ margin: '0 auto 4px' }} />
      <p style={{ fontSize: 10, color: T.TEXT3, margin: 0, lineHeight: 1.4 }}>
        Drop files<br />
        <span style={{ color: T.AMBER, fontSize: 9 }}>PDF, XLSX, CSV</span>
      </p>
      <input
        ref={inputRef} type="file" multiple hidden
        accept=".pdf,.xlsx,.xls,.csv"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </motion.div>
  );
}
