"use client";

import { useEffect, useState, useRef } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Holographic particles background
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: { x: number; y: number; r: number; dx: number; dy: number }[] = [];
    const count = 120;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 1.2,
        dy: (Math.random() - 0.5) * 1.2,
      });
    }

    function animate() {
      if (!ctx) return;
      ctx.fillStyle = "rgba(10,10,30,0.2)";
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;

        if (p.x > width || p.x < 0) p.dx *= -1;
        if (p.y > height || p.y < 0) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100,150,255,${0.2 * (1 - dist / 150)})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(100,150,255,0.2)";
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }

    animate();

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mounted]);

  if (!mounted) return null; // prevent SSR hydration mismatch

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-purple-900 to-indigo-900 px-4">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

      {/* Floating shapes */}
      <div className="absolute w-12 h-12 rounded-full bg-pink-500/40 animate-bounce-slow top-16 left-10 shadow-[0_0_30px_rgba(255,192,203,0.5)]"></div>
      <div className="absolute w-20 h-20 rounded-full bg-indigo-500/30 animate-bounce-slow bottom-32 right-16 shadow-[0_0_40px_rgba(123,104,238,0.4)]"></div>
      <div className="absolute w-6 h-6 rounded-full bg-cyan-400/50 animate-bounce-slow top-40 right-28 shadow-[0_0_25px_rgba(0,255,255,0.5)]"></div>

      {/* Glassmorphic Dashboard card */}
      <div className="relative backdrop-blur-3xl bg-white/5 border border-white/20 rounded-3xl p-12 max-w-2xl w-full text-center shadow-3xl transform transition-transform hover:scale-105 hover:rotate-1 hover:shadow-4xl animate-float-card">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-400 animate-glow-text mb-6">
          Dashboard
        </h1>

        {user ? (
          <>
            <p className="mb-4 text-gray-200">Logged in as: {user.email}</p>
            <button
              onClick={handleLogout}
              className="rounded bg-red-600 text-white px-4 py-2 shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              Log Out
            </button>
          </>
        ) : (
          <p className="text-gray-200">Loading...</p>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeSlide { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes glowText { 0%,100% { text-shadow: 0 0 20px #fff,0 0 40px #ff00ff,0 0 60px #00ffff; } 50% { text-shadow: 0 0 40px #fff,0 0 60px #ff00ff,0 0 80px #00ffff; } }
        @keyframes bounceSlow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes floatCard { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(0.5deg); } }

        .animate-glow-text { animation: glowText 2s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounceSlow 6s ease-in-out infinite; }
        .animate-float-card { animation: floatCard 6s ease-in-out infinite; }
      `}</style>
    </main>
  );
}