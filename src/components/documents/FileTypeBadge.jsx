import { T } from '../../lib/tokens';

const EXT_COLORS = {
  pdf:   { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171' },
  xlsx:  { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',  text: '#4ade80' },
  xls:   { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',  text: '#4ade80' },
  csv:   { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',  text: '#4ade80' },
  docx:  { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)', text: '#93c5fd' },
  txt:   { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.2)', text: '#94a3b8' },
  png:   { bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)',text: '#c084fc' },
  jpg:   { bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)',text: '#c084fc' },
  jpeg:  { bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)',text: '#c084fc' },
  webp:  { bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)',text: '#c084fc' },
  gif:   { bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)',text: '#c084fc' },
};

const DEFAULT_STYLE = { bg: 'rgba(71,85,105,0.15)', border: 'rgba(71,85,105,0.25)', text: T.TEXT3 };

export function FileTypeBadge({ ext }) {
  const key = (ext || '').toLowerCase();
  const style = EXT_COLORS[key] || DEFAULT_STYLE;
  return (
    <span style={{
      display: 'inline-block',
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: 3,
      padding: '0px 4px',
      fontSize: 8,
      fontWeight: 800,
      fontFamily: 'monospace',
      color: style.text,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      lineHeight: '14px',
      verticalAlign: 'middle',
    }}>
      {key || '?'}
    </span>
  );
}
