"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { usePerformances } from "@/hooks/usePerformances";
import { StudentPositioningView } from "@/components/StudentPositioningView";
import { AppBrand } from "@/components/AppBrand";
import { ScheduleView } from "@/components/ScheduleView";
import { formatDisplayDateTime, formatTimeString, getDateKeyInTimeZone } from "@/lib/datetime";

export default function StudentSignup() {
  const [activeTab, setActiveTab] = useState<"browse" | "mySignups" | "schedule">(
    "browse"
  );
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string | null>(null);
  const { performances, loading } = usePerformances();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-green-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <AppBrand href="/" />
          <div className="flex gap-4">
            <Link href="/" className="hover:bg-green-800 px-3 py-2 rounded">
              Home
            </Link>
            <span className="px-3 py-2 bg-green-800 rounded">Student Signup</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Performances
          </h1>
          <p className="text-gray-600">
            View performance details, upcoming rehearsals, and uniform information.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "browse"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            Browse Performances
          </button>
          <button
            onClick={() => setActiveTab("mySignups")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "mySignups"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            My Sign-ups
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "schedule"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            Schedule
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {activeTab === "browse" && (
            <BrowsePerformances
              performances={performances}
              loading={loading}
              selectedPerformanceId={selectedPerformanceId}
              onSelectPerformance={setSelectedPerformanceId}
            />
          )}
          {activeTab === "mySignups" && <MySignups />}
          {activeTab === "schedule" && <ScheduleView title="Performance Schedule" accent="green" />}
        </div>
      </div>
    </div>
  );
}

interface BrowsePerformancesProps {
  performances: any[];
  loading: boolean;
  selectedPerformanceId: string | null;
  onSelectPerformance: (id: string | null) => void;
}

