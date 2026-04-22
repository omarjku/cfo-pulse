import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Code2, Copy, ExternalLink, Check } from 'lucide-react';
import { StreamingCursor } from './StreamingCursor';
import { RichResponse } from './RichResponse';
import { T, metalBg } from '../../lib/tokens';

function CFOAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
      background: T.AMBER_BG,
      border: `1px solid ${T.BORDER_A}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.4)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 11, height: 11,
        background: T.AMBER,
        clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
      }} />
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
      ...metalBg(4),
      border: `1px solid ${T.EDGE_SEP}`,
      boxShadow: T.MACHINED_SM,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 600, color: T.TEXT3,
      fontFamily: "'Barlow Condensed', sans-serif",
      letterSpacing: '1px',
    }}>
      U
    </div>
  );
}

const toolbarBtn = {
  ...metalBg(4),
  border: `1px solid ${T.EDGE_SEP}`,
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.3)`,
  borderRadius: 4,
  padding: '3px 6px',
  color: T.TEXT3,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center',
  transition: 'color 0.15s',
};

function HtmlArtifact({ html }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked in some contexts */ }
  };

  const handleExpand = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div style={{
      margin: '10px 0',
      border: `1px solid ${T.EDGE_SEP}`,
      borderRadius: 8, overflow: 'hidden',
      ...metalBg(3),
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px',
        ...metalBg(2),
        borderBottom: `1px solid ${T.EDGE_SEP}`,
        boxShadow: T.MACHINED_SM,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 9, fontWeight: 700, letterSpacing: '2px',
          color: T.AMBER, fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: 'uppercase',
        }}>
          <Code2 size={10} />
          ARTIFACT
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleCopy} title="Copy HTML" style={toolbarBtn}>
            {copied ? <Check size={12} color={T.SUCCESS} /> : <Copy size={12} />}
          </button>
          <button onClick={handleExpand} title="Open in new tab" style={toolbarBtn}>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
      <iframe
        srcDoc={html}
        sandbox="allow-scripts"
        title="artifact"
        style={{ display: 'block', width: '100%', height: 480, border: 'none', background: '#0f1117' }}
      />
    </div>
  );
}

function TypingDots() {
  const dot = (delay) => ({
    width: 6, height: 6, borderRadius: '50%', background: T.AMBER,
    animation: `cfoBounce 0.9s ${delay}s ease-in-out infinite`,
  });
  return (
    <>
      <style>{`@keyframes cfoBounce{0%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-4px);opacity:0.9}}`}</style>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 2px' }}>
        <div style={dot(0)} /><div style={dot(0.12)} /><div style={dot(0.24)} />
      </div>
    </>
  );
}

