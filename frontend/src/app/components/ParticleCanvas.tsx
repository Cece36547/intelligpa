"use client";

import { useEffect, useRef, memo } from "react";

// ── Drop this into any page that uses the particle canvas ──
// Usage: <ParticleCanvas />
// It is memoized — it NEVER re-renders when parent state changes.
// This fixes input lag and animation jank across the entire app.

const ParticleCanvas = memo(function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width  = (canvas.width  = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const pts = Array.from({ length: 100 }, () => ({
      x:  Math.random() * width,
      y:  Math.random() * height,
      r:  Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.9,
      dy: (Math.random() - 0.5) * 0.9,
    }));

    let raf: number;

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = "rgba(10,10,30,0.2)";
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.dx; p.y += p.dy;
        if (p.x > width  || p.x < 0) p.dx *= -1;
        if (p.y > height || p.y < 0) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fill();

        // Only connect nearby points — skip if too many checks would lag
        for (let j = i + 1; j < pts.length; j++) {
          const q   = pts[j];
          const dx  = p.x - q.x;
          const dy  = p.y - q.y;
          const d2  = dx * dx + dy * dy;
          if (d2 < 18000) { // ~134px
            const alpha = 0.18 * (1 - d2 / 18000);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100,150,255,${alpha})`;
            ctx.lineWidth   = 0.6;
            ctx.shadowBlur  = 0; // disable shadow on lines — major perf win
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }

    draw();

    const onResize = () => {
      width  = canvas.width  = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []); // runs once only

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
});

export default ParticleCanvas;
