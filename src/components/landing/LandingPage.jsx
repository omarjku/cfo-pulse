import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { T } from '../../lib/tokens';

// ── design tokens ──────────────────────────────────────────────────
const C = {
  emerald:   '#10b981',
  emeraldD:  '#059669',
  emeraldSm: 'rgba(16,185,129,0.12)',
  violet:    '#7c3aed',
  violetSm:  'rgba(124,58,237,0.10)',
  amberSm:   'rgba(245,158,11,0.12)',
};

// ── animated gradient mesh background ──────────────────────────────
function GradientMesh() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <motion.div
        animate={{ x: [0, 50, -20, 0], y: [0, -40, 25, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '-25%', right: '-12%',
          width: 800, height: 800, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(245,158,11,0.16) 0%, transparent 65%)`,
          filter: 'blur(60px)',
        }}
      />
      <motion.div
        animate={{ x: [0, -35, 45, 0], y: [0, 50, -25, 0], scale: [1, 0.92, 1.1, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '5%', left: '-18%',
          width: 700, height: 700, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 65%)`,
          filter: 'blur(70px)',
        }}
      />
      <motion.div
        animate={{ x: [0, 25, -50, 0], y: [0, -50, 30, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', bottom: '-15%', left: '25%',
          width: 900, height: 500, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 65%)`,
          filter: 'blur(80px)',
        }}
      />
      {/* dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(245,158,11,0.06) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      {/* vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, ${T.BG} 100%)`,
      }} />
    </div>
  );
}

// ── floating stat card ──────────────────────────────────────────────
function StatCard({ value, label, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: '14px 20px',
        background: 'rgba(8,9,24,0.7)',
        border: `1px solid ${T.BORDER}`,
        borderRadius: 14,
        backdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', gap: 2,
        minWidth: 120,
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 700, color: T.AMBER, letterSpacing: '-0.02em' }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: T.TEXT3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </motion.div>
  );
}

// ── hero section ────────────────────────────────────────────────────
function HeroSection({ onGetStarted }) {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '120px 24px 80px', position: 'relative', overflow: 'hidden',
      background: T.BG,
    }}>
      <GradientMesh />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 780, width: '100%', textAlign: 'center' }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px 6px 10px',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 100,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: C.emerald,
              boxShadow: `0 0 8px ${C.emerald}`,
              animation: 'pulseDot 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, color: C.emerald, fontWeight: 600, letterSpacing: '0.04em' }}>
              AI-Powered Financial Intelligence
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.2rem)',
            fontWeight: 800,
            lineHeight: 1.03,
            letterSpacing: '-0.04em',
            margin: '0 0 24px',
            background: 'linear-gradient(135deg, #e2e8f0 20%, #f59e0b 55%, #10b981 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Your Documents.<br />CFO-Grade Intelligence.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: T.TEXT2,
            lineHeight: 1.65,
            margin: '0 auto 40px',
            maxWidth: 560,
            letterSpacing: '-0.01em',
          }}
        >
          Upload financial statements, cash flows, and balance sheets.
          Ask anything. Get answers with the precision of a Big-4 auditor
          and the clarity of a Fortune 500 CFO.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.03, boxShadow: `0 0 40px rgba(16,185,129,0.35), 0 0 80px rgba(245,158,11,0.15)` }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '14px 32px', borderRadius: 12,
              background: `linear-gradient(135deg, ${C.emerald}, ${C.emeraldD})`,
              border: 'none', color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '-0.01em',
              boxShadow: `0 0 20px rgba(16,185,129,0.25)`,
              transition: 'none',
            }}
          >
            Start Analyzing Free →
          </motion.button>
          <motion.button
            whileHover={{ borderColor: 'rgba(245,158,11,0.5)', color: T.TEXT1 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '14px 28px', borderRadius: 12,
              background: 'transparent',
              border: `1px solid ${T.BORDER}`, color: T.TEXT2,
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              letterSpacing: '-0.01em', transition: 'border-color 0.2s, color 0.2s',
            }}
          >
            See How It Works
          </motion.button>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'flex', gap: 12, justifyContent: 'center',
            flexWrap: 'wrap', marginTop: 56,
          }}
        >
          <StatCard value="< 3s" label="Response time" delay={0.55} />
          <StatCard value="30+" label="Financial KPIs" delay={0.65} />
          <StatCard value="PDF/XLSX" label="Native support" delay={0.75} />
          <StatCard value="Real-time" label="Web grounding" delay={0.85} />
        </motion.div>
      </div>
    </section>
  );
}

