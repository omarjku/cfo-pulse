import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Code2, Copy, ExternalLink, Check } from 'lucide-react';
import { StreamingCursor } from './StreamingCursor';
import { RichResponse } from './RichResponse';
import { T } from '../../lib/tokens';

function CFOAvatar() {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      boxShadow: '0 0 12px rgba(245,158,11,0.4), 0 0 0 1px rgba(245,158,11,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 900, color: '#05060f', fontFamily: 'monospace',
      letterSpacing: '0.5px',
    }}>
      CF
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
      background: 'linear-gradient(135deg, #1e2040, #0d0e1f)',
      border: `1px solid ${T.BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: T.TEXT2, letterSpacing: '0.5px',
    }}>
      U
    </div>
  );
}

const toolbarBtn = {
  background: 'transparent',
  border: `1px solid ${T.BORDER}`,
  borderRadius: 4,
  padding: '3px 6px',
  color: T.TEXT2,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center',
  transition: 'color 0.15s, border-color 0.15s',
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
      border: `1px solid ${T.BORDER}`,
      borderRadius: 8,
      overflow: 'hidden',
      background: T.SURFACE,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px',
        background: 'rgba(245,158,11,0.06)',
        borderBottom: `1px solid ${T.BORDER}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, fontWeight: 800, letterSpacing: '1.5px',
          color: T.AMBER, fontFamily: 'monospace',
        }}>
          <Code2 size={11} />
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
    width: 7, height: 7, borderRadius: '50%', background: '#f59e0b',
    animation: `cfoBounce 0.9s ${delay}s ease-in-out infinite`,
  });
  return (
    <>
      <style>{`@keyframes cfoBounce{0%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}`}</style>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 2px' }}>
        <div style={dot(0)} /><div style={dot(0.12)} /><div style={dot(0.24)} />
      </div>
    </>
  );
}

