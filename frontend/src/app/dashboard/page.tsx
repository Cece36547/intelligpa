"use client";

import { useEffect, useState, useRef } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Calendar", href: "/calendar" },
  { label: "GPA Predictor", href: "/gpa-predictor" },
  { label: "Profile", href: "/profile" },
];

const AVATARS = ["🦊","🐼","🦋","🐸","🦄","🐙","🦩","🐬","🦁","🐧","🦖","🌟","🔥","💎","🚀"];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [currentGpa, setCurrentGpa] = useState<string | null>(null);
  const [goalGpa, setGoalGpa] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Load profile from localStorage
  useEffect(() => {
    setUsername(localStorage.getItem("student_user_name") ?? "");
    setCurrentGpa(localStorage.getItem("current_gpa"));
    setGoalGpa(localStorage.getItem("goal_gpa"));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.push("/login");
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    router.push("/login");
  };

  // Particles
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const particles: { x: number; y: number; r: number; dx: number; dy: number }[] = [];

    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * width, y: Math.random() * height,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 1.2, dy: (Math.random() - 0.5) * 1.2,
      });
    }

    function animate() {
      if (!ctx) return;
      ctx.fillStyle = "rgba(10,10,30,0.2)";
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.dx; p.y += p.dy;
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
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }
    animate();

    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mounted]);

  if (!mounted) return null;

  const avatarEmoji = username ? AVATARS[username.charCodeAt(0) % AVATARS.length] : "🎓";
  const gpaProgress = goalGpa ? Math.min((parseFloat(currentGpa ?? "0") / parseFloat(goalGpa)) * 100, 100) : 0;

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-black via-purple-900 to-indigo-900">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

      {/* Navbar */}
      <nav className="relative z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span onClick={() => router.push("/dashboard")} className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 cursor-pointer select-none">
            IntelliGPA
          </span>
          <ul className="flex items-center gap-8">
            {navLinks.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <button onClick={() => router.push(href)}
                    className={`relative text-sm font-semibold tracking-wide transition-all duration-300 pb-1 ${isActive ? "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400" : "text-gray-300 hover:text-white"}`}>
                    {label}
                    {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 shadow-[0_0_6px_rgba(200,100,255,0.8)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Floating shapes */}
      <div className="absolute w-12 h-12 rounded-full bg-pink-500/40 animate-bounce-slow top-16 left-10 shadow-[0_0_30px_rgba(255,192,203,0.5)]" />
      <div className="absolute w-20 h-20 rounded-full bg-indigo-500/30 animate-bounce-slow bottom-32 right-16 shadow-[0_0_40px_rgba(123,104,238,0.4)]" />
      <div className="absolute w-6 h-6 rounded-full bg-cyan-400/50 animate-bounce-slow top-40 right-28 shadow-[0_0_25px_rgba(0,255,255,0.5)]" />

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="backdrop-blur-3xl bg-white/5 border border-white/20 rounded-3xl p-10 max-w-2xl w-full shadow-3xl animate-float-card">

          {user ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/30 via-purple-500/30 to-cyan-500/30 blur-md" />
                    <span className="relative text-3xl animate-float-emoji"
                      style={{ filter: "drop-shadow(0 0 10px rgba(168,85,247,0.8))" }}>
                      {avatarEmoji}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 animate-glow-text">
                      {username ? `Hey, @${username} 👋` : "Dashboard"}
                    </h1>
                    <p className="text-gray-400 text-xs mt-0.5">Welcome back to IntelliGPA</p>
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="text-xs text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-400/30 px-3 py-1.5 rounded-lg transition-all duration-200">
                  Log Out
                </button>
              </div>

              {/* GPA Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current GPA</p>
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                    {currentGpa ? parseFloat(currentGpa).toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">out of 4.0</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Goal GPA</p>
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                    {goalGpa ? parseFloat(goalGpa).toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">your target</p>
                </div>
              </div>

              {/* Progress bar toward goal */}
              {goalGpa && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Progress toward goal</span>
                    <span>{Math.round(gpaProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 transition-all duration-700"
                      style={{ width: `${gpaProgress}%`, boxShadow: "0 0 8px rgba(168,85,247,0.6)" }} />
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Add Course", icon: "📚", href: "/courses" },
                  { label: "GPA Predictor", icon: "🔮", href: "/gpa-predictor" },
                  { label: "Calendar", icon: "📅", href: "/calendar" },
                  { label: "My Profile", icon: "👤", href: "/profile" },
                ].map(item => (
                  <button key={item.label} onClick={() => router.push(item.href)}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/30 rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group">
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-200">{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-200 text-center">Loading...</p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes glowText { 0%,100% { text-shadow: 0 0 20px #fff,0 0 40px #ff00ff,0 0 60px #00ffff; } 50% { text-shadow: 0 0 40px #fff,0 0 60px #ff00ff,0 0 80px #00ffff; } }
        @keyframes bounceSlow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes floatCard { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(0.5deg); } }
        @keyframes floatEmoji { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

        .animate-glow-text { animation: glowText 2s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounceSlow 6s ease-in-out infinite; }
        .animate-float-card { animation: floatCard 6s ease-in-out infinite; }
        .animate-float-emoji { animation: floatEmoji 2s ease-in-out infinite; }
      `}</style>
    </main>
  );
}
