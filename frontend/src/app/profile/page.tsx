"use client";

import { useState, useEffect, memo } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

const NAVLINKS = [
  { label:"Dashboard",    href:"/dashboard" },
  { label:"Calendar",     href:"/calendar" },
  { label:"GPA Predictor",href:"/gpa-predictor" },
  { label:"Profile",      href:"/profile" },
];

const AVATARS = ["🦊","🐼","🦋","🐸","🦄","🐙","🦩","🐬","🦁","🐧","🦖","🌟","🔥","💎","🚀"];
const COURSE_COLORS = ["#a78bfa","#38bdf8","#fb7185","#34d399","#fb923c","#818cf8","#f87171","#86efac"];

const GRADE_MAP = [
  { letter:"A",  min:93, points:4.0, hex:"#22c55e" },
  { letter:"A-", min:90, points:3.7, hex:"#4ade80" },
  { letter:"B+", min:87, points:3.3, hex:"#38bdf8" },
  { letter:"B",  min:83, points:3.0, hex:"#60a5fa" },
  { letter:"B-", min:80, points:2.7, hex:"#818cf8" },
  { letter:"C+", min:77, points:2.3, hex:"#fbbf24" },
  { letter:"C",  min:73, points:2.0, hex:"#f59e0b" },
  { letter:"C-", min:70, points:1.7, hex:"#fb923c" },
  { letter:"D+", min:67, points:1.3, hex:"#f87171" },
  { letter:"D",  min:60, points:1.0, hex:"#ef4444" },
  { letter:"F",  min:0,  points:0.0, hex:"#dc2626" },
];

const getGrade = (gpa: number) => GRADE_MAP.find(g => (gpa/4)*100 >= g.min) ?? GRADE_MAP[GRADE_MAP.length-1];

