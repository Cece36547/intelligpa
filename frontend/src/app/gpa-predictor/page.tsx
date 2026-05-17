"use client";

import { useState, useEffect, useMemo, memo, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

type Course={course_id:number;course_name:string;instructor:string;credits:number;categories:Category[];color:string;};
type Category={category_id:number;category_name:string;weight:number;assignments:Assign[];};
type Assign={assignment_id:number;title:string;score:number|null;max_score:number;hypothetical?:number|null;};
type Grade={letter:string;min:number;points:number;};
type RiskAnalysis = {
  risk_level: string;
  confidence: string;
  difference_from_goal: number | null;
  completion_rate: number;
  message: string;
};
type SimulationResult = {
  course_id: number;
  course_name: string;
  current_percentage: number;
  simulated_percentage: number;
  delta_percentage: number;
  simulated_letter: string;
  simulated_points: number;
  categories: {
    category_id: number;
    category_name: string;
    weight: number;
    simulated_average: number | null;
  }[];
};
type PredictionResult = {
  course_id: number;
  course_name: string;
  baseline_average_used: number;
  simulations_run: number;
  predicted_average: number;
  most_likely_letter: string;
  confidence: number;
  probabilities: Record<string, number>;
  current_projection: number;
  explanation: string;
};

const SCALE:Grade[]=[
  {letter:"A",min:93,points:4.0},{letter:"A-",min:90,points:3.7},
  {letter:"B+",min:87,points:3.3},{letter:"B",min:83,points:3.0},
  {letter:"B-",min:80,points:2.7},{letter:"C+",min:77,points:2.3},
  {letter:"C",min:73,points:2.0},{letter:"C-",min:70,points:1.7},
  {letter:"D+",min:67,points:1.3},{letter:"D",min:60,points:1.0},
  {letter:"F",min:0,points:0.0},
];
const PALETTE=["#818cf8","#34d399","#f472b6","#fb923c","#22d3ee","#a78bfa","#fbbf24","#4ade80"];
const NAV=[{l:"Dashboard",h:"/dashboard"},{l:"Calendar",h:"/calendar"},{l:"GPA Predictor",h:"/gpa-predictor"},{l:"Profile",h:"/profile"}];

const ltr=(p:number)=>SCALE.find(g=>p>=g.min)??SCALE[SCALE.length-1];
const gc=(l:string)=>l.startsWith("A")?"#4ade80":l.startsWith("B")?"#818cf8":l.startsWith("C")?"#fbbf24":l.startsWith("D")?"#fb923c":"#f87171";
const gcBg=(l:string)=>l.startsWith("A")?"rgba(74,222,128,.12)":l.startsWith("B")?"rgba(129,140,248,.12)":l.startsWith("C")?"rgba(251,191,36,.12)":l.startsWith("D")?"rgba(251,146,60,.12)":"rgba(248,113,113,.12)";
const gcBd=(l:string)=>l.startsWith("A")?"rgba(74,222,128,.25)":l.startsWith("B")?"rgba(129,140,248,.25)":l.startsWith("C")?"rgba(251,191,36,.25)":l.startsWith("D")?"rgba(251,146,60,.25)":"rgba(248,113,113,.25)";

function catPct(cat:Category,h=false):number|null{
  const it=cat.assignments.filter(a=>(h&&a.hypothetical!=null?a.hypothetical:a.score)!==null);
  if(!it.length)return null;
  return it.reduce((s,a)=>s+(h&&a.hypothetical!=null?a.hypothetical!:a.score!),0)/it.reduce((s,a)=>s+a.max_score,0)*100;
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

// ── Animated arc ──────────────────────────────────────────────────────────────
const Arc=memo(function Arc({val,size=180,color,label}:{val:number|null;size?:number;color:string;label:string}){
  const p=val==null?0:Math.min(val/4,1);
  const r=size*.37,circ=2*Math.PI*r,cx=size/2,cy=size/2,fill=p*circ*.82;
  const g=val!=null?ltr((val/4)*100):null;
  return(
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:size,height:size,flexShrink:0}}>
      {val!=null&&<div style={{position:"absolute",top:"15%",left:"15%",width:"70%",height:"70%",
        borderRadius:"50%",background:color,opacity:.11,filter:`blur(${size*.2}px)`}}/>}
      <svg viewBox={`0 0 ${size} ${size}`} style={{position:"absolute",inset:0,width:"100%",height:"100%",transform:"rotate(-148deg)"}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)"
          strokeWidth={size*.08} strokeDasharray={`${circ*.82} ${circ*.18}`} strokeLinecap="round"/>
        {val!=null&&<circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size*.077}
          strokeDasharray={`${fill} ${circ-fill+circ*.18}`} strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 ${size*.042}px ${color}) drop-shadow(0 0 ${size*.1}px ${color}55)`,
            transition:"stroke-dasharray 1.5s cubic-bezier(.34,1.4,.64,1)"}}/>}
        {val!=null&&p>.04&&(()=>{
          const a=(p*.82-.09)*2*Math.PI;
          return<circle cx={cx+r*Math.cos(a)} cy={cy+r*Math.sin(a)} r={size*.03} fill="white"
            style={{filter:`drop-shadow(0 0 3px white) drop-shadow(0 0 8px ${color})`}}/>;
        })()}
      </svg>
      <div style={{zIndex:1,textAlign:"center",userSelect:"none",pointerEvents:"none"}}>
        <div style={{fontSize:size*.059,color:"rgba(100,116,139,1)",textTransform:"uppercase",letterSpacing:".2em",fontWeight:600,marginBottom:2}}>{label}</div>
        <div style={{fontSize:size*.24,fontWeight:900,lineHeight:.92,fontVariantNumeric:"tabular-nums",
          letterSpacing:"-.03em",color:val!=null?"white":"rgba(51,65,85,1)"}}>
          {val!=null?val.toFixed(2):"—"}
        </div>
        {g&&val!=null&&<div style={{fontSize:size*.11,fontWeight:900,color,marginTop:4,textShadow:`0 0 20px ${color}`,lineHeight:1}}>{g.letter}</div>}
      </div>
    </div>
  );
});

function Bar({pct,color,h=4,bg="rgba(255,255,255,.06)"}:{pct:number|null;color:string;h?:number;bg?:string}){
  return(
    <div style={{height:h,borderRadius:999,background:bg,overflow:"hidden"}}>
      <div style={{height:"100%",borderRadius:999,width:`${Math.min(pct??0,100)}%`,
        background:`linear-gradient(90deg,${color}85,${color})`,
        boxShadow:`0 0 8px ${color}55`,transition:"width 1.1s cubic-bezier(.34,1.1,.64,1)"}}/>
    </div>
  );
}

// ── Ticked progress bar ───────────────────────────────────────────────────────
function TickBar({pct,goal,color}:{pct:number;goal:number;color:string}){
  const goalPct=Math.min((goal/4)*100,100);
  return(
    <div style={{position:"relative"}}>
      <div style={{height:10,borderRadius:999,background:"rgba(255,255,255,.05)",overflow:"hidden",position:"relative"}}>
        {[25,50,75].map(p=><div key={p} style={{position:"absolute",top:0,bottom:0,left:`${p}%`,zIndex:2,
          width:1,background:"rgba(255,255,255,.08)"}}/>)}
        <div style={{position:"absolute",inset:"0 auto 0 0",width:`${pct}%`,borderRadius:999,
          background:`linear-gradient(90deg,${color}80,${color})`,
          boxShadow:`0 0 20px ${color}50`,transition:"width 1.2s cubic-bezier(.34,1.1,.64,1)"}}>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(255,255,255,.2),transparent)",borderRadius:999}}/>
        </div>
        <div style={{position:"absolute",top:0,bottom:0,left:`${goalPct}%`,zIndex:3,
          width:2,background:"rgba(255,255,255,.6)",boxShadow:"0 0 5px white"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
        {[0,1,2,3,4].map(n=><span key={n} style={{fontSize:8,color:"rgba(51,65,85,1)",fontFamily:"monospace"}}>{n}.0</span>)}
      </div>
    </div>
  );
}

export default function Page(){
  const router=useRouter(),pathname=usePathname();
  const [neededResult, setNeededResult] = useState<any>(null);
  const [neededLoading, setNeededLoading] = useState(false);
  const [courses,setCourses]=useState<Course[]>([]);
  const [loading,setLoading]=useState(true);
  const [mounted,setMounted]=useState(false);
  const [tab,setTab]=useState<"overview"|"courses"|"solver"|"whatif">("overview");
  const [expanded,setExpanded]=useState<number|null>(null);
  const [selC,setSelC]=useState<number|null>(null);
  const [target,setTarget]=useState(90);
  const [goal,setGoal]=useState(3.5);
  const [username,setUsername]=useState("");
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [simulationResults, setSimulationResults] = useState<Record<number, SimulationResult | null>>({});
  const [simulationLoading, setSimulationLoading] = useState<Record<number, boolean>>({});
  const [predictionResults, setPredictionResults] = useState<Record<number, PredictionResult | null>>({});
  const [predictionLoading, setPredictionLoading] = useState<Record<number, boolean>>({});

  useEffect(()=>{
    setMounted(true);
    const g=localStorage.getItem("goal_gpa"),u=localStorage.getItem("student_user_name")??"";
    if(g)setGoal(parseFloat(g));setUsername(u);
    import("@/lib/firebase").then(({auth})=>{
      const unsub=auth.onAuthStateChanged(user=>{
        unsub();if(!user){setLoading(false);return;}
        user.getIdToken().then(token=>{
          fetch(`http://localhost:8000/gpa/project`, {headers: {Authorization: `Bearer ${token}`}})
            .then(r => r.json())
            .then((data:any) => {
              const projectedCourses = data.projected_courses ?? [];
              setRiskAnalysis(data.risk_analysis ?? null);

              setCourses(projectedCourses.map((c:any, i:number) => ({
                course_id: c.course_id,
                course_name: c.course_name,
                instructor: c.instructor ?? "",
                credits: c.credits ?? 3,
                color: PALETTE[i % PALETTE.length],
                categories: (c.categories ?? []).map((cat:any) => ({
                  category_id: cat.category_id,
                  category_name: cat.category_name,
                  weight: cat.weight ?? 0,
                  assignments: (cat.assignments ?? []).map((a:any) => ({
                    assignment_id: a.assignment_id,
                    title: a.title ?? "Untitled",
                    score: a.score ?? null,
                    max_score: a.max_score ?? 100,
                    hypothetical: null,
                  })),
                })),
              })));

              setLoading(false);
            })
            .catch(() => setLoading(false));
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
  const allA=useMemo(()=>courses.flatMap(c=>c.categories.flatMap(cat=>cat.assignments)),[courses]);
  const gradedA=useMemo(()=>allA.filter(a=>a.score!=null),[allA]);
  const totalCr=courses.reduce((s,c)=>s+c.credits,0);
  const hasWI=diff!=null&&Math.abs(diff)>.001;
  const accentColor=curGpa!=null?gc(ltr((curGpa/4)*100).letter):"#818cf8";
  const calculateNeededScore = async () => {
    if (!selCourse || !username) return;

    setNeededLoading(true);

    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`http://localhost:8000/gpa/needed/${selCourse.course_id}?target=${target}`, 
        { headers: { Authorization: `Bearer ${token}` }}
      );

      const data = await res.json();
      setNeededResult(data);
    } catch (err) {
      console.error("Needed score error:", err);
    } finally {
      setNeededLoading(false);
    }
  };
  const runBackendSimulation = async (course: Course) => {
    if (!username) return;

    const hypotheticalScores = course.categories.flatMap(cat =>
      cat.assignments
        .filter(a => a.hypothetical !== null && a.hypothetical !== undefined)
        .map(a => ({
          assignment_id: a.assignment_id,
          score: a.hypothetical,
          max_score: a.max_score ?? 100,
        }))
    );

    if (hypotheticalScores.length === 0) {
      alert("Enter at least one hypothetical score first.");
      return;
    }

    setSimulationLoading(prev => ({ ...prev, [course.course_id]: true }));

    try {
      const { auth } = await import("@/lib/firebase");
const token = await auth.currentUser?.getIdToken();
const res = await fetch(
  `http://localhost:8000/gpa/simulate/${course.course_id}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(hypotheticalScores),
  }
    );

      if (!res.ok) {
        alert("Simulation failed.");
        return;
      }

      const data = await res.json();

      setSimulationResults(prev => ({
        ...prev,
        [course.course_id]: data,
      }));
    } catch (err) {
      console.error("Simulation error:", err);
      alert("Error running simulation.");
    } finally {
      setSimulationLoading(prev => ({ ...prev, [course.course_id]: false }));
    }
  };
  const runPrediction = async (course: Course) => {
    if (!username) return;

    setPredictionLoading(prev => ({ ...prev, [course.course_id]: true }));

    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`http://localhost:8000/gpa/predict/${course.course_id}?simulations=1000`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

      if (!res.ok) {
        alert("Prediction failed.");
        return;
      }

      const data = await res.json();

      setPredictionResults(prev => ({
        ...prev,
        [course.course_id]: data,
      }));
    } catch (err) {
      console.error("Prediction error:", err);
      alert("Error running prediction.");
    } finally {
      setPredictionLoading(prev => ({ ...prev, [course.course_id]: false }));
    }
  };

  const upd=useCallback((cid:number,catId:number,aid:number,val:number|null)=>
    setCourses(p=>p.map(c=>c.course_id!==cid?c:{...c,categories:c.categories.map(cat=>cat.category_id!==catId?cat:{
      ...cat,assignments:cat.assignments.map(a=>a.assignment_id!==aid?a:{...a,hypothetical:val})})})),[]);
  const reset=useCallback(()=>setCourses(p=>p.map(c=>({...c,
    categories:c.categories.map(cat=>({...cat,assignments:cat.assignments.map(a=>({...a,hypothetical:null}))}))}))),[]);

  if(!mounted)return null;

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&display=swap');
    *{box-sizing:border-box;}
    body{background:#040510;}
    input[type=range]{height:3px;border-radius:99px;cursor:pointer;}
    input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{opacity:.2;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes floatIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
    @keyframes dot{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.4);opacity:1}}
    .fi{animation:floatIn .5s cubic-bezier(.34,1.2,.64,1) both;}
    .fi1{animation-delay:.07s}.fi2{animation-delay:.14s}.fi3{animation-delay:.21s}
    .row-hover{transition:background .15s,border-color .15s,transform .15s;}
    .row-hover:hover{transform:translateY(-1px);}
  `;

  // GPA color for theming the whole page
  const pageAccent=curGpa!=null?gc(ltr((curGpa/4)*100).letter):"#818cf8";

  const TABS=[
    {id:"overview"as const,icon:"◈",label:"Overview"},
    {id:"courses"as const,icon:"≡",label:"My Courses"},
    {id:"solver"as const,icon:"◎",label:"Score Solver"},
    {id:"whatif"as const,icon:"◇",label:"What-If ✨"},
  ];

  const card=(extra?:React.CSSProperties)=>({
    borderRadius:20,
    background:"rgba(255,255,255,.028)",
    border:"1px solid rgba(255,255,255,.07)",
    boxShadow:"inset 0 1px 0 rgba(255,255,255,.04)",
    ...extra,
  } as React.CSSProperties);

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:"#040510",
      color:"white",fontFamily:"'Syne',system-ui,sans-serif"}}>
      <style>{css}</style>

      {/* ── FULL PAGE GLOW based on GPA letter ── */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-30%",left:"-20%",width:"80%",height:"80%",
          background:`radial-gradient(ellipse,${pageAccent}18 0%,transparent 65%)`,
          transition:"background 2s ease"}}/>
        <div style={{position:"absolute",top:"-15%",right:"-15%",width:"60%",height:"60%",
          background:"radial-gradient(ellipse,rgba(129,140,248,.1) 0%,transparent 65%)"}}/>
        <div style={{position:"absolute",bottom:"-20%",left:"30%",width:"50%",height:"50%",
          background:"radial-gradient(ellipse,rgba(244,114,182,.06) 0%,transparent 60%)"}}/>
        {/* grid */}
        <div style={{position:"absolute",inset:0,
          backgroundImage:"linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)",
          backgroundSize:"56px 56px"}}/>
        <div style={{position:"absolute",inset:0,
          backgroundImage:"linear-gradient(rgba(129,140,248,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(129,140,248,.04) 1px,transparent 1px)",
          backgroundSize:"280px 280px"}}/>
        {/* noise */}
        <div style={{position:"absolute",inset:0,opacity:.02,
          backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize:"200px"}}/>
      </div>

      {/* ── NAVBAR ── */}
      <nav style={{position:"relative",zIndex:50,height:56,
        background:"rgba(4,5,16,.92)",backdropFilter:"blur(40px) saturate(200%)",
        borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{maxWidth:1300,margin:"0 auto",width:"100%",padding:"0 28px",height:"100%",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>router.push("/dashboard")} style={{background:"none",border:"none",cursor:"pointer",
            display:"flex",alignItems:"center",gap:9,padding:0}}>
            <div style={{width:28,height:28,borderRadius:8,
              background:"linear-gradient(135deg,#f472b6,#818cf8,#22d3ee)",
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,
              boxShadow:"0 0 14px rgba(129,140,248,.4)"}}>G</div>
            <span style={{fontSize:15,fontWeight:900,letterSpacing:"-.04em"}}>IntelliGPA</span>
          </button>
          <div style={{display:"flex",gap:1}}>
            {NAV.map(({l,h})=>{
              const a=pathname===h;
              return<button key={h} onClick={()=>router.push(h)} style={{
                padding:"5px 14px",borderRadius:9,fontSize:11,fontWeight:700,cursor:"pointer",
                letterSpacing:".05em",textTransform:"uppercase",transition:"all .15s",
                background:a?"rgba(129,140,248,.14)":"transparent",
                border:`1px solid ${a?"rgba(129,140,248,.3)":"transparent"}`,
                color:a?"#a5b4fc":"rgba(71,85,105,1)"}}>
                {l}
              </button>;
            })}
          </div>
        </div>
      </nav>

      <div style={{position:"relative",zIndex:1,flex:1,maxWidth:1300,margin:"0 auto",
        width:"100%",padding:"28px 28px 80px",display:"flex",flexDirection:"column",gap:16}}>

        {/* ═══════════════════════════════════════════════════════
            HERO BLOCK — completely redesigned
            Works beautifully with NO data, partial data, or full data
        ═══════════════════════════════════════════════════════ */}
        <div className="fi" style={{borderRadius:28,overflow:"hidden",
          background:"linear-gradient(145deg,rgba(129,140,248,.14) 0%,rgba(4,5,16,.97) 55%,rgba(34,211,238,.05) 100%)",
          border:"1px solid rgba(129,140,248,.18)",
          boxShadow:`0 0 80px ${pageAccent}0a,inset 0 1px 0 rgba(255,255,255,.05)`,
          transition:"box-shadow 2s ease"}}>

          {/* rainbow top line */}
          <div style={{height:2,background:"linear-gradient(90deg,#f472b6,#818cf8 35%,#22d3ee 65%,#4ade80)"}}/>

          <div style={{display:"grid",gridTemplateColumns:"1fr 296px",minHeight:300}}>

            {/* LEFT */}
            <div style={{padding:"36px 44px",display:"flex",flexDirection:"column",gap:24}}>
              {/* dots + label */}
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                {["#f472b6","#818cf8","#22d3ee"].map((c,i)=>(
                  <div key={i} style={{width:5,height:5,borderRadius:"50%",background:c,
                    boxShadow:`0 0 7px ${c}`,animation:`dot ${1.4+i*.25}s ease-in-out ${i*.15}s infinite`}}/>
                ))}
                <span style={{fontSize:8,letterSpacing:".38em",textTransform:"uppercase",
                  color:"rgba(129,140,248,.45)",fontWeight:700,marginLeft:3}}>GPA Intelligence</span>
                {username&&<span style={{marginLeft:"auto",fontSize:12,color:"rgba(100,116,139,1)"}}>
                  Hey, <b style={{color:"rgba(165,180,252,1)",fontWeight:700}}>@{username}</b>
                </span>}
              </div>

              {loading?(
                <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                  <div style={{width:16,height:16,borderRadius:"50%",border:"1.5px solid rgba(129,140,248,.2)",
                    borderTopColor:"#818cf8",animation:"spin 1s linear infinite"}}/>
                  <span style={{fontSize:14,color:"rgba(71,85,105,1)"}}>Loading your data...</span>
                </div>
              ):courses.length===0?(
                /* NO COURSES — inviting CTA */
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:16,justifyContent:"center"}}>
                  <div>
                    <div style={{fontSize:11,color:"rgba(71,85,105,1)",letterSpacing:".06em",marginBottom:8,textTransform:"uppercase"}}>
                      Nothing tracked yet
                    </div>
                    <div style={{fontSize:48,fontWeight:900,letterSpacing:"-.04em",lineHeight:1,marginBottom:12,
                      background:"linear-gradient(135deg,rgba(129,140,248,.5),rgba(244,114,182,.4))",
                      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                      Start tracking
                    </div>
                    <p style={{fontSize:14,color:"rgba(100,116,139,1)",lineHeight:1.75,maxWidth:400}}>
                      Upload your syllabi to unlock GPA tracking, grade predictions, and scenario simulations.
                    </p>
                  </div>
                  <button onClick={()=>router.push("/dashboard")} style={{
                    width:"fit-content",padding:"13px 28px",borderRadius:14,fontWeight:700,fontSize:13,
                    cursor:"pointer",border:"none",color:"white",letterSpacing:".03em",
                    background:"linear-gradient(135deg,#6366f1,#818cf8)",
                    boxShadow:"0 0 32px rgba(99,102,241,.4)",transition:"all .2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.03)";e.currentTarget.style.boxShadow="0 0 48px rgba(99,102,241,.55)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 0 32px rgba(99,102,241,.4)";}}>
                    Upload Syllabi →
                  </button>
                </div>
              ):curGpa==null?(
                /* COURSES LOADED, NO GRADES YET */
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:20}}>
                  <div>
                    <div style={{fontSize:11,color:"rgba(71,85,105,1)",letterSpacing:".06em",marginBottom:8,textTransform:"uppercase"}}>
                      {courses.length} course{courses.length>1?"s":""} loaded · awaiting grades
                    </div>
                    <div style={{fontSize:48,fontWeight:900,letterSpacing:"-.04em",lineHeight:1,
                      background:"linear-gradient(135deg,rgba(129,140,248,.65),rgba(52,211,153,.5))",
                      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                      Grades pending
                    </div>
                  </div>
                  {/* courses as compact chips */}
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                    {courses.map(c=>{
                      const total=c.categories.flatMap(x=>x.assignments).length;
                      const done=c.categories.flatMap(x=>x.assignments).filter(a=>a.score!=null).length;
                      return(
                        <button key={c.course_id} onClick={()=>{setTab("courses");setExpanded(c.course_id);}}
                          style={{display:"flex",alignItems:"center",gap:7,padding:"7px 12px",borderRadius:10,
                            background:`${c.color}0e`,border:`1px solid ${c.color}28`,cursor:"pointer",
                            transition:"all .14s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=`${c.color}1c`;e.currentTarget.style.borderColor=`${c.color}44`;}}
                          onMouseLeave={e=>{e.currentTarget.style.background=`${c.color}0e`;e.currentTarget.style.borderColor=`${c.color}28`;}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:c.color,boxShadow:`0 0 5px ${c.color}`}}/>
                          <span style={{fontSize:11,fontWeight:600,color:"rgba(203,213,225,1)"}}>{c.course_name}</span>
                          <span style={{fontSize:9,color:"rgba(71,85,105,1)",borderLeft:"1px solid rgba(255,255,255,.08)",paddingLeft:6}}>
                            {done}/{total}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p style={{fontSize:12,color:"rgba(71,85,105,1)",lineHeight:1.65}}>
                    GPA will calculate automatically once grades are entered by your instructors.
                  </p>
                </div>
              ):(
                /* FULL DATA */
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:20}}>
                  {/* GPA number */}
                  <div style={{display:"flex",alignItems:"flex-end",gap:16,flexWrap:"wrap"}}>
                    <span style={{fontSize:104,fontWeight:900,lineHeight:.82,letterSpacing:"-.07em",
                      fontVariantNumeric:"tabular-nums",
                      background:`linear-gradient(135deg,white 0%,${pageAccent} 50%,${pageAccent}aa 100%)`,
                      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                      filter:`drop-shadow(0 0 50px ${pageAccent}30)`,
                      transition:"filter 2s ease"}}>
                      {curGpa.toFixed(2)}
                    </span>
                    <div style={{paddingBottom:14,display:"flex",flexDirection:"column",gap:6}}>
                      <span style={{fontSize:12,color:"rgba(71,85,105,1)"}}>/ 4.00 GPA</span>
                      {curL&&(
                        <div style={{display:"inline-flex",alignItems:"center",gap:7,
                          padding:"6px 12px",borderRadius:11,
                          background:gcBg(curL.letter),border:`1px solid ${gcBd(curL.letter)}`}}>
                          <span style={{fontSize:20,fontWeight:900,color:gc(curL.letter),lineHeight:1,
                            textShadow:`0 0 14px ${gc(curL.letter)}90`}}>{curL.letter}</span>
                          <span style={{fontSize:10,color:"rgba(100,116,139,1)"}}>{curL.points.toFixed(1)} pts</span>
                        </div>
                      )}
                    </div>
                    {hasWI&&(
                      <div style={{paddingBottom:14,padding:"5px 11px",borderRadius:10,fontSize:13,fontWeight:800,
                        color:diff!>0?"#4ade80":"#f87171",
                        background:diff!>0?"rgba(74,222,128,.1)":"rgba(248,113,113,.1)",
                        border:`1px solid ${diff!>0?"rgba(74,222,128,.2)":"rgba(248,113,113,.2)"}`}}>
                        {diff!>0?"↑ +":"↓ "}{Math.abs(diff!).toFixed(3)}
                      </div>
                    )}
                  </div>

                  <p style={{fontSize:13,color:onTrack?"#4ade80":"rgba(148,163,184,1)"}}>
                    {onTrack?`✦ Goal of ${goal.toFixed(1)} reached — keep going`
                      :`${(goal-curGpa).toFixed(2)} more to reach your ${goal.toFixed(1)} goal`}
                  </p>

                  {/* progress */}
                  <div style={{maxWidth:500}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:9,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(71,85,105,1)"}}>Toward {goal.toFixed(1)}</span>
                      <span style={{fontSize:11,fontWeight:700,color:"rgba(148,163,184,1)"}}>{prog.toFixed(1)}%</span>
                    </div>
                    <TickBar pct={prog} goal={goal} color={pageAccent}/>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL — solid dark section */}
            <div style={{background:"rgba(0,0,0,.35)",borderLeft:"1px solid rgba(255,255,255,.05)",
              padding:"28px 22px",display:"flex",flexDirection:"column",gap:12}}>

              {/* Goal card */}
              <div style={{borderRadius:16,overflow:"hidden",position:"relative",
                background:"linear-gradient(145deg,rgba(251,191,36,.13),rgba(4,5,16,.95))",
                border:"1px solid rgba(251,191,36,.2)"}}>
                <div style={{height:1.5,background:"linear-gradient(90deg,transparent,rgba(251,191,36,.7),transparent)"}}/>
                <div style={{padding:"16px 18px"}}>
                  <div style={{fontSize:8,color:"rgba(100,116,139,1)",letterSpacing:".22em",textTransform:"uppercase",marginBottom:8}}>Goal GPA</div>
                  <div style={{fontSize:52,fontWeight:900,color:"#fbbf24",lineHeight:1,letterSpacing:"-.05em",
                    fontVariantNumeric:"tabular-nums",textShadow:"0 0 28px rgba(251,191,36,.4)",marginBottom:10}}>
                    {goal.toFixed(1)}
                  </div>
                  <input type="range" min="1" max="4" step="0.1" value={goal}
                    onChange={e=>setGoal(parseFloat(e.target.value))}
                    style={{width:"100%",accentColor:"#fbbf24",marginBottom:7}}/>
                  <div style={{fontSize:11,color:onTrack?"#4ade80":"rgba(100,116,139,1)"}}>
                    {onTrack?"✓ Achieved! 🎉":curGpa!=null?`Need +${(goal-curGpa).toFixed(2)}`:"Drag to set your target"}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                {[
                  {l:"Credits",v:totalCr||"—",c:"#22d3ee"},
                  {l:"Courses",v:courses.length||"—",c:"#818cf8"},
                  {l:"Graded",v:gradedA.length,c:"#4ade80"},
                  {l:"Pending",v:Math.max(0,allA.length-gradedA.length),c:"#fb923c"},
                ].map(s=>(
                  <div key={s.l} style={{padding:"11px 13px",borderRadius:13,
                    background:`${s.c}0b`,border:`1px solid ${s.c}1c`,
                    transition:"border-color .2s"}}>
                    <div style={{fontSize:7,color:"rgba(71,85,105,1)",letterSpacing:".22em",textTransform:"uppercase",marginBottom:5}}>{s.l}</div>
                    <div style={{fontSize:26,fontWeight:900,color:s.c,lineHeight:1,
                      textShadow:`0 0 12px ${s.c}50`}}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Status pill */}
              {/* Risk / Confidence card */}
              <div style={{
                padding: "12px 14px",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: riskAnalysis?.risk_level === "High Risk"
                  ? "rgba(248,113,113,.08)"
                  : riskAnalysis?.risk_level === "Moderate Risk"
                    ? "rgba(251,191,36,.08)"
                    : "rgba(74,222,128,.06)",
                border: riskAnalysis?.risk_level === "High Risk"
                  ? "1px solid rgba(248,113,113,.22)"
                  : riskAnalysis?.risk_level === "Moderate Risk"
                    ? "1px solid rgba(251,191,36,.22)"
                    : "1px solid rgba(74,222,128,.18)"
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background:
                        riskAnalysis?.risk_level === "High Risk"
                          ? "#f87171"
                          : riskAnalysis?.risk_level === "Moderate Risk"
                            ? "#fbbf24"
                            : "#4ade80",
                    }}
                  />

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color:
                        riskAnalysis?.risk_level === "High Risk"
                          ? "#f87171"
                          : riskAnalysis?.risk_level === "Moderate Risk"
                            ? "#fbbf24"
                            : "#4ade80",
                      letterSpacing: ".02em",
                    }}
                  >
                    {riskAnalysis ? riskAnalysis.risk_level : "Risk Pending"}
                  </span>
                </div>

                {riskAnalysis && (
                  <>
                    <div style={{fontSize:10,color:"rgba(148,163,184,1)"}}>
                      Confidence: <b style={{color:"white"}}>{riskAnalysis.confidence}</b>
                    </div>

                    <div style={{fontSize:10,color:"rgba(100,116,139,1)",lineHeight:1.45}}>
                      {riskAnalysis.message}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="fi fi1" style={{display:"flex",gap:2,padding:3,borderRadius:14,
          background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.05)",width:"fit-content"}}>
          {TABS.map(t=>{
            const a=tab===t.id;
            return<button key={t.id} onClick={()=>setTab(t.id)} style={{
              display:"flex",alignItems:"center",gap:7,padding:"8px 18px",borderRadius:11,
              fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:".05em",
              textTransform:"uppercase",transition:"all .14s",
              background:a?"rgba(99,102,241,.18)":"transparent",
              border:`1px solid ${a?"rgba(99,102,241,.38)":"transparent"}`,
              color:a?"#a5b4fc":"rgba(71,85,105,1)",
              boxShadow:a?"0 0 18px rgba(99,102,241,.15)":"none"}}>
              <span style={{fontSize:12,opacity:a?1:.5}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>;
          })}
        </div>

        {/* ════════ OVERVIEW ════════ */}
        {tab==="overview"&&(
          <div className="fi fi2" style={{display:"flex",flexDirection:"column",gap:12}}>
            {loading?(
              <div style={{display:"flex",justifyContent:"center",padding:"80px 0",gap:12,alignItems:"center"}}>
                <div style={{width:16,height:16,borderRadius:"50%",border:"1.5px solid rgba(129,140,248,.2)",
                  borderTopColor:"#818cf8",animation:"spin 1s linear infinite"}}/>
                <span style={{color:"rgba(71,85,105,1)",fontSize:13}}>Loading...</span>
              </div>
            ):courses.length===0?(
              <div style={{...card(),padding:"64px 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
                <div style={{width:64,height:64,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:28,background:"rgba(129,140,248,.08)",border:"1px solid rgba(129,140,248,.14)"}}>🎓</div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,marginBottom:6}}>No courses yet</div>
                  <p style={{fontSize:13,color:"rgba(100,116,139,1)",maxWidth:320,margin:"0 auto",lineHeight:1.7}}>
                    Upload your syllabi to start tracking.
                  </p>
                </div>
                <button onClick={()=>router.push("/dashboard")} style={{padding:"11px 24px",borderRadius:12,fontWeight:700,
                  fontSize:12,cursor:"pointer",border:"none",color:"white",
                  background:"linear-gradient(135deg,#6366f1,#818cf8)"}}>
                  Go to Dashboard →
                </button>
              </div>
            ):(
              <>
                {/* Row 1: Arc(s) + Course Standings */}
                <div style={{display:"grid",gridTemplateColumns:"360px 1fr",gap:12}}>

                  {/* Arc panel */}
                  <div style={{...card(),padding:"22px 18px",display:"flex",flexDirection:"column",
                    alignItems:"center",gap:14}}>
                    {curGpa!=null?(
                      <>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <Arc val={curGpa} color={pageAccent} size={168} label="Current"/>
                          {hasWI&&(
                            <>
                              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                                <div style={{width:1,height:36,background:"rgba(255,255,255,.07)"}}/>
                                <div style={{fontSize:18,fontWeight:900,color:diff!>0?"#4ade80":"#f87171"}}>{diff!>0?"↑":"↓"}</div>
                                <div style={{fontSize:9,fontWeight:700,color:diff!>0?"#4ade80":"#f87171"}}>{Math.abs(diff!).toFixed(3)}</div>
                                <div style={{width:1,height:36,background:"rgba(255,255,255,.07)"}}/>
                              </div>
                              <Arc val={projGpa} color="#22d3ee" size={168} label="Projected"/>
                            </>
                          )}
                        </div>
                        {/* Grade scale — only when has grades */}
                        <div style={{width:"100%",display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
                          {SCALE.map(g=>{
                            const active=curGpa!=null&&ltr((curGpa/4)*100).letter===g.letter;
                            const col=gc(g.letter);
                            return(
                              <div key={g.letter} style={{display:"flex",flexDirection:"column",alignItems:"center",
                                padding:"6px 8px",borderRadius:10,transition:"all .22s",
                                ...(active?{background:gcBg(g.letter),border:`1px solid ${gcBd(g.letter)}`,
                                  transform:"translateY(-3px) scale(1.1)",boxShadow:`0 6px 20px ${col}22`}
                                  :{background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.06)"})}}>
                                <span style={{fontSize:11,fontWeight:900,color:active?col:"rgba(71,85,105,1)"}}>{g.letter}</span>
                                <span style={{fontSize:7,marginTop:2,color:active?`${col}75`:"rgba(30,41,59,1)"}}>{g.points.toFixed(1)}</span>
                              </div>
                            );
                          })}
                        </div>
                        {!hasWI&&(
                          <div style={{fontSize:11,color:"rgba(51,65,85,1)",textAlign:"center",padding:"4px 0"}}>
                            Use <b style={{color:"rgba(129,140,248,.5)"}}>What-If</b> to simulate a projected GPA
                          </div>
                        )}
                      </>
                    ):(
                      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                        justifyContent:"center",gap:10,padding:"20px",textAlign:"center"}}>
                        <div style={{fontSize:52,opacity:.1,fontWeight:900,lineHeight:1}}>◎</div>
                        <div style={{fontSize:12,fontWeight:700,color:"rgba(71,85,105,1)"}}>GPA pending</div>
                        <div style={{fontSize:11,color:"rgba(51,65,85,1)",lineHeight:1.6}}>
                          Will appear once grades are submitted
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Course standings */}
                  <div style={{...card(),padding:"20px 22px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                      <span style={{fontSize:9,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(71,85,105,1)"}}>
                        Course Standings
                      </span>
                      <button onClick={()=>setTab("courses")} style={{fontSize:11,color:"rgba(129,140,248,.6)",
                        background:"none",border:"none",cursor:"pointer",letterSpacing:".02em",fontFamily:"inherit"}}>
                        Details →
                      </button>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:9}}>
                      {courses.map(c=>{
                        const g=cG[c.course_id],e=g!=null?ltr(g):null;
                        const totalA=c.categories.flatMap(x=>x.assignments).length;
                        const doneA=c.categories.flatMap(x=>x.assignments).filter(a=>a.score!=null).length;
                        return(
                          <div key={c.course_id} className="row-hover" onClick={()=>{setTab("courses");setExpanded(c.course_id);}}
                            style={{cursor:"pointer",padding:"12px 14px",borderRadius:14,
                              background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.04)"}}
                            onMouseEnter={el=>{el.currentTarget.style.background=`${c.color}0b`;el.currentTarget.style.borderColor=`${c.color}2a`;}}
                            onMouseLeave={el=>{el.currentTarget.style.background="rgba(255,255,255,.02)";el.currentTarget.style.borderColor="rgba(255,255,255,.04)";}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                                <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0,
                                  boxShadow:`0 0 7px ${c.color}`}}/>
                                <span style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",
                                  whiteSpace:"nowrap"}}>{c.course_name}</span>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                                {e?(
                                  <span style={{fontSize:14,fontWeight:900,color:gc(e.letter),
                                    textShadow:`0 0 10px ${gc(e.letter)}60`}}>{e.letter}</span>
                                ):(
                                  <span style={{fontSize:10,color:"rgba(51,65,85,1)",padding:"2px 8px",borderRadius:99,
                                    background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
                                    {doneA}/{totalA}
                                  </span>
                                )}
                                <span style={{fontSize:10,color:"rgba(100,116,139,1)"}}>{g!=null?`${g.toFixed(1)}%`:"—"}</span>
                              </div>
                            </div>
                            <Bar pct={g} color={c.color} h={4}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Assignment completion — only if assignments exist */}
                {allA.length>0&&(
                  <div style={{...card(),padding:"20px 22px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                      <span style={{fontSize:13,fontWeight:700,letterSpacing:"-.01em"}}>Assignment Completion</span>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {gradedA.length>0&&(
                          <span style={{fontSize:11,color:"rgba(100,116,139,1)"}}>
                            Avg: <b style={{color:
                              gradedA.reduce((s,a)=>s+(a.score!/a.max_score)*100,0)/gradedA.length>=90?"#4ade80":
                              gradedA.reduce((s,a)=>s+(a.score!/a.max_score)*100,0)/gradedA.length>=70?"#fbbf24":"#f87171"}}>
                              {(gradedA.reduce((s,a)=>s+(a.score!/a.max_score)*100,0)/gradedA.length).toFixed(1)}%
                            </b>
                          </span>
                        )}
                        <span style={{fontSize:10,padding:"3px 10px",borderRadius:99,
                          color:"rgba(100,116,139,1)",background:"rgba(255,255,255,.04)",
                          border:"1px solid rgba(255,255,255,.06)"}}>
                          {gradedA.length}/{allA.length} graded
                        </span>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:8}}>
                      {courses.map(c=>{
                        const total=c.categories.flatMap(x=>x.assignments).length;
                        const done=c.categories.flatMap(x=>x.assignments).filter(a=>a.score!=null).length;
                        const pct=total>0?Math.round(done/total*100):0;
                        const g=cG[c.course_id],e=g!=null?ltr(g):null;
                        return(
                          <div key={c.course_id} className="row-hover" style={{borderRadius:15,padding:"12px 14px",
                            background:`linear-gradient(135deg,${c.color}09,rgba(4,5,16,.9))`,
                            border:`1px solid ${c.color}18`,cursor:"pointer"}}
                            onMouseEnter={el=>{el.currentTarget.style.borderColor=`${c.color}35`;}}
                            onMouseLeave={el=>{el.currentTarget.style.borderColor=`${c.color}18`;}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                              <span style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",
                                whiteSpace:"nowrap",flex:1,marginRight:6}}>{c.course_name}</span>
                              {e&&<span style={{fontSize:12,fontWeight:900,flexShrink:0,color:gc(e.letter),
                                textShadow:`0 0 10px ${gc(e.letter)}60`}}>{e.letter}</span>}
                            </div>
                            <Bar pct={pct} color={c.color} h={5}/>
                            <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                              <span style={{fontSize:9,color:"rgba(71,85,105,1)"}}>{pct}%</span>
                              <span style={{fontSize:9,color:c.color,fontWeight:700}}>{done}/{total}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════ COURSES ════════ */}
        {tab==="courses"&&(
          <div className="fi fi2" style={{display:"flex",flexDirection:"column",gap:8}}>
            {loading?(
              <div style={{...card(),padding:"60px",textAlign:"center",color:"rgba(71,85,105,1)"}}>Loading...</div>
            ):courses.length===0?(
              <div style={{...card(),padding:"60px",textAlign:"center",color:"rgba(71,85,105,1)"}}>
                No courses — upload syllabi from Dashboard
              </div>
            ):courses.map(c=>{
              const g=cG[c.course_id],e=g!=null?ltr(g):null,open=expanded===c.course_id;
              const done=c.categories.flatMap(x=>x.assignments).filter(a=>a.score!=null).length;
              const total=c.categories.flatMap(x=>x.assignments).length;
              const totalW=c.categories.reduce((s,cat)=>s+cat.weight,0);
              return(
                <div key={c.course_id} style={{borderRadius:22,overflow:"hidden",transition:"all .22s",
                  background:open?`linear-gradient(135deg,${c.color}0d,rgba(4,5,16,.99))`:"rgba(255,255,255,.025)",
                  border:`1px solid ${open?c.color+"45":"rgba(255,255,255,.06)"}`,
                  boxShadow:open?`0 0 50px ${c.color}0d`:"none"}}>
                  <button onClick={()=>setExpanded(open?null:c.course_id)}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:16,padding:"18px 24px",
                      background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
                    <div style={{width:3,alignSelf:"stretch",borderRadius:4,flexShrink:0,
                      background:`linear-gradient(to bottom,${c.color},${c.color}44)`,boxShadow:`0 0 12px ${c.color}80`}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{c.course_name}</div>
                      <div style={{display:"flex",gap:8,fontSize:11,color:"rgba(71,85,105,1)",flexWrap:"wrap",alignItems:"center"}}>
                        {c.instructor&&<span>{c.instructor} ·</span>}
                        <span>{c.credits} credits ·</span>
                        <span>{done}/{total} graded</span>
                        {totalW!==100&&<span style={{padding:"1px 6px",borderRadius:99,fontSize:8,
                          background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.2)",color:"#f87171"}}>
                          WEIGHTS {totalW}%
                        </span>}
                      </div>
                    </div>
                    <div style={{width:110,flexShrink:0}}>
                      <Bar pct={g} color={c.color} h={5}/>
                      <span style={{fontSize:9,color:"rgba(71,85,105,1)",marginTop:3,display:"block"}}>{g!=null?`${g.toFixed(1)}%`:"No grades"}</span>
                    </div>
                    {e?(
                      <div style={{minWidth:68,textAlign:"center",padding:"8px 14px",borderRadius:14,flexShrink:0,
                        background:gcBg(e.letter),border:`1px solid ${gcBd(e.letter)}`}}>
                        <div style={{fontSize:26,fontWeight:900,color:gc(e.letter),lineHeight:1,
                          textShadow:`0 0 18px ${gc(e.letter)}80`}}>{e.letter}</div>
                        <div style={{fontSize:9,color:"rgba(100,116,139,1)",marginTop:2}}>{g?.toFixed(1)}%</div>
                      </div>
                    ):(
                      <div style={{minWidth:68,textAlign:"center",padding:"8px 14px",borderRadius:14,flexShrink:0,
                        background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
                        <div style={{fontSize:26,fontWeight:900,color:"rgba(30,41,59,1)"}}>—</div>
                      </div>
                    )}
                    <span style={{fontSize:14,color:"rgba(71,85,105,1)",transition:"transform .2s",flexShrink:0,
                      transform:open?"rotate(90deg)":"none"}}>›</span>
                  </button>
                  {open&&(
                    <div style={{borderTop:`1px solid ${c.color}15`,padding:"20px 24px"}}>
                      <div style={{marginBottom:18}}>
                        <div style={{fontSize:8,color:"rgba(71,85,105,1)",letterSpacing:".2em",textTransform:"uppercase",marginBottom:10}}>Category Weights</div>
                        <div style={{display:"flex",height:10,borderRadius:999,overflow:"hidden",gap:2}}>
                          {c.categories.map(cat=>{const cg=catPct(cat);return<div key={cat.category_id}
                            title={`${cat.category_name}: ${cat.weight}%`}
                            style={{flex:cat.weight,background:cg!=null?c.color:`${c.color}22`,transition:"all .3s"}}/>;
                          })}
                        </div>
                        <div style={{display:"flex",gap:10,marginTop:8,flexWrap:"wrap"}}>
                          {c.categories.map(cat=>{const cg=catPct(cat),ce=cg!=null?ltr(cg):null;return(
                            <div key={cat.category_id} style={{display:"flex",alignItems:"center",gap:4}}>
                              <div style={{width:6,height:6,borderRadius:2,background:c.color,opacity:cg!=null?1:.3}}/>
                              <span style={{fontSize:9,color:"rgba(100,116,139,1)"}}>{cat.category_name} ({cat.weight}%)</span>
                              {ce&&<span style={{fontSize:9,fontWeight:700,color:gc(ce.letter)}}>{ce.letter}</span>}
                            </div>
                          );})}
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(215px,1fr))",gap:12}}>
                        {c.categories.map(cat=>{
                          const cg=catPct(cat),ce=cg!=null?ltr(cg):null;
                          return(
                            <div key={cat.category_id} style={{borderRadius:18,padding:16,
                              background:`linear-gradient(145deg,${c.color}0d,rgba(4,5,16,.94))`,border:`1px solid ${c.color}22`}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                                <div>
                                  <div style={{fontSize:12,fontWeight:700}}>{cat.category_name}</div>
                                  <div style={{fontSize:9,color:"rgba(71,85,105,1)",marginTop:2}}>
                                    {cat.weight}% · {cat.assignments.filter(a=>a.score!=null).length}/{cat.assignments.length}
                                  </div>
                                </div>
                                {ce&&<span style={{fontSize:11,fontWeight:900,padding:"3px 9px",borderRadius:9,
                                  color:gc(ce.letter),background:gcBg(ce.letter),border:`1px solid ${gcBd(ce.letter)}`}}>
                                  {ce.letter}
                                </span>}
                              </div>
                              <div style={{fontSize:28,fontWeight:900,lineHeight:1,marginBottom:8,
                                color:cg!=null?c.color:"rgba(30,41,59,1)",textShadow:cg!=null?`0 0 18px ${c.color}55`:"none"}}>
                                {cg!=null?`${cg.toFixed(1)}%`:"—"}
                              </div>
                              <Bar pct={cg} color={c.color} h={4}/>
                              <div style={{marginTop:11}}>
                                {cat.assignments.map(a=>{
                                  const ap=a.score!=null?(a.score/a.max_score)*100:null;
                                  const sc=ap!=null?(ap>=90?"#4ade80":ap>=70?"#fbbf24":"#f87171"):null;

                                  const saveScore = async (course: Course, assignmentTitle: string, assignmentId: number, maxScore: number) => {
                                    const input = document.getElementById(`score-${assignmentId}`) as HTMLInputElement;
                                    const value = input?.value;

                                    if (value === "" || value == null) return;

                                    const score = Number(value);
                                    const {auth} = await import('@/lib/firebase');
                                    const token = await auth.currentUser?.getIdToken()
                                    try {
                                      const res = await fetch(`http://localhost:8000/assignment/${encodeURIComponent(course.course_name)}/${encodeURIComponent(assignmentTitle)}`, {
                                        method: "PUT",
                                        headers: {
                                          "Content-Type": "application/json", Authorization: `Bearer ${token}`,
                                        },
                                        body: JSON.stringify({
                                          score,
                                          max_score: a.max_score ?? 100,
                                        }),
                                      });

                                      if (!res.ok) {
                                        alert("Failed to update score");
                                        return;
                                      }
                                      const refreshed = await fetch(`http://localhost:8000/gpa/project/${username}`);
                                      const refreshedData = await refreshed.json();

                                      setRiskAnalysis(refreshedData.risk_analysis ?? null);

                                      const projectedCourses = refreshedData.projected_courses ?? [];

                                      setCourses(projectedCourses.map((c:any, i:number) => ({
                                        course_id: c.course_id,
                                        course_name: c.course_name,
                                        instructor: c.instructor ?? "",
                                        credits: c.credits ?? 3,
                                        color: PALETTE[i % PALETTE.length],
                                        categories: (c.categories ?? []).map((cat:any) => ({
                                          category_id: cat.category_id,
                                          category_name: cat.category_name,
                                          weight: cat.weight ?? 0,
                                          assignments: (cat.assignments ?? []).map((a:any) => ({
                                            assignment_id: a.assignment_id,
                                            title: a.title ?? "Untitled",
                                            score: a.score ?? null,
                                            max_score: a.max_score ?? 100,
                                            hypothetical: null,
                                          })),
                                        })),
                                      })));

                                      setSimulationResults({});
                                      setPredictionResults({});
                                    } catch (err) {
                                      console.error(err);
                                      alert("Error updating score");
                                    }
                                  };

                                  return(
                                    <div key={a.assignment_id} style={{paddingBlock:5,borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                                      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                                        <span style={{fontSize:11,color:"rgba(100,116,139,1)",overflow:"hidden",
                                          textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{a.title}</span>

                                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                                          <input
                                            id={`score-${a.assignment_id}`}
                                            type="number"
                                            min="0"
                                            max={a.max_score ?? 100}
                                            defaultValue={a.score ?? ""}
                                            placeholder="Score"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                              width: 80,
                                              height: 34,
                                              padding: "6px 8px",
                                              borderRadius: 8,
                                              border: "1px solid rgba(129,140,248,.45)",
                                              background: "rgba(15,23,42,.95)",
                                              color: "white",
                                              fontSize: 13,
                                              fontWeight: 700,
                                              outline: "none"
                                            }}
                                          />

                                          <span style={{fontSize:10,color:"rgba(71,85,105,1)"}}>
                                            /{a.max_score ?? 100}
                                          </span>

                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              saveScore(c, a.title, a.assignment_id, a.max_score);
                                            }}
                                            style={{
                                              height: 34,
                                              padding: "6px 12px",
                                              borderRadius: 8,
                                              border: "1px solid rgba(129,140,248,.45)",
                                              background: "rgba(129,140,248,.18)",
                                              color: "#c7d2fe",
                                              fontSize: 11,
                                              fontWeight: 800,
                                              cursor: "pointer"
                                            }}
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>

                                      {ap!=null&&<div style={{marginTop:3,height:2,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.05)"}}>
                                        <div style={{height:"100%",borderRadius:999,width:`${ap}%`,background:sc!}}/>
                                      </div>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════ SOLVER ════════ */}
        {tab==="solver"&&(
          <div className="fi fi2" style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:14,alignItems:"start"}}>
            <div style={{...card(),padding:24,display:"flex",flexDirection:"column",gap:20}}>
              <div>
                <div style={{fontSize:8,color:"rgba(71,85,105,1)",letterSpacing:".3em",textTransform:"uppercase",marginBottom:7}}>Tool</div>
                <h2 style={{fontSize:21,fontWeight:900,letterSpacing:"-.03em",marginBottom:4}}>Score Solver</h2>
                <p style={{fontSize:12,color:"rgba(100,116,139,1)",lineHeight:1.6}}>What score do you need to hit your target grade?</p>
              </div>
              {courses.length===0?(
                <p style={{fontSize:12,color:"rgba(51,65,85,1)",textAlign:"center",padding:"20px 0"}}>No courses loaded</p>
              ):(
                <>
                  <div>
                    <div style={{fontSize:8,color:"rgba(51,65,85,1)",letterSpacing:".22em",textTransform:"uppercase",marginBottom:10}}>Course</div>
                    {courses.map(c=>{
                      const sel=selC===c.course_id,g=cG[c.course_id];
                      return(
                        <button key={c.course_id} onClick={()=>setSelC(c.course_id)} style={{
                          width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",
                          borderRadius:13,marginBottom:5,cursor:"pointer",textAlign:"left",transition:"all .13s",
                          background:sel?`${c.color}12`:"rgba(255,255,255,.02)",
                          border:`1px solid ${sel?c.color+"45":"rgba(255,255,255,.05)"}`,
                          boxShadow:sel?`0 0 18px ${c.color}10`:"none"}}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:c.color,
                            flexShrink:0,boxShadow:`0 0 7px ${c.color}`}}/>
                          <span style={{fontSize:12,fontWeight:600,flex:1,color:sel?"white":"rgba(100,116,139,1)",
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.course_name}</span>
                          {g!=null&&<span style={{fontSize:10,fontWeight:700,color:sel?c.color:"rgba(71,85,105,1)",flexShrink:0}}>{g.toFixed(1)}%</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:8,color:"rgba(51,65,85,1)",letterSpacing:".22em",textTransform:"uppercase"}}>Target</div>
                      <span style={{fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:9,
                        color:gc(ltr(target).letter),background:gcBg(ltr(target).letter),border:`1px solid ${gcBd(ltr(target).letter)}`}}>
                        {ltr(target).letter} · {ltr(target).points.toFixed(1)} pts
                      </span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <input type="range" min="50" max="100" step="1" value={target}
                        onChange={e=>setTarget(parseInt(e.target.value))} style={{flex:1,accentColor:"#818cf8",cursor:"pointer"}}/>
                      <span style={{fontSize:22,fontWeight:900,minWidth:46,textAlign:"right",
                        color:"#818cf8",fontVariantNumeric:"tabular-nums"}}>{target}%</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                      {[{p:60,l:"D"},{p:70,l:"C-"},{p:77,l:"C+"},{p:83,l:"B"},{p:87,l:"B+"},{p:90,l:"A-"},{p:93,l:"A"}].map(m=>(
                        <button key={m.l} onClick={()=>setTarget(m.p)} style={{
                          padding:"6px 2px",borderRadius:7,fontSize:9,fontWeight:700,cursor:"pointer",border:"none",
                          textAlign:"center",transition:"all .12s",fontFamily:"inherit",
                          background:target===m.p?gcBg(ltr(m.p).letter):"rgba(255,255,255,.03)",
                          color:target===m.p?gc(ltr(m.p).letter):"rgba(71,85,105,1)",
                          boxShadow:target===m.p?`0 0 10px ${gc(ltr(m.p).letter)}22`:"none"}}>
                          {m.l}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={calculateNeededScore}
                      disabled={!selCourse || neededLoading}
                      style={{
                        marginTop: 18,
                        width: "100%",
                        height: 44,
                        borderRadius: 12,
                        border: "1px solid rgba(129,140,248,.45)",
                        background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
                        color: "white",
                        fontWeight: 800,
                        cursor: !selCourse || neededLoading ? "not-allowed" : "pointer",
                        opacity: !selCourse ? 0.5 : 1,
                        fontFamily: "inherit"
                      }}
                    >
                      {neededLoading ? "Calculating..." : "Calculate Needed Score"}
                    </button>

                    {neededResult && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 16,
                          borderRadius: 16,
                          background: "rgba(15,23,42,.75)",
                          border: "1px solid rgba(129,140,248,.25)",
                          color: "white"
                        }}
                      >
                        <div style={{ fontSize: 9, letterSpacing: ".18em", color: "#94a3b8", textTransform: "uppercase" }}>
                          Needed to reach {neededResult.target_letter}
                        </div>

                        <div style={{ fontSize: 36, fontWeight: 900, marginTop: 8, color: "#a5b4fc" }}>
                          {neededResult.needed_average_on_remaining ?? "Not possible"}%
                        </div>

                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                          average needed on remaining {neededResult.remaining_weight}% of the course
                        </div>

                        <div style={{ fontSize: 11, color: "#22c55e", marginTop: 10 }}>
                          Known weighted total: {neededResult.known_weighted_total}%
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{...card(),padding:"52px 44px",minHeight:460,display:"flex",
              alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
              {!selCourse?(
                <div style={{textAlign:"center",opacity:.08,userSelect:"none"}}>
                  <div style={{fontSize:110,fontWeight:900,lineHeight:1}}>◎</div>
                  <div style={{fontSize:11,letterSpacing:".3em",textTransform:"uppercase",marginTop:12}}>Select a course</div>
                </div>
              ):needed==null?(
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:64}}>✓</div>
                  <div style={{fontSize:20,fontWeight:900,color:"#4ade80",marginTop:12}}>All graded!</div>
                </div>
              ):needed>100?(
                <div style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                  <div style={{fontSize:64}}>✗</div>
                  <div style={{fontSize:20,fontWeight:900,color:"#f87171"}}>Not possible</div>
                  <p style={{fontSize:12,color:"rgba(100,116,139,1)"}}>Needs {needed.toFixed(0)}% — lower target</p>
                  <button onClick={()=>setTarget(t=>Math.max(50,t-5))} style={{padding:"9px 20px",borderRadius:11,
                    fontSize:11,fontWeight:700,cursor:"pointer",border:"1px solid rgba(129,140,248,.22)",
                    background:"rgba(129,140,248,.1)",color:"#a5b4fc",fontFamily:"inherit"}}>Lower by 5%</button>
                </div>
              ):needed<=0?(
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:64}}>◆</div>
                  <div style={{fontSize:20,fontWeight:900,color:"#4ade80",marginTop:12}}>Locked in!</div>
                </div>
              ):(
                <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:22}}>
                  <div style={{position:"absolute",inset:"8%",borderRadius:"50%",
                    background:`${needed>80?"#f472b6":needed>60?"#fb923c":"#4ade80"}05`,filter:"blur(80px)"}}/>
                  <p style={{fontSize:13,color:"rgba(100,116,139,1)",textAlign:"center",position:"relative"}}>
                    For <b style={{color:selCourse.color,fontSize:15}}>{ltr(target).letter}</b>{" in "}
                    <b style={{color:"white"}}>{selCourse.course_name}</b>
                  </p>
                  <div style={{position:"relative",textAlign:"center",lineHeight:1}}>
                    <div style={{position:"absolute",inset:"-15%",
                      background:`radial-gradient(${needed>80?"#f472b625":needed>60?"#fb923c25":"#4ade8025"},transparent 65%)`,filter:"blur(32px)"}}/>
                    <div style={{fontSize:180,fontWeight:900,lineHeight:.82,letterSpacing:"-.06em",position:"relative",
                      fontVariantNumeric:"tabular-nums",
                      background:`linear-gradient(160deg,${needed>80?"#fda4af,#f472b6,#a78bfa":needed>60?"#fed7aa,#fb923c,#f59e0b":"#bbf7d0,#4ade80,#22d3ee"})`,
                      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                      {Math.ceil(needed)}
                    </div>
                    <div style={{fontSize:17,fontWeight:600,color:"rgba(71,85,105,1)",letterSpacing:".14em",
                      textTransform:"uppercase",marginTop:6,position:"relative"}}>% needed</div>
                  </div>
                  <div style={{width:"100%",position:"relative"}}>
                    <div style={{height:7,borderRadius:999,background:"rgba(255,255,255,.05)",overflow:"hidden",marginBottom:9}}>
                      <div style={{height:"100%",borderRadius:999,width:`${Math.min(needed,100)}%`,
                        transition:"width 1s cubic-bezier(.34,1.2,.64,1)",
                        background:needed<=60?"linear-gradient(90deg,#4ade80,#22d3ee)":needed<=80?"linear-gradient(90deg,#fb923c,#f59e0b)":"linear-gradient(90deg,#f472b6,#e879f9)",
                        boxShadow:needed<=60?"0 0 14px #4ade8055":needed<=80?"0 0 14px #fb923c55":"0 0 14px #f472b655"}}/>
                    </div>
                    <div style={{textAlign:"center",fontSize:13,fontWeight:700,
                      color:needed<=60?"#4ade80":needed<=80?"#fb923c":"#f472b6"}}>
                      {needed<=60?"✓ Very achievable":needed<=80?"⚡ Challenging but doable":"🔥 You'll need to grind hard"}
                    </div>
                  </div>
                  {cG[selCourse.course_id]!=null&&(
                    <div style={{display:"flex",gap:12,width:"100%",position:"relative"}}>
                      {[
                        {lbl:"CURRENT",letter:ltr(cG[selCourse.course_id]!).letter,pct:cG[selCourse.course_id]!,bg:"rgba(255,255,255,.03)",bd:"rgba(255,255,255,.06)"},
                        null,
                        {lbl:"TARGET",letter:ltr(target).letter,pct:target,bg:`${selCourse.color}0e`,bd:`${selCourse.color}35`},
                      ].map((item,i)=>item===null
                        ?<div key="arr" style={{display:"flex",alignItems:"center",color:"rgba(30,41,59,1)",fontSize:22}}>→</div>
                        :(
                          <div key={item.lbl} style={{flex:1,padding:"14px",borderRadius:16,textAlign:"center",
                            background:item.bg,border:`1px solid ${item.bd}`}}>
                            <div style={{fontSize:8,color:"rgba(71,85,105,1)",letterSpacing:".2em",marginBottom:6}}>{item.lbl}</div>
                            <div style={{fontSize:28,fontWeight:900,color:gc(item.letter),lineHeight:1,
                              textShadow:`0 0 18px ${gc(item.letter)}80`}}>{item.letter}</div>
                            <div style={{fontSize:11,color:"rgba(100,116,139,1)",marginTop:4}}>{item.pct.toFixed(1)}%</div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ WHAT-IF ════════ */}
        {tab==="whatif"&&(
          <div className="fi fi2" style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"18px 24px",borderRadius:20,
              background:"linear-gradient(135deg,rgba(99,102,241,.1),rgba(4,5,16,.98))",
              border:"1px solid rgba(99,102,241,.2)"}}>
              <div>
                <div style={{fontSize:8,color:"rgba(99,102,241,.5)",letterSpacing:".32em",textTransform:"uppercase",marginBottom:6}}>Simulation Mode</div>
                <h2 style={{fontSize:19,fontWeight:900,letterSpacing:"-.03em",marginBottom:3}}>What-If Simulator ✦</h2>
                <p style={{fontSize:12,color:"rgba(100,116,139,1)"}}>Enter hypothetical scores — GPA updates live</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {hasWI&&(
                  <div style={{padding:"12px 18px",borderRadius:14,
                    ...(diff!>0?{background:"rgba(74,222,128,.08)",border:"1px solid rgba(74,222,128,.2)",color:"#4ade80"}
                      :{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",color:"#f87171"}),
                    display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{fontSize:8,opacity:.6,letterSpacing:".2em"}}>GPA DELTA</span>
                    <span style={{fontSize:26,fontWeight:900,lineHeight:1}}>{diff!>0?"↑ +":"↓ "}{Math.abs(diff!).toFixed(3)}</span>
                    <span style={{fontSize:10,opacity:.6}}>{projGpa?.toFixed(2)} projected</span>
                  </div>
                )}
                <button onClick={reset} style={{padding:"9px 16px",borderRadius:11,fontSize:11,fontWeight:700,
                  letterSpacing:".06em",textTransform:"uppercase",color:"rgba(100,116,139,1)",cursor:"pointer",
                  transition:"all .15s",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",
                  fontFamily:"inherit"}}
                  onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,.15)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="rgba(100,116,139,1)";e.currentTarget.style.borderColor="rgba(255,255,255,.07)";}}>
                  ↺ Reset All
                </button>
              </div>
            </div>

            {courses.length===0?(
              <div style={{...card(),padding:"60px",textAlign:"center",color:"rgba(71,85,105,1)"}}>No courses to simulate</div>
            ):courses.map(c=>{
              const real=cG[c.course_id],hypo=cGH[c.course_id],delta=real!=null&&hypo!=null?hypo-real:null;
              const ungraded=c.categories.flatMap(cat=>
                cat.assignments.filter(a=>a.score===null).map(a=>({...a,catId:cat.category_id,catName:cat.category_name,catWeight:cat.weight})));
              const realG=real!=null?ltr(real):null;
              const hypoG=hypo!=null?ltr(hypo):null;
              const anyHypo=ungraded.some(a=>a.hypothetical!=null);
              return(
                <div key={c.course_id} style={{borderRadius:20,overflow:"hidden",transition:"all .26s",
                  background:anyHypo?`linear-gradient(135deg,${c.color}0c,rgba(4,5,16,.99))`:"rgba(255,255,255,.025)",
                  border:`1px solid ${anyHypo?c.color+"40":"rgba(255,255,255,.06)"}`,
                  boxShadow:anyHypo?`0 0 44px ${c.color}0b`:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:16,padding:"15px 22px",
                    borderBottom:`1px solid ${c.color}12`,background:`linear-gradient(90deg,${c.color}0b,transparent 55%)`}}>
                    <div style={{width:4,height:20,borderRadius:3,flexShrink:0,
                      background:`linear-gradient(to bottom,${c.color},${c.color}44)`,boxShadow:`0 0 10px ${c.color}80`}}/>
                    <h3 style={{fontSize:14,fontWeight:700,flex:1}}>{c.course_name}</h3>
                    <button
                      onClick={() => runBackendSimulation(c)}
                      disabled={simulationLoading[c.course_id]}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: `1px solid ${c.color}55`,
                        background: `${c.color}18`,
                        color: c.color,
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: simulationLoading[c.course_id] ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                        letterSpacing: ".04em",
                        textTransform: "uppercase"
                      }}
                    >
                      {simulationLoading[c.course_id] ? "Simulating..." : "Run Backend Simulation"}
                    </button>
                    <button
                      onClick={() => runPrediction(c)}
                      disabled={predictionLoading[c.course_id]}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(244,114,182,.45)",
                        background: "rgba(244,114,182,.14)",
                        color: "#f9a8d4",
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: predictionLoading[c.course_id] ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                        letterSpacing: ".04em",
                        textTransform: "uppercase"
                      }}
                    >
                      {predictionLoading[c.course_id] ? "Predicting..." : "Run Prediction"}
                    </button>
                    {anyHypo&&<span style={{fontSize:8,padding:"2px 8px",borderRadius:99,fontWeight:700,
                      letterSpacing:".12em",background:`${c.color}15`,border:`1px solid ${c.color}30`,color:c.color}}>EDITING</span>}
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:8,color:"rgba(71,85,105,1)",letterSpacing:".15em",marginBottom:3}}>NOW</div>
                        {realG?(
                          <div style={{fontSize:20,fontWeight:900,color:gc(realG.letter),
                            textShadow:`0 0 14px ${gc(realG.letter)}80`}}>{realG.letter}</div>
                        ):<div style={{fontSize:13,color:"rgba(30,41,59,1)"}}>—</div>}
                        <div style={{fontSize:9,color:"rgba(100,116,139,1)",marginTop:2}}>{real!=null?`${real.toFixed(1)}%`:"No grades"}</div>
                      </div>
                      {delta!=null&&Math.abs(delta)>.01&&(
                        <>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                            <span style={{fontSize:16,color:"rgba(30,41,59,1)"}}>→</span>
                            <span style={{fontSize:9,fontWeight:700,color:delta>0?"#4ade80":"#f87171"}}>{delta>0?"+":""}{delta.toFixed(1)}%</span>
                          </div>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:8,color:"rgba(71,85,105,1)",letterSpacing:".15em",marginBottom:3}}>PROJECTED</div>
                            {hypoG&&<div style={{fontSize:20,fontWeight:900,color:c.color,textShadow:`0 0 14px ${c.color}`}}>{hypoG.letter}</div>}
                            <div style={{fontSize:9,color:c.color,fontWeight:700,marginTop:2}}>{hypo!=null?`${hypo.toFixed(1)}%`:"—"}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {simulationResults[c.course_id] && (
                    <div style={{
                      margin: "14px 16px 0",
                      padding: 16,
                      borderRadius: 16,
                      background: "rgba(15,23,42,.72)",
                      border: `1px solid ${c.color}35`,
                    }}>
                      <div style={{fontSize:9,letterSpacing:".18em",textTransform:"uppercase",color:"rgba(148,163,184,1)",marginBottom:8}}>
                        Backend Simulation Result
                      </div>

                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14}}>
                        <div>
                          <div style={{fontSize:11,color:"rgba(100,116,139,1)"}}>Current</div>
                          <div style={{fontSize:24,fontWeight:900,color:"white"}}>
                            {simulationResults[c.course_id]?.current_percentage.toFixed(2)}%
                          </div>
                        </div>

                        <div style={{fontSize:24,color:"rgba(100,116,139,1)"}}>→</div>

                        <div>
                          <div style={{fontSize:11,color:"rgba(100,116,139,1)"}}>Simulated</div>
                          <div style={{fontSize:24,fontWeight:900,color:c.color}}>
                            {simulationResults[c.course_id]?.simulated_percentage.toFixed(2)}%
                          </div>
                        </div>

                        <div>
                          <div style={{fontSize:11,color:"rgba(100,116,139,1)"}}>Delta</div>
                          <div style={{
                            fontSize:20,
                            fontWeight:900,
                            color: (simulationResults[c.course_id]?.delta_percentage ?? 0) >= 0 ? "#4ade80" : "#f87171"
                          }}>
                            {(simulationResults[c.course_id]?.delta_percentage ?? 0) >= 0 ? "+" : ""}
                            {simulationResults[c.course_id]?.delta_percentage.toFixed(2)}%
                          </div>
                        </div>

                        <div>
                          <div style={{fontSize:11,color:"rgba(100,116,139,1)"}}>Letter</div>
                          <div style={{fontSize:24,fontWeight:900,color:gc(simulationResults[c.course_id]?.simulated_letter ?? "F")}}>
                            {simulationResults[c.course_id]?.simulated_letter}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {predictionResults[c.course_id] && (
                    <div style={{
                      margin: "14px 16px 0",
                      padding: 16,
                      borderRadius: 16,
                      background: "rgba(244,114,182,.08)",
                      border: "1px solid rgba(244,114,182,.25)",
                    }}>
                      <div style={{
                        fontSize: 9,
                        letterSpacing: ".18em",
                        textTransform: "uppercase",
                        color: "rgba(249,168,212,1)",
                        marginBottom: 10,
                        fontWeight: 800
                      }}>
                        Monte Carlo Prediction
                      </div>

                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
                        <div>
                          <div style={{fontSize:10,color:"rgba(148,163,184,1)"}}>Predicted Avg</div>
                          <div style={{fontSize:24,fontWeight:900,color:"white"}}>
                            {predictionResults[c.course_id]?.predicted_average.toFixed(2)}%
                          </div>
                        </div>

                        <div>
                          <div style={{fontSize:10,color:"rgba(148,163,184,1)"}}>Likely Letter</div>
                          <div style={{fontSize:24,fontWeight:900,color:gc(predictionResults[c.course_id]?.most_likely_letter ?? "F")}}>
                            {predictionResults[c.course_id]?.most_likely_letter}
                          </div>
                        </div>

                        <div>
                          <div style={{fontSize:10,color:"rgba(148,163,184,1)"}}>Confidence</div>
                          <div style={{fontSize:24,fontWeight:900,color:"#f9a8d4"}}>
                            {predictionResults[c.course_id]?.confidence.toFixed(1)}%
                          </div>
                        </div>

                        <div>
                          <div style={{fontSize:10,color:"rgba(148,163,184,1)"}}>Runs</div>
                          <div style={{fontSize:24,fontWeight:900,color:"white"}}>
                            {predictionResults[c.course_id]?.simulations_run}
                          </div>
                        </div>
                      </div>

                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {Object.entries(predictionResults[c.course_id]?.probabilities ?? {}).map(([letter, pct]) => (
                          <div key={letter}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                              <span style={{fontSize:10,fontWeight:800,color:gc(letter)}}>{letter}</span>
                              <span style={{fontSize:10,color:"rgba(148,163,184,1)"}}>{pct.toFixed(1)}%</span>
                            </div>
                            <div style={{height:5,borderRadius:999,background:"rgba(255,255,255,.06)",overflow:"hidden"}}>
                              <div style={{
                                height:"100%",
                                width:`${pct}%`,
                                borderRadius:999,
                                background:gc(letter)
                              }}/>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p style={{fontSize:10,color:"rgba(148,163,184,.75)",lineHeight:1.5,marginTop:12}}>
                        {predictionResults[c.course_id]?.explanation}
                      </p>
                    </div>
                  )}
                  {!ungraded.length?(
                    <div style={{padding:"14px 22px",color:"rgba(51,65,85,1)",fontSize:12,textAlign:"center"}}>All graded ✓</div>
                  ):(
                    <div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:8}}>
                      {ungraded.map(a=>{
                        const hp=a.hypothetical!=null?(a.hypothetical/a.max_score)*100:null;
                        const hcol=hp!=null?(hp>=90?"#4ade80":hp>=70?"#fbbf24":"#f87171"):c.color;
                        return(
                          <div key={a.assignment_id} style={{borderRadius:13,padding:12,transition:"all .2s",
                            background:a.hypothetical!=null?`${c.color}0d`:"rgba(255,255,255,.02)",
                            border:`1px solid ${a.hypothetical!=null?c.color+"40":"rgba(255,255,255,.05)"}`,
                            boxShadow:a.hypothetical!=null?`0 0 16px ${c.color}10`:"none"}}>
                            <p style={{fontSize:11,fontWeight:600,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.title}</p>
                            <p style={{fontSize:9,color:"rgba(71,85,105,1)",marginBottom:9}}>{a.catName} · {a.catWeight}% · max {a.max_score}</p>
                            <div style={{display:"flex",alignItems:"center",gap:7}}>
                              <input type="number" min="0" max={a.max_score} placeholder="Score?"
                                value={a.hypothetical??""} onChange={e=>upd(c.course_id,a.catId,a.assignment_id,
                                  e.target.value===""?null:Math.min(parseFloat(e.target.value),a.max_score))}
                                style={{flex:1,minWidth:0,borderRadius:9,padding:"7px 10px",fontSize:12,
                                  background:"rgba(255,255,255,.06)",outline:"none",color:"white",fontFamily:"inherit",
                                  border:`1px solid ${a.hypothetical!=null?c.color+"50":"rgba(255,255,255,.08)"}`}}/>
                              {hp!=null&&<span style={{fontSize:13,fontWeight:900,color:hcol,flexShrink:0,
                                textShadow:`0 0 9px ${hcol}80`}}>{hp.toFixed(0)}%</span>}
                            </div>
                            {hp!=null&&<div style={{marginTop:6,height:3,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.05)"}}>
                              <div style={{height:"100%",borderRadius:999,width:`${hp}%`,
                                background:`linear-gradient(90deg,${hcol}80,${hcol})`,transition:"width .7s"}}/>
                            </div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}