function BrowsePerformances({
  performances,
  loading,
  selectedPerformanceId,
  onSelectPerformance,
}: BrowsePerformancesProps) {
  const [error, setError] = useState<string | null>(null);
  const [performanceDetails, setPerformanceDetails] = useState<any>(null);
  const [uniformInfo, setUniformInfo] = useState<
    Array<{ item_number: string; type_name: string; status: string; student_name?: string | null }>
  >([]);
  const [uniformLoading, setUniformLoading] = useState(false);

  useEffect(() => {
    if (selectedPerformanceId) {
      fetchPerformanceDetails(selectedPerformanceId);
    }
  }, [selectedPerformanceId]);

  const fetchPerformanceDetails = async (perfId: string) => {
    try {
      const response = await fetch(`/api/performances/${perfId}`);
      if (!response.ok) throw new Error("Failed to fetch details");
      const data = await response.json();
      setPerformanceDetails(data);
      setError(null);

      setUniformLoading(true);
      try {
        const [itemsRes, typesRes] = await Promise.all([
          fetch("/api/uniform-items"),
          fetch("/api/uniform-types"),
        ]);
        const items = await itemsRes.json();
        const types = await typesRes.json();
        const typeMap = new Map(
          (Array.isArray(types) ? types : []).map((t: any) => [t.id, t.name])
        );
        const assigned: Array<{
          item_number: string;
          type_name: string;
          status: string;
          student_name?: string | null;
        }> = [];
        (Array.isArray(items) ? items : []).forEach((item: any) => {
          const typeName = typeMap.get(item.uniform_type_id) || "Uniform";
          const assignments = Array.isArray(item.uniform_assignments)
            ? item.uniform_assignments
            : [];
          assignments
            .filter((assignment: any) => assignment.performance_id === perfId)
            .forEach((assignment: any) => {
              assigned.push({
                item_number: item.item_number,
                type_name: typeName,
                status: assignment.returned_at ? "Returned" : "Assigned",
                student_name: assignment.student_name || null,
              });
            });
        });
        setUniformInfo(assigned);
      } catch (err) {
        console.warn("Failed to load uniform info:", err);
        setUniformInfo([]);
      } finally {
        setUniformLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setPerformanceDetails(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading performances...</div>;
  }

  if (performances.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No performances available at the moment.</p>
        <p className="text-gray-500 text-sm">Check back soon for upcoming events!</p>
      </div>
    );
  }

  const todayKey = getDateKeyInTimeZone(
    new Date().toISOString(),
    "America/New_York"
  );
return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Available Performances</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performances List */}
        <div className="space-y-3">
          {performances.map((perf) => {
            const perfKey = perf?.date
              ? getDateKeyInTimeZone(perf.date, perf.timezone || "America/New_York")
              : "";
            const isUpcoming = perfKey && todayKey ? perfKey >= todayKey : true;

            return (
              <button
                key={perf.id}
                onClick={() => onSelectPerformance(perf.id)}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  selectedPerformanceId === perf.id
                    ? "border-green-600 bg-green-50"
                    : "border-gray-200 hover:border-green-400"
                } ${isUpcoming ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{perf.title}</h3>
                  {isUpcoming ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                      {formatDisplayDateTime(
                        perf.date,
                        perf.timezone || "America/New_York"
                      )}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                      {formatDisplayDateTime(
                        perf.date,
                        perf.timezone || "America/New_York"
                      )}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <div>📍 {perf.location}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Performance Info */}
        <div>
          {selectedPerformanceId ? (
            <div className="p-6 bg-gray-50 rounded-lg border-2 border-green-200 space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Performance Information</h3>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {performanceDetails && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Performance Date</div>
                    <div className="font-semibold text-gray-900">
                      {formatDisplayDateTime(
                        performanceDetails.date,
                        performanceDetails.timezone || "America/New_York"
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="font-semibold text-gray-900">
                      {performanceDetails.location || "N/A"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500">Contact</div>
                    <div className="font-semibold text-gray-900">
                      {Array.isArray(performanceDetails.phone_numbers)
                        ? performanceDetails.phone_numbers.join(", ")
                        : performanceDetails.phone_numbers || "N/A"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500">Upcoming Rehearsals</div>
                    {Array.isArray(performanceDetails.rehearsals) &&
                    performanceDetails.rehearsals.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {performanceDetails.rehearsals.map((reh: any) => {
                          const rehKey = reh.date
                            ? getDateKeyInTimeZone(
                                reh.date,
                                performanceDetails.timezone || "America/New_York"
                              )
                            : "";
                          const todayKey = getDateKeyInTimeZone(
                            new Date().toISOString(),
                            "America/New_York"
                          );
                          const isUpcoming = rehKey && todayKey ? rehKey >= todayKey : true;
                          return (
                            <span
                              key={reh.id}
                              className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                                isUpcoming
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : "bg-gray-100 text-gray-500 border-gray-200"
                              }`}
                            >
                              {reh.date
                                ? formatDisplayDateTime(
                                    reh.date,
                                    performanceDetails.timezone || "America/New_York"
                                  )
                                : "Date TBD"}
                              {reh.time ? ` • ${formatTimeString(reh.time)} ET` : ""}
                              {reh.location ? ` • ${reh.location}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 mt-2">No rehearsals scheduled yet.</div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm text-gray-500">Uniform Info</div>
                    {uniformLoading ? (
                      <div className="text-sm text-gray-600 mt-2">Loading uniform info...</div>
                    ) : uniformInfo.length > 0 ? (
                      <div className="mt-2 space-y-2 text-sm text-gray-700">
                        {uniformInfo.map((item, idx) => (
                          <div key={`${item.item_number}-${idx}`}>
                            {item.type_name} {item.item_number} • {item.status}
                            {item.student_name ? ` (Assigned to ${item.student_name})` : ""}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 mt-2">
                        No uniforms assigned for this performance yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-600">
              <p>Select a performance to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MySignupsProps {}

function MySignups({}: MySignupsProps) {
  const [studentName, setStudentName] = useState("");
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [matchingStudents, setMatchingStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeStudentNames, setActiveStudentNames] = useState<string[]>([]);

  const loadSignups = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const query = studentName.trim().toLowerCase();
      const matches = allStudents.filter((s: any) => s.name.toLowerCase().includes(query));
      const exact = allStudents.find((s: any) => s.name.toLowerCase() === query);
      const studentsToUse = showAllMatches
        ? matches
        : selectedStudentId
          ? allStudents.filter((s: any) => s.id === selectedStudentId)
          : exact
            ? [exact]
            : matches.length === 1
              ? matches
              : [];

      if (studentsToUse.length === 0) {
        setError("Select a student from the suggestions or enable 'Show all matches'.");
        setSignups([]);
        setActiveStudentNames([]);
        return;
      }

      const signupsData = (
        await Promise.all(
          studentsToUse.map(async (student: any) => {
            const signupsRes = await fetch(`/api/signups?studentId=${student.id}`);
            const data = await signupsRes.json();
            return data || [];
          })
        )
      ).flat();

      const enriched = await Promise.all(
        signupsData.map(async (signup: any) => {
          const perfRes = await fetch(`/api/performances/${signup.performance_id}`);
          const perf = await perfRes.json();
          return { ...signup, performance: perf };
        })
      );

      setSignups(enriched);
      setActiveStudentNames(studentsToUse.map((s: any) => s.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch signups");
    } finally {
      setLoading(false);
    }
  }, [studentName, allStudents, showAllMatches, selectedStudentId]);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const studentsRes = await fetch("/api/students");
        const data = await studentsRes.json();
        setAllStudents(data || []);
      } catch {
        setAllStudents([]);
      }
    };
    loadStudents();
  }, []);

  useEffect(() => {
    const query = studentName.trim().toLowerCase();
    if (!query) {
      setMatchingStudents([]);
      setSelectedStudentId(null);
      return;
    }
    const matches = allStudents.filter((s: any) => s.name.toLowerCase().includes(query));
    setMatchingStudents(matches);
    if (matches.length === 1) {
      setSelectedStudentId(matches[0].id);
    }
  }, [studentName, allStudents]);

  useEffect(() => {
    if (!studentName.trim()) return;
    if (!searched) setSearched(true);
    loadSignups();
  }, [searched, studentName, selectedStudentId, showAllMatches, loadSignups]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);

    if (!studentName.trim()) {
      setError("Please enter your name");
      return;
    }
    await loadSignups();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">View Your Sign-ups</h2>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={studentName}
            onChange={(e) => {
              setStudentName(e.target.value);
              setSelectedStudentId(null);
            }}
            placeholder="Enter your full name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        {matchingStudents.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {matchingStudents.slice(0, 6).map((student: any) => (
              <label
                key={student.id}
                className={`px-3 py-1 rounded-full text-xs border cursor-pointer ${
                  selectedStudentId === student.id
                    ? "bg-green-600 text-white border-green-700"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
                onClick={() => {
                  setSelectedStudentId(student.id);
                  setSearched(true);
                }}
              >
                {student.name}
              </label>
            ))}
          </div>
        )}
        {matchingStudents.length > 1 && (
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showAllMatches}
              onChange={(e) => setShowAllMatches(e.target.checked)}
            />
            Show performances for all matching names
          </label>
        )}
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      {activeStudentNames.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Showing performances for:{" "}
          <span className="font-semibold text-gray-900">
            {activeStudentNames.join(", ")}
          </span>
        </div>
      )}

      {!searched ? (
        <div className="text-center py-12 text-gray-500">
          <p>Enter your name above to view your sign-ups</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : signups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">You haven&apos;t signed up for any performances yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {signups.map((signup) => (
            <SignupCard key={signup.id} signup={signup} studentName={studentName} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SignupCardProps {
  signup: any;
  studentName: string;
}

function SignupCard({ signup, studentName }: SignupCardProps) {
  const [positioning, setPositioning] = useState<any[]>([]);
  const [loadingPos, setLoadingPos] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showPositioningView, setShowPositioningView] = useState(false);
  const [assignedTimeLabel, setAssignedTimeLabel] = useState<string | null>(null);
  const [assignedSubpartLabel, setAssignedSubpartLabel] = useState<string | null>(null);
  const [assignedPartNote, setAssignedPartNote] = useState<string | null>(null);
  const [assignedSubpartNote, setAssignedSubpartNote] = useState<string | null>(null);
  const musicUrl = signup.performance?.music_file_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/performance-music/${signup.performance.music_file_path}`
    : "";

  const formatTimepoint = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return null;
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return null;
    const minutes = Math.floor(numeric / 60);
    const seconds = Math.floor(numeric % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const formatTimeRange = (
    start: number | string | null | undefined,
    end: number | string | null | undefined
  ) => {
    const startLabel = formatTimepoint(start);
    const endLabel = formatTimepoint(end);
    if (!startLabel && !endLabel) return null;
    if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
    return startLabel || endLabel;
  };

  const fetchPositioning = useCallback(async () => {
    try {
      setLoadingPos(true);
      setAssignedTimeLabel(null);
      setAssignedSubpartLabel(null);
      setAssignedPartNote(null);
      setAssignedSubpartNote(null);
      // Get all parts for this performance
      const perfRes = await fetch(`/api/performances/${signup.performance_id}`);
      const perf = await perfRes.json();

      if (!perf.parts || perf.parts.length === 0) {
        setPositioning([]);
        return;
      }

      const partMatch = signup.part_id
        ? (perf.parts || []).find((part: any) => part.id === signup.part_id)
        : null;

      let timeLabel = partMatch
        ? formatTimeRange(partMatch.timepoint_seconds, partMatch.timepoint_end_seconds)
        : null;
      let subpartLabel: string | null = null;

      let noteLookup: Array<{ part_id: string; subpart_id: string | null; note: string }> = [];
      try {
        const notesRes = await fetch(`/api/rehearse-notes?performanceId=${signup.performance_id}`);
        const notes = await notesRes.json();
        if (Array.isArray(notes)) {
          noteLookup = notes.map((item: any) => ({
            part_id: item.part_id,
            subpart_id: item.subpart_id ?? null,
            note: item.note,
          }));
        }
      } catch (noteErr) {
        console.warn("Failed to load rehearse notes:", noteErr);
      }

      if (partMatch) {
        const subRes = await fetch(`/api/subparts?partId=${partMatch.id}`);
        const subparts = await subRes.json();
        if (Array.isArray(subparts) && subparts.length > 0) {
          for (const sub of subparts) {
            const orderRes = await fetch(`/api/subpart-order?subpartId=${sub.id}`);
            const order = await orderRes.json();
            const matches = Array.isArray(order)
              ? order.some((item: any) => item.student_id === signup.student_id)
              : false;
            if (matches) {
              subpartLabel = sub.title || "Subpart";
              const subTime = formatTimeRange(sub.timepoint_seconds, sub.timepoint_end_seconds);
              if (subTime) timeLabel = subTime;
              const subNote = noteLookup.find(
                (item) => item.part_id === partMatch.id && item.subpart_id === sub.id
              );
              if (subNote?.note) setAssignedSubpartNote(subNote.note);
              break;
            }
          }
        }
        const partNote = noteLookup.find(
          (item) => item.part_id === partMatch.id && item.subpart_id === null
        );
        if (partNote?.note) setAssignedPartNote(partNote.note);
      }
      setAssignedTimeLabel(timeLabel);
      setAssignedSubpartLabel(subpartLabel);

      const resolveSubpartTimeForStudent = async (partId: string) => {
        try {
          const subRes = await fetch(`/api/subparts?partId=${partId}`);
          const subparts = await subRes.json();
          if (!Array.isArray(subparts) || subparts.length === 0) return null;
          for (const sub of subparts) {
            const orderRes = await fetch(`/api/subpart-order?subpartId=${sub.id}`);
            const order = await orderRes.json();
            const matches = Array.isArray(order)
              ? order.some((item: any) => item.student_id === signup.student_id)
              : false;
            if (matches) {
              return {
                title: sub.title || "Subpart",
                time: formatTimeRange(sub.timepoint_seconds, sub.timepoint_end_seconds),
              };
            }
          }
          return null;
        } catch (err) {
          console.warn("Failed to resolve subpart time:", err);
          return null;
        }
      };

      // Get positioning for each part
      const posData: any[] = [];
      for (const part of perf.parts) {
        const posRes = await fetch(`/api/stage-positions?partId=${part.id}`);
        const positions = await posRes.json();
        const isPositioned = positions.some(
          (p: any) => p.student_id === signup.student_id
        );
        const partTime = formatTimeRange(part.timepoint_seconds, part.timepoint_end_seconds);
        const subpartInfo = await resolveSubpartTimeForStudent(part.id);

        if (isPositioned) {
          const pos = positions.find((p: any) => p.student_id === signup.student_id);
          posData.push({
            part_name: part.name,
            x: pos.x,
            y: pos.y,
            positioned: true,
            part_time: partTime,
            subpart_time: subpartInfo?.time ?? null,
            subpart_title: subpartInfo?.title ?? null,
          });
        } else {
          posData.push({
            part_name: part.name,
            positioned: false,
            part_time: partTime,
            subpart_time: subpartInfo?.time ?? null,
            subpart_title: subpartInfo?.title ?? null,
          });
        }
      }
      setPositioning(posData);
    } catch (err) {
      console.error("Error fetching positioning:", err);
    } finally {
      setLoadingPos(false);
    }
  }, [signup.performance_id, signup.student_id]);

  useEffect(() => {
    fetchPositioning();
  }, [fetchPositioning]);

  if (showPositioningView) {
    return (
      <div className="border border-green-200 rounded-lg bg-white overflow-hidden">
        {/* Header with back button */}
        <div className="p-6 bg-green-50 border-b border-green-200 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900">
            {signup.performance?.title || "Performance"}
          </h3>
          <button
            onClick={() => setShowPositioningView(false)}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
          >
            ← Back to Signups
          </button>
        </div>
        {/* Positioning View */}
        <div className="p-6">
          <StudentPositioningView
            performanceId={signup.performance_id}
            studentId={signup.student_id}
            studentName={studentName}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-green-200 rounded-lg bg-green-50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 text-left hover:bg-green-100 transition-colors"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">
              Performance: {signup.performance?.title || "Unknown"}
            </h3>
            <div className="text-sm text-gray-600 mt-2">
              <div>📅 Date: {signup.performance?.date
                ? formatDisplayDateTime(signup.performance.date, signup.performance.timezone || "America/New_York")
                : "N/A"}</div>
              <div>📍 Location: {signup.performance?.location || "N/A"}</div>
              <div>
                Status: <span className="capitalize px-2 py-1 bg-green-200 rounded text-green-900 text-xs font-semibold">
                  {signup.status}
                </span>
              </div>
            </div>
          </div>
          <div className="text-2xl text-gray-600">
            {expanded ? "▼" : "▶"}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-green-200 p-6 bg-white">
          {signup.part && (
            <div className="mb-4 pb-4 border-b border-green-200">
              <span className="font-semibold text-gray-700">Signed Up For Part:</span>{" "}
              <span className="text-gray-600 font-medium">{signup.part}</span>
              {(assignedSubpartLabel || assignedTimeLabel) && (
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  {assignedSubpartLabel && (
                    <div>
                      Subpart: <span className="font-medium text-gray-800">{assignedSubpartLabel}</span>
                    </div>
                  )}
                  {assignedTimeLabel && (
                    <div>
                      Time: <span className="font-medium text-gray-800">{assignedTimeLabel}</span>
                    </div>
                  )}
                </div>
              )}
              {(assignedSubpartNote || assignedPartNote) && (
                <div className="mt-3 text-sm text-gray-600 space-y-2">
                  {assignedSubpartNote && (
                    <div>
                      Subpart Note:{" "}
                      <span className="font-medium text-gray-800">{assignedSubpartNote}</span>
                    </div>
                  )}
                  {assignedPartNote && (
                    <div>
                      Part Note: <span className="font-medium text-gray-800">{assignedPartNote}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Positioning Info */}
          {positioning.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Your Positioning for Each Part:</h4>
              <div className="space-y-2 mb-4">
                {positioning.map((pos, idx) => (
                  <div key={idx} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{pos.part_name}:</span>
                      {pos.part_time && (
                        <span className="text-xs font-semibold text-gray-700">
                          Time: {pos.part_time}
                        </span>
                      )}
                      {pos.subpart_time && (
                        <span className="text-xs font-semibold text-blue-700">
                          {pos.subpart_title || "Subpart"}: {pos.subpart_time}
                        </span>
                      )}
                    </div>{" "}
                    {pos.positioned ? (
                      <span className="text-green-700 font-semibold">
                        ✓ Grid position ({pos.x}, {pos.y})
                      </span>
                    ) : (
                      <span className="text-gray-500">Not positioned yet</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowPositioningView(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                >
                  View Positioning Grid →
                </button>
                <button
                  onClick={() => {
                    const url = `/api/rehearse-export?performanceId=${signup.performance_id}&embedAudio=1`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
                >
                  Open Rehearse Mode
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Note: Rehearse Mode downloads an HTML file and should be run on a computer.
              </div>
            </div>
          )}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h4 className="font-semibold text-gray-700 mb-2">Music</h4>
            {musicUrl ? (
              <audio controls className="w-full">
                <source src={musicUrl} />
              </audio>
            ) : (
              <div className="text-sm text-gray-500">No music uploaded for this performance yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}





