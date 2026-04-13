"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Particle = {
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];
    const COUNT = 120;

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 1.2,
        dy: (Math.random() - 0.5) * 1.2,
      });
    }

    // ===== SPATIAL GRID SETTINGS =====
    const CELL_SIZE = 160; // must be >= link distance
    let cols = Math.ceil(width / CELL_SIZE);
    let rows = Math.ceil(height / CELL_SIZE);

    let grid: number[][] = [];

    function buildGrid() {
      grid = Array.from({ length: cols * rows }, () => []);
    }

    function getCellIndex(x: number, y: number) {
      const col = Math.floor(x / CELL_SIZE);
      const row = Math.floor(y / CELL_SIZE);
      return row * cols + col;
    }

    function insertParticles() {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const idx = getCellIndex(p.x, p.y);
        if (grid[idx]) grid[idx].push(i);
      }
    }

    function draw() {
      if (!ctx) return;

      ctx.fillStyle = "rgba(10,10,30,0.25)";
      ctx.fillRect(0, 0, width, height);

      buildGrid();
      insertParticles();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // move
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > width) p.dx *= -1;
        if (p.y < 0 || p.y > height) p.dy *= -1;

        // draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fill();

        // ===== ONLY CHECK NEAR CELLS (BIG SPEEDUP) =====
        const cx = Math.floor(p.x / CELL_SIZE);
        const cy = Math.floor(p.y / CELL_SIZE);

        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = cx + ox;
            const ny = cy + oy;

            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;

            const idx = ny * cols + nx;
            const cell = grid[idx];

            for (let k = 0; k < cell.length; k++) {
              const j = cell[k];
              if (j <= i) continue;

              const q = particles[j];
              const dist = Math.hypot(p.x - q.x, p.y - q.y);

              if (dist < 150) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(100,150,255,${
                  0.25 * (1 - dist / 150)
                })`;
                ctx.lineWidth = 1;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
              }
            }
          }
        }
      }

      requestAnimationFrame(draw);
    }

    draw();

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      cols = Math.ceil(width / CELL_SIZE);
      rows = Math.ceil(height / CELL_SIZE);
    };

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-purple-900 to-indigo-900 px-4">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Floating shapes */}
      <div className="absolute w-12 h-12 rounded-full bg-pink-500/40 animate-bounce-slow top-16 left-10" />
      <div className="absolute w-20 h-20 rounded-full bg-indigo-500/30 animate-bounce-slow bottom-32 right-16" />
      <div className="absolute w-6 h-6 rounded-full bg-cyan-400/50 animate-bounce-slow top-40 right-28" />

      {/* Card */}
      <div className="relative backdrop-blur-3xl bg-white/5 border border-white/20 rounded-3xl p-12 max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-white">IntelliGPA</h1>
        <p className="text-gray-300 mt-4">
          Your AI-powered academic assistant
        </p>

        <div className="flex gap-4 mt-8">
          <Link
            href="/login"
            className="flex-1 bg-indigo-500 text-white py-3 rounded-xl"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="flex-1 border border-indigo-400 text-indigo-300 py-3 rounded-xl"
          >
            Sign Up
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounceSlow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-bounce-slow {
          animation: bounceSlow 6s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}