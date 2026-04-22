"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { useRouter, usePathname } from "next/navigation";

type Course = { course_id:number; course_name:string; instructor:string; credits:number; categories:Category[]; color:string; };
type Category = { category_id:number; category_name:string; weight:number; assignments:Assign[]; };
type Assign = { assignment_id:number; title:string; score:number|null; max_score:number; hypothetical?:number|null; };
type Grade = { letter:string; min:number; points:number; };

const SCALE:Grade[] = [
  {letter:"A",min:93,points:4.0},{letter:"A-",min:90,points:3.7},
  {letter:"B+",min:87,points:3.3},{letter:"B",min:83,points:3.0},
  {letter:"B-",min:80,points:2.7},{letter:"C+",min:77,points:2.3},
  {letter:"C",min:73,points:2.0},{letter:"C-",min:70,points:1.7},
  {letter:"D+",min:67,points:1.3},{letter:"D",min:60,points:1.0},
  {letter:"F",min:0,points:0.0},
];
const COLORS=["#c084fc","#67e8f9","#f472b6","#4ade80","#fb923c","#818cf8","#f87171","#a3e635"];
const NAVLINKS=[{label:"Dashboard",href:"/dashboard"},{label:"Calendar",href:"/calendar"},{label:"GPA Predictor",href:"/gpa-predictor"},{label:"Profile",href:"/profile"}];

const ltr=(p:number)=>SCALE.find(g=>p>=g.min)??SCALE[SCALE.length-1];
function catPct(cat:Category,h=false):number|null{
  const items=cat.assignments.filter(a=>(h&&a.hypothetical!=null?a.hypothetical:a.score)!==null);
  if(!items.length)return null;
  return items.reduce((s,a)=>s+(h&&a.hypothetical!=null?a.hypothetical!:a.score!),0)/items.reduce((s,a)=>s+a.max_score,0)*100;
}
function cPct(c:Course,h=false):number|null{
  let ws=0,wu=0;
  c.categories.forEach(cat=>{const g=catPct(cat,h);if(g!=null){ws+=g*(cat.weight/100);wu+=cat.weight;}});
  return wu?ws/wu*100:null;
}
function calcGpa(cs:Course[],h=false):number|null{
  const g=cs.filter(c=>cPct(c,h)!=null);if(!g.length)return null;
  const tc=g.reduce((s,c)=>s+c.credits,0);
  return tc?g.reduce((s,c)=>s+ltr(cPct(c,h)!).points*c.credits,0)/tc:null;
}
function solve(c:Course,t:number):number|null{
  let ew=0,gw=0,uw=0;
  c.categories.forEach(cat=>{
    const g=catPct(cat,false);if(g!=null){ew+=g*(cat.weight/100);gw+=cat.weight;}
    if(cat.assignments.some(a=>a.score===null))uw+=cat.weight;
  });
  return uw?((t/100)*(gw+uw)-ew)/(uw/100):null;
}

