"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";

export type AssignmentStatus = "not_started" | "in_progress" | "completed" | "not_submitted";
export type AssignmentPriority = "low" | "medium" | "high";

export type Assignment = {
  id: number;
  title: string;
  course: string;
  course_color: string;
  type: "homework" | "quiz" | "exam" | "project" | "lab" | "other";
  due_date: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  score?: number | null;
  max_score?: number | null;
  notes?: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const COURSE_COLORS = ["#818cf8","#38bdf8","#fb7185","#34d399","#fb923c","#a78bfa","#f472b6","#4ade80"];

const TYPE_COLORS: Record<string, string> = {
  homework: "#818cf8", quiz: "#38bdf8", exam: "#f87171",
  project: "#4ade80", lab: "#fb923c", other: "#a78bfa",
};

const PRIORITY_CONFIG: Record<AssignmentPriority, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "#f87171", dot: "🔴" },
  medium: { label: "Medium", color: "#fbbf24", dot: "🟡" },
  low:    { label: "Low",    color: "#4ade80", dot: "🟢" },
};

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  not_started:   { label: "Not Started",   color: "text-gray-300",   bg: "bg-gray-500/15",   border: "border-gray-500/30",   dot: "bg-gray-400" },
  in_progress:   { label: "In Progress",   color: "text-amber-300",  bg: "bg-amber-500/15",  border: "border-amber-500/30",  dot: "bg-amber-400" },
  completed:     { label: "Completed",     color: "text-emerald-300",bg: "bg-emerald-500/15",border: "border-emerald-500/30",dot: "bg-emerald-400" },
  not_submitted: { label: "Not Submitted", color: "text-red-300",    bg: "bg-red-500/15",    border: "border-red-500/30",    dot: "bg-red-400" },
};

const TYPE_ICONS: Record<string, string> = {
  homework: "📝", quiz: "📋", exam: "📌", project: "🚀", lab: "🔬", other: "📎",
};

