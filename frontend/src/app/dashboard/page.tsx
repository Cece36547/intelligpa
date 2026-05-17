"use client";

import { useEffect, useState, useRef, memo } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

const NAVLINKS = [
  { label: "Dashboard",     href: "/dashboard" },
  { label: "Calendar",      href: "/calendar" },
  { label: "GPA Predictor", href: "/gpa-predictor" },
  { label: "Profile",       href: "/profile" },
];
const AVATARS = ["🦊","🐼","🦋","🐸","🦄","🐙","🦩","🐬","🦁","🐧","🦖","🌟","🔥","💎","🚀"];
const COURSE_COLORS = ["#818cf8","#38bdf8","#fb7185","#34d399","#fb923c","#a78bfa"];
const GRADE_COLORS: Record<string,string> = {
  "A":"#22c55e","A-":"#4ade80","B+":"#38bdf8","B":"#60a5fa","B-":"#818cf8",
  "C+":"#fbbf24","C":"#f59e0b","C-":"#fb923c","D+":"#f87171","D":"#ef4444","F":"#dc2626",
};
function getGrade(gpa: number) {
  const p = (gpa/4)*100;
  if(p>=93)return"A"; if(p>=90)return"A-"; if(p>=87)return"B+"; if(p>=83)return"B";
  if(p>=80)return"B-"; if(p>=77)return"C+"; if(p>=73)return"C"; if(p>=70)return"C-";
  if(p>=67)return"D+"; if(p>=60)return"D"; return"F";
}

