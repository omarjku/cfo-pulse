import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 40;
const AMBER = { r: 245, g: 158, b: 11 };

function randomBetween(a, b) { return a + Math.random() * (b - a); }

export function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Init particles
    particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: randomBetween(0, canvas.width),
      y: randomBetween(0, canvas.height),
      r: randomBetween(0.5, 2),
      opacity: randomBetween(0.1, 0.45),
      vx: randomBetween(-0.12, 0.12),
      vy: randomBetween(-0.12, 0.12),
      pulseSpeed: randomBetween(0.005, 0.015),
      pulseOffset: randomBetween(0, Math.PI * 2),
    }));

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Wrap edges
        if (p.x < -2) p.x = canvas.width + 2;
        if (p.x > canvas.width + 2) p.x = -2;
        if (p.y < -2) p.y = canvas.height + 2;
        if (p.y > canvas.height + 2) p.y = -2;
        // Pulse opacity
        const opacity = p.opacity * (0.6 + 0.4 * Math.sin(frame * p.pulseSpeed + p.pulseOffset));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${AMBER.r},${AMBER.g},${AMBER.b},${opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
