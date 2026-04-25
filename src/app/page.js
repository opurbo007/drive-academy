"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  getSideLabel,
  getSideMeta,
  normalizeSide,
  SIDE_OPTIONS,
} from "@/lib/sides";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(str) {
  const date = new Date(`${str}T00:00:00`);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function normalizeStatus(value) {
  return typeof value === "boolean" ? value : null;
}

function withSide(path, side) {
  return `${path}?side=${side}`;
}

function getNextStudentId(students, attendance) {
  return (
    students.find(
      (student) => normalizeStatus(attendance[student.studentId]) === null,
    )?._id || null
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const side = normalizeSide(searchParams.get("side"));

  if (!side) {
    return <SideChooser />;
  }

  return <AttendanceBoard side={side} />;
}

function SideChooser() {
  return (
    <div className="fade-in space-y-4">
      <div
        className="mobile-card px-5 py-5 relative overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: "3px solid var(--accent)",
        }}
      >
        {/* <div className="font-condensed font-black text-3xl tracking-[0.18em] uppercase mb-2" style={{ color: 'var(--accent)' }}>
          Home
        </div> */}
        <div
          className="text-sm leading-6 max-w-xs"
          style={{ color: "var(--muted)" }}
        >
          Choose a side to open the same student flow. Each side has its own
          separate captain access.
        </div>
      </div>

      {SIDE_OPTIONS.map((option) => (
        <div
          key={option.key}
          className="mobile-card p-5 relative overflow-hidden"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="absolute inset-y-0 right-0 w-28 opacity-10"
            style={{
              background: `linear-gradient(180deg, ${option.accent}, transparent)`,
            }}
          />
          <div className="relative z-10">
            <div
              className="font-condensed font-black text-2xl tracking-[0.16em] uppercase"
              style={{ color: option.accent }}
            >
              {option.label} sir
            </div>
            <div
              className="text-xs tracking-[0.24em] uppercase mt-1"
              style={{ color: "var(--muted)" }}
            >
              Only for students of {option.label} sir.
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link
                href={withSide("/", option.key)}
                className="text-center font-condensed font-black text-sm tracking-widest uppercase px-4 py-3"
                style={{ background: option.accent, color: "#000" }}
              >
                Student
              </Link>
              <Link
                href={withSide("/login", option.key)}
                className="text-center font-condensed font-bold text-sm tracking-widest uppercase px-4 py-3"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                Captain
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AttendanceBoard({ side }) {
  const { isAdmin, user, authFetch } = useAuth();
  const sideMeta = getSideMeta(side);
  const [date] = useState(todayStr);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [checkup, setCheckup] = useState({
    groups: [],
    currentGroup: [],
    currentIndex: 0,
  });
  const [isOffDay, setIsOffDay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const canManage = isAdmin && user?.side === side;

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, attendanceRes, checkupRes] = await Promise.all([
        fetch(`/api/students?date=${date}&side=${side}`),
        fetch(`/api/attendance?date=${date}&side=${side}`),
        fetch(`/api/checkup?date=${date}&side=${side}`),
      ]);
      const studentsData = await studentsRes.json();
      const attendanceData = await attendanceRes.json();
      const checkupData = await checkupRes.json();
      if (!studentsRes.ok)
        throw new Error(studentsData.error || "Failed to load students");
      if (!attendanceRes.ok)
        throw new Error(attendanceData.error || "Failed to load attendance");
      if (!checkupRes.ok)
        throw new Error(checkupData.error || "Failed to load checkup");
      setStudents(studentsData.students || []);
      setIsOffDay(studentsData.isOffDay || false);
      setAttendance(attendanceData.attendance || {});
      setCheckup(checkupData);
      setLastUpdated(new Date());
      setError("");
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [date, side]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const setAttendanceStatus = async (studentId, nextStatus) => {
    if (!canManage || isOffDay) return;
    setMarkingId(studentId);
    try {
      const response = await authFetch(`/api/attendance/mark?side=${side}`, {
        method: "POST",
        body: JSON.stringify({ date, studentId, present: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update");

      setAttendance((prev) => {
        const next = { ...prev };
        if (nextStatus === null) delete next[studentId];
        else next[studentId] = nextStatus;
        return next;
      });
    } catch (requestError) {
      setError(requestError.message || "Failed to update");
      setTimeout(() => setError(""), 3000);
    } finally {
      setMarkingId(null);
    }
  };

  const markAll = async (present) => {
    if (!canManage || isOffDay) return;
    try {
      const studentIds = students.map((student) => student.studentId);
      const response = await authFetch(
        `/api/attendance/mark-all?side=${side}`,
        {
          method: "POST",
          body: JSON.stringify({ date, studentIds, present }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update");

      const nextAttendance = {};
      studentIds.forEach((studentId) => {
        nextAttendance[studentId] = present;
      });
      setAttendance(nextAttendance);
    } catch (requestError) {
      setError(requestError.message || "Failed to update");
      setTimeout(() => setError(""), 3000);
    }
  };

  const presentCount = students.filter(
    (student) => normalizeStatus(attendance[student.studentId]) === true,
  ).length;
  const absentCount = students.filter(
    (student) => normalizeStatus(attendance[student.studentId]) === false,
  ).length;
  const unmarkedCount = students.length - presentCount - absentCount;
  const dayName = DAY_NAMES[new Date(`${date}T00:00:00`).getDay()];
  const nextStudentId = getNextStudentId(students, attendance);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="font-condensed text-sm tracking-widest uppercase animate-pulse"
          style={{ color: "var(--muted)" }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-4">
      <div
        className="mobile-card px-5 py-5 relative overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: `3px solid ${sideMeta.accent}`,
        }}
      >
        <div
          className="absolute -right-10 -top-8 h-28 w-28 rounded-full opacity-20"
          style={{ background: sideMeta.accent, filter: "blur(28px)" }}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className="font-condensed font-black text-xs tracking-[0.3em] uppercase"
                style={{ color: "var(--muted)" }}
              >
                {getSideLabel(side)}
              </div>
              <div
                className="font-condensed font-black text-3xl uppercase tracking-[0.14em]"
                style={{ color: sideMeta.accent }}
              >
                {dayName}
              </div>
              <div
                className="font-condensed text-base font-bold tracking-[0.12em] uppercase"
                style={{ color: "var(--text)" }}
              >
                {formatDate(date)}
              </div>
            </div>
            <span
              className="inline-flex h-fit font-condensed font-bold text-[11px] tracking-[0.24em] uppercase px-3 py-2"
              style={{
                border: `1px solid ${isOffDay ? "rgba(224,60,60,0.4)" : "rgba(34,197,94,0.4)"}`,
                background: isOffDay
                  ? "rgba(224,60,60,0.08)"
                  : "rgba(34,197,94,0.08)",
                color: isOffDay ? "var(--accent2)" : "var(--green)",
              }}
            >
              {isOffDay ? "Off" : "Open"}
            </span>
          </div>

          {lastUpdated && (
            <div
              className="text-[11px] mt-3 tracking-[0.22em] uppercase"
              style={{ color: "var(--muted)" }}
            >
              Refreshed {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {error && <Banner text={error} />}

      {students.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <StatChip label="P" value={presentCount} color="var(--green)" />
          <StatChip label="A" value={absentCount} color="var(--accent2)" />
          <StatChip label="B" value={unmarkedCount} color="var(--muted)" />
          <StatChip label="T" value={students.length} color="var(--text)" />
        </div>
      )}

      {canManage && !isOffDay && (
        <div className="grid grid-cols-2 gap-2">
          <ActionBtn
            onClick={() => markAll(true)}
            label="All P"
            color="var(--green)"
          />
          <ActionBtn
            onClick={() => markAll(false)}
            label="All A"
            color="var(--accent2)"
          />
        </div>
      )}

      {isOffDay && (
        <div
          className="mobile-card px-4 py-4 text-sm font-medium"
          style={{
            background: "rgba(224,60,60,0.07)",
            border: "1px solid rgba(224,60,60,0.25)",
            color: "var(--accent2)",
          }}
        >
          Off day. Attendance cannot be marked.
        </div>
      )}

      <div className="space-y-3">
        <div
          className="mobile-card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {students.map((student, index) => {
            const status = normalizeStatus(attendance[student.studentId]);
            const isCurrent = nextStudentId === student._id;
            const isMarking = markingId === student.studentId;
            const order = index + 1;

            return (
              <div
                key={student._id}
                className="student-row px-4 py-3 flex items-center gap-3"
                style={{
                  borderTop: index > 0 ? "1px solid var(--border)" : "none",
                  borderLeft: isCurrent
                    ? `3px solid ${sideMeta.accent}`
                    : "3px solid transparent",
                  background:
                    status === true
                      ? "rgba(34,197,94,0.04)"
                      : status === false
                        ? "rgba(224,60,60,0.04)"
                        : "transparent",
                }}
              >
                <div
                  className="font-condensed font-black text-xl leading-none shrink-0"
                  style={{
                    color: isCurrent ? sideMeta.accent : "var(--muted)",
                  }}
                >
                  {String(order).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm"
                    style={{
                      color: "var(--text)",
                      fontWeight: isCurrent ? 700 : 400,
                    }}
                  >
                    {student.name}
                  </div>
                  <div
                    className="mt-1 text-[11px] uppercase tracking-[0.2em]"
                    style={{ color: "var(--muted)" }}
                  >
                    {student.studentId}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canManage ? (
                    <div className="flex gap-1">
                      <StatusBtn
                        label="P"
                        active={status === true}
                        disabled={isOffDay || isMarking}
                        onClick={() =>
                          setAttendanceStatus(
                            student.studentId,
                            status === true ? null : true,
                          )
                        }
                      />
                      <StatusBtn
                        label="A"
                        active={status === false}
                        tone="danger"
                        disabled={isOffDay || isMarking}
                        onClick={() =>
                          setAttendanceStatus(
                            student.studentId,
                            status === false ? null : false,
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!canManage && (
        <div
          className="text-center font-condensed text-xs tracking-[0.24em] uppercase px-2"
          style={{ color: "var(--muted)" }}
        >
          View only. {getSideLabel(side)} captain login is required to mark
          attendance.
        </div>
      )}
    </div>
  );
}

function Banner({ text }) {
  return (
    <div
      className="mobile-card px-4 py-3 text-sm"
      style={{
        background: "rgba(224,60,60,0.1)",
        border: "1px solid rgba(224,60,60,0.3)",
        color: "var(--accent2)",
      }}
    >
      {text}
    </div>
  );
}

function StatChip({ label, value, color }) {
  return (
    <div
      className="mobile-card flex flex-col items-center justify-center px-2 py-3 font-condensed font-bold text-[11px] tracking-[0.22em] uppercase"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--muted)",
      }}
    >
      <span>{label}</span>
      <span className="text-lg mt-1" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function ActionBtn({ onClick, label, color }) {
  return (
    <button
      onClick={onClick}
      className="mobile-card font-condensed font-bold text-xs tracking-[0.24em] uppercase px-3 py-3 transition-all"
      style={{
        border: `1px solid ${color}`,
        color,
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function StatusBtn({
  label,
  active,
  onClick,
  disabled = false,
  tone = "success",
}) {
  const activeColor = tone === "danger" ? "var(--accent2)" : "var(--green)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-10 h-10 flex items-center justify-center font-condensed font-black text-xs transition-all rounded-2xl"
      style={{
        border: `1px solid ${active ? activeColor : "var(--border)"}`,
        color: active ? activeColor : "var(--muted)",
        background: active
          ? `${tone === "danger" ? "rgba(224,60,60,0.12)" : "rgba(34,197,94,0.12)"}`
          : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
