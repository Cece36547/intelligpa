"use client";

import { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// Memoized so it NEVER re-renders when typing — fixes input lag
const ParticleCanvas = memo(function ParticleCanvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
});

type Step = "auth" | "profile";
type ProfileSubStep = "username" | "currentGpa" | "goalGpa" | "done";

const PROFILE_STEPS: ProfileSubStep[] = ["username", "currentGpa", "goalGpa"];

const GOAL_PRESETS = [
  { label: "Dean's List", value: "3.8", emoji: "🏆", desc: "Top academic honors" },
  { label: "Honor Roll",  value: "3.5", emoji: "⭐", desc: "Strong performance" },
  { label: "Solid B+",   value: "3.3", emoji: "📈", desc: "Above average" },
  { label: "Stay Eligible", value: "2.0", emoji: "✅", desc: "Keep moving forward" },
];

function GpaArc({ value, max = 4.0, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ * 0.75;
  const gap = circ - dash;

  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-[135deg]">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)"
          strokeWidth="10" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${gap + circ * 0.25}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-black text-white">{value.toFixed(1)}</div>
        <div className="text-xs text-gray-400 tracking-widest uppercase">GPA</div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("auth");
  const [profileSubStep, setProfileSubStep] = useState<ProfileSubStep>("username");
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");
  const [animating, setAnimating] = useState(false);

  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Profile
  const [username, setUsername] = useState("");
  const [currentGpa, setCurrentGpa] = useState<number | null>(null);
  const [goalGpa, setGoalGpa] = useState<number | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const cleanFirebaseError = (msg: string) =>
    msg.replace("Firebase: ", "").replace(/\s*\(auth\/[^)]+\)\.?/, "").trim();

  const transitionTo = (target: Step | ProfileSubStep, dir: "left" | "right" = "left") => {
    setSlideDir(dir);
    setAnimating(true);
    setTimeout(() => {
      if (target === "auth" || target === "profile") setStep(target as Step);
      else setProfileSubStep(target as ProfileSubStep);
      setMessage("");
      setAnimating(false);
    }, 280);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(""); setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      transitionTo("profile");
    } catch (err: any) { setMessage(cleanFirebaseError(err.message)); }
    finally { setAuthLoading(false); }
  };

  const handleGoogle = async () => {
    setMessage(""); setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      transitionTo("profile");
    } catch (err: any) { setMessage(cleanFirebaseError(err.message)); }
    finally { setAuthLoading(false); }
  };

  const handleMicrosoft = async () => {
    setMessage(""); setAuthLoading(true);
    try {
      const p = new OAuthProvider("microsoft.com");
      p.setCustomParameters({ tenant: "common" });
      await signInWithPopup(auth, p);
      transitionTo("profile");
    } catch (err: any) { setMessage(cleanFirebaseError(err.message)); }
    finally { setAuthLoading(false); }
  };

  const handleFinish = async () => {
    if (!goalGpa) return;
    setProfileLoading(true);
    try {
      localStorage.setItem("student_user_name", username);
      if (currentGpa !== null) localStorage.setItem("current_gpa", String(currentGpa));
      if (goalGpa !== null) localStorage.setItem("goal_gpa", String(goalGpa));

      try {
        const res = await fetch("http://localhost:8000/student/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_user_name: username,
            current_gpa: currentGpa,
            goal_gpa: goalGpa,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          console.warn("Backend error:", err.detail);
        }
      } catch {
        console.warn("Backend offline — profile saved locally only.");
      }

      router.push("/dashboard");
    } catch (err) { setMessage("Something went wrong. Please try again."); }
    finally { setProfileLoading(false); }
  };

  // Particles — only runs once on mount
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const pts = Array.from({ length: 120 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 3 + 1,
      dx: (Math.random() - 0.5) * 1.2, dy: (Math.random() - 0.5) * 1.2,
    }));
    let raf: number;
    function draw() {
      ctx!.fillStyle = "rgba(10,10,30,0.2)";
      ctx!.fillRect(0, 0, w, h);
      pts.forEach((p, i) => {
        p.x += p.dx; p.y += p.dy;
        if (p.x > w || p.x < 0) p.dx *= -1;
        if (p.y > h || p.y < 0) p.dy *= -1;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255,255,255,0.4)"; ctx!.fill();
        pts.slice(i + 1).forEach(q => {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 150) {
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(100,150,255,${0.2 * (1 - d / 150)})`;
            ctx!.shadowBlur = 10; ctx!.shadowColor = "rgba(100,150,255,0.2)";
            ctx!.moveTo(p.x, p.y); ctx!.lineTo(q.x, q.y); ctx!.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [mounted]);

  if (!mounted) return null;

  const inputCls = "w-full rounded-xl border p-3 bg-white/10 text-white placeholder-gray-400 border-white/20 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-all duration-200 text-lg";
  const profileIdx = PROFILE_STEPS.indexOf(profileSubStep);
  const profilePct = step === "auth" ? 0 : profileSubStep === "done" ? 100 : ((profileIdx + 1) / (PROFILE_STEPS.length + 1)) * 100;

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-purple-900 to-indigo-900 px-4 py-12">
      <ParticleCanvas canvasRef={canvasRef} />
      <div className="absolute w-12 h-12 rounded-full bg-pink-500/40 animate-bounce-slow top-16 left-10 shadow-[0_0_30px_rgba(255,192,203,0.5)]" />
      <div className="absolute w-20 h-20 rounded-full bg-indigo-500/30 animate-bounce-slow bottom-32 right-16 shadow-[0_0_40px_rgba(123,104,238,0.4)]" />
      <div className="absolute w-6 h-6 rounded-full bg-cyan-400/50 animate-bounce-slow top-40 right-28 shadow-[0_0_25px_rgba(0,255,255,0.5)]" />

      <div className="relative backdrop-blur-3xl bg-white/5 border border-white/20 rounded-3xl p-10 max-w-md w-full shadow-3xl animate-float-card">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span className={step === "auth" ? "text-purple-300 font-semibold" : "text-gray-400"}>Account</span>
            <span className={step === "profile" && profileSubStep !== "done" ? "text-cyan-300 font-semibold" : profileSubStep === "done" ? "text-emerald-300 font-semibold" : "text-gray-400"}>Profile Setup</span>
            <span className={profileSubStep === "done" ? "text-emerald-300 font-semibold" : "text-gray-400"}>Ready!</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${profilePct}%`,
                background: "linear-gradient(to right, #f472b6, #a855f7, #22d3ee)",
                boxShadow: "0 0 10px rgba(168,85,247,0.5)",
              }}
            />
          </div>
        </div>

        <div className={`transition-all duration-280 ${animating ? (slideDir === "left" ? "opacity-0 translate-x-8" : "opacity-0 -translate-x-8") : "opacity-100 translate-x-0"}`}
          style={{ transition: "opacity 0.28s ease, transform 0.28s ease" }}>

          {/* ── AUTH STEP ── */}
          {step === "auth" && (
            <div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 animate-glow-text mb-1">Welcome</h1>
              <p className="text-gray-400 text-sm mb-7">Create your IntelliGPA account</p>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-300">Email address</label>
                  <input type="email" placeholder="you@example.com" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-300">Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" className={inputCls + " pr-16"} value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs tracking-wider transition-colors">{showPassword ? "HIDE" : "SHOW"}</button>
                  </div>
                </div>
                <button type="submit" disabled={authLoading} className="w-full rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white p-3 font-semibold shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60">
                  {authLoading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</span> : "Continue →"}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/15" />
                <span className="text-gray-500 text-xs uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/15" />
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={handleGoogle} disabled={authLoading} className="w-full flex items-center justify-center gap-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-white p-3 text-sm font-medium transition-all duration-200 hover:scale-[1.01] disabled:opacity-60">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </button>
                <button onClick={handleMicrosoft} disabled={authLoading} className="w-full flex items-center justify-center gap-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-white p-3 text-sm font-medium transition-all duration-200 hover:scale-[1.01] disabled:opacity-60">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>
                  Continue with Microsoft
                </button>
              </div>

              {message && <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20"><p className="text-sm text-red-300">{message}</p></div>}
              <p className="mt-6 text-center text-gray-400 text-sm">Already have an account?{" "}<Link href="/login" className="text-purple-300 hover:text-purple-200 font-medium">Sign in</Link></p>
            </div>
          )}

          {/* ── PROFILE: USERNAME ── */}
          {step === "profile" && profileSubStep === "username" && (
            <div>
              {(() => {
                const AVATARS = ["🦊","🐼","🦋","🐸","🦄","🐙","🦩","🐬","🦁","🐧","🦖","🌟","🔥","💎","🚀"];
                const MOONS =   ["⭐","💫","✨","🌙","💥","🎯","🎪","🎨","🎭","🎬","🎮","🏆","💡","🔮","🎲"];
                const idx = username.length > 0 ? username.charCodeAt(0) % AVATARS.length : 0;
                const emoji = username.length > 0 ? AVATARS[idx] : null;
                const moon  = username.length > 0 ? MOONS[idx] : null;
                const ready = username.length >= 6;
                return (
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative w-32 h-32 flex items-center justify-center select-none">
                      <div className={`absolute inset-0 rounded-full border-2 border-dashed transition-all duration-700
                        ${ready ? "border-purple-400/50 animate-spin-slow" : "border-white/10"}`} />
                      <div className={`absolute w-20 h-20 rounded-full transition-all duration-500
                        ${ready ? "bg-gradient-to-br from-pink-500/40 via-purple-600/40 to-cyan-500/40 blur-lg scale-110" : "bg-white/5 blur-sm"}`} />
                      {ready && (
                        <span className="absolute text-lg animate-orbit" style={{ top: 4, right: 8 }}>{moon}</span>
                      )}
                      <span
                        className={`relative text-5xl transition-all duration-500 z-10 ${ready ? "animate-float-emoji scale-110" : "opacity-40 scale-90"}`}
                        style={{ filter: ready ? "drop-shadow(0 0 16px rgba(168,85,247,1)) drop-shadow(0 0 6px rgba(34,211,238,0.6))" : "grayscale(1)" }}
                      >
                        {emoji ?? "🎓"}
                      </span>
                      {ready && (
                        <>
                          <span className="absolute top-2 left-6 text-xs animate-twinkle" style={{animationDelay:"0s"}}>✦</span>
                          <span className="absolute bottom-4 right-4 text-xs animate-twinkle" style={{animationDelay:"0.4s"}}>✦</span>
                          <span className="absolute bottom-2 left-3 text-xs animate-twinkle" style={{animationDelay:"0.8s"}}>✦</span>
                        </>
                      )}
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-sm font-mono transition-all duration-300
                      ${username.length > 0 ? "bg-white/10 border border-purple-400/40 text-white shadow-sm shadow-purple-500/20" : "bg-white/5 border border-white/10 text-gray-600"}`}>
                      @{username.length > 0 ? username.toLowerCase().replace(/\s/g, "_") : "username"}
                    </div>
                    {username.length >= 6 && (
                      <p className="text-xs text-purple-300 mt-1.5">Your IntelliGPA identity ✦</p>
                    )}
                  </div>
                );
              })()}

              <h2 className="text-2xl font-extrabold text-white mb-1 text-center">Create a username</h2>
              <p className="text-gray-400 text-sm mb-5 text-center">Your unique ID across IntelliGPA</p>

              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. student_dan, anna_c"
                  className={inputCls + " text-center text-lg tracking-wide pr-14"}
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, "_").toLowerCase())}
                  maxLength={20}
                  autoFocus
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono tabular-nums
                  ${username.length >= 6 ? "text-emerald-400" : username.length > 0 ? "text-amber-400" : "text-gray-600"}`}>
                  {username.length}/20
                </span>
              </div>

              <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((username.length / 20) * 100, 100)}%`,
                    background: username.length < 6 ? "#f59e0b" : username.length < 12 ? "#a855f7" : "#22d3ee",
                    boxShadow: username.length >= 6 ? "0 0 8px rgba(168,85,247,0.6)" : "none",
                  }}
                />
              </div>

              <div className="mt-2 h-5 text-center">
                {username.length === 0 && <p className="text-xs text-gray-500">Minimum 6 characters · letters, numbers, underscores</p>}
                {username.length > 0 && username.length < 6 && <p className="text-xs text-amber-400">{6 - username.length} more character{6 - username.length !== 1 ? "s" : ""} to go</p>}
                {username.length >= 6 && username.length < 12 && <p className="text-xs text-purple-300">✓ Good username!</p>}
                {username.length >= 12 && <p className="text-xs text-cyan-300">✓ Great username!</p>}
              </div>

              <div className="flex gap-2 justify-center mt-4 flex-wrap">
                {[
                  { label: "6+ chars", ok: username.length >= 6 },
                  { label: "no spaces", ok: !username.includes(" ") },
                  { label: "under 20", ok: username.length <= 20 && username.length > 0 },
                ].map(rule => (
                  <span key={rule.label} className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-200
                    ${rule.ok ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/15 text-gray-500"}`}>
                    {rule.ok ? "✓" : "·"} {rule.label}
                  </span>
                ))}
              </div>

              <button
                onClick={() => transitionTo("currentGpa")}
                disabled={username.length < 6}
                className="w-full mt-6 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white p-3 font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:scale-100 shadow-lg shadow-purple-500/20"
              >
                {username.length >= 6 ? `Continue as @${username} →` : "Next →"}
              </button>
            </div>
          )}

          {/* ── PROFILE: CURRENT GPA ── */}
          {step === "profile" && profileSubStep === "currentGpa" && (
            <div>
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-3xl font-extrabold text-white mb-1">Where are you now?</h2>
              <p className="text-gray-400 text-sm mb-6">Enter your current GPA, or skip if you're just starting out</p>

              <GpaArc value={currentGpa ?? 0} color="#a855f7" />

              <div className="mt-6">
                <input
                  type="range" min="0" max="4.0" step="0.1"
                  value={currentGpa ?? 0}
                  onChange={e => setCurrentGpa(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.0</span><span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => transitionTo("username", "right")} className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-gray-300 p-3 text-sm font-medium transition-all duration-200">← Back</button>
                <button onClick={() => { setCurrentGpa(null); transitionTo("goalGpa"); }} className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-gray-400 p-3 text-sm transition-all duration-200">Skip</button>
                <button onClick={() => transitionTo("goalGpa")} className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-3 text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">Next →</button>
              </div>
            </div>
          )}

          {/* ── PROFILE: GOAL GPA ── */}
          {step === "profile" && profileSubStep === "goalGpa" && (
            <div>
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-3xl font-extrabold text-white mb-1">Set your target</h2>
              <p className="text-gray-400 text-sm mb-6">What GPA are you aiming for?</p>

              <GpaArc value={goalGpa ?? 0} color="#22d3ee" />

              <div className="grid grid-cols-2 gap-2 mt-6 mb-4">
                {GOAL_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setSelectedPreset(p.label); setGoalGpa(parseFloat(p.value)); setCustomGoal(""); }}
                    className={`flex items-start gap-2 p-3 rounded-xl border text-left text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                      ${selectedPreset === p.label ? "bg-cyan-500/20 border-cyan-400/50 text-white shadow-lg shadow-cyan-500/10" : "bg-white/5 border-white/15 text-gray-300 hover:bg-white/10"}`}
                  >
                    <span className="text-xl mt-0.5">{p.emoji}</span>
                    <div>
                      <div className="font-semibold leading-none">{p.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.value} · {p.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mb-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Or drag to set custom goal</label>
                <input
                  type="range" min="0" max="4.0" step="0.1"
                  value={goalGpa ?? 0}
                  onChange={e => { setGoalGpa(parseFloat(e.target.value)); setSelectedPreset(null); }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.0</span><span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span>
                </div>
              </div>

              {message && <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"><p className="text-sm text-red-300">{message}</p></div>}

              <div className="flex gap-3 mt-5">
                <button onClick={() => transitionTo("currentGpa", "right")} className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-gray-300 p-3 text-sm font-medium transition-all duration-200">← Back</button>
                <button
                  onClick={handleFinish}
                  disabled={!goalGpa || profileLoading}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500 text-white p-3 font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:scale-100"
                >
                  {profileLoading
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span>
                    : "Launch Dashboard 🚀"}
                </button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "profile" && profileSubStep === "done" && (
            <div className="text-center py-8">
              <div className="text-7xl mb-4 animate-bounce-once">🎓</div>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">You're all set!</h2>
              <p className="text-gray-400 mb-6">Taking you to your dashboard...</p>
              <div className="flex justify-center gap-2">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        @keyframes glowText { 0%,100% { text-shadow: 0 0 20px #fff,0 0 40px #ff00ff,0 0 60px #00ffff; } 50% { text-shadow: 0 0 40px #fff,0 0 60px #ff00ff,0 0 80px #00ffff; } }
        @keyframes bounceSlow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes floatCard { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(0.5deg); } }
        @keyframes bounceOnce { 0%,100% { transform: translateY(0); } 30% { transform: translateY(-20px); } 60% { transform: translateY(-8px); } }
        @keyframes wiggle { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
        @keyframes popIn { 0% { transform: scale(0); opacity:0; } 70% { transform: scale(1.3); } 100% { transform: scale(1); opacity:1; } }
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbit { 0% { transform: rotate(0deg) translateX(44px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(44px) rotate(-360deg); } }
        @keyframes floatEmoji { 0%,100% { transform: translateY(0) scale(1.1); } 50% { transform: translateY(-6px) scale(1.15); } }
        @keyframes twinkle { 0%,100% { opacity:0; transform:scale(0.5); } 50% { opacity:1; transform:scale(1.2); } }

        .animate-glow-text { animation: glowText 2s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounceSlow 6s ease-in-out infinite; }
        .animate-float-card { animation: floatCard 6s ease-in-out infinite; }
        .animate-bounce-once { animation: bounceOnce 1s ease forwards; }
        .animate-wiggle { animation: wiggle 0.6s ease-in-out infinite; }
        .animate-pop-in { animation: popIn 0.4s cubic-bezier(.4,0,.2,1) forwards; }
        .animate-spin-slow { animation: spinSlow 4s linear infinite; }
        .animate-orbit { animation: orbit 2.5s linear infinite; }
        .animate-float-emoji { animation: floatEmoji 2s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 1.2s ease-in-out infinite; }

        input[type=range] { height: 6px; border-radius: 9999px; }
      `}</style>
    </main>
  );
}