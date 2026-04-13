"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type AssignmentStatus = "not_started" | "in_progress" | "completed" | "not_submitted";

export type Assignment = {
  id: number;
  title: string;
  course: string;
  course_color: string;
  type: "homework" | "quiz" | "exam" | "project" | "lab" | "other";
  due_date: string; // "YYYY-MM-DD"
  status: AssignmentStatus;
  score?: number | null;
  max_score?: number | null;
};

// ─── NO MOCK DATA — assignments loaded from backend only ────────────────────

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const today = new Date();

  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeStatus, setActiveStatus] = useState<AssignmentStatus | "all">("all");

  // ── BACKEND HOOK — groupmate connects this to the API ──
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    const username = localStorage.getItem("student_user_name");
    if (!username) { setLoadingAssignments(false); return; }
    fetch(`http://localhost:8000/course/course/${username}`)
      .then(r => r.json())
      .then(data => {
        // TODO: map API response to Assignment[] shape
        // setAssignments(data.flatMap(course => course.assignments));
        setLoadingAssignments(false);
      })
      .catch(() => setLoadingAssignments(false));
  }, []);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1);

  const daysInMonth   = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDay(year, month);

  const assignmentsOnDay = (day: number) =>
    assignments.filter(a => a.due_date === toDateStr(year, month, day));

  const selectedAssignments = selected ? assignments.filter(a => a.due_date === selected) : [];

  // Status sections
  const byStatus = (status: AssignmentStatus) => assignments.filter(a => a.status === status);
  const filteredByStatus = activeStatus === "all" ? assignments : byStatus(activeStatus as AssignmentStatus);

  // Update status handler — groupmate connects to PATCH /assignment/{id}
  const updateStatus = (id: number, status: AssignmentStatus) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    // TODO: await fetch(`http://localhost:8000/assignment/${id}`, { method: "PATCH", body: JSON.stringify({ status }) })
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-indigo-900 flex flex-col">

      {/* NAVBAR */}
      <nav className="relative z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span onClick={() => router.push("/dashboard")}
            className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 cursor-pointer select-none">
            IntelliGPA
          </span>
          <ul className="flex items-center gap-8">
            {navLinks.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <button onClick={() => router.push(href)}
                    className={`relative text-sm font-semibold tracking-wide transition-all duration-300 pb-1
                      ${isActive ? "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400" : "text-gray-300 hover:text-white"}`}>
                    {label}
                    {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 shadow-[0_0_6px_rgba(200,100,255,0.8)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-4">

        {/* Loading state */}
        {loadingAssignments && (
          <div className="flex items-center justify-center py-8 gap-3">
            <span className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Loading your assignments...</span>
          </div>
        )}

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
              Academic Calendar
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Track your assignments and deadlines</p>
          </div>
          {/* Today's date */}
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>

        {/* ── CALENDAR TABLE ── */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-center gap-4 px-6 py-4 border-b border-white/10">
            <button onClick={prevMonth}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center text-base transition-all duration-200 hover:scale-110">
              ‹
            </button>
            <h2 className="text-lg font-bold text-white w-44 text-center">
              {MONTHS[month]} <span className="text-purple-300">{year}</span>
            </h2>
            <button onClick={nextMonth}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center text-base transition-all duration-200 hover:scale-110">
              ›
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {DAYS.map(d => (
                    <th key={d} className="border border-white/10 px-2 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider bg-white/3 w-[14.28%]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const cells: React.ReactNode[] = [];
                  // fill empty leading cells
                  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
                  // fill days
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = toDateStr(year, month, d);
                    const dayAssignments = assignmentsOnDay(d);
                    const todayFlag = isToday(year, month, d);
                    const isSelected = selected === dateStr;
                    cells.push(
                      <td key={d}
                        onClick={() => setSelected(isSelected ? null : dateStr)}
                        className={`border border-white/10 align-top p-2 cursor-pointer transition-all duration-200 hover:bg-white/8
                          ${isSelected ? "bg-purple-500/20 border-purple-400/50" : todayFlag ? "bg-cyan-500/10" : "bg-white/2"}`}
                        style={{ verticalAlign: "top" }}
                      >
                        <div className={`text-xs font-bold mb-1.5 flex items-center gap-1
                          ${todayFlag ? "text-cyan-300" : isSelected ? "text-purple-200" : "text-gray-300"}`}>
                          {todayFlag ? (
                            <span className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-black">{d}</span>
                          ) : (
                            <span>{d}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          {dayAssignments.slice(0, 3).map(a => (
                            <div key={a.id}
                              className="text-[11px] font-medium px-1.5 py-0.5 rounded-md truncate leading-tight"
                              style={{
                                backgroundColor: a.course_color + "25",
                                color: a.course_color,
                                border: `1px solid ${a.course_color}40`,
                              }}
                              title={`${a.title} — ${a.course}`}
                            >
                              {TYPE_ICONS[a.type]} {a.title}
                            </div>
                          ))}
                          {dayAssignments.length > 3 && (
                            <span className="text-[10px] text-gray-500 pl-1">+{dayAssignments.length - 3} more</span>
                          )}
                        </div>
                      </td>
                    );
                  }

                  // chunk into weeks
                  const rows: React.ReactNode[][] = [];
                  let row: React.ReactNode[] = [];
                  cells.forEach((cell, i) => {
                    row.push(cell ?? <td key={`empty-${i}`} className="border border-white/10 bg-white/2 h-16" />);
                    if (row.length === 7) { rows.push(row); row = []; }
                  });
                  // pad last row
                  while (row.length > 0 && row.length < 7) row.push(<td key={`pad-${row.length}`} className="border border-white/10 bg-white/2" />);
                  if (row.length > 0) rows.push(row);

                  return rows.map((r, i) => <tr key={i}>{r}</tr>);
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SELECTED DAY POPUP ── */}
        {selected && selectedAssignments.length > 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-purple-400/30 rounded-3xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                📅 {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                <span className="ml-2 text-sm font-normal text-gray-400">— {selectedAssignments.length} due</span>
              </h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedAssignments.map(a => {
                const s = STATUS_CONFIG[a.status];
                return (
                  <div key={a.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: a.course_color + "25", color: a.course_color, border: `1px solid ${a.course_color}40` }}>
                          {a.course}
                        </span>
                        <p className="text-sm font-semibold text-white mt-1">{TYPE_ICONS[a.type]} {a.title}</p>
                      </div>
                    </div>
                    {/* Status selector */}
                    <select
                      value={a.status}
                      onChange={e => updateStatus(a.id, e.target.value as AssignmentStatus)}
                      className={`w-full mt-2 text-xs rounded-lg px-2 py-1.5 border font-medium cursor-pointer outline-none ${s.bg} ${s.border} ${s.color} bg-transparent`}
                    >
                      {(Object.keys(STATUS_CONFIG) as AssignmentStatus[]).map(st => (
                        <option key={st} value={st} className="bg-gray-900 text-white">
                          {STATUS_CONFIG[st].label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STATUS SECTIONS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {(Object.keys(STATUS_CONFIG) as AssignmentStatus[]).map(status => {
            const s = STATUS_CONFIG[status];
            const items = byStatus(status);
            return (
              <div key={status} className={`backdrop-blur-xl bg-white/5 border rounded-2xl p-4 ${s.border}`}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${s.color}`}>{s.label}</h3>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-md font-bold ${s.bg} ${s.color} border ${s.border}`}>
                    {items.length}
                  </span>
                </div>

                {/* Assignment cards */}
                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-3 italic">No assignments</p>
                  ) : (
                    items.map(a => {
                      const d = daysUntil(a.due_date);
                      return (
                        <div key={a.id}
                          className="bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl p-3 transition-all duration-200 group">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{TYPE_ICONS[a.type]} {a.title}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: a.course_color }}>{a.course}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0
                              ${d < 0 ? "bg-red-500/20 text-red-300"
                              : d === 0 ? "bg-red-500/20 text-red-300"
                              : d <= 2 ? "bg-amber-500/20 text-amber-300"
                              : "bg-white/5 text-gray-500"}`}>
                              {d < 0 ? `${Math.abs(d)}d ago` : d === 0 ? "Today" : d === 1 ? "Tmrw" : `${d}d`}
                            </span>
                          </div>
                          {/* Quick status change */}
                          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {(Object.keys(STATUS_CONFIG) as AssignmentStatus[])
                              .filter(st => st !== status)
                              .map(st => (
                                <button key={st}
                                  onClick={() => updateStatus(a.id, st)}
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium transition-all duration-150 hover:scale-105
                                    ${STATUS_CONFIG[st].bg} ${STATUS_CONFIG[st].border} ${STATUS_CONFIG[st].color}`}>
                                  {STATUS_CONFIG[st].label.split(" ")[0]}
                                </button>
                              ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>
    </div>
  );
}