// ── SVG Arc ring ──────────────────────────────────────────────────────────────
const Arc=memo(function Arc({val,size=220,color,dim=false}:{val:number|null;size?:number;color:string;dim?:boolean}){
  const p=val==null?0:Math.min(val/4,1);
  const r=size*.4,circ=2*Math.PI*r,cx=size/2,cy=size/2;
  const fill=p*circ*.8;
  const g=val!=null?ltr((val/4)*100):null;
  return(
    <div className="relative flex items-center justify-center" style={{width:size,height:size}}>
      {!dim&&val!=null&&<div className="absolute inset-0 rounded-full opacity-25 blur-3xl" style={{backgroundColor:color}}/>}
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full" style={{transform:"rotate(-144deg)"}}>
        <circle cx={cx} cy={cy} r={r+size*.06} fill="none" stroke="rgba(255,255,255,.03)" strokeWidth="1"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={size*.07} strokeDasharray={`${circ*.8} ${circ*.2}`} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size*.07}
          strokeDasharray={`${fill} ${circ-fill+circ*.2}`} strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 ${size*.055}px ${color}) drop-shadow(0 0 ${size*.1}px ${color}50)`,
            transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)",opacity:dim?.4:1}}/>
        {val!=null&&p>.02&&(()=>{
          const a=(p*.8-.1)*2*Math.PI;
          return <circle cx={cx+r*Math.cos(a)} cy={cy+r*Math.sin(a)} r={size*.028} fill="white" opacity={dim?.4:1}
            style={{filter:`drop-shadow(0 0 ${size*.025}px ${color})`}}/>;
        })()}
      </svg>
      <div className="z-10 text-center">
        <div className="font-black tracking-tight tabular-nums" style={{fontSize:size*.22,lineHeight:1,color:"white",opacity:dim?.4:1}}>
          {val!=null?val.toFixed(2):"—"}
        </div>
        {g&&<div className="font-black mt-1" style={{fontSize:size*.12,color,opacity:dim?.4:1,textShadow:`0 0 20px ${color}`}}>{g.letter}</div>}
      </div>
    </div>
  );
});

export default function Page(){
  const router=useRouter(),pathname=usePathname();
  const [courses,setCourses]=useState<Course[]>([]);
  const [loading,setLoading]=useState(true);
  const [mounted,setMounted]=useState(false);
  const [tab,setTab]=useState<"courses"|"solver"|"whatif">("courses");
  const [expanded,setExpanded]=useState<number|null>(null);
  const [selC,setSelC]=useState<number|null>(null);
  const [target,setTarget]=useState(90);
  const [goal,setGoal]=useState(3.5);
  const [username,setUsername]=useState("");

  useEffect(()=>{
  setMounted(true);
  const g=localStorage.getItem("goal_gpa"),u=localStorage.getItem("student_user_name")??"";
  if(g)setGoal(parseFloat(g)); setUsername(u);
  
  import("@/lib/firebase").then(({auth})=>{
    // Wait for Firebase auth to initialize
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe(); // Only run once
      if(!user){setLoading(false);return;}
      user.getIdToken().then(token=>{
        fetch(`http://localhost:8000/course/`,{headers:{Authorization:`Bearer ${token}`}})
          .then(r=>r.json()).then((data:any[])=>{
            if(!Array.isArray(data)){setLoading(false);return;}
            setCourses(data.map((c,i)=>({course_id:c.course_id,course_name:c.course_name,instructor:c.instructor??"",credits:c.credits??3,color:COLORS[i%COLORS.length],
              categories:(c.categories??[]).map((cat:any)=>({category_id:cat.category_id,category_name:cat.category_name,weight:cat.weight??0,
                assignments:(cat.assignments??[]).map((a:any)=>({assignment_id:a.assignment_id,title:a.title??"Untitled",score:a.score??null,max_score:a.max_score??100,hypothetical:null}))}))})));
            setLoading(false);
          }).catch(()=>setLoading(false));
      });
    });
  });
},[]);

  const curGpa=useMemo(()=>calcGpa(courses,false),[courses]);
const projGpa=useMemo(()=>calcGpa(courses,true),[courses]);
const cG=useMemo(()=>Object.fromEntries(courses.map(c=>[c.course_id,cPct(c,false)])),[courses]);
const cGH=useMemo(()=>Object.fromEntries(courses.map(c=>[c.course_id,cPct(c,true)])),[courses]);
const selCourse=useMemo(()=>courses.find(c=>c.course_id===selC)??null,[courses,selC]);
const needed=useMemo(()=>selCourse?solve(selCourse,target):null,[selCourse,target]);
const diff=projGpa!=null&&curGpa!=null?projGpa-curGpa:null;
const onTrack=curGpa!=null&&curGpa>=goal;
const prog=curGpa!=null?Math.min((curGpa/goal)*100,100):0;
const curL=curGpa!=null?ltr((curGpa/4)*100):null;