// ── Memoized particle canvas ──────────────────────────────────────────────────
const ParticleCanvas = memo(function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if(!canvas) return;
    const ctx = canvas.getContext("2d"); if(!ctx) return;
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const pts = Array.from({length:35},()=>({
      x:Math.random()*w, y:Math.random()*h,
      r:Math.random()*2+.5, dx:(Math.random()-.5)*.8, dy:(Math.random()-.5)*.8,
    }));
    let raf: number;
    function draw() {
      if(!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle="rgba(7,6,15,0.18)";
      ctx.fillRect(0,0,w,h);
      for(let i=0;i<pts.length;i++){
        const p=pts[i]; p.x+=p.dx; p.y+=p.dy;
        if(p.x>w||p.x<0)p.dx*=-1; if(p.y>h||p.y<0)p.dy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle="rgba(255,255,255,0.3)"; ctx.fill();
        for(let j=i+1;j<pts.length;j++){
          const q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d2=dx*dx+dy*dy;
          if(d2<14000){ctx.beginPath();ctx.strokeStyle=`rgba(120,160,255,${.14*(1-d2/14000)})`;
            ctx.lineWidth=.5;ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
        }
      }
      raf=requestAnimationFrame(draw);
    }
    draw();
    const resize=()=>{w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight;};
    window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
});

// ── Add Course Modal ──────────────────────────────────────────────────────────
function AddCourseModal({username,onClose,onSuccess}:{username:string;onClose:()=>void;onSuccess:(c:any)=>void}) {
  const [file,setFile]=useState<File|null>(null);
  const [dragging,setDragging]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  const [result,setResult]=useState<any>(null);
  const fileRef=useRef<HTMLInputElement>(null);

  const handleFile=(f:File)=>{if(f.type!=="application/pdf"){setError("Only PDF files are accepted.");return;}setFile(f);setError("");};

  const handleUpload=async()=>{
  if(!file)return;
  setUploading(true);setError("");
  const fd=new FormData();fd.append("file",file);
  try{
    const token = await auth.currentUser?.getIdToken();
    const res=await fetch(`http://localhost:8000/course/`,{
      method:"POST",
      body:fd,
      headers:{ Authorization: `Bearer ${token}` }
    });
    if(res.status===409){setError("This course already exists.");return;}
    if(!res.ok){const d=await res.json().then(d=>d.detail).catch(()=>res.statusText);throw new Error(typeof d==="string"?d:JSON.stringify(d));}
    const course=await res.json();setResult(course);setDone(true);
  }catch(e:any){setError(e.message||"Something went wrong.");}
  finally{setUploading(false);}
};

  return(
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={!uploading?onClose:undefined} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(16px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:520,background:"linear-gradient(135deg,rgba(79,70,229,.15),rgba(7,6,15,.99))",border:"1px solid rgba(255,255,255,.1)",borderRadius:28,boxShadow:"0 50px 120px rgba(0,0,0,.9)"}}>
        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(167,139,250,.8),rgba(56,189,248,.5),transparent)",borderRadius:"28px 28px 0 0"}}/>
        <div style={{padding:"32px 36px"}}>
          {done&&result?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,textAlign:"center"}}>
              <div style={{fontSize:52}}>🎉</div>
              <div>
                <h2 style={{fontSize:22,fontWeight:800,color:"white",margin:"0 0 6px"}}>{result.course_name}</h2>
                {result.instructor&&<p style={{fontSize:12,color:"rgba(156,163,175,1)",margin:0}}>{result.instructor}</p>}
              </div>
              <div style={{width:"100%",padding:"14px 16px",borderRadius:14,background:"rgba(74,222,128,.06)",border:"1px solid rgba(74,222,128,.2)"}}>
                <div style={{fontSize:10,color:"#4ade80",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>Successfully extracted</div>
                <div style={{display:"flex",justifyContent:"center",gap:24}}>
                  <div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:900,color:"#4ade80"}}>{(result.categories??[]).length}</div><div style={{fontSize:9,color:"rgba(107,114,128,1)",textTransform:"uppercase",marginTop:2}}>Categories</div></div>
                  <div style={{width:1,background:"rgba(255,255,255,.06)"}}/>
                  <div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:900,color:"#38bdf8"}}>{(result.categories??[]).reduce((s:number,c:any)=>s+(c.assignments??[]).length,0)}</div><div style={{fontSize:9,color:"rgba(107,114,128,1)",textTransform:"uppercase",marginTop:2}}>Assignments</div></div>
                </div>
              </div>
              <button onClick={()=>onSuccess(result)} style={{width:"100%",padding:"12px",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",background:"linear-gradient(135deg,#22c55e,#0891b2)",color:"white",border:"none"}}>Go to Dashboard →</button>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:9,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(167,139,250,.7)",marginBottom:6}}>New Course</div>
                  <h2 style={{fontSize:21,fontWeight:800,color:"white",margin:0}}>Upload Your Syllabus</h2>
                  <p style={{fontSize:11,color:"rgba(107,114,128,1)",marginTop:4,lineHeight:1.5}}>We'll automatically extract the course name, instructor, categories, weights, and every assignment.</p>
                </div>
                <button onClick={onClose} disabled={uploading} style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(156,163,175,1)",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
              <div onClick={()=>!uploading&&fileRef.current?.click()} onDragOver={e=>{e.preventDefault();if(!uploading)setDragging(true);}} onDragLeave={()=>setDragging(false)}
                onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f&&!uploading)handleFile(f);}}
                style={{border:`2px dashed ${uploading?"rgba(255,255,255,.06)":dragging?"rgba(167,139,250,.7)":file?"rgba(56,189,248,.5)":"rgba(255,255,255,.14)"}`,borderRadius:18,padding:"36px 20px",textAlign:"center",cursor:uploading?"not-allowed":"pointer",background:dragging?"rgba(124,58,237,.08)":file?"rgba(56,189,248,.04)":"rgba(255,255,255,.02)",transition:"all .2s"}}>
                <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
                {uploading?(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,border:"3px solid rgba(124,58,237,.3)",borderTopColor:"#c084fc",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                    <div><div style={{fontSize:13,fontWeight:600,color:"white",marginBottom:3}}>Parsing your syllabus…</div><div style={{fontSize:11,color:"rgba(107,114,128,1)"}}>This may take 10–20 seconds</div></div>
                  </div>
                ):file?(
                  <div><div style={{fontSize:32,marginBottom:8}}>📄</div><div style={{fontSize:13,fontWeight:600,color:"white",marginBottom:3}}>{file.name}</div><div style={{fontSize:11,color:"rgba(107,114,128,1)",marginBottom:8}}>{(file.size/1024).toFixed(0)} KB · PDF</div>
                    <button onClick={e=>{e.stopPropagation();setFile(null);setError("");}} style={{fontSize:11,color:"rgba(252,165,165,1)",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Remove file</button>
                  </div>
                ):(
                  <div><div style={{fontSize:36,marginBottom:10}}>☁️</div><div style={{fontSize:13,fontWeight:600,color:"white",marginBottom:3}}>Drop your syllabus PDF here</div><div style={{fontSize:11,color:"rgba(107,114,128,1)"}}>or click to browse</div></div>
                )}
              </div>
              {error&&<div style={{padding:"9px 13px",borderRadius:9,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.22)",fontSize:11,color:"#f87171"}}>✗ {error}</div>}
              <button onClick={handleUpload} disabled={!file||uploading} style={{padding:"13px",borderRadius:12,fontSize:13,fontWeight:700,cursor:!file||uploading?"not-allowed":"pointer",background:"linear-gradient(135deg,#7c3aed,#0891b2)",color:"white",border:"none",opacity:!file||uploading?.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {uploading?(<><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"white",borderRadius:"50%",display:"inline-block",animation:"spin .8s linear infinite"}}/>Parsing & saving…</>):"Upload & Parse Syllabus →"}
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Edit Course Modal ─────────────────────────────────────────────────────────
function EditCourseModal({course,onClose,onSuccess}:{course:any;onClose:()=>void;onSuccess:(c:any)=>void}) {
  const [name,setName]=useState(course.course_name||"");
  const [instructor,setInstructor]=useState(course.instructor||"");
  const [credits,setCredits]=useState(course.credits||3);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  const handleSave=async()=>{
    setSaving(true);setError("");
    try{
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`http://localhost:8000/course/${course.course_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({course_name: name, instructor, credits}),
      });
      if(!res.ok)throw new Error("Failed to update course");
      const updated=await res.json();
      onSuccess(updated);
    }catch(e:any){setError(e.message||"Failed to save.");}
    finally{setSaving(false);}
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(16px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:460,background:"linear-gradient(135deg,rgba(79,70,229,.15),rgba(7,6,15,.99))",border:"1px solid rgba(255,255,255,.1)",borderRadius:24,boxShadow:"0 40px 100px rgba(0,0,0,.9)"}}>
        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(167,139,250,.8),transparent)",borderRadius:"24px 24px 0 0"}}/>
        <div style={{padding:"28px 32px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h2 style={{fontSize:19,fontWeight:800,color:"white",margin:0}}>Edit Course</h2>
            <button onClick={onClose} style={{width:28,height:28,borderRadius:7,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(156,163,175,1)",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
          {[{l:"Course Name",v:name,s:setName},{l:"Instructor",v:instructor,s:setInstructor}].map(f=>(
            <div key={f.l}>
              <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>{f.l}</div>
              <input value={f.v} onChange={e=>f.s(e.target.value)} style={{width:"100%",padding:"10px 13px",borderRadius:10,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"white",fontSize:13,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.currentTarget.style.borderColor="rgba(99,102,241,.5)"}
                onBlur={e=>e.currentTarget.style.borderColor="rgba(255,255,255,.1)"}/>
            </div>
          ))}
          <div>
            <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:8}}>Credits</div>
            <div style={{display:"flex",gap:6}}>
              {[1,2,3,4,5,6].map(n=>(
                <button key={n} onClick={()=>setCredits(n)} style={{flex:1,padding:"8px 4px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .12s",
                  ...(credits===n?{background:"rgba(124,58,237,.22)",border:"1px solid rgba(124,58,237,.45)",color:"#c084fc"}:{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"rgba(107,114,128,1)"})}}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {error&&<div style={{padding:"8px 12px",borderRadius:8,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",fontSize:11,color:"#f87171"}}>✗ {error}</div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(156,163,175,1)"}}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{flex:2,padding:"11px",borderRadius:10,fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",background:"linear-gradient(135deg,#7c3aed,#0891b2)",color:"white",border:"none",opacity:saving?.6:1}}>
              {saving?"Saving…":"Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({course,onClose,onConfirm}:{course:any;onClose:()=>void;onConfirm:()=>void}) {
  const [deleting,setDeleting]=useState(false);
  const handleDelete=async()=>{
    setDeleting(true);
    try{
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`http://localhost:8000/course/${course.course_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if(!res.ok)throw new Error("Failed to delete");
      onConfirm();
    }catch(e){setDeleting(false);}
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(16px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:400,background:"rgba(7,6,15,.99)",border:"1px solid rgba(239,68,68,.2)",borderRadius:24,boxShadow:"0 40px 100px rgba(0,0,0,.9)",padding:"28px 32px"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:12}}>🗑</div>
          <h2 style={{fontSize:18,fontWeight:800,color:"white",margin:"0 0 8px"}}>Delete Course?</h2>
          <p style={{fontSize:13,color:"rgba(156,163,175,1)",margin:0,lineHeight:1.5}}>
            <b style={{color:"white"}}>{course.course_name}</b> and all its categories and assignments will be permanently deleted.
          </p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(156,163,175,1)"}}>Cancel</button>
          <button onClick={handleDelete} disabled={deleting} style={{flex:1,padding:"11px",borderRadius:10,fontSize:13,fontWeight:700,cursor:deleting?"not-allowed":"pointer",background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.35)",color:"#fca5a5",opacity:deleting?.6:1}}>
            {deleting?"Deleting…":"Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [user,setUser]=useState<User|null>(null);
  const [mounted,setMounted]=useState(false);
  const [username,setUsername]=useState("");
  const [currentGpa,setCurrentGpa]=useState<string|null>(null);
  const [goalGpa,setGoalGpa]=useState<string|null>(null);
  const [courses,setCourses]=useState<any[]>([]);
  const [showModal,setShowModal]=useState(false);
  const [editCourse,setEditCourse]=useState<any|null>(null);
  const [deleteCourse,setDeleteCourse]=useState<any|null>(null);
  const router=useRouter();
  const pathname=usePathname();

  useEffect(()=>setMounted(true),[]);

useEffect(()=>{
  const unsub=onAuthStateChanged(auth, async (u)=>{
    if(!u){ router.push("/login"); return; }
    setUser(u);

    const token = await u.getIdToken();
    
    // Fetch student profile (GPA etc)
    fetch(`http://localhost:8000/student/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      if(data.current_gpa != null) { localStorage.setItem("current_gpa", String(data.current_gpa)); setCurrentGpa(String(data.current_gpa)); }
      if(data.goal_gpa != null) { localStorage.setItem("goal_gpa", String(data.goal_gpa)); setGoalGpa(String(data.goal_gpa)); }
      if(data.student_user_name) { localStorage.setItem("student_user_name", data.student_user_name); setUsername(data.student_user_name); }
    })
    .catch(() => {});

    // Fetch courses
    fetch(`http://localhost:8000/course/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(d => setCourses(Array.isArray(d) ? d : []))
    .catch(() => {});
  });
  return()=>unsub();
},[router]);

  const handleLogout=async()=>{await signOut(auth);localStorage.clear();router.push("/login");};

  if(!mounted)return null;

  const gpa=parseFloat(currentGpa??"0");
  const goal=parseFloat(goalGpa??"4");
  const prog=goalGpa?Math.min((gpa/goal)*100,100):0;
  const onTrack=!!currentGpa&&gpa>=goal;
  const grade=currentGpa?getGrade(gpa):null;
  const gradeColor=grade?(GRADE_COLORS[grade]??"#6b7280"):"#6b7280";
  const avatar=username?AVATARS[username.charCodeAt(0)%AVATARS.length]:"🎓";
  const totalCr=courses.reduce((s,c)=>s+(c.credits??3),0);
  const totalA=courses.reduce((s,c)=>s+(c.categories??[]).reduce((ss:number,cat:any)=>ss+(cat.assignments??[]).length,0),0);

  return(
    <div style={{minHeight:"100vh",background:"#07060f",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"white",position:"relative"}}>
      {user && <ParticleCanvas />}

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:50,backdropFilter:"blur(24px)",background:"rgba(7,6,15,.85)",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{maxWidth:1320,margin:"0 auto",padding:"0 40px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span onClick={()=>router.push("/dashboard")} style={{fontWeight:800,fontSize:19,background:"linear-gradient(135deg,#f472b6,#a78bfa,#38bdf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",cursor:"pointer",letterSpacing:"-.02em"}}>IntelliGPA</span>
          <div style={{display:"flex",gap:28,alignItems:"center"}}>
            {NAVLINKS.map(({label,href})=>{
              const active=pathname===href;
              return<button key={href} onClick={()=>router.push(href)} style={{fontSize:13,fontWeight:active?600:400,color:active?"white":"rgba(107,114,128,1)",background:"none",border:"none",cursor:"pointer",position:"relative",paddingBottom:3,transition:"color .15s"}}>
                {label}{active&&<span style={{position:"absolute",bottom:0,left:0,right:0,height:1.5,borderRadius:1,background:"linear-gradient(90deg,#f472b6,#a78bfa)"}}/>}
              </button>;
            })}
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1320,margin:"0 auto",padding:"40px 40px 80px",position:"relative",zIndex:1}}>

        {/* HERO */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:20}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <div style={{position:"relative"}}>
                <div style={{width:54,height:54,borderRadius:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,background:`linear-gradient(135deg,${gradeColor}20,rgba(255,255,255,.05))`,border:`1px solid ${gradeColor}26`,boxShadow:`0 0 20px ${gradeColor}12`}}>{avatar}</div>
                <div style={{position:"absolute",bottom:-2,right:-2,width:13,height:13,borderRadius:7,background:"#22c55e",border:"2.5px solid #07060f",boxShadow:"0 0 5px #22c55e"}}/>
              </div>
              <div>
                <h1 style={{fontSize:26,fontWeight:900,margin:0,letterSpacing:"-.03em",lineHeight:1}}>
                  <span style={{color:"rgba(156,163,175,1)",fontWeight:400}}>Hey, </span>
                  <span style={{background:"linear-gradient(135deg,#f9a8d4,#c084fc,#67e8f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>@{username||"student"}</span>
                  <span> 👋</span>
                </h1>
                <p style={{fontSize:12,color:"rgba(107,114,128,1)",margin:"3px 0 0"}}>
                  {onTrack?"You've hit your goal — keep pushing!":currentGpa?`${(goal-gpa).toFixed(2)} GPA points to reach your ${goal.toFixed(1)} goal`:"Add your first course to get started"}
                </p>
              </div>
            </div>
            <div style={{display:"flex",gap:7,marginBottom:7}}>
              {[
                {l:"Current GPA",v:currentGpa?gpa.toFixed(2):"—",c:gradeColor,sub:grade??"No grades"},
                {l:"Goal GPA",v:goal.toFixed(1),c:"#38bdf8",sub:`${prog.toFixed(0)}% there`},
                {l:"Courses",v:String(courses.length),c:"#818cf8",sub:`${totalCr} credits`},
                {l:"Assignments",v:String(totalA),c:"#4ade80",sub:"tracked"},
              ].map(m=>(
                <div key={m.l} style={{flex:1,padding:"13px 14px",borderRadius:14,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${m.c},transparent)`}}/>
                  <div style={{fontSize:8,color:"rgba(75,85,99,1)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:4}}>{m.l}</div>
                  <div style={{fontSize:22,fontWeight:900,color:m.c,lineHeight:1,fontVariantNumeric:"tabular-nums",textShadow:`0 0 14px ${m.c}28`}}>{m.v}</div>
                  <div style={{fontSize:9,color:"rgba(107,114,128,1)",marginTop:3}}>{m.sub}</div>
                </div>
              ))}
            </div>
            {goalGpa&&(
              <div style={{padding:"11px 14px",borderRadius:12,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <span style={{fontSize:8,color:"rgba(75,85,99,1)",letterSpacing:".14em",textTransform:"uppercase"}}>Progress toward {goal.toFixed(1)}</span>
                  <span style={{fontSize:10,fontWeight:700,color:"white"}}>{prog.toFixed(1)}%</span>
                </div>
                <div style={{height:5,borderRadius:5,background:"rgba(255,255,255,.05)",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:5,width:`${prog}%`,background:`linear-gradient(90deg,${gradeColor},#7c3aed,#0891b2)`,boxShadow:`0 0 10px ${gradeColor}45`,transition:"width 1s cubic-bezier(.4,0,.2,1)"}}/>
                </div>
              </div>
            )}
          </div>
          <button onClick={handleLogout} style={{padding:"8px 16px",borderRadius:10,fontSize:12,fontWeight:500,cursor:"pointer",color:"rgba(252,165,165,1)",background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.16)",whiteSpace:"nowrap",transition:"all .15s",flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,.14)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,.07)"}>
            Sign Out
          </button>
        </div>

        {/* MAIN GRID */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:8}}>
          <div style={{borderRadius:22,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",overflow:"hidden"}}>
            <div style={{padding:"16px 22px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"white"}}>My Courses</div>
                <div style={{fontSize:10,color:"rgba(107,114,128,1)",marginTop:1}}>{courses.length} enrolled · {totalCr} total credits</div>
              </div>
              <button onClick={()=>setShowModal(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",background:"linear-gradient(135deg,#7c3aed,#0891b2)",color:"white",border:"none",boxShadow:"0 0 16px rgba(124,58,237,.3)",transition:"box-shadow .15s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 0 28px rgba(124,58,237,.55)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="0 0 16px rgba(124,58,237,.3)"}>
                <span style={{fontSize:15,lineHeight:1}}>+</span> Add Course
              </button>
            </div>

            {courses.length===0?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"56px 24px",gap:14,textAlign:"center"}}>
                <div style={{fontSize:44,opacity:.12}}>📚</div>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"white",marginBottom:5}}>No courses yet</div>
                  <div style={{fontSize:12,color:"rgba(107,114,128,1)",lineHeight:1.65,maxWidth:300}}>Click <b style={{color:"white"}}>"+ Add Course"</b> and upload your syllabus PDF. We'll auto-extract everything.</div>
                </div>
                <button onClick={()=>setShowModal(true)} style={{padding:"10px 22px",borderRadius:11,fontSize:12,fontWeight:700,cursor:"pointer",background:"linear-gradient(135deg,#7c3aed,#0891b2)",color:"white",border:"none",marginTop:4}}>+ Add Your First Course</button>
              </div>
            ):(
              <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:5}}>
                {courses.map((c:any,i:number)=>{
                  const col=COURSE_COLORS[i%COURSE_COLORS.length];
                  const graded=(c.categories??[]).reduce((s:number,cat:any)=>s+(cat.assignments??[]).filter((a:any)=>a.score!=null).length,0);
                  const total=(c.categories??[]).reduce((s:number,cat:any)=>s+(cat.assignments??[]).length,0);
                  const pct=total>0?(graded/total)*100:0;
                  return(
                    <div key={c.course_id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderRadius:14,background:`${col}06`,border:`1px solid ${col}15`,transition:"all .15s"}}>
                      <div style={{width:3,alignSelf:"stretch",borderRadius:2,background:col,flexShrink:0,boxShadow:`0 0 8px ${col}`}}/>
                      <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>router.push("/gpa-predictor")}>
                        <div style={{fontSize:13,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.course_name}</div>
                        <div style={{display:"flex",gap:5,alignItems:"center",marginTop:3}}>
                          {c.instructor&&<span style={{fontSize:9,color:"rgba(107,114,128,1)"}}>{c.instructor}</span>}
                          <span style={{fontSize:9,fontWeight:700,color:col,background:`${col}14`,padding:"1px 6px",borderRadius:4}}>{c.credits??3} cr</span>
                          <span style={{fontSize:9,color:"rgba(75,85,99,1)"}}>{graded}/{total} graded</span>
                        </div>
                        <div style={{marginTop:7,height:2.5,borderRadius:2,background:"rgba(255,255,255,.07)",overflow:"hidden"}}>
                          <div style={{height:"100%",borderRadius:2,background:col,width:`${pct}%`,transition:"width .6s",boxShadow:`0 0 4px ${col}`}}/>
                        </div>
                      </div>
                      {/* Edit + Delete buttons */}
                      <div style={{display:"flex",gap:5,flexShrink:0}}>
                        <button onClick={()=>setEditCourse(c)} style={{width:30,height:30,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",cursor:"pointer",fontSize:13,transition:"all .15s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background="rgba(124,58,237,.2)";e.currentTarget.style.borderColor="rgba(124,58,237,.4)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";}}>
                          ✏️
                        </button>
                        <button onClick={()=>setDeleteCourse(c)} style={{width:30,height:30,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",cursor:"pointer",fontSize:13,transition:"all .15s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.15)";e.currentTarget.style.borderColor="rgba(239,68,68,.35)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";}}>
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>setShowModal(true)} style={{padding:"20px",borderRadius:20,cursor:"pointer",textAlign:"left",border:"none",background:"linear-gradient(135deg,rgba(124,58,237,.2),rgba(8,145,178,.12))",outline:"1px solid rgba(124,58,237,.28)",boxShadow:"0 0 24px rgba(124,58,237,.08)",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 0 36px rgba(124,58,237,.22)";e.currentTarget.style.outlineColor="rgba(124,58,237,.5)";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 0 24px rgba(124,58,237,.08)";e.currentTarget.style.outlineColor="rgba(124,58,237,.28)";}}>
              <div style={{fontSize:26,marginBottom:7}}>📄</div>
              <div style={{fontSize:13,fontWeight:700,color:"white",marginBottom:4}}>Add Course</div>
              <div style={{fontSize:11,color:"rgba(156,163,175,1)",lineHeight:1.55}}>Upload a syllabus PDF — we auto-extract assignments, categories, weights and due dates.</div>
              <div style={{marginTop:10,fontSize:11,fontWeight:600,color:"#a78bfa",display:"flex",alignItems:"center",gap:3}}>Upload Syllabus <span>→</span></div>
            </button>
            {[
              {label:"GPA Predictor",icon:"🔮",href:"/gpa-predictor",color:"#818cf8"},
              {label:"Calendar",     icon:"📅",href:"/calendar",     color:"#38bdf8"},
              {label:"My Profile",   icon:"👤",href:"/profile",      color:"#f472b6"},
            ].map(a=>(
              <button key={a.href} onClick={()=>router.push(a.href)} style={{display:"flex",alignItems:"center",gap:11,padding:"13px 14px",borderRadius:14,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",cursor:"pointer",textAlign:"left",transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.borderColor=`${a.color}28`;}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.025)";e.currentTarget.style.borderColor="rgba(255,255,255,.07)";}}>
                <div style={{width:34,height:34,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,background:`${a.color}14`,border:`1px solid ${a.color}22`}}>{a.icon}</div>
                <span style={{fontSize:12,fontWeight:600,color:"white",flex:1}}>{a.label}</span>
                <span style={{color:"rgba(75,85,99,1)",fontSize:15}}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal&&<AddCourseModal username={username} onClose={()=>setShowModal(false)} onSuccess={c=>{setCourses(p=>[...p,c]);setShowModal(false);}}/>}
      {editCourse&&<EditCourseModal course={editCourse} onClose={()=>setEditCourse(null)} onSuccess={updated=>{setCourses(p=>p.map(c=>c.course_id===updated.course_id?updated:c));setEditCourse(null);}}/>}
      {deleteCourse&&<DeleteConfirmModal course={deleteCourse} onClose={()=>setDeleteCourse(null)} onConfirm={()=>{setCourses(p=>p.filter(c=>c.course_id!==deleteCourse.course_id));setDeleteCourse(null);}}/>}

      <style jsx>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
