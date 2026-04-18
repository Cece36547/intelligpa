"use client";

import { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const AVATARS = ["🦊","🐼","🦋","🐸","🦄","🐙","🦩","🐬","🦁","🐧","🦖","🌟","🔥","💎","🚀"];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // Time-based greeting
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const cleanError = (msg: string) =>
    msg.replace("Firebase: ", "").replace(/\s*\(auth\/[^)]+\)\.?/, "").trim();

  // Derive avatar from email prefix
  const avatarEmoji =
    email.length > 0
      ? AVATARS[email.charCodeAt(0) % AVATARS.length]
      : null;

  // After any successful sign-in, fetch the student profile from backend
  const loadProfile = async (userEmail: string) => {
  try {
    // Use username from localStorage (set during signup)
    const username = localStorage.getItem("student_user_name");
    if (!username) return;
    const res = await fetch(`http://localhost:8000/student/${username}`);
    if (res.ok) {
      const data = await res.json();
      if (data.current_gpa != null)
        localStorage.setItem("current_gpa", String(data.current_gpa));
      if (data.goal_gpa != null)
        localStorage.setItem("goal_gpa", String(data.goal_gpa));
    }
  } catch {
    console.warn("Could not fetch profile from backend.");
  }
};
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // If input looks like a username (no @), look up email first
    let loginEmail = email;

    if (!email.includes("@")) {
      try {
        const res = await fetch(
          `http://localhost:8000/student/${encodeURIComponent(email)}`
        );
        if (res.ok) {
          const data = await res.json();

          if (data.student_user_name)
            localStorage.setItem("student_user_name", data.student_user_name);
          if (data.current_gpa != null)
            localStorage.setItem("current_gpa", String(data.current_gpa));
          if (data.goal_gpa != null)
            localStorage.setItem("goal_gpa", String(data.goal_gpa));

          setMessage("Firebase requires your email to sign in. Enter your email.");
          setLoading(false);
          return;
        } else {
          setMessage("Username not found. Try email instead.");
          setLoading(false);
          return;
        }
      } catch {
        setMessage("Could not reach server. Please use email.");
        setLoading(false);
        return;
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
      await loadProfile(cred.user.email ?? loginEmail);
      router.push("/dashboard");
    } catch (error: any) {
      setMessage(cleanError(error.message));
    } finally {
      setLoading(false);
    }
  };

  // GOOGLE (UNCHANGED)
  const handleGoogle = async () => {
    setMessage("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      await loadProfile(cred.user.email ?? "");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // MICROSOFT (UNCHANGED)
  const handleMicrosoft = async () => {
    setMessage("");
    setLoading(true);
    try {
      const provider = new OAuthProvider("microsoft.com");
      provider.setCustomParameters({ tenant: "common", prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      await loadProfile(cred.user.email ?? "");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // PARTICLES (UNCHANGED DESIGN)
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const pts = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 3 + 1,
      dx: (Math.random() - 0.5) * 1.2,
      dy: (Math.random() - 0.5) * 1.2,
    }));

    function draw() {
      if (!ctx) return;

      ctx.fillStyle = "rgba(10,10,30,0.2)";
      ctx.fillRect(0, 0, width, height);

      pts.forEach((p, i) => {
        p.x += p.dx;
        p.y += p.dy;

        if (p.x > width || p.x < 0) p.dx *= -1;
        if (p.y > height || p.y < 0) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fill();

        pts.slice(i + 1).forEach((q) => {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100,150,255,${
              0.2 * (1 - d / 150)
            })`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(100,150,255,0.2)";
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(draw);
    }

    draw();

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  if (!mounted) return null;

  const inputCls =
    "w-full rounded-xl border p-3 bg-white/10 text-white placeholder-gray-400 border-white/20 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-all duration-200 text-base";

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-purple-900 to-indigo-900 px-4">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

      {/* Floating shapes */}
      <div className="absolute w-12 h-12 rounded-full bg-pink-500/40 animate-bounce-slow top-16 left-10 shadow-[0_0_30px_rgba(255,192,203,0.5)]" />
      <div className="absolute w-20 h-20 rounded-full bg-indigo-500/30 animate-bounce-slow bottom-32 right-16 shadow-[0_0_40px_rgba(123,104,238,0.4)]" />
      <div className="absolute w-6 h-6 rounded-full bg-cyan-400/50 animate-bounce-slow top-40 right-28 shadow-[0_0_25px_rgba(0,255,255,0.5)]" />

      <div className="relative backdrop-blur-3xl bg-white/5 border border-white/20 rounded-3xl p-10 max-w-md w-full shadow-3xl animate-float-card">

        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 flex items-center justify-center mb-4">
            <div className={`absolute inset-0 rounded-2xl transition-all duration-500
              ${email.length > 0
                ? "bg-gradient-to-br from-pink-500/30 via-purple-500/30 to-cyan-500/30 blur-lg scale-110"
                : "bg-white/5 blur-sm"}`}
            />
            <div className={`absolute inset-0 rounded-2xl border-2 border-dashed transition-all duration-500
              ${email.length > 0 ? "border-purple-400/40 animate-spin-slow" : "border-white/10"}`}
            />
            <span className={`relative text-4xl z-10 transition-all duration-300
              ${email.length > 0 ? "animate-float-emoji scale-110" : "opacity-30"}`}
              style={{ filter: email.length > 0 ? "drop-shadow(0 0 12px rgba(168,85,247,0.9))" : "none" }}>
              {avatarEmoji ?? "🎓"}
            </span>
          </div>

          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 animate-glow-text">
            {greeting || "Welcome back"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to IntelliGPA</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email or username" />
          <input className={inputCls} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white p-3 font-semibold shadow-lg"
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-gray-500 text-xs uppercase">or</span>
          <div className="flex-1 h-px bg-white/15" />
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 rounded-xl bg-white/8 border border-white/15 text-white p-3">
            Continue with Google
          </button>

          <button onClick={handleMicrosoft} className="w-full flex items-center justify-center gap-3 rounded-xl bg-white/8 border border-white/15 text-white p-3">
            Continue with Microsoft
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300">{message}</p>
          </div>
        )}

        <p className="mt-6 text-center text-gray-400 text-sm">
          <Link href="/signup" className="text-purple-300 hover:text-purple-200">
            Sign up free
          </Link>
        </p>
      </div>

      <style jsx>{`
        @keyframes glowText {
          0%,100% { text-shadow: 0 0 20px #fff,0 0 40px #ff00ff,0 0 60px #00ffff; }
          50% { text-shadow: 0 0 40px #fff,0 0 60px #ff00ff,0 0 80px #00ffff; }
        }
        @keyframes bounceSlow {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes floatCard {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.5deg); }
        }
        @keyframes floatEmoji {
          0%,100% { transform: translateY(0) scale(1.1); }
          50% { transform: translateY(-5px) scale(1.15); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}