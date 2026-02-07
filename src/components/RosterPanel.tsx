"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLogo } from "@/components/AppLogo";
import { DEFAULT_TIMEZONE, formatTimeString, getDateKeyInTimeZone } from "@/lib/datetime";
import { useRehearsals } from "@/hooks/useRehearsals";
import { Rehearsal, RehearsalAttendance } from "@/types";

interface RosterStudent {
  signup_id: string;
  student_id: string;
  name: string;
  email: string;
  part_id: string | null;
  part_name: string | null;
}

interface StudentSummary {
  id: string;
  name: string;
  email: string | null;
}

interface RosterPanelProps {
  performanceId: string;
}

export function RosterPanel({ performanceId }: RosterPanelProps) {
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [pendingExisting, setPendingExisting] = useState<StudentSummary[]>([]);
  const [allStudents, setAllStudents] = useState<StudentSummary[]>([]);
  const [attendance, setAttendance] = useState<RehearsalAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [performanceDate, setPerformanceDate] = useState<string>("");

  const { rehearsals } = useRehearsals(performanceId);

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/performances/${performanceId}/roster`);
      if (!response.ok) throw new Error("Failed to fetch roster");
      const data = await response.json();
      setRoster(data);
    } catch (err) {
      console.error("Error fetching roster:", err);
      setError(err instanceof Error ? err.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, [performanceId]);

  const fetchAttendance = useCallback(async () => {
    if (!performanceId) return;
    try {
      setAttendanceLoading(true);
      const response = await fetch(`/api/rehearsal-attendance?performanceId=${performanceId}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Attendance fetch failed:", response.status, errorText);
        throw new Error("Failed to fetch attendance");
      }
      const data = await response.json();
      setAttendance(data);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setAttendanceLoading(false);
    }
  }, [performanceId]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (!performanceId) return;
      try {
        const res = await fetch(`/api/performances/${performanceId}`);
        if (!res.ok) return;
        const data = await res.json();
        setPerformanceDate(data?.date || "");
      } catch (err) {
        console.error("Error fetching performance date:", err);
      }
    };
    fetchPerformance();
  }, [performanceId]);

  const fetchAllStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students");
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setAllStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  }, []);

  useEffect(() => {
    if (!showAddForm) return;
    fetchAllStudents();
  }, [showAddForm, fetchAllStudents]);

  const handleRemoveStudent = async (signupId: string) => {
    try {
      const response = await fetch(`/api/signups/${signupId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove student");
      setRoster(roster.filter((s) => s.signup_id !== signupId));
    } catch (err) {
      console.error("Error removing student:", err);
      setError(err instanceof Error ? err.message : "Failed to remove student");
    }
  };

  const addPendingName = () => {
    const trimmed = newStudentName.trim();
    if (!trimmed) return;
    setPendingNames((prev) => [...prev, trimmed]);
    setNewStudentName("");
    setNewStudentEmail("");
  };

  const addPendingExisting = (student: StudentSummary) => {
    setPendingExisting((prev) => [...prev, student]);
    setNewStudentName("");
    setNewStudentEmail("");
  };

  const removePendingName = (index: number) => {
    setPendingNames((prev) => prev.filter((_, i) => i !== index));
  };

  const removePendingExisting = (studentId: string) => {
    setPendingExisting((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const queue =
      newStudentName.trim().length > 0
        ? [...pendingNames, newStudentName.trim()]
        : [...pendingNames];
    if (queue.length === 0 && pendingExisting.length === 0) {
      setError("Please enter at least one name");
      return;
    }

    setIsAdding(true);
    try {
      for (const student of pendingExisting) {
        const signupRes = await fetch("/api/signups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            performance_id: performanceId,
            student_id: student.id,
            status: "registered",
          }),
        });
        if (!signupRes.ok) throw new Error("Failed to add to roster");
      }

      for (const name of queue) {
        // Create or get student
        const studentRes = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email: newStudentEmail.trim() ? newStudentEmail.trim() : null,
          }),
        });
        if (!studentRes.ok) throw new Error("Failed to create student");
        const student = await studentRes.json();

        // Create signup
        const signupRes = await fetch("/api/signups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            performance_id: performanceId,
            student_id: student.id,
            status: "registered",
          }),
        });
        if (!signupRes.ok) throw new Error("Failed to add to roster");
      }

      setNewStudentName("");
      setNewStudentEmail("");
      setPendingNames([]);
      setPendingExisting([]);
      setShowAddForm(false);
      await fetchRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setIsAdding(false);
    }
  };

  const attendanceMap = useMemo(() => {
    const map = new Map<string, RehearsalAttendance>();
    for (const record of attendance) {
      map.set(`${record.rehearsal_id}:${record.student_id}`, record);
    }
    return map;
  }, [attendance]);

  const normalizeDateOnly = useCallback((value: string) => {
    if (!value) return "";
    return value.split("T")[0];
  }, []);

  const toLocalDate = useCallback(
    (value: string) => {
      const dateOnly = normalizeDateOnly(value);
      if (!dateOnly) return new Date(value);
      const [y, m, d] = dateOnly.split("-").map(Number);
      return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
    },
    [normalizeDateOnly]
  );

  const sortedRehearsals = useMemo(() => {
    return [...rehearsals].sort(
      (a, b) => toLocalDate(a.date).getTime() - toLocalDate(b.date).getTime()
    );
  }, [rehearsals, toLocalDate]);

  const isFutureRehearsal = (rehearsal: Rehearsal) => {
    const todayKey = getDateKeyInTimeZone(new Date().toISOString(), DEFAULT_TIMEZONE);
    const rehearsalKey = normalizeDateOnly(rehearsal.date);
    return rehearsalKey > todayKey;
  };

  const formatRehearsalDate = (date: string) => {
    const local = toLocalDate(date);
    return local.toLocaleDateString(undefined, {
      month: "numeric",
      day: "numeric",
      timeZone: DEFAULT_TIMEZONE,
    });
  };

  const rosterStudentIds = useMemo(() => {
    return new Set(roster.map((student) => student.student_id));
  }, [roster]);

  const pendingExistingIds = useMemo(() => {
    return new Set(pendingExisting.map((student) => student.id));
  }, [pendingExisting]);

  const nameSuggestions = useMemo(() => {
    const query = newStudentName.trim().toLowerCase();
    if (!query) return [];
    return allStudents
      .filter((student) => {
        if (rosterStudentIds.has(student.id)) return false;
        if (pendingExistingIds.has(student.id)) return false;
        return student.name.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [allStudents, newStudentName, rosterStudentIds, pendingExistingIds]);

  const toggleAttendance = async (rehearsalId: string, studentId: string, isFuture: boolean) => {
    if (isFuture) return;
    const key = `${rehearsalId}:${studentId}`;
    const current = attendanceMap.get(key);
    try {
      if (!current) {
        const response = await fetch("/api/rehearsal-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rehearsal_id: rehearsalId, student_id: studentId, status: "present" }),
        });
        if (!response.ok) throw new Error("Failed to save attendance");
        const saved = await response.json();
        setAttendance((prev) => [...prev, saved]);
        return;
      }

      if (current.status === "present") {
        const response = await fetch("/api/rehearsal-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rehearsal_id: rehearsalId, student_id: studentId, status: "absent" }),
        });
        if (!response.ok) throw new Error("Failed to save attendance");
        const saved = await response.json();
        setAttendance((prev) =>
          prev.map((record) => (record.id === saved.id ? saved : record))
        );
        return;
      }

      const response = await fetch(
        `/api/rehearsal-attendance?rehearsalId=${rehearsalId}&studentId=${studentId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to clear attendance");
      setAttendance((prev) =>
        prev.filter((record) => !(record.rehearsal_id === rehearsalId && record.student_id === studentId))
      );
    } catch (err) {
      console.error("Error updating attendance:", err);
      setError(err instanceof Error ? err.message : "Failed to update attendance");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading roster...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <AppLogo size={22} className="border border-gray-200 bg-white text-gray-400" />
            <h3 className="font-semibold text-gray-900">
              Roster ({roster.length})
            </h3>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            {showAddForm ? "Cancel" : "+ Add"}
          </button>
        </div>
        {sortedRehearsals.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-gray-600">
            <span>Attendance:</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-green-500 inline-block" />
              Present
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-red-500 inline-block" />
              Missed
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-gray-300 inline-block" />
              Pending
            </span>
            <span className="text-gray-500">Click boxes to toggle.</span>
          </div>
        )}

        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleAddStudent} className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <div className="relative">
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const exactMatch = nameSuggestions.find(
                      (student) => student.name.toLowerCase() === newStudentName.trim().toLowerCase()
                    );
                    if (exactMatch) {
                      addPendingExisting(exactMatch);
                      return;
                    }
                    addPendingName();
                  }
                }}
                placeholder="Name (press Enter to add)"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
              {nameSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow-sm text-sm">
                  {nameSuggestions.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => addPendingExisting(student)}
                      className="w-full text-left px-2 py-1 hover:bg-blue-50"
                    >
                      <span className="font-medium text-gray-900">{student.name}</span>
                      {student.email && <span className="text-gray-500"> • {student.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="email"
              value={newStudentEmail}
              onChange={(e) => setNewStudentEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
            {(pendingNames.length > 0 || pendingExisting.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {pendingExisting.map((student) => (
                  <span
                    key={student.id}
                    className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-800 px-2 py-1 rounded text-xs"
                  >
                    {student.name}
                    <button
                      type="button"
                      onClick={() => removePendingExisting(student.id)}
                      className="text-green-800 hover:text-green-900"
                      aria-label={`Remove ${student.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {pendingNames.map((name, index) => (
                  <span
                    key={`${name}-${index}`}
                    className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded text-xs"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removePendingName(index)}
                      className="text-blue-700 hover:text-blue-900"
                      aria-label={`Remove ${name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              type="submit"
              disabled={isAdding}
              className="w-full px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isAdding ? "Adding..." : "Add to Roster"}
            </button>
          </form>
        )}

        {roster.length === 0 ? (
          <p className="text-gray-500 text-sm">No students registered yet</p>
        ) : (
          <div className="space-y-2">
            {roster.map((student) => (
              <div
                key={student.signup_id}
                className="bg-gray-50 p-2 rounded-md border border-gray-200 flex justify-between items-start group"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-xs">{student.name}</p>
                  {student.email && (
                    <p className="text-gray-600 text-[10px]">{student.email}</p>
                  )}
                  {student.part_name && (
                    <div className="mt-1">
                      <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium">
                        {student.part_name}
                      </span>
                    </div>
                  )}
                  {sortedRehearsals.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {performanceDate && (
                        <div
                          title={`Performance â€¢ ${formatRehearsalDate(performanceDate)} ET`}
                          className="h-7 w-9 border bg-gray-200 text-gray-700 border-gray-300 text-[9px] leading-tight rounded flex flex-col items-center justify-center font-semibold opacity-90"
                        >
                          <span>{formatRehearsalDate(performanceDate)}</span>
                          <span>P</span>
                        </div>
                      )}
                      {sortedRehearsals.map((rehearsal) => {
                        const record = attendanceMap.get(`${rehearsal.id}:${student.student_id}`);
                        const isFuture = isFutureRehearsal(rehearsal);
                        const status = record?.status ?? "pending";
                        const colorClass =
                          status === "present"
                            ? "bg-green-500 text-white border-green-600"
                            : status === "absent"
                              ? "bg-red-500 text-white border-red-600"
                              : "bg-gray-300 text-gray-700 border-gray-400";
                        return (
                          <button
                            key={rehearsal.id}
                            type="button"
                            onClick={() => toggleAttendance(rehearsal.id, student.student_id, isFuture)}
                            disabled={attendanceLoading}
                            title={`${rehearsal.title} • ${formatRehearsalDate(rehearsal.date)} ${formatTimeString(rehearsal.time)} ET`}
                            className={`h-7 w-9 border text-[9px] leading-tight rounded flex flex-col items-center justify-center font-semibold ${colorClass} ${isFuture ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"}`}
                          >
                            <span>{formatRehearsalDate(rehearsal.date)}</span>
                            <span>R</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveStudent(student.signup_id)}
                  className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity"
                  title="Remove from roster"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