const mdComponents = {
  p({ children }) {
    return (
      <p style={{ margin: '0 0 10px', lineHeight: 1.72, fontSize: 13, color: T.TEXT2 }}>
        {children}
      </p>
    );
  },
  strong({ children }) {
    return <strong style={{ fontWeight: 600, color: T.TEXT1 }}>{children}</strong>;
  },
  em({ children }) {
    return <em style={{ color: T.TEXT2, fontStyle: 'italic' }}>{children}</em>;
  },
  h1({ children }) {
    return (
      <h1 style={{
        fontSize: 14, fontWeight: 700, color: T.TEXT1, margin: '14px 0 6px',
        fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '1px', textTransform: 'uppercase',
      }}>{children}</h1>
    );
  },
  h2({ children }) {
    return (
      <h2 style={{
        fontSize: 12, fontWeight: 700, color: T.TEXT2, margin: '12px 0 5px',
        fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '1px', textTransform: 'uppercase',
      }}>{children}</h2>
    );
  },
  h3({ children }) {
    return (
      <h3 style={{
        fontSize: 11, fontWeight: 700, color: T.AMBER, margin: '10px 0 4px',
        fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '1.5px', textTransform: 'uppercase',
      }}>{children}</h3>
    );
  },
  ul({ children }) {
    return <ul style={{ margin: '4px 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ul>;
  },
  ol({ children }) {
    return <ol style={{ margin: '4px 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ol>;
  },
  li({ children }) {
    return <li style={{ fontSize: 13, color: T.TEXT2, lineHeight: 1.65 }}>{children}</li>;
  },
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children;
    const { className = '', children: codeChildren } = child?.props || {};
    const raw = String(codeChildren ?? '').replace(/\n$/, '');
    const isHtmlLang = className === 'language-html' || className === 'lang-html';
    const isFullDoc = /^\s*(<!DOCTYPE\s+html|<html[\s>])/i.test(raw);
    if (isHtmlLang && isFullDoc) return <HtmlArtifact html={raw} />;
    return (
      <pre style={{
        ...metalBg(1),
        border: `1px solid ${T.EDGE_SEP}`,
        boxShadow: T.MACHINED_SM,
        borderRadius: 6, padding: '10px 14px', margin: '8px 0',
        overflowX: 'auto', fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        color: T.TEXT2, lineHeight: 1.6,
      }}>
        {children}
      </pre>
    );
  },
  code({ className, children }) {
    if (!className) {
      return (
        <code style={{
          background: T.AMBER_BG,
          border: `1px solid ${T.BORDER_A}`,
          borderRadius: 4, padding: '1px 5px',
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
          color: T.AMBER,
        }}>
          {children}
        </code>
      );
    }
    return <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{children}</code>;
  },
  blockquote({ children }) {
    return (
      <blockquote style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${T.EDGE_SEP}`,
        borderRadius: 5, paddingLeft: 12, paddingRight: 12,
        paddingTop: 8, paddingBottom: 8,
        margin: '8px 0', color: T.TEXT2, fontStyle: 'italic',
      }}>
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr style={{ border: 'none', borderTop: `1px solid ${T.EDGE_SEP}`, margin: '10px 0' }} />;
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ color: T.AMBER, textDecoration: 'underline', textDecorationColor: `rgba(210,138,22,0.35)` }}>
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div style={{ overflowX: 'auto', margin: '8px 0' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th style={{
        padding: '5px 10px', borderBottom: `1px solid ${T.EDGE_SEP}`,
        color: T.AMBER, fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 10, textAlign: 'left', fontWeight: 700,
        letterSpacing: '1.5px', textTransform: 'uppercase',
      }}>{children}</th>
    );
  },
  td({ children }) {
    return <td style={{ padding: '5px 10px', borderBottom: `1px solid ${T.EDGE_SEP}`, color: T.TEXT2, fontSize: 12 }}>{children}</td>;
  },
};

export function MessageBubble({ role, content, rich, isStreaming }) {
  const isAssistant = role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex', gap: 10,
        flexDirection: isAssistant ? 'row' : 'row-reverse',
        marginBottom: 20, alignItems: 'flex-start',
      }}
    >
      {isAssistant ? <CFOAvatar /> : <UserAvatar />}

      <div style={{
        maxWidth: rich ? '92%' : '76%',
        ...metalBg(3),
        border: `1px solid ${T.EDGE_SEP}`,
        borderRadius: isAssistant ? '2px 10px 10px 10px' : '10px 2px 10px 10px',
        padding: '12px 16px',
        boxShadow: `inset 0 1px 0 ${T.EDGE_HI}, inset 0 -1px 0 rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.4)`,
      }}>
        {isAssistant && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 8,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 9, fontWeight: 700, color: T.TEXT3,
            letterSpacing: '2.5px', textTransform: 'uppercase',
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%', background: T.AMBER,
              boxShadow: `0 0 5px rgba(210,138,22,0.35)`,
            }} />
            CFO-PULSE
          </div>
        )}

        {isAssistant ? (
          <div style={{ fontSize: 13, lineHeight: 1.72, color: T.TEXT2, wordBreak: 'break-word' }}>
            {isStreaming && !content ? (
              <TypingDots />
            ) : rich ? (
              <>
                <RichResponse rich={rich} />
                {isStreaming && <StreamingCursor />}
              </>
            ) : (
              <>
                <ReactMarkdown components={mdComponents}>{content || ''}</ReactMarkdown>
                {isStreaming && <StreamingCursor />}
              </>
            )}
          </div>
        ) : (
          <p style={{
            margin: 0, fontSize: 13, lineHeight: 1.7,
            color: T.TEXT2, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {content}
          </p>
        )}
      </div>
    </motion.div>
  );
}