// ── typewriter hook ─────────────────────────────────────────────────
function useTypewriter(fullText, { delay = 0, speed = 22, active = false } = {}) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    if (!active) return;
    setDisplayed('');
    setDone(false);
    idx.current = 0;

    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        idx.current += 1;
        setDisplayed(fullText.slice(0, idx.current));
        if (idx.current >= fullText.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [active, fullText, delay, speed]);

  return { text: displayed, done };
}

// ── mini kpi row ────────────────────────────────────────────────────
const MOCK_KPIS = [
  { label: 'Revenue',    value: '$2.4M',  color: C.emerald },
  { label: 'Gross Margin', value: '62.5%', color: T.AMBER },
  { label: 'Burn Rate',  value: '$186K/mo', color: '#ef4444' },
  { label: 'Runway',     value: '14 mo',  color: '#60a5fa' },
];

function MiniKPI({ label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        flex: 1, minWidth: 80, padding: '10px 12px',
        background: T.SURFACE2, borderRadius: 10,
        border: `1px solid ${T.BORDER}`,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, color: T.TEXT3, marginTop: 2, letterSpacing: '0.03em' }}>{label}</div>
    </motion.div>
  );
}

// ── chat demo section ───────────────────────────────────────────────
const MOCK_RESPONSE = `**Burn rate: $186K/mo** — up 12% from Q3.

Current cash: $2.6M → **14-month runway** at this rate. 3 months below the 18-month safety threshold.

**Immediate risks:**
• OpEx grew 28% YoY but revenue only 18% — compression risk
• DSO at 47 days vs. 30-day terms — $340K tied up in collections
• No credit facility — zero buffer if a large customer delays

**Recommended:** Open a $500K revolver now while metrics are strong. Negotiate net-45 with top 3 suppliers to free ~$180K working capital.`;

function ChatDemoSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [phase, setPhase] = useState(0);
  // phase 0 = idle, 1 = user msg, 2 = typing dots, 3 = streaming, 4 = done

  useEffect(() => {
    if (!inView) return;
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 2000);
    const t4 = setTimeout(() => setPhase(4), 2000 + MOCK_RESPONSE.length * 18 + 400);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [inView]);

  const { text: streamedText } = useTypewriter(MOCK_RESPONSE, {
    active: phase >= 3, delay: 0, speed: 18,
  });

  return (
    <section
      ref={ref}
      style={{
        background: T.BG,
        padding: '0 24px 120px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center', marginBottom: 48 }}
      >
        <p style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: C.emerald, marginBottom: 12,
        }}>
          Live Intelligence
        </p>
        <h2 style={{
          fontSize: 'clamp(1.8rem, 4vw, 3rem)',
          fontWeight: 800, letterSpacing: '-0.03em',
          color: T.TEXT1, margin: 0,
        }}>
          Ask anything about your finances.
        </h2>
        <p style={{ fontSize: 16, color: T.TEXT2, marginTop: 12, lineHeight: 1.6 }}>
          CFO-Pulse reads your documents, searches the web for context, and delivers
          answers with the numbers you actually need.
        </p>
      </motion.div>

      {/* Chat window mock */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 920, margin: '0 auto', position: 'relative' }}
      >
        {/* Outer glow */}
        <div style={{
          position: 'absolute', inset: -1,
          borderRadius: 22,
          background: `linear-gradient(135deg, rgba(245,158,11,0.3), rgba(16,185,129,0.2), rgba(124,58,237,0.15))`,
          filter: 'blur(1px)',
          zIndex: 0,
        }} />

        {/* Window chrome */}
        <div style={{
          position: 'relative', zIndex: 1,
          background: T.SURFACE,
          border: `1px solid ${T.BORDER}`,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}>
          {/* Titlebar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px',
            borderBottom: `1px solid ${T.BORDER}`,
            background: T.SURFACE2,
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ef4444','#f59e0b','#22c55e'].map((c) => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
              ))}
            </div>
            <span style={{
              flex: 1, textAlign: 'center', fontSize: 12,
              color: T.TEXT3, letterSpacing: '0.02em',
            }}>
              CFO-Pulse — Q4 2024 Analysis
            </span>
          </div>

          {/* Body: sidebar + chat + dashboard */}
          <div style={{ display: 'flex', height: 440 }}>
            {/* Sidebar */}
            <div style={{
              width: 180, borderRight: `1px solid ${T.BORDER}`,
              padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4,
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, color: T.TEXT3, letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 4 }}>
                CONVERSATIONS
              </div>
              {['Q4 2024 Analysis', 'Cash Flow Review', 'Burn Rate Deep Dive'].map((title, i) => (
                <div
                  key={i}
                  style={{
                    padding: '7px 10px', borderRadius: 8, fontSize: 12,
                    color: i === 0 ? T.TEXT1 : T.TEXT3,
                    background: i === 0 ? T.SURFACE3 : 'transparent',
                    border: i === 0 ? `1px solid ${T.BORDER}` : '1px solid transparent',
                    cursor: 'default', letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {title}
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 10, color: T.TEXT3, letterSpacing: '0.08em', marginBottom: 6, paddingLeft: 4 }}>
                DOCUMENTS
              </div>
              {['Q4_financials.pdf', 'cashflow.xlsx'].map((doc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px' }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: doc.endsWith('.pdf') ? '#ef4444' : C.emerald,
                  }} />
                  <span style={{
                    fontSize: 11, color: T.TEXT3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{doc}</span>
                </div>
              ))}
            </div>

            {/* Chat area */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              borderRight: `1px solid ${T.BORDER}`,
              overflow: 'hidden',
            }}>
              <div style={{ flex: 1, padding: '20px 20px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* User message */}
                <AnimatePresence>
                  {phase >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      style={{ display: 'flex', justifyContent: 'flex-end' }}
                    >
                      <div style={{
                        maxWidth: '70%', padding: '10px 14px', borderRadius: '12px 2px 12px 12px',
                        background: 'rgba(245,158,11,0.08)',
                        border: `1px solid rgba(245,158,11,0.15)`,
                        fontSize: 13, color: T.TEXT1, lineHeight: 1.5,
                      }}>
                        What's our burn rate and runway situation? Anything I should be worried about?
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Typing dots */}
                <AnimatePresence>
                  {phase === 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
                    >
                      <Avatar />
                      <div style={{
                        padding: '12px 16px',
                        background: T.SURFACE2, borderRadius: '2px 12px 12px 12px',
                        border: `1px solid ${T.BORDER}`, display: 'flex', gap: 5, alignItems: 'center',
                      }}>
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                            style={{ width: 6, height: 6, borderRadius: '50%', background: T.AMBER }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Assistant streaming */}
                <AnimatePresence>
                  {phase >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
                    >
                      <Avatar />
                      <div style={{
                        flex: 1, padding: '12px 16px',
                        background: T.SURFACE2, borderRadius: '2px 12px 12px 12px',
                        border: `1px solid ${T.BORDER}`,
                        borderLeft: `2px solid ${T.AMBER}`,
                        fontSize: 12.5, color: T.TEXT1, lineHeight: 1.7,
                        whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif',
                      }}>
                        {/* Render text with bold */}
                        {streamedText.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                          part.startsWith('**') ? (
                            <strong key={i} style={{ color: T.AMBER, fontWeight: 600 }}>
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                        {phase === 3 && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                            style={{
                              display: 'inline-block', width: 2, height: 13,
                              background: T.AMBER, marginLeft: 2, verticalAlign: 'middle',
                            }}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input bar mock */}
              <div style={{
                padding: '10px 14px',
                borderTop: `1px solid ${T.BORDER}`,
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <div style={{
                  flex: 1, padding: '9px 14px', borderRadius: 10,
                  background: T.SURFACE3, border: `1px solid ${T.BORDER}`,
                  fontSize: 12, color: T.TEXT3,
                }}>
                  Ask CFO-Pulse anything...
                </div>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(135deg, ${C.emerald}, ${C.emeraldD})`,
                  cursor: 'default', fontSize: 14,
                }}>
                  →
                </div>
              </div>
            </div>

            {/* Dashboard mini panel */}
            <div style={{
              width: 200, padding: '16px 14px', flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden',
            }}>
              <div style={{
                fontSize: 10, color: T.TEXT3,
                letterSpacing: '0.08em', marginBottom: 4,
              }}>
                LIVE DASHBOARD
              </div>
              <AnimatePresence>
                {phase >= 4 &&
                  MOCK_KPIS.map((kpi, i) => (
                    <MiniKPI key={kpi.label} {...kpi} delay={i * 0.12} />
                  ))
                }
              </AnimatePresence>
              {phase < 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[80, 65, 90, 50].map((w, i) => (
                    <div key={i} style={{
                      height: 50, borderRadius: 10,
                      background: T.SURFACE2, border: `1px solid ${T.BORDER}`,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: 3, width: `${w}%`,
                        background: T.BORDER,
                        margin: '10px 10px 0',
                        borderRadius: 2,
                      }} />
                      <div style={{
                        height: 3, width: `${w * 0.6}%`,
                        background: T.BORDER,
                        margin: '6px 10px',
                        borderRadius: 2,
                      }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ── avatar ──────────────────────────────────────────────────────────
function Avatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: `linear-gradient(135deg, ${T.AMBER}, ${T.AMBER_D})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#000', letterSpacing: '0.02em',
      boxShadow: `0 0 8px rgba(245,158,11,0.35)`,
    }}>
      CF
    </div>
  );
}

// ── main export ─────────────────────────────────────────────────────
export function LandingPage({ onGetStarted }) {
  return (
    <div style={{ background: T.BG, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #10b981; }
          50% { opacity: 0.6; box-shadow: 0 0 16px #10b981, 0 0 24px rgba(16,185,129,0.4); }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 60,
        background: 'rgba(5,6,15,0.7)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${T.BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `linear-gradient(135deg, ${T.AMBER}, ${T.AMBER_D})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: '#000',
          }}>CF</div>
          <span style={{
            fontSize: 16, fontWeight: 700, color: T.TEXT1,
            letterSpacing: '-0.03em',
          }}>CFO-Pulse</span>
        </div>
        <motion.button
          onClick={onGetStarted}
          whileHover={{ borderColor: 'rgba(245,158,11,0.5)', color: T.TEXT1 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '7px 18px', borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${T.BORDER}`, color: T.TEXT2,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            letterSpacing: '-0.01em', transition: 'border-color 0.2s, color 0.2s',
          }}
        >
          Sign In
        </motion.button>
      </nav>

      <HeroSection onGetStarted={onGetStarted} />
      <ChatDemoSection />

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '32px 24px',
        borderTop: `1px solid ${T.BORDER}`,
        fontSize: 12, color: T.TEXT3,
      }}>
        CFO-Pulse · AI Financial Intelligence
      </div>
    </div>
  );
}
