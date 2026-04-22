import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { T, metalBg } from '../../lib/tokens';

const ACCEPT = '.pdf,.xlsx,.xls,.csv,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif';

export function UploadZone({ onFiles, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFiles = (files) => {
    Array.from(files).forEach((f) => onFiles(f));
  };

  return (
    <motion.div
      animate={{ borderColor: dragging ? T.BORDER_A2 : T.BORDER_A }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        border: `1px dashed ${T.BORDER_A}`, borderRadius: 7,
        padding: '12px 10px', textAlign: 'center', cursor: disabled ? 'not-allowed' : 'pointer',
        background: dragging ? T.AMBER_BG : 'transparent',
        transition: 'background 0.2s',
      }}
    >
      <Upload size={13} color={T.AMBER} style={{ margin: '0 auto 4px' }} />
      <p style={{
        fontSize: 10, color: T.TEXT3, margin: 0, lineHeight: 1.5,
        fontFamily: "'Figtree', sans-serif",
      }}>
        Drop files<br />
        <span style={{ color: T.AMBER, fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '1px' }}>
          PDF · XLSX · CSV · DOCX · TXT
        </span><br />
        <span style={{ color: T.TEXT4, fontSize: 9 }}>PNG · JPG · WEBP · GIF</span>
      </p>
      <input
        ref={inputRef} type="file" multiple hidden
        accept={ACCEPT}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </motion.div>
  );
}