const navLinks = [
  { label: "Dashboard",     href: "/dashboard" },
  { label: "Calendar",      href: "/calendar" },
  { label: "GPA Predictor", href: "/gpa-predictor" },
  { label: "Profile",       href: "/profile" },
];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDay(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isToday(year: number, month: number, day: number) {
  const t = new Date();
  return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
}
function daysUntil(dateStr: string) {
  if (!dateStr || dateStr === "undated") return 999; // undated = sort to end
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}
function todayStr() {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}

function guessType(title: string): Assignment["type"] {
  const t = title.toLowerCase();
  if (t.includes("quiz")) return "quiz";
  if (t.includes("exam") || t.includes("midterm") || t.includes("final")) return "exam";
  if (t.includes("project")) return "project";
  if (t.includes("lab")) return "lab";
  if (t.includes("hw") || t.includes("homework")) return "homework";
  return "other";
}

function AddAssignmentModal({ courses, defaultDate, onClose, onAdd }: {
  courses: { name: string; color: string }[];
  defaultDate: string;
  onClose: () => void;
  onAdd: (a: Assignment) => void;
}) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState(courses[0]?.name ?? "");
  const [type, setType] = useState<Assignment["type"]>("homework");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [status, setStatus] = useState<AssignmentStatus>("not_started");
  const [priority, setPriority] = useState<AssignmentPriority>("medium");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!dueDate) { setError("Due date is required."); return; }
    const color = courses.find(c => c.name === course)?.color ?? COURSE_COLORS[0];
    onAdd({
      id: Date.now(), title: title.trim(), course, course_color: color, type,
      due_date: dueDate, status, priority,
      score: score ? parseFloat(score) : null,
      max_score: maxScore ? parseFloat(maxScore) : null,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-purple-400/50 transition-colors";
  const tc = TYPE_COLORS[type];

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24,overflowY:"auto"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(16px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:500,background:"linear-gradient(135deg,rgba(79,70,229,.15),rgba(7,6,15,.99))",border:`1px solid ${tc}30`,borderRadius:24,boxShadow:`0 40px 100px rgba(0,0,0,.9),0 0 40px ${tc}15`,margin:"auto"}}>
        <div style={{height:2,background:`linear-gradient(90deg,transparent,${tc},transparent)`,borderRadius:"24px 24px 0 0"}}/>
        <div style={{padding:"28px 32px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <h2 style={{fontSize:19,fontWeight:800,color:"white",margin:0}}>Add Assignment</h2>
              <p style={{fontSize:11,color:"rgba(107,114,128,1)",marginTop:2}}>Track your upcoming work</p>
            </div>
            <button onClick={onClose} style={{width:28,height:28,borderRadius:7,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(156,163,175,1)",fontSize:13,cursor:"pointer"}}>✕</button>
          </div>
          <div>
            <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Title</div>
            <input className={inputCls} placeholder="e.g. Homework 3, Midterm Exam" value={title} onChange={e => setTitle(e.target.value)} autoFocus/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Course</div>
              {courses.length > 0 ? (
                <select className={inputCls} value={course} onChange={e => setCourse(e.target.value)} style={{background:"rgba(255,255,255,.05)"}}>
                  {courses.map(c => <option key={c.name} value={c.name} style={{background:"#1a1a2e"}}>{c.name}</option>)}
                </select>
              ) : (
                <input className={inputCls} placeholder="Course name" value={course} onChange={e => setCourse(e.target.value)}/>
              )}
            </div>
            <div>
              <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Type</div>
              <select className={inputCls} value={type} onChange={e => setType(e.target.value as Assignment["type"])} style={{background:"rgba(255,255,255,.05)",borderColor:`${TYPE_COLORS[type]}40`}}>
                {Object.keys(TYPE_ICONS).map(t => <option key={t} value={t} style={{background:"#1a1a2e"}}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            {Object.keys(TYPE_COLORS).map(t => (
              <button key={t} onClick={() => setType(t as Assignment["type"])} style={{
                flex:1,padding:"6px 4px",borderRadius:8,fontSize:10,fontWeight:600,cursor:"pointer",transition:"all .15s",textAlign:"center",
                background: type===t ? TYPE_COLORS[t]+"22" : "rgba(255,255,255,.03)",
                border: `1px solid ${type===t ? TYPE_COLORS[t]+"60" : "rgba(255,255,255,.06)"}`,
                color: type===t ? TYPE_COLORS[t] : "rgba(75,85,99,1)",
              }}>{TYPE_ICONS[t]}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Due Date</div>
              <input type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} style={{colorScheme:"dark"}}/>
            </div>
            <div>
              <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Priority</div>
              <div style={{display:"flex",gap:5}}>
                {(Object.keys(PRIORITY_CONFIG) as AssignmentPriority[]).map(p => (
                  <button key={p} onClick={() => setPriority(p)} style={{
                    flex:1,padding:"7px 4px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .12s",textAlign:"center",
                    background: priority===p ? PRIORITY_CONFIG[p].color+"20" : "rgba(255,255,255,.03)",
                    border: `1px solid ${priority===p ? PRIORITY_CONFIG[p].color+"50" : "rgba(255,255,255,.06)"}`,
                    color: priority===p ? PRIORITY_CONFIG[p].color : "rgba(75,85,99,1)",
                  }}>{PRIORITY_CONFIG[p].dot}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Score (optional)</div>
              <input type="number" className={inputCls} placeholder="e.g. 85" value={score} onChange={e => setScore(e.target.value)} min="0"/>
            </div>
            <div>
              <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Max Score</div>
              <input type="number" className={inputCls} placeholder="e.g. 100" value={maxScore} onChange={e => setMaxScore(e.target.value)} min="0"/>
            </div>
          </div>
          <div>
            <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Notes (optional)</div>
            <textarea className={inputCls} placeholder="e.g. Check Blackboard, group project, open book..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{resize:"none"}}/>
          </div>
          <div>
            <div style={{fontSize:9,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:6}}>Status</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {(Object.keys(STATUS_CONFIG) as AssignmentStatus[]).map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{
                  padding:"5px 10px",borderRadius:8,fontSize:11,fontWeight:500,cursor:"pointer",transition:"all .12s",
                  ...(status===s ? {background:"rgba(124,58,237,.22)",border:"1px solid rgba(124,58,237,.45)",color:"#c084fc"} : {background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"rgba(107,114,128,1)"}),
                }}>{STATUS_CONFIG[s].label}</button>
              ))}
            </div>
          </div>
          {error && <div style={{fontSize:11,color:"#f87171",padding:"7px 12px",borderRadius:8,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)"}}>✗ {error}</div>}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(156,163,175,1)"}}>Cancel</button>
            <button onClick={handleAdd} style={{flex:2,padding:"11px",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",background:`linear-gradient(135deg,${tc},#0891b2)`,color:"white",border:"none"}}>Add Assignment</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditAssignmentModal({
  assignment,
  onClose,
  onSave,
}: {
  assignment: Assignment;
  onClose: () => void;
  onSave: (updated: Assignment) => void;
}) {
  const [title, setTitle] = useState(assignment.title);
  const [dueDate, setDueDate] = useState(assignment.due_date);
  const [type, setType] = useState(assignment.type);
  const [status, setStatus] = useState(assignment.status);
  const [priority, setPriority] = useState<AssignmentPriority>(
    assignment.priority ?? "medium"
  );
  const [score, setScore] = useState(
    assignment.score != null ? String(assignment.score) : ""
  );
  const [maxScore, setMaxScore] = useState(
    assignment.max_score != null ? String(assignment.max_score) : ""
  );
  const [notes, setNotes] = useState(assignment.notes ?? "");

  const inputCls =
    "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-purple-400/50 transition-colors";

  const tc = TYPE_COLORS[type];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,.8)",
          backdropFilter: "blur(16px)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 500,
          background:
            "linear-gradient(135deg,rgba(79,70,229,.15),rgba(7,6,15,.99))",
          border: `1px solid ${tc}30`,
          borderRadius: 24,
          boxShadow: `0 40px 100px rgba(0,0,0,.9),0 0 40px ${tc}15`,
          margin: "auto",
        }}
      >
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg,transparent,${tc},transparent)`,
            borderRadius: "24px 24px 0 0",
          }}
        />

        <div
          style={{
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: "white",
                margin: 0,
              }}
            >
              Edit Assignment
            </h2>

            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.1)",
                color: "rgba(156,163,175,1)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(75,85,99,1)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 5,
              }}
            >
              Title
            </div>

            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(75,85,99,1)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 5,
              }}
            >
              Type
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {Object.keys(TYPE_COLORS).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t as Assignment["type"])}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all .15s",
                    textAlign: "center",
                    background:
                      type === t
                        ? TYPE_COLORS[t] + "22"
                        : "rgba(255,255,255,.03)",
                    border: `1px solid ${
                      type === t
                        ? TYPE_COLORS[t] + "60"
                        : "rgba(255,255,255,.06)"
                    }`,
                    color:
                      type === t
                        ? TYPE_COLORS[t]
                        : "rgba(75,85,99,1)",
                  }}
                >
                  {TYPE_ICONS[t]}
                  <div style={{ fontSize: 8, marginTop: 2 }}>{t}</div>
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(75,85,99,1)",
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  marginBottom: 5,
                }}
              >
                Due Date
              </div>

              <input
                type="date"
                className={inputCls}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ colorScheme: "dark" }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(75,85,99,1)",
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  marginBottom: 5,
                }}
              >
                Priority
              </div>

              <div style={{ display: "flex", gap: 5 }}>
                {(Object.keys(
                  PRIORITY_CONFIG
                ) as AssignmentPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{
                      flex: 1,
                      padding: "7px 4px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all .12s",
                      textAlign: "center",
                      background:
                        priority === p
                          ? PRIORITY_CONFIG[p].color + "20"
                          : "rgba(255,255,255,.03)",
                      border: `1px solid ${
                        priority === p
                          ? PRIORITY_CONFIG[p].color + "50"
                          : "rgba(255,255,255,.06)"
                      }`,
                      color:
                        priority === p
                          ? PRIORITY_CONFIG[p].color
                          : "rgba(75,85,99,1)",
                    }}
                  >
                    {PRIORITY_CONFIG[p].dot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(75,85,99,1)",
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  marginBottom: 5,
                }}
              >
                Score
              </div>

              <input
                type="number"
                className={inputCls}
                placeholder="e.g. 85"
                value={score}
                onChange={(e) => {
                  const value = e.target.value;
                  setScore(value);
                }}
                min="0"
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(75,85,99,1)",
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  marginBottom: 5,
                }}
              >
                Max Score
              </div>

              <input
                type="number"
                className={inputCls}
                placeholder="e.g. 100"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(75,85,99,1)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 5,
              }}
            >
              Notes
            </div>

            <textarea
              className={inputCls}
              placeholder="Any reminders or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ resize: "none" }}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(75,85,99,1)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 6,
              }}
            >
              Status
            </div>

            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(Object.keys(STATUS_CONFIG) as AssignmentStatus[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all .12s",
                      ...(status === s
                        ? {
                            background: "rgba(124,58,237,.22)",
                            border:
                              "1px solid rgba(124,58,237,.45)",
                            color: "#c084fc",
                          }
                        : {
                            background: "rgba(255,255,255,.04)",
                            border:
                              "1px solid rgba(255,255,255,.08)",
                            color: "rgba(107,114,128,1)",
                          }),
                    }}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                )
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                color: "rgba(156,163,175,1)",
              }}
            >
              Cancel
            </button>

            <button
              onClick={() => {
                const parsedScore = score
                  ? parseFloat(score)
                  : null;

                const parsedMaxScore = maxScore
                  ? parseFloat(maxScore)
                  : null;

                onSave({
                  ...assignment,
                  title: title.trim(),
                  due_date: dueDate,
                  type,
                  status,
                  priority,
                  score: parsedScore,
                  max_score: parsedMaxScore,
                  notes: notes.trim() || undefined,
                });
              }}
              style={{
                flex: 2,
                padding: "11px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: `linear-gradient(135deg,${tc},#0891b2)`,
                color: "white",
                border: "none",
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const today = new Date();

  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [courses, setCourses] = useState<{ name: string; color: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAssignment, setEditAssignment] = useState<Assignment | null>(null);
  const [addDefaultDate, setAddDefaultDate] = useState(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()));
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [view, setView] = useState<"month"|"list">("month");
  const [sortBy, setSortBy] = useState<"date"|"priority"|"course">("date");

  useEffect(() => {
    setMounted(true);

    // ── FIXED: use /gpa/project/ with Bearer token so scores stay in sync
    // with GPA predictor saves
    import("@/lib/firebase").then(({ auth }) => {
      const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe();
        if (!user) { setLoadingAssignments(false); return; }

        const username = localStorage.getItem("student_user_name") ?? "";

        user.getIdToken().then(token => {
          // Primary: use /gpa/project/ which returns actual scores
          fetch(`http://localhost:8000/gpa/project`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(r => r.json())
            .then((data: any) => {
              const projectedCourses: any[] = data.projected_courses ?? [];
              // Debug: log how many assignments have due_dates
              const allAssignments = projectedCourses.flatMap((c: any) =>
                (c.categories ?? []).flatMap((cat: any) => cat.assignments ?? [])
              );
              console.log(`[Calendar] ${projectedCourses.length} courses, ${allAssignments.length} assignments, ${allAssignments.filter((a: any) => a.due_date).length} with due_date`);

              // Build courses list
              const courseList = projectedCourses.map((c: any, i: number) => ({
                name: c.course_name,
                color: COURSE_COLORS[i % COURSE_COLORS.length],
              }));
              setCourses(courseList);

              // Map assignments from projected courses (includes real scores)
              const mapped: Assignment[] = [];
              projectedCourses.forEach((course: any, ci: number) => {
                const color = COURSE_COLORS[ci % COURSE_COLORS.length];
                (course.categories ?? []).forEach((cat: any) => {
                  (cat.assignments ?? []).forEach((a: any) => {
                    // Include all assignments — use due_date if present, otherwise
                    // mark as undated so they still appear in list view
                    const rawDate = a.due_date ? a.due_date.slice(0, 10) : null;
                    mapped.push({
                      id: a.assignment_id ?? a.id ?? Math.random(),
                      title: a.title ?? "Assignment",
                      course: course.course_name,
                      course_color: color,
                      type: guessType(a.title ?? ""),
                      due_date: rawDate ?? "undated",
                      status: "not_started",
                      priority: "medium",
                      score: a.score ?? null,
                      max_score: a.max_score ?? null,
                    });
                  });
                });
              });

              // Merge with localStorage: keep status, priority, notes from local
              // but use backend score (so GPA predictor saves show here)
              const saved: Assignment[] = JSON.parse(localStorage.getItem("local_assignments") ?? "[]");
              const savedMap = new Map(saved.map(a => [a.id, a]));

              const merged = mapped.map(a => {
                const local = savedMap.get(a.id);
                // If a grade was entered in the GPA predictor, auto-complete the assignment
                // unless the user has explicitly set a non-default status locally
                const hasGrade = a.score != null && a.max_score != null && a.max_score > 0;
                const localStatus = local?.status;
                const autoStatus = hasGrade && (!localStatus || localStatus === "not_started")
                  ? "completed"
                  : (localStatus ?? a.status);
                return {
                  ...a,
                  status: autoStatus,
                  priority: local?.priority ?? a.priority,
                  notes: local?.notes ?? a.notes,
                  // Always use backend score — it's authoritative
                  score: a.score,
                  max_score: a.max_score,
                };
              });

              // Keep any manually-added local assignments that aren't in backend
              const backendIds = new Set(mapped.map(a => a.id));
              const localOnly = saved.filter(a => !backendIds.has(a.id));

              const final = [...merged, ...localOnly];
              setAssignments(final);
              // Only persist assignments that have real dates to localStorage
              // so stale "undated" entries don't pollute the cache on re-upload
              saveLocal(final.filter(a => a.due_date !== "undated"));
              setLoadingAssignments(false);
            })
            .catch(() => {
              // Fallback to localStorage if backend fails
              const saved: Assignment[] = JSON.parse(localStorage.getItem("local_assignments") ?? "[]");
              setAssignments(saved);
              setLoadingAssignments(false);
            });
        });
      });
    });

    // Re-fetch assignments when page regains focus (user switches back from GPA predictor)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        import("@/lib/firebase").then(({ auth }) => {
          const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            if (!user) return;

            const username = localStorage.getItem("student_user_name") ?? "";
            const token = user.getIdToken();

            token.then(tok => {
              fetch(`http://localhost:8000/gpa/project`, {
                headers: { Authorization: `Bearer ${tok}` }
              })
                .then(r => r.json())
                .then((data: any) => {
                  const projectedCourses: any[] = data.projected_courses ?? [];
                  const allAssignments = projectedCourses.flatMap((c: any) =>
                    (c.categories ?? []).flatMap((cat: any) => cat.assignments ?? [])
                  );

                  const mapped: Assignment[] = [];
                  projectedCourses.forEach((course: any, ci: number) => {
                    const color = COURSE_COLORS[ci % COURSE_COLORS.length];
                    (course.categories ?? []).forEach((cat: any) => {
                      (cat.assignments ?? []).forEach((a: any) => {
                        const rawDate = a.due_date ? a.due_date.slice(0, 10) : null;
                        mapped.push({
                          id: a.assignment_id ?? a.id ?? Math.random(),
                          title: a.title ?? "Assignment",
                          course: course.course_name,
                          course_color: color,
                          type: guessType(a.title ?? ""),
                          due_date: rawDate ?? "undated",
                          status: "not_started",
                          priority: "medium",
                          score: a.score ?? null,
                          max_score: a.max_score ?? null,
                        });
                      });
                    });
                  });

                  const saved: Assignment[] = JSON.parse(localStorage.getItem("local_assignments") ?? "[]");
                  const savedMap = new Map(saved.map(a => [a.id, a]));

                  const merged = mapped.map(a => {
                    const local = savedMap.get(a.id);
                    // If a grade was entered in the GPA predictor, auto-complete the assignment
                    // unless the user has explicitly set a non-default status locally
                    const hasGrade = a.score != null && a.max_score != null && a.max_score > 0;
                    const localStatus = local?.status;
                    const autoStatus = hasGrade && (!localStatus || localStatus === "not_started")
                      ? "completed"
                      : (localStatus ?? a.status);
                    return {
                      ...a,
                      status: autoStatus,
                      priority: local?.priority ?? a.priority,
                      notes: local?.notes ?? a.notes,
                      score: a.score,
                      max_score: a.max_score,
                    };
                  });

                  const backendIds = new Set(mapped.map(a => a.id));
                  const localOnly = saved.filter(a => !backendIds.has(a.id));

                  const final = [...merged, ...localOnly];
                  setAssignments(final);
                  saveLocal(final.filter(a => a.due_date !== "undated"));
                })
                .catch(err => console.error("[Calendar] Failed to re-fetch assignments:", err));
            });
          });
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const saveLocal = (updated: Assignment[]) =>
    localStorage.setItem("local_assignments", JSON.stringify(updated));

  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1);
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const priorityOrder: Record<AssignmentPriority, number> = { high: 0, medium: 1, low: 2 };

  const daysInMonth    = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDay(year, month);
  const assignmentsOnDay = (day: number) => assignments.filter(a => a.due_date !== "undated" && a.due_date === toDateStr(year, month, day));
  const selectedAssignments = selected ? assignments.filter(a => a.due_date === selected) : [];

  const filteredAssignments = useMemo(() => {
    let r = assignments.filter(a =>
      (filterType === "all" || a.type === filterType) &&
      (filterCourse === "all" || a.course === filterCourse) &&
      (filterPriority === "all" || a.priority === filterPriority)
    );
    if (sortBy === "date") r = [...r].sort((a,b) => a.due_date.localeCompare(b.due_date));
    if (sortBy === "priority") r = [...r].sort((a,b) => priorityOrder[a.priority??"medium"] - priorityOrder[b.priority??"medium"]);
    if (sortBy === "course") r = [...r].sort((a,b) => a.course.localeCompare(b.course));
    return r;
  }, [assignments, filterType, filterCourse, filterPriority, sortBy]);

  const byStatus = (status: AssignmentStatus) => filteredAssignments.filter(a => a.status === status);

  const today0 = todayStr();
  const totalA = assignments.length;
  const completedA = assignments.filter(a => a.status === "completed").length;
  const overdueA = assignments.filter(a => a.due_date !== "undated" && a.due_date < today0 && a.status !== "completed").length;
  const completionPct = totalA > 0 ? Math.round((completedA / totalA) * 100) : 0;
  const gradedA = assignments.filter(a => a.score != null && a.max_score != null && a.max_score > 0);
  const avgGrade = gradedA.length > 0
    ? Math.round(gradedA.reduce((s, a) => s + (a.score! / a.max_score!) * 100, 0) / gradedA.length)
    : null;

  const upcoming = assignments
    .filter(a => { const d = daysUntil(a.due_date); return d >= 0 && d <= 7 && a.status !== "completed" && a.due_date !== "undated"; })
    .sort((a, b) => {
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
      return priorityOrder[a.priority ?? "medium"] - priorityOrder[b.priority ?? "medium"];
    })
    .slice(0, 5);

  if (!mounted) return null;

  const updateStatus = (id: number, status: AssignmentStatus) => {
    setAssignments(prev => { const u = prev.map(a => a.id === id ? { ...a, status } : a); saveLocal(u); return u; });
  };
  const handleDelete = (id: number) => {
    setAssignments(prev => { const u = prev.filter(x => x.id !== id); saveLocal(u); return u; });
  };
  const handleSaveEdit = (updated: Assignment) => {
    // Auto-complete if a grade was entered and status is still not_started
    const hasGrade = updated.score != null && updated.max_score != null && updated.max_score > 0;
    const finalStatus = hasGrade && updated.status === "not_started" ? "completed" : updated.status;
    const finalAssignment = { ...updated, status: finalStatus };
    setAssignments(prev => { const u = prev.map(x => x.id === finalAssignment.id ? finalAssignment : x); saveLocal(u); return u; });
    setEditAssignment(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-indigo-900 flex flex-col">
      <nav className="relative z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span onClick={() => router.push("/dashboard")} className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 cursor-pointer select-none">IntelliGPA</span>
          <ul className="flex items-center gap-8">
            {navLinks.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <button onClick={() => router.push(href)} className={`relative text-sm font-semibold tracking-wide transition-all duration-300 pb-1 ${isActive ? "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400" : "text-gray-300 hover:text-white"}`}>
                    {label}
                    {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-4">
        {loadingAssignments && (
          <div className="flex items-center justify-center py-8 gap-3">
            <span className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Loading your assignments...</span>
          </div>
        )}

        {/* PAGE HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">Academic Calendar</h1>
              {overdueA > 0 && (
                <span style={{padding:"3px 10px",borderRadius:999,fontSize:12,fontWeight:800,background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.35)",color:"#f87171",boxShadow:"0 0 12px rgba(239,68,68,.2)"}}>
                  ⚠️ {overdueA} overdue
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-0.5">Track your assignments and deadlines</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
            <button onClick={() => { setAddDefaultDate(toDateStr(year, month, today.getDate())); setShowAddModal(true); }}
              style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",background:"linear-gradient(135deg,#7c3aed,#0891b2)",color:"white",border:"none",boxShadow:"0 0 16px rgba(124,58,237,.3)"}}>
              + Add Assignment
            </button>
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[
            { label:"Total", value: totalA, color:"#818cf8", sub:"assignments", icon:"📚" },
            { label:"Completed", value:`${completionPct}%`, color:"#4ade80", sub:`${completedA} of ${totalA}`, icon:"✅" },
            { label:"Overdue", value: overdueA, color: overdueA > 0 ? "#f87171" : "#4ade80", sub: overdueA > 0 ? "need attention" : "all on track", icon: overdueA > 0 ? "🔴" : "🟢" },
            { label:"Avg Grade", value: avgGrade != null ? `${avgGrade}%` : "—", color:"#38bdf8", sub: gradedA.length > 0 ? `${gradedA.length} graded` : "no grades yet", icon:"📊" },
          ].map(s => (
            <div key={s.label} style={{borderRadius:16,padding:"14px 16px",background:"rgba(255,255,255,.025)",border:`1px solid ${s.color}20`,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.color},transparent)`}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:9,color:"rgba(75,85,99,1)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:4}}>{s.label}</div>
                  <div style={{fontSize:26,fontWeight:900,color:s.color,lineHeight:1,textShadow:`0 0 20px ${s.color}40`}}>{s.value}</div>
                  <div style={{fontSize:9,color:"rgba(107,114,128,1)",marginTop:3}}>{s.sub}</div>
                </div>
                <span style={{fontSize:20,opacity:.4}}>{s.icon}</span>
              </div>
              {s.label === "Completed" && (
                <div style={{marginTop:8,height:3,borderRadius:3,background:"rgba(255,255,255,.07)"}}>
                  <div style={{height:"100%",borderRadius:3,width:`${completionPct}%`,background:"#4ade80",transition:"width 1s ease"}}/>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* UPCOMING DEADLINES BANNER */}
        {upcoming.length > 0 && (
          <div style={{borderRadius:20,padding:"16px 20px",background:"linear-gradient(135deg,rgba(124,58,237,.1),rgba(8,145,178,.08))",border:"1px solid rgba(124,58,237,.25)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:14}}>⏰</span>
              <span style={{fontSize:12,fontWeight:700,color:"white",letterSpacing:".05em"}}>COMING UP</span>
              <span style={{fontSize:10,color:"rgba(107,114,128,1)"}}>next 7 days</span>
            </div>
            <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:2}}>
              {upcoming.map(a => {
                const d = daysUntil(a.due_date);
                const tc = TYPE_COLORS[a.type];
                return (
                  <div key={a.id} style={{flexShrink:0,borderRadius:12,padding:"10px 14px",background:tc+"10",border:`1px solid ${tc}30`,minWidth:160,cursor:"pointer"}}
                    onClick={() => { setSelected(a.due_date); setYear(parseInt(a.due_date.slice(0,4))); setMonth(parseInt(a.due_date.slice(5,7))-1); setView("month"); }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:9,color:tc,fontWeight:700}}>{TYPE_ICONS[a.type]} {a.type}</span>
                      <span style={{fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:6,
                        background: d===0?"rgba(239,68,68,.2)":d===1?"rgba(251,191,36,.15)":"rgba(255,255,255,.05)",
                        color: d===0?"#f87171":d===1?"#fbbf24":"rgba(107,114,128,1)"}}>
                        {d===0?"Today!":d===1?"Tmrw":`${d}d`}
                      </span>
                    </div>
                    <p style={{fontSize:12,fontWeight:700,color:"white",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.title}</p>
                    <p style={{fontSize:10,color:"rgba(107,114,128,1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.course}</p>
                    <div style={{display:"flex",alignItems:"center",gap:4,marginTop:5}}>
                      <span style={{fontSize:10}}>{PRIORITY_CONFIG[a.priority ?? "medium"].dot}</span>
                      <span style={{fontSize:9,color:"rgba(75,85,99,1)"}}>{new Date(a.due_date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CALENDAR TABLE */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all duration-200 hover:scale-110">‹</button>
              <h2 className="text-lg font-bold text-white w-44 text-center">{MONTHS[month]} <span className="text-purple-300">{year}</span></h2>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all duration-200 hover:scale-110">›</button>
              <button onClick={goToday} style={{padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,background:"rgba(124,58,237,.15)",border:"1px solid rgba(124,58,237,.3)",color:"#a78bfa",cursor:"pointer"}}>
                Today
              </button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex",borderRadius:9,overflow:"hidden",border:"1px solid rgba(255,255,255,.1)"}}>
                {(["month","list"] as const).map(v => (
                  <button key={v} onClick={() => setView(v)} style={{padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",border:"none",transition:"all .15s",
                    background:view===v?"rgba(124,58,237,.3)":"rgba(255,255,255,.03)",color:view===v?"white":"rgba(107,114,128,1)"}}>
                    {v === "month" ? "📅 Month" : "📋 List"}
                  </button>
                ))}
              </div>
              <div className="hidden lg:flex items-center gap-3">
                {Object.keys(TYPE_COLORS).map(t => (
                  <div key={t} className="flex items-center gap-1">
                    <span style={{width:8,height:8,borderRadius:"50%",backgroundColor:TYPE_COLORS[t],display:"inline-block",boxShadow:`0 0 5px ${TYPE_COLORS[t]}`}}/>
                    <span style={{fontSize:10,color:"rgba(107,114,128,1)"}}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Month view */}
          {view === "month" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>{DAYS.map(d => <th key={d} className="border border-white/10 px-2 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider bg-white/3 w-[14.28%]">{d}</th>)}</tr>
                </thead>
                <tbody>
                  {(() => {
                    const cells: React.ReactNode[] = [];
                    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = toDateStr(year, month, d);
                      const dayAssignments = assignmentsOnDay(d);
                      const todayFlag = isToday(year, month, d);
                      const isSelected = selected === dateStr;
                      const hasOverdue = dayAssignments.some(a => a.due_date < today0 && a.status !== "completed");
                      cells.push(
                        <td key={d} onClick={() => setSelected(prev => prev === dateStr ? null : dateStr)}
                          className={`border border-white/10 align-top p-2 cursor-pointer transition-all duration-200 hover:bg-white/8 ${isSelected ? "bg-purple-500/20 border-purple-400/50" : todayFlag ? "bg-cyan-500/10" : "bg-white/2"}`}
                          style={{ verticalAlign: "top", outline: hasOverdue && !isSelected ? "1px solid rgba(239,68,68,.3)" : undefined }}>
                          <div className={`text-xs font-bold mb-1.5 flex items-center gap-1 ${todayFlag ? "text-cyan-300" : isSelected ? "text-purple-200" : "text-gray-300"}`}>
                            {todayFlag ? <span className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-black">{d}</span> : <span>{d}</span>}
                            {hasOverdue && <span style={{width:5,height:5,borderRadius:"50%",background:"#f87171",display:"inline-block"}}/>}
                          </div>
                          <div className="flex flex-col gap-1">
                            {dayAssignments.slice(0, 3).map(a => (
                              <div key={a.id} className="text-[11px] font-medium px-1.5 py-0.5 rounded-md truncate leading-tight"
                                style={{
                                  backgroundColor: TYPE_COLORS[a.type] + "25",
                                  color: TYPE_COLORS[a.type],
                                  border: `1px solid ${TYPE_COLORS[a.type]}40`,
                                  textDecoration: a.status === "completed" ? "line-through" : "none",
                                  opacity: a.status === "completed" ? 0.5 : 1,
                                }}
                                title={`${a.title} — ${a.course}`}>
                                {TYPE_ICONS[a.type]} {a.title}
                              </div>
                            ))}
                            {dayAssignments.length > 3 && <span className="text-[10px] text-gray-500 pl-1">+{dayAssignments.length - 3} more</span>}
                          </div>
                        </td>
                      );
                    }
                    const rows: React.ReactNode[][] = [];
                    let row: React.ReactNode[] = [];
                    cells.forEach((cell, i) => {
                      row.push(cell ?? <td key={`empty-${i}`} className="border border-white/10 bg-white/2 h-16" />);
                      if (row.length === 7) { rows.push(row); row = []; }
                    });
                    while (row.length > 0 && row.length < 7) row.push(<td key={`pad-${row.length}`} className="border border-white/10 bg-white/2" />);
                    if (row.length > 0) rows.push(row);
                    return rows.map((r, i) => <tr key={i}>{r}</tr>);
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* List view */}
          {view === "list" && (
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:8}}>
              {filteredAssignments.length === 0 ? (
                <div style={{textAlign:"center",padding:"40px 0",color:"rgba(75,85,99,1)"}}>
                  <div style={{fontSize:40,marginBottom:10}}>📭</div>
                  <p>No assignments match your filters</p>
                </div>
              ) : Array.from(new Set(filteredAssignments.map(a => a.due_date))).sort((a,b) => {
                  if (a === "undated") return 1;
                  if (b === "undated") return -1;
                  return a.localeCompare(b);
                }).map(date => {
                const dayA = filteredAssignments.filter(a => a.due_date === date);
                const d = daysUntil(date);
                return (
                  <div key={date}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,marginTop:4}}>
                      <span style={{fontSize:11,fontWeight:800,color:d<0?"#f87171":d===0?"#22d3ee":"rgba(156,163,175,1)"}}>
                        {date==="undated"?"📌 NO DUE DATE":d===0?"TODAY":d<0?`${Math.abs(d)}d ago`:d===1?"TOMORROW":new Date(date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                      </span>
                      <div style={{flex:1,height:1,background:d<0?"rgba(239,68,68,.2)":d===0?"rgba(34,211,238,.2)":"rgba(255,255,255,.06)"}}/>
                      <span style={{fontSize:10,color:"rgba(75,85,99,1)"}}>{dayA.length}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:5}}>
                      {dayA.map(a => {
                        const tc = TYPE_COLORS[a.type];
                        const dl = daysUntil(a.due_date);
                        return (
                          <div key={a.id} style={{borderRadius:12,padding:"10px 14px",background:tc+"07",border:`1px solid ${tc}25`,display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontSize:14,flexShrink:0}}>{TYPE_ICONS[a.type]}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{fontSize:12,fontWeight:600,color:a.status==="completed"?"rgba(107,114,128,1)":"white",textDecoration:a.status==="completed"?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.title}</p>
                              <p style={{fontSize:10,color:"rgba(107,114,128,1)",marginTop:1}}>{a.course} · <span style={{color:tc}}>{a.type}</span></p>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                              <span style={{fontSize:10}}>{PRIORITY_CONFIG[a.priority??"medium"].dot}</span>
                              <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:6,
                                background:dl<0?"rgba(239,68,68,.2)":dl===0?"rgba(239,68,68,.2)":dl<=2?"rgba(251,191,36,.15)":"rgba(255,255,255,.05)",
                                color:dl<0?"#f87171":dl===0?"#f87171":dl<=2?"#fbbf24":"rgba(107,114,128,1)"}}>
                                {dl<0?`${Math.abs(dl)}d ago`:dl===0?"Today":dl===1?"Tmrw":`${dl}d`}
                              </span>
                              <select value={a.status} onChange={e => updateStatus(a.id, e.target.value as AssignmentStatus)}
                                style={{fontSize:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",borderRadius:6,padding:"3px 6px",cursor:"pointer",outline:"none"}}>
                                {(Object.keys(STATUS_CONFIG) as AssignmentStatus[]).map(st => (
                                  <option key={st} value={st} style={{background:"#1a1a2e"}}>{STATUS_CONFIG[st].label}</option>
                                ))}
                              </select>
                              <button onClick={e=>{e.stopPropagation();setEditAssignment(a);}} style={{width:24,height:24,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",cursor:"pointer",fontSize:11}}>✏️</button>
                              <button onClick={e=>{e.stopPropagation();handleDelete(a.id);}} style={{width:24,height:24,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",cursor:"pointer",fontSize:11}}>🗑</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SELECTED DAY POPUP */}
        {selected && view === "month" && (
          <div className="backdrop-blur-xl bg-white/5 border border-purple-400/30 rounded-3xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                📅 {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                <span className="ml-2 text-sm font-normal text-gray-400">— {selectedAssignments.length} due</span>
              </h3>
              <div className="flex gap-2">
                <button onClick={() => { setAddDefaultDate(selected); setShowAddModal(true); }}
                  style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",background:"linear-gradient(135deg,#7c3aed,#0891b2)",color:"white",border:"none"}}>
                  + Add
                </button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
              </div>
            </div>
            {selectedAssignments.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No assignments due — click + Add to add one.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedAssignments.map(a => {
                  const s = STATUS_CONFIG[a.status];
                  const tc = TYPE_COLORS[a.type];
                  const pct = a.score != null && a.max_score ? Math.round((a.score / a.max_score) * 100) : null;
                  return (
                    <div key={a.id} style={{borderRadius:16,padding:16,background:tc+"08",border:`1px solid ${tc}30`}}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                            <span style={{fontSize:10,padding:"2px 7px",borderRadius:6,background:tc+"20",color:tc,border:`1px solid ${tc}40`,fontWeight:700}}>
                              {TYPE_ICONS[a.type]} {a.type}
                            </span>
                            <span title={`${PRIORITY_CONFIG[a.priority ?? "medium"].label} priority`} style={{fontSize:11}}>{PRIORITY_CONFIG[a.priority ?? "medium"].dot}</span>
                          </div>
                          <p className="text-sm font-semibold text-white">{a.title}</p>
                          <p style={{fontSize:10,color:"rgba(107,114,128,1)",marginTop:2}}>{a.course}</p>
                          {pct != null && (
                            <div style={{marginTop:6}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                                <span style={{fontSize:9,color:"rgba(75,85,99,1)"}}>Grade</span>
                                <span style={{fontSize:10,fontWeight:700,color:pct>=90?"#4ade80":pct>=70?"#fbbf24":"#f87171"}}>{a.score}/{a.max_score} ({pct}%)</span>
                              </div>
                              <div style={{height:3,borderRadius:3,background:"rgba(255,255,255,.07)"}}>
                                <div style={{height:"100%",borderRadius:3,width:`${pct}%`,background:pct>=90?"#4ade80":pct>=70?"#fbbf24":"#f87171"}}/>
                              </div>
                            </div>
                          )}
                          {a.notes && <p style={{fontSize:10,color:"rgba(156,163,175,1)",marginTop:5,fontStyle:"italic"}}>💬 {a.notes}</p>}
                        </div>
                        <div style={{display:"flex",gap:4,flexShrink:0}}>
                          <button onClick={e => { e.stopPropagation(); setEditAssignment(a); }}
                            style={{width:26,height:26,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",cursor:"pointer",fontSize:12}}>✏️</button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                            style={{width:26,height:26,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",cursor:"pointer",fontSize:12}}>🗑</button>
                        </div>
                      </div>
                      <select value={a.status} onChange={e => updateStatus(a.id, e.target.value as AssignmentStatus)}
                        className={`w-full mt-2 text-xs rounded-lg px-2 py-1.5 border font-medium cursor-pointer outline-none ${s.bg} ${s.border} ${s.color} bg-transparent`}>
                        {(Object.keys(STATUS_CONFIG) as AssignmentStatus[]).map(st => (
                          <option key={st} value={st} className="bg-gray-900 text-white">{STATUS_CONFIG[st].label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FILTER BAR */}
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:"rgba(75,85,99,1)",textTransform:"uppercase",letterSpacing:".1em"}}>Filter:</span>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{padding:"5px 10px",borderRadius:8,fontSize:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",cursor:"pointer",outline:"none"}}>
            <option value="all" style={{background:"#1a1a2e"}}>All Types</option>
            {Object.keys(TYPE_ICONS).map(t => <option key={t} value={t} style={{background:"#1a1a2e"}}>{TYPE_ICONS[t]} {t}</option>)}
          </select>
          <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
            style={{padding:"5px 10px",borderRadius:8,fontSize:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",cursor:"pointer",outline:"none"}}>
            <option value="all" style={{background:"#1a1a2e"}}>All Courses</option>
            {courses.map(c => <option key={c.name} value={c.name} style={{background:"#1a1a2e"}}>{c.name}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            style={{padding:"5px 10px",borderRadius:8,fontSize:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",cursor:"pointer",outline:"none"}}>
            <option value="all" style={{background:"#1a1a2e"}}>All Priorities</option>
            <option value="high" style={{background:"#1a1a2e"}}>🔴 High</option>
            <option value="medium" style={{background:"#1a1a2e"}}>🟡 Medium</option>
            <option value="low" style={{background:"#1a1a2e"}}>🟢 Low</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            style={{padding:"5px 10px",borderRadius:8,fontSize:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",cursor:"pointer",outline:"none"}}>
            <option value="date" style={{background:"#1a1a2e"}}>📅 Sort: Date</option>
            <option value="priority" style={{background:"#1a1a2e"}}>🔴 Sort: Priority</option>
            <option value="course" style={{background:"#1a1a2e"}}>📚 Sort: Course</option>
          </select>
          {(filterType !== "all" || filterCourse !== "all" || filterPriority !== "all") && (
            <button onClick={() => { setFilterType("all"); setFilterCourse("all"); setFilterPriority("all"); }}
              style={{padding:"5px 10px",borderRadius:8,fontSize:11,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",color:"#f87171",cursor:"pointer"}}>
              Clear ✕
            </button>
          )}
          <span style={{fontSize:10,color:"rgba(75,85,99,1)",marginLeft:"auto"}}>
            {filteredAssignments.length} of {assignments.length} assignments
          </span>
        </div>

        {/* STATUS SECTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {(Object.keys(STATUS_CONFIG) as AssignmentStatus[]).map(status => {
            const s = STATUS_CONFIG[status];
            const items = byStatus(status);
            return (
              <div key={status} className={`backdrop-blur-xl bg-white/5 border rounded-2xl p-4 ${s.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${s.color}`}>{s.label}</h3>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-md font-bold ${s.bg} ${s.color} border ${s.border}`}>{items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-3 italic">No assignments</p>
                  ) : items.map(a => {
                    const d = daysUntil(a.due_date);
                    const tc = TYPE_COLORS[a.type];
                    return (
                      <div key={a.id} style={{borderRadius:12,padding:12,background:tc+"06",border:`1px solid ${tc}20`}} className="group transition-all duration-200">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                              <span style={{fontSize:9,color:tc,fontWeight:700}}>{TYPE_ICONS[a.type]} {a.type}</span>
                              <span style={{fontSize:10}}>{PRIORITY_CONFIG[a.priority ?? "medium"].dot}</span>
                            </div>
                            <p className="text-xs font-semibold text-white truncate">{a.title}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(107,114,128,1)" }}>{a.course}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${d < 0 ? "bg-red-500/20 text-red-300" : d === 0 ? "bg-red-500/20 text-red-300" : d <= 2 ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-gray-500"}`}>
                              {d < 0 ? `${Math.abs(d)}d ago` : d === 0 ? "Today" : d === 1 ? "Tmrw" : `${d}d`}
                            </span>
                            <button onClick={e => { e.stopPropagation(); setEditAssignment(a); }}
                              style={{width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",cursor:"pointer",fontSize:10,flexShrink:0}}>✏️</button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                              style={{width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",cursor:"pointer",fontSize:10,flexShrink:0}}>🗑</button>
                          </div>
                        </div>
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {(Object.keys(STATUS_CONFIG) as AssignmentStatus[]).filter(st => st !== status).map(st => (
                            <button key={st} onClick={() => updateStatus(a.id, st)}
                              className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium transition-all duration-150 hover:scale-105 ${STATUS_CONFIG[st].bg} ${STATUS_CONFIG[st].border} ${STATUS_CONFIG[st].color}`}>
                              {STATUS_CONFIG[st].label.split(" ")[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAddModal && (
        <AddAssignmentModal courses={courses} defaultDate={addDefaultDate} onClose={() => setShowAddModal(false)}
          onAdd={a => { setAssignments(prev => { const u = [...prev, a]; saveLocal(u); return u; }); }}
        />
      )}
      {editAssignment && (
        <EditAssignmentModal assignment={editAssignment} onClose={() => setEditAssignment(null)} onSave={handleSaveEdit} />
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>
    </div>
  );
}