function Toggle({ on, onChange }: { on:boolean; onChange:(v:boolean)=>void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="relative w-11 h-6 rounded-full flex-shrink-0 transition-all duration-300"
      style={{ background: on ? "linear-gradient(135deg,#7c3aed,#0891b2)" : "rgba(255,255,255,.08)", border:`1px solid ${on?"rgba(167,139,250,.4)":"rgba(255,255,255,.1)"}` }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full shadow-lg transition-all duration-300"
        style={{ left: on ? "calc(100% - 22px)" : "2px", background: on ? "white" : "rgba(107,114,128,1)", boxShadow: on ? "0 2px 8px rgba(124,58,237,.5)" : "none" }}/>
    </button>
  );
}

// Sleek minimal ring
const Ring = memo(function Ring({ val, goal, size=140 }: { val:number|null; goal:number; size?:number }) {
  const g = val !== null ? getGrade(val) : null;
  const p = val === null ? 0 : Math.min(val/4,1);
  const gp = Math.min(goal/4,1);
  const r = size*.38, circ = 2*Math.PI*r, cx=size/2, cy=size/2;
  return (
    <div className="relative flex items-center justify-center" style={{width:size,height:size}}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" style={{transform:"rotate(-135deg)"}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={size*.07}
          strokeDasharray={`${circ*.75} ${circ*.25}`} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size*.025}
          strokeDasharray={`${gp*circ*.75} ${circ-gp*circ*.75+circ*.25}`} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={g?.hex ?? "#6b7280"} strokeWidth={size*.07}
          strokeDasharray={`${p*circ*.75} ${circ-p*circ*.75+circ*.25}`} strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 ${size*.04}px ${g?.hex??"#6b7280"})`,transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)"}}/>
      </svg>
      <div className="z-10 text-center">
        <div className="font-black tabular-nums text-white" style={{fontSize:size*.22,lineHeight:1}}>
          {val !== null ? val.toFixed(2) : "—"}
        </div>
        {g && <div className="font-bold mt-0.5" style={{fontSize:size*.11,color:g.hex}}>{g.letter}</div>}
      </div>
    </div>
  );
});

export default function ProfilePage() {
  const router = useRouter(), pathname = usePathname();
  const [user, setUser] = useState<User|null>(null);
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [currentGpa, setCurrentGpa] = useState<number|null>(null);
  const [goalGpa, setGoalGpa] = useState(3.5);
  const [courses, setCourses] = useState<any[]>([]);
  const [memberSince, setMemberSince] = useState("");
  const [tab, setTab] = useState<"overview"|"security"|"settings">("overview");
  const [editGoal, setEditGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(3.5);
  const [currentPw, setCurrentPw] = useState(""), [newPw, setNewPw] = useState(""), [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [notifs, setNotifs] = useState({deadlines:true,gpa:true,weekly:false,grades:true});

  useEffect(() => {
    setMounted(true);
    const u=localStorage.getItem("student_user_name")??"";
    const g=localStorage.getItem("goal_gpa"), c=localStorage.getItem("current_gpa");
    setUsername(u);
    if(g){setGoalGpa(parseFloat(g));setNewGoal(parseFloat(g));}
    if(c) setCurrentGpa(parseFloat(c));
    const unsub=onAuthStateChanged(auth,usr=>{
      if(!usr){router.push("/login");return;}
      setUser(usr);
      if(usr.metadata.creationTime) setMemberSince(new Date(usr.metadata.creationTime).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}));
    });
    if(u) fetch(`http://localhost:8000/course/course/${u}`).then(r=>r.json()).then(d=>setCourses(Array.isArray(d)?d:[])).catch(()=>{});
    return ()=>unsub();
  },[router]);

  const handleLogout=async()=>{await signOut(auth);localStorage.clear();router.push("/login");};
  const handleSaveGoal=()=>{setGoalGpa(newGoal);localStorage.setItem("goal_gpa",String(newGoal));setEditGoal(false);};
  const handlePw=async()=>{
    setPwMsg(null);
    if(newPw!==confirmPw){setPwMsg({text:"Passwords don't match",ok:false});return;}
    if(newPw.length<6){setPwMsg({text:"Minimum 6 characters",ok:false});return;}
    if(!user?.email)return; setPwLoading(true);
    try{
      await reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,currentPw));
      await updatePassword(user,newPw);
      setPwMsg({text:"Password updated",ok:true});setCurrentPw("");setNewPw("");setConfirmPw("");
    }catch(e:any){setPwMsg({text:e.message.replace("Firebase: ","").replace(/\(auth\/.*\)/,"").trim(),ok:false});}
    finally{setPwLoading(false);}
  };

  if(!mounted) return null;

  const emoji    = username ? AVATARS[username.charCodeAt(0)%AVATARS.length] : "🎓";
  const grade    = currentGpa !== null ? getGrade(currentGpa) : null;
  const onTrack  = currentGpa !== null && currentGpa >= goalGpa;
  const prog     = currentGpa !== null ? Math.min((currentGpa/goalGpa)*100,100) : 0;
  const gap      = goalGpa - (currentGpa??0);
  const isEmail  = user?.providerData.some(p=>p.providerId==="password");
  const provider = user?.providerData[0]?.providerId;

  const totalAssign = courses.reduce((s:number,c:any)=>s+(c.categories??[]).reduce((ss:number,cat:any)=>ss+(cat.assignments??[]).length,0),0);
  const gradedAssign= courses.reduce((s:number,c:any)=>s+(c.categories??[]).reduce((ss:number,cat:any)=>ss+(cat.assignments??[]).filter((a:any)=>a.score!=null).length,0),0);

  return (
    <div className="min-h-screen" style={{background:"#050509",fontFamily:"system-ui,sans-serif"}}>

      {/* Subtle ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{position:"absolute",top:-200,left:-100,width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,.18) 0%,transparent 65%)",filter:"blur(40px)"}}/>
        <div style={{position:"absolute",top:-100,right:-200,width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(8,145,178,.12) 0%,transparent 65%)",filter:"blur(40px)"}}/>
      </div>

      {/* NAVBAR */}
      <nav style={{position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)",background:"rgba(5,5,9,.9)",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 32px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span onClick={()=>router.push("/dashboard")} style={{fontWeight:800,fontSize:20,background:"linear-gradient(135deg,#f472b6,#a78bfa,#38bdf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",cursor:"pointer"}}>IntelliGPA</span>
          <div style={{display:"flex",gap:32,alignItems:"center"}}>
            {NAVLINKS.map(({label,href})=>{
              const active=pathname===href;
              return <button key={href} onClick={()=>router.push(href)} style={{fontSize:13,fontWeight:active?600:400,color:active?"white":"rgba(107,114,128,1)",background:"none",border:"none",cursor:"pointer",position:"relative",paddingBottom:2}}>
                {label}
                {active&&<span style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:"linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8)"}}/>}
              </button>;
            })}
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"40px 32px",display:"flex",flexDirection:"column",gap:24}}>

        {/* ══════════════════════════════════════════════════════
            HERO — Two panel layout like a real product
        ══════════════════════════════════════════════════════ */}
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:6,borderRadius:24,overflow:"hidden"}}>

          {/* LEFT PANEL — identity */}
          <div style={{
            background:"linear-gradient(160deg,rgba(124,58,237,.15) 0%,rgba(5,5,9,1) 60%)",
            border:"1px solid rgba(255,255,255,.08)",
            borderRadius:24,
            padding:"40px 32px",
            display:"flex",flexDirection:"column",alignItems:"center",gap:24,
            position:"relative",overflow:"hidden",
          }}>
            {/* Background glow */}
            <div style={{position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,${grade?.hex??"#7c3aed"}30 0%,transparent 70%)`,filter:"blur(20px)"}}/>

            {/* Avatar */}
            <div style={{position:"relative"}}>
              <div style={{
                width:96,height:96,borderRadius:24,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:48,position:"relative",
                background:`linear-gradient(135deg,${grade?.hex??"#7c3aed"}20,rgba(255,255,255,.05))`,
                border:`1px solid ${grade?.hex??"#7c3aed"}30`,
                boxShadow:`0 0 40px ${grade?.hex??"#7c3aed"}25`,
              }}>{emoji}</div>
              <div style={{position:"absolute",bottom:-4,right:-4,width:20,height:20,borderRadius:"50%",background:"#22c55e",border:"3px solid #050509",boxShadow:"0 0 8px #22c55e80"}}/>
            </div>

            {/* Name */}
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:"white",letterSpacing:"-.02em"}}>@{username||"student"}</div>
              <div style={{fontSize:12,color:"rgba(107,114,128,1)",marginTop:4,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
              {memberSince&&<div style={{fontSize:10,color:"rgba(75,85,99,1)",marginTop:6,textTransform:"uppercase",letterSpacing:".08em"}}>Member since {memberSince}</div>}
            </div>

            {/* Grade badge — big */}
            {grade && (
              <div style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                padding:"16px 32px",borderRadius:16,
                background:`${grade.hex}10`,border:`1px solid ${grade.hex}30`,
                boxShadow:`0 0 24px ${grade.hex}15`,width:"100%",
              }}>
                <div style={{fontSize:48,fontWeight:900,color:grade.hex,textShadow:`0 0 24px ${grade.hex}`,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{currentGpa?.toFixed(2)}</div>
                <div style={{fontSize:13,fontWeight:700,color:grade.hex,opacity:.8}}>{grade.letter} · {grade.points.toFixed(1)} GPA points</div>
              </div>
            )}

            {/* Auth provider */}
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)"}}>
              {provider==="google.com"&&<svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
              {provider==="microsoft.com"&&<svg width="14" height="14" viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>}
              {provider==="password"&&<span style={{fontSize:12}}>✉️</span>}
              <span style={{fontSize:12,color:"rgba(156,163,175,1)",fontWeight:500}}>{provider==="google.com"?"Google":provider==="microsoft.com"?"Microsoft":"Email"}</span>
            </div>

            {/* Sign out */}
            <button onClick={handleLogout} style={{
              width:"100%",padding:"11px",borderRadius:12,
              background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.18)",
              color:"rgba(252,165,165,1)",fontSize:13,fontWeight:600,cursor:"pointer",
              transition:"all .15s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.15)";e.currentTarget.style.borderColor="rgba(239,68,68,.35)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(239,68,68,.08)";e.currentTarget.style.borderColor="rgba(239,68,68,.18)";}}>
              Sign Out
            </button>
          </div>

          {/* RIGHT PANEL — metrics */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>

            {/* Top metric strip */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {[
                {label:"Current GPA",  value:currentGpa?.toFixed(2)??"—", sub:grade?.letter??"No grades", color:grade?.hex??"#6b7280",  icon:"◎"},
                {label:"Goal GPA",     value:goalGpa.toFixed(1),          sub:`${prog.toFixed(0)}% there`,  color:"#38bdf8",              icon:"◈"},
                {label:"Courses",      value:String(courses.length),      sub:`${courses.reduce((s:number,c:any)=>s+(c.credits??3),0)} credits`, color:"#a78bfa", icon:"▦"},
                {label:"Progress",     value:`${prog.toFixed(0)}%`,       sub:onTrack?"Goal reached!":`+${gap.toFixed(2)} to go`, color:onTrack?"#22c55e":"#fb923c", icon:"◐"},
              ].map(m=>(
                <div key={m.label} style={{
                  padding:"20px 20px",borderRadius:16,
                  background:"rgba(255,255,255,.025)",
                  border:"1px solid rgba(255,255,255,.07)",
                  position:"relative",overflow:"hidden",
                }}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${m.color}80,transparent)`}}/>
                  <div style={{fontSize:10,color:"rgba(107,114,128,1)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:m.color}}>{m.icon}</span>{m.label}
                  </div>
                  <div style={{fontSize:28,fontWeight:900,color:m.color,lineHeight:1,fontVariantNumeric:"tabular-nums",textShadow:`0 0 20px ${m.color}40`}}>{m.value}</div>
                  <div style={{fontSize:11,color:"rgba(107,114,128,1)",marginTop:5,fontWeight:500}}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* GPA visualization row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,flex:1}}>

              {/* Progress visualization */}
              <div style={{padding:"24px",borderRadius:16,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:10,color:"rgba(107,114,128,1)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:16}}>Goal Progress</div>
                  {/* Big progress number */}
                  <div style={{fontSize:56,fontWeight:900,lineHeight:1,fontVariantNumeric:"tabular-nums",
                    background:`linear-gradient(135deg,${grade?.hex??"#6b7280"},#7c3aed)`,
                    WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                    {prog.toFixed(0)}<span style={{fontSize:24,fontWeight:600}}>%</span>
                  </div>
                  <div style={{fontSize:12,color:"rgba(107,114,128,1)",marginTop:4}}>
                    {onTrack ? "🎉 You've reached your goal!" : `${gap.toFixed(3)} GPA points remaining`}
                  </div>
                </div>

                {/* Segmented progress */}
                <div>
                  <div style={{display:"flex",gap:3,marginBottom:6}}>
                    {[0,0.5,1,1.5,2,2.5,3,3.5].map((v,i)=>{
                      const filled=(currentGpa??0)>=v+.5;
                      const partial=(currentGpa??0)>v&&(currentGpa??0)<v+.5;
                      const pct=partial?((currentGpa??0)-v)/.5*100:0;
                      return(
                        <div key={i} style={{flex:1,height:8,borderRadius:4,overflow:"hidden",background:"rgba(255,255,255,.06)"}}>
                          <div style={{height:"100%",background:grade?.hex??"#6b7280",width:filled?"100%":partial?`${pct}%`:"0%",borderRadius:4,transition:"width .6s",boxShadow:`0 0 4px ${grade?.hex??"#6b7280"}`}}/>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"rgba(55,65,81,1)"}}>
                    {[0,1,2,3,4].map(n=><span key={n}>{n}.0</span>)}
                  </div>
                </div>
              </div>

              {/* Ring + quick stats */}
              <div style={{padding:"24px",borderRadius:16,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between"}}>
                <Ring val={currentGpa} goal={goalGpa} size={130}/>
                <div style={{width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {[
                    {l:"Assignments",v:totalAssign,  c:"#4ade80"},
                    {l:"Graded",     v:gradedAssign, c:"#38bdf8"},
                  ].map(s=>(
                    <div key={s.l} style={{padding:"10px",borderRadius:10,textAlign:"center",background:"rgba(255,255,255,.03)",border:`1px solid ${s.c}15`}}>
                      <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(75,85,99,1)",marginTop:2}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            TABS
        ══════════════════════════════════════════════════════ */}
        <div style={{display:"flex",gap:2,padding:4,borderRadius:14,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",width:"fit-content"}}>
          {(["overview","security","settings"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:"9px 24px",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",
              transition:"all .15s",textTransform:"capitalize",
              ...(tab===t?{
                background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"white",
                boxShadow:"0 1px 3px rgba(0,0,0,.3)",
              }:{background:"transparent",border:"1px solid transparent",color:"rgba(107,114,128,1)"}),
            }}>{t}</button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════════════ */}
        {tab==="overview"&&(
          <div key="ov" style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:6}}>

            {/* Goal editor */}
            <div style={{padding:"28px",borderRadius:20,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"white"}}>GPA Goal</div>
                  <div style={{fontSize:11,color:"rgba(107,114,128,1)",marginTop:2}}>Your target academic performance</div>
                </div>
                {!editGoal
                  ? <button onClick={()=>setEditGoal(true)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",background:"rgba(124,58,237,.15)",border:"1px solid rgba(124,58,237,.3)",color:"#a78bfa"}}>Edit</button>
                  : <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setEditGoal(false)} style={{padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(156,163,175,1)"}}>Cancel</button>
                      <button onClick={handleSaveGoal} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",background:"rgba(34,197,94,.15)",border:"1px solid rgba(34,197,94,.3)",color:"#4ade80"}}>Save</button>
                    </div>
                }
              </div>

              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:72,fontWeight:900,letterSpacing:"-.04em",fontVariantNumeric:"tabular-nums",
                  background:"linear-gradient(135deg,#f472b6,#a78bfa,#38bdf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                  {editGoal?newGoal.toFixed(1):goalGpa.toFixed(1)}
                </div>
                <div style={{fontSize:12,color:"rgba(107,114,128,1)",marginTop:4}}>Target GPA</div>
              </div>

              {editGoal&&(
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <input type="range" min="1.0" max="4.0" step="0.1" value={newGoal}
                    onChange={e=>setNewGoal(parseFloat(e.target.value))}
                    style={{accentColor:"#a78bfa",cursor:"pointer",width:"100%"}}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[{l:"Dean's List",v:3.8,e:"🏆"},{l:"Honor Roll",v:3.5,e:"⭐"},{l:"B+ Average",v:3.3,e:"📈"},{l:"Pass",v:2.0,e:"✓"}].map(p=>(
                      <button key={p.l} onClick={()=>setNewGoal(p.v)} style={{
                        display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",
                        ...(Math.abs(newGoal-p.v)<.05?{background:"rgba(167,139,250,.15)",border:"1px solid rgba(167,139,250,.35)",color:"white"}:{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",color:"rgba(156,163,175,1)"}),
                      }}>
                        <span style={{fontSize:16}}>{p.e}</span>
                        <div><div style={{fontSize:12,fontWeight:600}}>{p.l}</div><div style={{fontSize:10,opacity:.6}}>{p.v.toFixed(1)}</div></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Courses */}
            <div style={{padding:"28px",borderRadius:20,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"white"}}>Enrolled Courses</div>
                  <div style={{fontSize:11,color:"rgba(107,114,128,1)",marginTop:2}}>{courses.length} courses · {courses.reduce((s:number,c:any)=>s+(c.credits??3),0)} total credits</div>
                </div>
                <button onClick={()=>router.push("/dashboard")} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",color:"rgba(156,163,175,1)"}}>
                  + Add Course
                </button>
              </div>

              {courses.length===0?(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0",gap:12}}>
                  <div style={{fontSize:36,opacity:.2}}>📚</div>
                  <div style={{fontSize:13,color:"rgba(75,85,99,1)"}}>No courses loaded</div>
                  <button onClick={()=>router.push("/dashboard")} style={{padding:"8px 20px",borderRadius:10,fontSize:12,fontWeight:600,cursor:"pointer",background:"rgba(124,58,237,.15)",border:"1px solid rgba(124,58,237,.3)",color:"#a78bfa"}}>Upload Syllabus →</button>
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
                  {courses.map((c:any,i:number)=>{
                    const color=COURSE_COLORS[i%COURSE_COLORS.length];
                    const graded=(c.categories??[]).reduce((s:number,cat:any)=>s+(cat.assignments??[]).filter((a:any)=>a.score!=null).length,0);
                    const total=(c.categories??[]).reduce((s:number,cat:any)=>s+(cat.assignments??[]).length,0);
                    return(
                      <div key={c.course_id} style={{padding:"14px 16px",borderRadius:14,background:`${color}08`,border:`1px solid ${color}20`,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:0,left:0,bottom:0,width:3,background:color,borderRadius:"3px 0 0 3px"}}/>
                        <div style={{paddingLeft:8}}>
                          <div style={{fontSize:13,fontWeight:700,color:"white",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.course_name}</div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            {c.instructor&&<span style={{fontSize:10,color:"rgba(107,114,128,1)"}}>{c.instructor}</span>}
                            <span style={{fontSize:10,color:color,fontWeight:600,background:`${color}15`,padding:"1px 6px",borderRadius:4}}>{c.credits??3} cr</span>
                            <span style={{fontSize:10,color:"rgba(75,85,99,1)"}}>·</span>
                            <span style={{fontSize:10,color:"rgba(107,114,128,1)"}}>{graded}/{total}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SECURITY TAB
        ══════════════════════════════════════════════════════ */}
        {tab==="security"&&(
          <div key="sec" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {/* Account info */}
            <div style={{padding:"28px",borderRadius:20,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{fontSize:12,fontWeight:600,color:"white",marginBottom:20}}>Account Details</div>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {[
                  {l:"Username",   v:`@${username||"—"}`,                                       icon:"👤"},
                  {l:"Email",      v:user?.email??"—",                                          icon:"✉️"},
                  {l:"Sign-in",    v:provider==="google.com"?"Google OAuth":provider==="microsoft.com"?"Microsoft OAuth":"Email & Password", icon:"🔐"},
                  {l:"Joined",     v:memberSince||"—",                                          icon:"📅"},
                  {l:"Account ID", v:(user?.uid?.slice(0,20)??"—")+"…",                         icon:"🪪"},
                  {l:"Last Login", v:user?.metadata.lastSignInTime?new Date(user.metadata.lastSignInTime).toLocaleString():"—", icon:"⏰"},
                ].map(item=>(
                  <div key={item.l} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,.02)"}}>
                    <span style={{fontSize:16,width:24,textAlign:"center",flexShrink:0}}>{item.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:2}}>{item.l}</div>
                      <div style={{fontSize:13,color:"white",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Password */}
            <div style={{padding:"28px",borderRadius:20,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,fontWeight:600,color:"white"}}>Change Password</div>
                <div style={{fontSize:11,color:"rgba(107,114,128,1)",marginTop:2}}>
                  {isEmail?"Update your account credentials":"OAuth users manage password through their provider"}
                </div>
              </div>

              {isEmail?(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {[{l:"Current Password",v:currentPw,s:setCurrentPw,p:"Enter current password"},{l:"New Password",v:newPw,s:setNewPw,p:"At least 6 characters"},{l:"Confirm Password",v:confirmPw,s:setConfirmPw,p:"Re-enter new password"}].map(f=>(
                    <div key={f.l}>
                      <div style={{fontSize:10,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>{f.l}</div>
                      <input type="password" placeholder={f.p} value={f.v} onChange={e=>f.s(e.target.value)}
                        style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",color:"white",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                  ))}
                  <button onClick={handlePw} disabled={pwLoading||!currentPw||!newPw||!confirmPw}
                    style={{padding:"12px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",
                      background:"linear-gradient(135deg,#7c3aed,#0891b2)",color:"white",border:"none",
                      opacity:pwLoading||!currentPw||!newPw||!confirmPw?.5:1,transition:"all .15s"}}>
                    {pwLoading?"Updating...":"Update Password"}
                  </button>
                  {pwMsg&&<div style={{fontSize:12,fontWeight:500,color:pwMsg.ok?"#4ade80":"#f87171",padding:"8px 12px",borderRadius:8,background:pwMsg.ok?"rgba(74,222,128,.08)":"rgba(248,113,113,.08)"}}>{pwMsg.ok?"✓ ":"✗ "}{pwMsg.text}</div>}
                </div>
              ):(
                <div style={{display:"flex",alignItems:"flex-start",gap:14,padding:"16px",borderRadius:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)"}}>
                  <span style={{fontSize:24}}>🔐</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"white",marginBottom:4}}>{provider==="google.com"?"Google":"Microsoft"} Authentication</div>
                    <div style={{fontSize:12,color:"rgba(107,114,128,1)",lineHeight:1.6}}>Manage your password through your {provider==="google.com"?"Google":"Microsoft"} account settings at account.{provider==="google.com"?"google":"microsoft"}.com</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SETTINGS TAB
        ══════════════════════════════════════════════════════ */}
        {tab==="settings"&&(
          <div key="set" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>

            {/* Notifications */}
            <div style={{padding:"28px",borderRadius:20,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{fontSize:12,fontWeight:600,color:"white",marginBottom:4}}>Notifications</div>
              <div style={{fontSize:11,color:"rgba(107,114,128,1)",marginBottom:20}}>Choose what you hear about</div>
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {[
                  {k:"deadlines" as const,l:"Deadline Reminders",d:"Before assignments are due"},
                  {k:"gpa"       as const,l:"GPA Changes",        d:"Significant GPA shifts"},
                  {k:"weekly"    as const,l:"Weekly Digest",       d:"Your progress summary"},
                  {k:"grades"    as const,l:"New Grades",          d:"When grades are posted"},
                ].map((n,i,arr)=>(
                  <div key={n.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,.05)":"none"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:500,color:"white"}}>{n.l}</div>
                      <div style={{fontSize:11,color:"rgba(107,114,128,1)",marginTop:2}}>{n.d}</div>
                    </div>
                    <Toggle on={notifs[n.k]} onChange={v=>setNotifs(p=>({...p,[n.k]:v}))}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferences */}
            <div style={{padding:"28px",borderRadius:20,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{fontSize:12,fontWeight:600,color:"white",marginBottom:4}}>Preferences</div>
              <div style={{fontSize:11,color:"rgba(107,114,128,1)",marginBottom:20}}>Customize your experience</div>
              <div style={{display:"flex",flexDirection:"column",gap:20}}>
                {[
                  {l:"GPA Display",opts:["2 decimal","3 decimal"],active:"2 decimal"},
                  {l:"Calendar Start",opts:["Sunday","Monday"],active:"Sunday"},
                  {l:"Grade Scale",opts:["Letter","Percentage"],active:"Letter"},
                ].map(pref=>(
                  <div key={pref.l}>
                    <div style={{fontSize:10,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>{pref.l}</div>
                    <div style={{display:"flex",gap:4,padding:3,borderRadius:8,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)"}}>
                      {pref.opts.map(o=>(
                        <button key={o} style={{flex:1,padding:"6px 8px",borderRadius:6,fontSize:11,fontWeight:500,cursor:"pointer",transition:"all .15s",
                          ...(o===pref.active?{background:"rgba(255,255,255,.1)",color:"white",border:"1px solid rgba(255,255,255,.12)"}:{background:"transparent",color:"rgba(107,114,128,1)",border:"1px solid transparent"})}}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Accent colors */}
                <div>
                  <div style={{fontSize:10,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Accent Color</div>
                  <div style={{display:"flex",gap:8}}>
                    {["#a78bfa","#38bdf8","#fb7185","#34d399","#fb923c","#fbbf24"].map(c=>(
                      <button key={c} onClick={()=>{}} style={{width:28,height:28,borderRadius:"50%",border:"2px solid rgba(255,255,255,.15)",cursor:"pointer",backgroundColor:c,boxShadow:`0 0 10px ${c}60`,transition:"transform .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.15)"}
                        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Account actions */}
            <div style={{padding:"28px",borderRadius:20,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"white",marginBottom:4}}>Account Actions</div>
                <div style={{fontSize:11,color:"rgba(107,114,128,1)"}}>Manage your account data</div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <button style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",cursor:"pointer",textAlign:"left"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.03)";}}>
                  <span style={{fontSize:18}}>📦</span>
                  <div><div style={{fontSize:13,fontWeight:500,color:"white"}}>Export Data</div><div style={{fontSize:11,color:"rgba(107,114,128,1)",marginTop:1}}>Download your academic records</div></div>
                </button>
                <button style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",cursor:"pointer",textAlign:"left"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.03)";}}>
                  <span style={{fontSize:18}}>🔗</span>
                  <div><div style={{fontSize:13,fontWeight:500,color:"white"}}>Share Progress</div><div style={{fontSize:11,color:"rgba(107,114,128,1)",marginTop:1}}>Generate a shareable report</div></div>
                </button>
              </div>

              <div style={{marginTop:"auto",paddingTop:16,borderTop:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{fontSize:10,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>Danger Zone</div>
                <button onClick={handleLogout} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"11px 14px",borderRadius:10,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.15)",cursor:"pointer",textAlign:"left",marginBottom:6}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,.1)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,.06)"}>
                  <span style={{fontSize:14,color:"rgba(252,165,165,1)"}}>↩</span>
                  <span style={{fontSize:12,fontWeight:500,color:"rgba(252,165,165,1)"}}>Sign Out</span>
                </button>
                <button disabled style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"11px 14px",borderRadius:10,background:"rgba(239,68,68,.04)",border:"1px solid rgba(239,68,68,.1)",cursor:"not-allowed",textAlign:"left",opacity:.35}}>
                  <span style={{fontSize:14,color:"rgba(252,165,165,1)"}}>✕</span>
                  <span style={{fontSize:12,fontWeight:500,color:"rgba(252,165,165,1)"}}>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        input[type=range]{height:4px;border-radius:9999px;width:100%;}
        *{box-sizing:border-box;}
      `}</style>
    </div>
  );
}
