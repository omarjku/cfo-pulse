// SVG fractal noise grain — baked into every metal surface via background-blend-mode:overlay
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

export const T = {
  // ── Anodized dark aluminium scale ────────────────────────────────────
  BG:       '#090b0d',   // deepest frame / body
  SURFACE:  '#121517',   // sidebar / side panels
  SURFACE2: '#161a1c',   // main working surface
  SURFACE3: '#1b1f22',   // raised cards / bubbles
  SURFACE4: '#202528',   // hover / active states
  SURFACE5: '#262b2e',   // top-level raised element

  // ── Machined edges ───────────────────────────────────────────────────
  EDGE_HI:  'rgba(255,255,255,0.09)',   // top-catch light
  EDGE_LO:  'rgba(0,0,0,0.55)',          // bottom shadow
  EDGE_SEP: 'rgba(255,255,255,0.05)',   // separator / border

  // ── Borders ─────────────────────────────────────────────────────────
  BORDER:   'rgba(255,255,255,0.05)',
  BORDER_A: 'rgba(210,138,22,0.22)',
  BORDER_A2:'rgba(210,138,22,0.38)',

  // ── Accent: anodised bronze / amber ─────────────────────────────────
  AMBER:    'rgba(210,138,22,0.90)',
  AMBER_D:  'rgba(180,112,18,0.90)',
  AMBER_BG: 'rgba(210,138,22,0.09)',
  AMBER_G:  'rgba(210,138,22,0.35)',

  // ── Text ────────────────────────────────────────────────────────────
  TEXT1:    'rgba(255,255,255,0.84)',
  TEXT2:    'rgba(255,255,255,0.52)',
  TEXT3:    'rgba(255,255,255,0.28)',
  TEXT4:    'rgba(255,255,255,0.16)',

  // ── Status ───────────────────────────────────────────────────────────
  SUCCESS:  'rgba(56,160,80,0.88)',
  DANGER:   'rgba(210,65,55,0.85)',
  DANGER_BG:'rgba(210,65,55,0.07)',
  DANGER_BD:'rgba(210,65,55,0.18)',
  WARNING:  'rgba(210,138,22,0.90)',

  // ── Gradients ────────────────────────────────────────────────────────
  GRAD_AMBER: 'linear-gradient(180deg, rgba(210,138,22,0.88) 0%, rgba(175,110,16,0.88) 100%)',

  // ── Shadows ──────────────────────────────────────────────────────────
  SHADOW_AMBER:    '0 0 12px rgba(210,138,22,0.18)',
  SHADOW_AMBER_SM: '0 0 6px rgba(210,138,22,0.12)',

  // ── Machined box-shadows ─────────────────────────────────────────────
  MACHINED:    'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)',
  MACHINED_SM: 'inset 0 1px 0 rgba(255,255,255,0.09), 0 1px 3px rgba(0,0,0,0.35)',

  // ── Noise ────────────────────────────────────────────────────────────
  NOISE,
};

// Returns an inline style object that paints a metal surface at the given depth (0–5).
// Spread into a `style` prop: <div style={{ ...metalBg(2), ... }}>
const METAL_LEVELS = ['#0e1012', '#121517', '#161a1c', '#1b1f22', '#202528', '#262b2e'];
export function metalBg(level = 2) {
  return {
    backgroundColor: METAL_LEVELS[Math.min(level, 5)],
    backgroundImage: NOISE,
    backgroundBlendMode: 'overlay',
    backgroundSize: '256px 256px',
  };
}