if(!mounted)return null;

  const upd=(cid:number,catId:number,aid:number,val:number|null)=>
    setCourses(p=>p.map(c=>c.course_id!==cid?c:{...c,categories:c.categories.map(cat=>cat.category_id!==catId?cat:{
      ...cat,assignments:cat.assignments.map(a=>a.assignment_id!==aid?a:{...a,hypothetical:val})})}));
  const reset=()=>setCourses(p=>p.map(c=>({...c,categories:c.categories.map(cat=>({...cat,assignments:cat.assignments.map(a=>({...a,hypothetical:null}))}))})));

  return(
    <div className="min-h-screen flex flex-col" style={{background:"#07050f"}}>
      {/* Background — layered gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{position:"absolute",top:0,left:0,right:0,height:"70vh",background:"radial-gradient(ellipse 80% 60% at 20% -10%,rgba(124,58,237,.35) 0%,transparent 60%)"}}/>
        <div style={{position:"absolute",top:0,right:0,width:"50%",height:"60vh",background:"radial-gradient(ellipse 60% 50% at 80% 0%,rgba(6,182,212,.2) 0%,transparent 60%)"}}/>
        <div style={{position:"absolute",bottom:0,left:"30%",width:"40%",height:"40vh",background:"radial-gradient(ellipse 60% 40% at 50% 100%,rgba(236,72,153,.12) 0%,transparent 60%)"}}/>
        {/* Subtle grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(124,58,237,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.04) 1px,transparent 1px)",backgroundSize:"80px 80px"}}/>
      </div>

      {/* NAVBAR */}
      <nav className="relative z-50" style={{borderBottom:"1px solid rgba(124,58,237,.2)",backdropFilter:"blur(24px)",background:"rgba(7,5,15,.75)"}}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span onClick={()=>router.push("/dashboard")} className="text-2xl font-extrabold cursor-pointer select-none text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400">IntelliGPA</span>
          <ul className="flex items-center gap-8">
            {NAVLINKS.map(({label,href})=>{
              const active=pathname===href;
              return<li key={href}><button onClick={()=>router.push(href)} className={`relative text-sm font-semibold pb-1 transition-all duration-200 ${active?"text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400":"text-gray-500 hover:text-gray-200"}`}>
                {label}{active&&<span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400"/>}
              </button></li>;
            })}
          </ul>
        </div>
      </nav>

      <div className="relative flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-8">

        {/* ── SPLIT HERO: left editorial, right big arc ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-[32px] overflow-hidden" style={{
          border:"1px solid rgba(124,58,237,.25)",
          background:"linear-gradient(135deg,rgba(124,58,237,.1) 0%,rgba(7,5,15,.98) 45%,rgba(6,182,212,.07) 100%)",
          boxShadow:"0 0 100px rgba(124,58,237,.12), inset 0 1px 0 rgba(255,255,255,.06)",
        }}>
          {/* Left editorial block */}
          <div className="lg:col-span-8 px-10 py-10 flex flex-col justify-between gap-8">

            {/* Top: title + status */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div style={{width:8,height:8,borderRadius:"50%",backgroundColor:"#c084fc",boxShadow:"0 0 8px #c084fc"}}/>
                  <span style={{fontSize:10,letterSpacing:".3em",textTransform:"uppercase",color:"rgba(192,132,252,.6)"}}>GPA Intelligence System</span>
                </div>
                <h1 style={{fontSize:"clamp(2rem,4vw,3.5rem)",fontWeight:900,lineHeight:1.05,letterSpacing:"-.02em"}}>
                  {username?(
                    <span>
                      <span style={{color:"white"}}>Hey, </span>
                      <span style={{background:"linear-gradient(135deg,#f9a8d4 0%,#c084fc 40%,#67e8f9 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>@{username}</span>
                    </span>
                  ):<span style={{color:"white"}}>Your GPA</span>}
                </h1>
                <p style={{marginTop:8,fontSize:14,color:onTrack?"#4ade80":curGpa!=null?"rgba(209,213,219,1)":"rgba(107,114,128,1)"}}>
                  {onTrack?`✦ You've hit your ${goal.toFixed(1)} goal — keep pushing`
                  :curGpa!=null?`You need +${(goal-curGpa).toFixed(3)} to reach your ${goal.toFixed(1)} target`
                  :"Upload your syllabi to start tracking"}
                </p>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
                <div style={{padding:"6px 14px",borderRadius:999,fontSize:11,fontWeight:700,
                  background:onTrack?"rgba(74,222,128,.12)":"rgba(251,191,36,.1)",
                  border:`1px solid ${onTrack?"rgba(74,222,128,.3)":"rgba(251,191,36,.25)"}`,
                  color:onTrack?"#4ade80":"#fcd34d"}}>
                  {onTrack?"✓ On Track":"In Progress"}
                </div>
                {loading&&<div style={{fontSize:11,color:"rgba(107,114,128,1)",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:10,height:10,border:"1.5px solid rgba(124,58,237,.3)",borderTopColor:"#c084fc",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite"}}/>Loading
                </div>}
              </div>
            </div>

            {/* GPA number + progress */}
            <div>
              {/* Giant GPA display */}
              <div style={{display:"flex",alignItems:"flex-end",gap:16,marginBottom:20}}>
                <div style={{fontSize:"clamp(4rem,8vw,7rem)",fontWeight:900,lineHeight:1,letterSpacing:"-.04em",
                  background:curGpa!=null?"linear-gradient(135deg,#f9a8d4,#c084fc,#67e8f9)":"none",
                  WebkitBackgroundClip:curGpa!=null?"text":"unset",WebkitTextFillColor:curGpa!=null?"transparent":"rgba(55,65,81,1)",
                  fontVariantNumeric:"tabular-nums"}}>
                  {curGpa!=null?curGpa.toFixed(2):"—"}
                </div>
                <div style={{paddingBottom:12}}>
                  <div style={{fontSize:13,color:"rgba(107,114,128,1)",letterSpacing:".05em"}}>/ 4.00 GPA</div>
                  {curL&&<div style={{fontSize:22,fontWeight:900,color:"#c084fc",textShadow:"0 0 16px #c084fc80",marginTop:2}}>{curL.letter} · {curL.points.toFixed(1)}pts</div>}
                </div>
                {projGpa!=null&&curGpa!=null&&Math.abs(projGpa-curGpa)>.001&&(
                  <div style={{paddingBottom:12,marginLeft:"auto"}}>
                    <div style={{fontSize:11,color:"rgba(107,114,128,1)",marginBottom:2}}>Scenario</div>
                    <div style={{fontSize:22,fontWeight:900,color:diff!>0?"#4ade80":"#f87171",textShadow:`0 0 16px ${diff!>0?"#4ade8080":"#f8717180"}`}}>
                      {diff!>0?"↑":"↓"} {Math.abs(diff!).toFixed(3)}
                    </div>
                  </div>
                )}
              </div>

              {/* Thick progress track */}
              <div style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:10,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(75,85,99,1)"}}>Progress toward {goal.toFixed(1)}</span>
                  <span style={{fontSize:13,fontWeight:800,color:"white",fontVariantNumeric:"tabular-nums"}}>{prog.toFixed(1)}%</span>
                </div>
                <div style={{height:20,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",position:"relative"}}>
                  {[.25,.5,.75].map(p=>(
                    <div key={p} style={{position:"absolute",top:0,bottom:0,width:1,left:`${p*100}%`,background:"rgba(255,255,255,.07)"}}/>
                  ))}
                  <div style={{position:"absolute",inset:"0 auto 0 0",borderRadius:999,
                    width:`${prog}%`,
                    background:"linear-gradient(90deg,#9d174d,#7c3aed 50%,#0e7490)",
                    boxShadow:"0 0 30px rgba(124,58,237,.5),inset 0 1px 0 rgba(255,255,255,.25),inset 0 -1px 0 rgba(0,0,0,.4)",
                    transition:"width 1s cubic-bezier(.4,0,.2,1)"}}>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(255,255,255,.2),transparent)",borderRadius:999}}/>
                  </div>
                  {/* goal pin */}
                  <div style={{position:"absolute",top:0,bottom:0,left:`${Math.min((goal/4)*100,97)}%`,width:2,background:"rgba(255,255,255,.4)"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4,paddingInline:2}}>
                  {[0,1,2,3,4].map(n=><span key={n} style={{fontSize:9,color:"rgba(55,65,81,1)"}}>{n}.0</span>)}
                </div>
              </div>

              {/* Grade slider row */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12}}>
                <span style={{fontSize:10,color:"rgba(75,85,99,1)",whiteSpace:"nowrap",letterSpacing:".1em"}}>SET GOAL</span>
                <input type="range" min="1" max="4" step="0.1" value={goal} onChange={e=>setGoal(parseFloat(e.target.value))}
                  style={{flex:1,accentColor:"#f472b6",cursor:"pointer",height:4}}/>
                <span style={{fontSize:20,fontWeight:900,background:"linear-gradient(135deg,#f472b6,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",minWidth:36,textAlign:"right"}}>{goal.toFixed(1)}</span>
              </div>
            </div>

            {/* Grade scale chips */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {SCALE.map(g=>{
                const active=curGpa!=null&&ltr((curGpa/4)*100).letter===g.letter;
                return(
                  <div key={g.letter} style={{
                    display:"flex",flexDirection:"column",alignItems:"center",
                    padding:"8px 12px",borderRadius:12,cursor:"default",
                    transition:"all .3s",
                    ...(active?{
                      background:"linear-gradient(135deg,rgba(192,132,252,.25),rgba(124,58,237,.15))",
                      border:"1px solid rgba(192,132,252,.5)",
                      transform:"translateY(-3px) scale(1.12)",
                      boxShadow:"0 8px 24px rgba(192,132,252,.25),0 0 0 1px rgba(192,132,252,.1)",
                    }:{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}),
                  }}>
                    <span style={{fontSize:12,fontWeight:900,color:active?"#e9d5ff":"rgba(75,85,99,1)"}}>{g.letter}</span>
                    <span style={{fontSize:9,marginTop:2,color:active?"rgba(167,139,250,.8)":"rgba(55,65,81,1)"}}>{g.points.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: big ring + stats */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center gap-5 px-8 py-10" style={{borderLeft:"1px solid rgba(124,58,237,.15)"}}>
            <Arc val={curGpa} color="#c084fc" size={200}/>
            <div style={{width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                {l:"Courses",v:courses.length,c:"#c084fc"},
                {l:"Credits",v:courses.reduce((s,c)=>s+c.credits,0),c:"#67e8f9"},
                {l:"Graded",v:courses.filter(c=>cG[c.course_id]!=null).length,c:"#4ade80"},
                {l:"Pending",v:courses.filter(c=>cG[c.course_id]==null).length,c:"#fb923c"},
              ].map(s=>(
                <div key={s.l} style={{
                  padding:"12px 16px",borderRadius:16,textAlign:"center",
                  background:"rgba(255,255,255,.03)",
                  border:`1px solid ${s.c}20`,
                }}>
                  <div style={{fontSize:28,fontWeight:900,color:s.c,textShadow:`0 0 16px ${s.c}60`,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:"rgba(75,85,99,1)",marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{display:"flex",gap:4,padding:4,borderRadius:20,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",width:"fit-content"}}>
          {[{id:"courses",label:"My Courses",icon:"📚"},{id:"solver",label:"Score Solver",icon:"🎯"},{id:"whatif",label:"What-If",icon:"✨"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)} style={{
              display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:14,
              fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",
              ...(tab===t.id?{
                background:"linear-gradient(135deg,rgba(124,58,237,.45),rgba(79,70,229,.3))",
                border:"1px solid rgba(167,139,250,.4)",color:"white",
                boxShadow:"0 0 24px rgba(124,58,237,.25),inset 0 1px 0 rgba(255,255,255,.1)",
              }:{background:"transparent",border:"1px solid transparent",color:"rgba(107,114,128,1)"}),
            }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div key={tab}>

          {/* MY COURSES */}
          {tab==="courses"&&(loading?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 0",gap:12}}>
              <span style={{width:20,height:20,border:"2px solid rgba(124,58,237,.3)",borderTopColor:"#c084fc",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite"}}/>
              <span style={{color:"rgba(75,85,99,1)",fontSize:14}}>Loading courses...</span>
            </div>
          ):courses.length===0?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px",gap:24,borderRadius:28,background:"rgba(255,255,255,.02)",border:"1px solid rgba(124,58,237,.12)"}}>
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",inset:-20,borderRadius:"50%",background:"rgba(124,58,237,.3)",filter:"blur(30px)"}}/>
                <div style={{position:"relative",width:88,height:88,borderRadius:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,
                  background:"linear-gradient(135deg,rgba(124,58,237,.35),rgba(79,70,229,.2))",
                  border:"1px solid rgba(167,139,250,.3)"}}>🎓</div>
              </div>
              <div style={{textAlign:"center",maxWidth:400}}>
                <h3 style={{fontSize:24,fontWeight:800,color:"white",marginBottom:8}}>No courses loaded yet</h3>
                <p style={{fontSize:14,color:"rgba(107,114,128,1)",lineHeight:1.6}}>Upload your syllabi from the dashboard to unlock GPA tracking, grade predictions, and smart insights across all your courses.</p>
              </div>
              <button onClick={()=>router.push("/dashboard")} style={{
                padding:"14px 32px",borderRadius:18,fontWeight:700,color:"white",fontSize:14,cursor:"pointer",
                background:"linear-gradient(135deg,#9d174d,#7c3aed,#0e7490)",
                boxShadow:"0 0 40px rgba(124,58,237,.5),inset 0 1px 0 rgba(255,255,255,.15)",
                border:"none",transition:"all .2s",
              }}
              onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.05)")}
              onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
                Upload Syllabi →
              </button>
            </div>
          ):courses.map(c=>{
            const g=cG[c.course_id],e=g!=null?ltr(g):null,open=expanded===c.course_id;
            const done=c.categories.flatMap(x=>x.assignments).filter(a=>a.score!=null).length;
            const total=c.categories.flatMap(x=>x.assignments).length;
            return(
              <div key={c.course_id} style={{marginBottom:10,borderRadius:22,overflow:"hidden",
                background:open?`linear-gradient(135deg,${c.color}0d,rgba(7,5,15,.98))`:"rgba(255,255,255,.025)",
                border:`1px solid ${open?c.color+"45":"rgba(255,255,255,.07)"}`,
                boxShadow:open?`0 0 40px ${c.color}12,0 0 0 1px ${c.color}10`:"none",
                transition:"all .3s"}}>
                <button onClick={()=>setExpanded(open?null:c.course_id)} style={{
                  width:"100%",display:"flex",alignItems:"center",gap:16,padding:"18px 24px",
                  background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:4,alignSelf:"stretch",borderRadius:4,backgroundColor:c.color,boxShadow:`0 0 16px ${c.color},0 0 32px ${c.color}60`,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:3}}>{c.course_name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:"rgba(75,85,99,1)"}}>
                      {c.instructor&&<><span>{c.instructor}</span><span style={{color:"rgba(31,41,55,1)"}}>·</span></>}
                      <span>{c.credits} credits</span><span style={{color:"rgba(31,41,55,1)"}}>·</span>
                      <span>{done}/{total} graded</span>
                    </div>
                  </div>
                  {/* Mini bar */}
                  <div style={{width:100,display:"flex",flexDirection:"column",gap:5}}>
                    <div style={{height:4,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.07)"}}>
                      <div style={{height:"100%",borderRadius:999,backgroundColor:c.color,width:`${g??0}%`,boxShadow:`0 0 8px ${c.color}`,transition:"width .7s ease"}}/>
                    </div>
                    <span style={{fontSize:9,color:"rgba(55,65,81,1)",fontVariantNumeric:"tabular-nums"}}>{g!=null?`${g.toFixed(2)}%`:"No grades"}</span>
                  </div>
                  {/* Grade badge */}
                  {e?(
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 18px",borderRadius:16,minWidth:72,
                      background:`${c.color}18`,border:`1px solid ${c.color}35`,boxShadow:`0 0 20px ${c.color}15`}}>
                      <span style={{fontSize:26,fontWeight:900,color:c.color,textShadow:`0 0 20px ${c.color}`,lineHeight:1}}>{e.letter}</span>
                      <span style={{fontSize:10,fontWeight:700,color:c.color,opacity:.7,marginTop:2,fontVariantNumeric:"tabular-nums"}}>{g?.toFixed(1)}%</span>
                    </div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 18px",borderRadius:16,minWidth:72,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
                      <span style={{fontSize:26,fontWeight:900,color:"rgba(55,65,81,1)"}}>—</span>
                    </div>
                  )}
                  <span style={{fontSize:20,color:"rgba(75,85,99,1)",transition:"transform .3s",transform:open?"rotate(90deg)":"rotate(0deg)"}}>›</span>
                </button>
                {open&&(
                  <div style={{borderTop:`1px solid ${c.color}20`,padding:"20px 24px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
                    {c.categories.map(cat=>{
                      const cg=catPct(cat),ce=cg!=null?ltr(cg):null;
                      return(
                        <div key={cat.category_id} style={{borderRadius:18,padding:16,background:`linear-gradient(135deg,${c.color}0c,rgba(7,5,15,.9))`,border:`1px solid ${c.color}25`}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:"white"}}>{cat.category_name}</div>
                              <div style={{fontSize:10,color:"rgba(75,85,99,1)",marginTop:2}}>{cat.weight}% of grade</div>
                            </div>
                            {ce&&<span style={{fontSize:13,fontWeight:900,padding:"2px 8px",borderRadius:8,color:c.color,background:`${c.color}20`}}>{ce.letter}</span>}
                          </div>
                          <div style={{fontSize:28,fontWeight:900,color:cg!=null?c.color:"rgba(55,65,81,1)",textShadow:cg!=null?`0 0 16px ${c.color}60`:"none",marginBottom:8,lineHeight:1}}>
                            {cg!=null?`${cg.toFixed(1)}%`:"—"}
                          </div>
                          <div style={{height:4,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.07)",marginBottom:12}}>
                            <div style={{height:"100%",borderRadius:999,backgroundColor:c.color,width:`${cg??0}%`,boxShadow:`0 0 6px ${c.color}`,transition:"width .6s"}}/>
                          </div>
                          {cat.assignments.map(a=>(
                            <div key={a.assignment_id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,paddingBlock:5,borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                              <span style={{color:"rgba(107,114,128,1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:8}}>{a.title}</span>
                              <span style={{color:a.score!=null?"white":"rgba(55,65,81,1)",fontFamily:"monospace",flexShrink:0}}>{a.score!=null?`${a.score}/${a.max_score}`:`—/${a.max_score}`}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }))}

          {/* SCORE SOLVER */}
          {tab==="solver"&&(
            <div style={{display:"grid",gridTemplateColumns:"2fr 3fr",gap:16}}>
              <div style={{borderRadius:24,padding:24,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",display:"flex",flexDirection:"column",gap:20}}>
                <div>
                  <h2 style={{fontSize:18,fontWeight:800,color:"white",marginBottom:4}}>Score Solver</h2>
                  <p style={{fontSize:13,color:"rgba(107,114,128,1)"}}>What do you need to hit your target?</p>
                </div>
                <div>
                  <p style={{fontSize:10,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(55,65,81,1)",marginBottom:10}}>Select Course</p>
                  {!courses.length?<p style={{fontSize:13,color:"rgba(55,65,81,1)",textAlign:"center",padding:"24px 0"}}>No courses loaded</p>:
                    courses.map(c=>(
                      <button key={c.course_id} onClick={()=>setSelC(c.course_id)} style={{
                        width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:14,marginBottom:6,cursor:"pointer",textAlign:"left",
                        ...(selC===c.course_id?{background:`${c.color}18`,border:`1px solid ${c.color}45`,color:"white",boxShadow:`0 0 16px ${c.color}12`}:{background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)",color:"rgba(107,114,128,1)"}),
                      }}>
                        <span style={{width:10,height:10,borderRadius:"50%",backgroundColor:c.color,boxShadow:`0 0 8px ${c.color}`,flexShrink:0}}/>
                        <span style={{fontSize:13,fontWeight:500,flex:1}}>{c.course_name}</span>
                        {cG[c.course_id]!=null&&<span style={{fontSize:11,fontWeight:700,color:c.color}}>{cG[c.course_id]!.toFixed(1)}%</span>}
                      </button>
                    ))
                  }
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <p style={{fontSize:10,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(55,65,81,1)"}}>Target</p>
                    <span style={{fontSize:13,fontWeight:800,padding:"4px 12px",borderRadius:10,
                      color:ltr(target).points>=3?"#4ade80":"#f87171",
                      background:ltr(target).points>=3?"rgba(74,222,128,.1)":"rgba(248,113,113,.1)",
                      border:`1px solid ${ltr(target).points>=3?"rgba(74,222,128,.25)":"rgba(248,113,113,.25)"}`}}>
                      {ltr(target).letter} · {ltr(target).points.toFixed(1)} pts
                    </span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <input type="range" min="50" max="100" step="1" value={target} onChange={e=>setTarget(parseInt(e.target.value))}
                      style={{flex:1,accentColor:"#67e8f9",cursor:"pointer",height:4}}/>
                    <span style={{fontSize:24,fontWeight:900,color:"#67e8f9",minWidth:52,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{target}%</span>
                  </div>
                </div>
              </div>

              <div style={{borderRadius:24,display:"flex",alignItems:"center",justifyContent:"center",padding:40,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",minHeight:320}}>
                {!selCourse?(
                  <div style={{textAlign:"center",opacity:.2}}><div style={{fontSize:80}}>🎯</div><p style={{color:"rgba(156,163,175,1)",marginTop:12}}>Pick a course to solve</p></div>
                ):needed==null?(
                  <div style={{textAlign:"center"}}><div style={{fontSize:72}}>✅</div><p style={{fontSize:20,fontWeight:800,color:"#4ade80",marginTop:12}}>Everything's graded!</p></div>
                ):needed>100?(
                  <div style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                    <div style={{fontSize:72}}>😬</div>
                    <p style={{fontSize:20,fontWeight:800,color:"#f87171"}}>Not mathematically possible</p>
                    <p style={{fontSize:13,color:"rgba(107,114,128,1)"}}>Would need {needed.toFixed(0)}% — try a lower target</p>
                    <button onClick={()=>setTarget(t=>Math.max(50,t-5))} style={{padding:"10px 20px",borderRadius:12,fontSize:13,color:"rgba(209,213,219,1)",cursor:"pointer",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)"}}>Lower by 5% →</button>
                  </div>
                ):needed<=0?(
                  <div style={{textAlign:"center"}}><div style={{fontSize:72}}>🏆</div><p style={{fontSize:20,fontWeight:800,color:"#4ade80",marginTop:12}}>Already locked in!</p><p style={{fontSize:13,color:"rgba(107,114,128,1)",marginTop:4}}>Even zeros can't drop you below {target}%</p></div>
                ):(
                  <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
                    <div style={{textAlign:"center"}}>
                      <p style={{fontSize:13,color:"rgba(107,114,128,1)"}}>For a <b style={{color:selCourse.color}}>{ltr(target).letter}</b> in <b style={{color:"white"}}>{selCourse.course_name}</b></p>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{
                        fontSize:120,fontWeight:900,lineHeight:1,letterSpacing:"-.04em",
                        background:`linear-gradient(135deg,${needed>80?"#f472b6,#c084fc":needed>60?"#fb923c,#f59e0b":"#4ade80,#22d3ee"})`,
                        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                        fontVariantNumeric:"tabular-nums",
                      }}>{Math.ceil(needed)}</div>
                      <div style={{fontSize:22,fontWeight:800,color:"rgba(75,85,99,1)",marginTop:-8}}>% needed</div>
                    </div>
                    <div style={{width:"100%"}}>
                      <div style={{height:10,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.06)",marginBottom:8}}>
                        <div style={{height:"100%",borderRadius:999,
                          width:`${Math.min(needed,100)}%`,
                          background:needed<=60?"linear-gradient(90deg,#4ade80,#22d3ee)":needed<=80?"linear-gradient(90deg,#fb923c,#f59e0b)":"linear-gradient(90deg,#f472b6,#e879f9)",
                          boxShadow:needed<=60?"0 0 12px #4ade8080":needed<=80?"0 0 12px #fb923c80":"0 0 12px #f472b680",
                          transition:"all .7s"}}/>
                      </div>
                      <p style={{textAlign:"center",fontSize:13,fontWeight:600,color:needed<=60?"#4ade80":needed<=80?"#fb923c":"#f472b6"}}>
                        {needed<=60?"✓ Very achievable":needed<=80?"⚡ Challenging but doable":"🔥 You'll really need to grind"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WHAT-IF */}
          {tab==="whatif"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <h2 style={{fontSize:18,fontWeight:800,color:"white",marginBottom:4}}>What-If Simulator ✨</h2>
                  <p style={{fontSize:13,color:"rgba(107,114,128,1)"}}>Enter hypothetical scores — your GPA updates live</p>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {diff!=null&&Math.abs(diff)>.001&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:14,fontSize:14,fontWeight:700,
                      ...(diff>0?{background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.25)",color:"#4ade80",boxShadow:"0 0 12px rgba(74,222,128,.1)"}:{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171"})}}>
                      {diff>0?"↑ +":"↓ "}{diff.toFixed(3)} GPA
                    </div>
                  )}
                  <button onClick={reset} style={{padding:"8px 16px",borderRadius:14,fontSize:13,color:"rgba(107,114,128,1)",cursor:"pointer",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)"}}>Reset All</button>
                </div>
              </div>
              {!courses.length?(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:64,borderRadius:24,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)"}}>
                  <div style={{fontSize:48,opacity:.2,marginBottom:12}}>✨</div>
                  <p style={{color:"rgba(55,65,81,1)"}}>No courses to simulate</p>
                </div>
              ):courses.map(c=>{
                const real=cG[c.course_id],hypo=cGH[c.course_id],d=real!=null&&hypo!=null?hypo-real:null;
                const ungraded=c.categories.flatMap(cat=>cat.assignments.filter(a=>a.score===null).map(a=>({...a,catId:cat.category_id,catName:cat.category_name,catWeight:cat.weight})));
                return(
                  <div key={c.course_id} style={{borderRadius:22,overflow:"hidden",background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 24px",borderBottom:`1px solid ${c.color}20`,background:`linear-gradient(90deg,${c.color}12,transparent 70%)`}}>
                      <div style={{width:6,height:20,borderRadius:3,backgroundColor:c.color,boxShadow:`0 0 10px ${c.color}`,flexShrink:0}}/>
                      <h3 style={{fontSize:14,fontWeight:700,color:"white",flex:1}}>{c.course_name}</h3>
                      <div style={{display:"flex",alignItems:"center",gap:16,fontSize:12}}>
                        <span style={{color:"rgba(107,114,128,1)"}}>Now: <b style={{color:"white",fontVariantNumeric:"tabular-nums"}}>{real!=null?`${real.toFixed(1)}%`:"—"}</b></span>
                        <span style={{color:"rgba(31,41,55,1)"}}>→</span>
                        <span style={{color:"rgba(107,114,128,1)"}}>After: <b style={{color:c.color,fontVariantNumeric:"tabular-nums"}}>{hypo!=null?`${hypo.toFixed(1)}%`:"—"}</b></span>
                        {d!=null&&Math.abs(d)>.01&&(
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,
                            ...(d>0?{background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.2)",color:"#4ade80"}:{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.2)",color:"#f87171"})}}>
                            {d>0?"+":""}{d.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {!ungraded.length?(
                      <p style={{fontSize:12,color:"rgba(55,65,81,1)",textAlign:"center",padding:"20px 0"}}>All assignments graded</p>
                    ):(
                      <div style={{padding:20,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
                        {ungraded.map(a=>(
                          <div key={a.assignment_id} style={{borderRadius:16,padding:14,transition:"all .2s",
                            background:a.hypothetical!=null?`${c.color}10`:"rgba(255,255,255,.025)",
                            border:`1px solid ${a.hypothetical!=null?c.color+"35":"rgba(255,255,255,.06)"}`,
                            boxShadow:a.hypothetical!=null?`0 0 16px ${c.color}15`:"none"}}>
                            <p style={{fontSize:11,fontWeight:600,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{a.title}</p>
                            <p style={{fontSize:9,color:"rgba(75,85,99,1)",marginBottom:10}}>{a.catName} · max {a.max_score}</p>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <input type="number" min="0" max={a.max_score} placeholder="Score?"
                                value={a.hypothetical??""} onChange={e=>upd(c.course_id,a.catId,a.assignment_id,e.target.value===""?null:Math.min(parseFloat(e.target.value),a.max_score))}
                                style={{flex:1,minWidth:0,borderRadius:10,padding:"6px 10px",fontSize:12,color:"white",background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.1)",outline:"none"}}/>
                              {a.hypothetical!=null&&<span style={{fontSize:11,fontWeight:800,flexShrink:0,color:c.color}}>{((a.hypothetical/a.max_score)*100).toFixed(0)}%</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        input[type=range]{height:4px;border-radius:9999px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .animate-spin{animation:spin 1s linear infinite}
      `}</style>
    </div>
  );
}