// Markdown component overrides — styled to match the dark theme
const mdComponents = {
  p({ children }) {
    return (
      <p style={{ margin: '0 0 10px', lineHeight: 1.7, fontSize: 14, color: T.TEXT1 }}>
        {children}
      </p>
    );
  },
  strong({ children }) {
    return <strong style={{ fontWeight: 700, color: T.TEXT1 }}>{children}</strong>;
  },
  em({ children }) {
    return <em style={{ color: T.TEXT2, fontStyle: 'italic' }}>{children}</em>;
  },
  h1({ children }) {
    return <h1 style={{ fontSize: 16, fontWeight: 800, color: T.TEXT1, margin: '14px 0 6px', letterSpacing: '-0.3px' }}>{children}</h1>;
  },
  h2({ children }) {
    return <h2 style={{ fontSize: 14, fontWeight: 700, color: T.TEXT1, margin: '12px 0 5px', letterSpacing: '-0.2px' }}>{children}</h2>;
  },
  h3({ children }) {
    return <h3 style={{ fontSize: 13, fontWeight: 700, color: T.AMBER, margin: '10px 0 4px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</h3>;
  },
  ul({ children }) {
    return <ul style={{ margin: '4px 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ul>;
  },
  ol({ children }) {
    return <ol style={{ margin: '4px 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ol>;
  },
  li({ children }) {
    return <li style={{ fontSize: 14, color: T.TEXT1, lineHeight: 1.65 }}>{children}</li>;
  },
  // react-markdown v9: override `pre` to intercept block code (artifact detection lives here)
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children;
    const { className = '', children: codeChildren } = child?.props || {};
    const raw = String(codeChildren ?? '').replace(/\n$/, '');
    const isHtmlLang = className === 'language-html' || className === 'lang-html';
    const isFullDoc = /^\s*(<!DOCTYPE\s+html|<html[\s>])/i.test(raw);
    if (isHtmlLang && isFullDoc) return <HtmlArtifact html={raw} />;
    return (
      <pre style={{
        background: 'rgba(5,6,15,0.7)',
        border: `1px solid ${T.BORDER}`,
        borderRadius: 6,
        padding: '10px 14px',
        margin: '8px 0',
        overflowX: 'auto',
        fontSize: 12,
        fontFamily: 'monospace',
        color: T.TEXT2,
        lineHeight: 1.6,
      }}>
        {children}
      </pre>
    );
  },
  // `code` handles inline (no className) and block interior (has className, inside pre above)
  code({ className, children }) {
    if (!className) {
      return (
        <code style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 4,
          padding: '1px 5px',
          fontSize: 12,
          fontFamily: 'monospace',
          color: T.AMBER,
        }}>
          {children}
        </code>
      );
    }
    return <code style={{ fontFamily: 'monospace', fontSize: 12 }}>{children}</code>;
  },
  blockquote({ children }) {
    return (
      <blockquote style={{
        borderLeft: `3px solid ${T.AMBER}`,
        paddingLeft: 12,
        margin: '8px 0',
        color: T.TEXT2,
        fontStyle: 'italic',
      }}>
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr style={{ border: 'none', borderTop: `1px solid ${T.BORDER}`, margin: '10px 0' }} />;
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: T.AMBER, textDecoration: 'underline', textDecorationColor: 'rgba(245,158,11,0.4)' }}>
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div style={{ overflowX: 'auto', margin: '8px 0' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>{children}</table>
      </div>
    );
  },
  th({ children }) {
    return <th style={{ padding: '5px 10px', borderBottom: `1px solid ${T.BORDER}`, color: T.AMBER, fontFamily: 'monospace', fontSize: 11, textAlign: 'left', fontWeight: 700 }}>{children}</th>;
  },
  td({ children }) {
    return <td style={{ padding: '5px 10px', borderBottom: `1px solid ${T.BORDER}`, color: T.TEXT2, fontSize: 13 }}>{children}</td>;
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
        display: 'flex',
        gap: 12,
        flexDirection: isAssistant ? 'row' : 'row-reverse',
        marginBottom: 20,
        alignItems: 'flex-start',
      }}
    >
      {isAssistant ? <CFOAvatar /> : <UserAvatar />}

      <div style={{
        maxWidth: rich ? '92%' : '76%',
        background: isAssistant ? 'rgba(8,9,24,0.82)' : 'rgba(13,14,31,0.9)',
        border: `1px solid ${isAssistant ? 'rgba(245,158,11,0.22)' : T.BORDER}`,
        borderRadius: isAssistant ? '2px 12px 12px 12px' : '12px 2px 12px 12px',
        padding: '12px 16px',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: isAssistant
          ? '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.08) inset'
          : '0 4px 16px rgba(0,0,0,0.3)',
        borderLeft: isAssistant ? `3px solid ${T.AMBER}` : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isAssistant && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, rgba(245,158,11,0.6), rgba(245,158,11,0.1), transparent)',
          }} />
        )}

        {isAssistant && (
          <div style={{
            fontSize: 9, fontWeight: 800, color: T.AMBER,
            fontFamily: 'monospace', letterSpacing: '1.5px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            CFO-PULSE
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: T.SUCCESS, boxShadow: `0 0 6px ${T.SUCCESS}` }} />
          </div>
        )}

        {isAssistant ? (
          <div style={{ fontSize: 14, lineHeight: 1.7, color: T.TEXT1, wordBreak: 'break-word' }}>
            {isStreaming && !content ? (
              <TypingDots />
            ) : rich ? (
              /* Rich structured response */
              <>
                <RichResponse rich={rich} />
                {isStreaming && <StreamingCursor />}
              </>
            ) : (
              /* Plain markdown fallback */
              <>
                <ReactMarkdown components={mdComponents}>{content || ''}</ReactMarkdown>
                {isStreaming && <StreamingCursor />}
              </>
            )}
          </div>
        ) : (
          <p style={{
            margin: 0, fontSize: 14, lineHeight: 1.7,
            color: T.TEXT2, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {content}
          </p>
        )}
      </div>
    </motion.div>
  );
}
