"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MusicPlayer } from "@/components/MusicPlayer";
import { AppLogo } from "@/components/AppLogo";

interface PartItem {
  id: string;
  name: string;
  description?: string;
  order: number;
  timepoint_seconds?: number | null;
  timepoint_end_seconds?: number | null;
}

interface PositionEntry {
  student_id: string;
  student_name: string;
  x: number;
  y: number;
}

interface SubpartItem {
  id: string;
  part_id: string;
  title: string;
  description?: string | null;
  timepoint_seconds?: number | null;
  timepoint_end_seconds?: number | null;
}

interface RehearseOverlayProps {
  performanceId: string;
  parts: PartItem[];
  musicUrl?: string | null;
  onClose: () => void;
}

const GRID_COLS = 12;
const GRID_ROWS = 8;
const CELL_SIZE = 68;

function getInitials(name: string) {
  if (!name) return "?";
  const chunks = name.trim().split(/\s+/);
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return (chunks[0][0] + chunks[chunks.length - 1][0]).toUpperCase();
}

export function RehearseOverlay({ performanceId, parts, musicUrl, onClose }: RehearseOverlayProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [positionsByPart, setPositionsByPart] = useState<Record<string, PositionEntry[]>>({});
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [ringEnabled, setRingEnabled] = useState(true);
  const [subpartsByPart, setSubpartsByPart] = useState<Record<string, SubpartItem[]>>({});
  const [subpartAssignments, setSubpartAssignments] = useState<Record<string, string[]>>({});
  const [subpartHasPositions, setSubpartHasPositions] = useState<Record<string, boolean>>({});
  const [personFilter, setPersonFilter] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownTargetTime, setCountdownTargetTime] = useState<number | null>(null);
  const [countdownTargetPartId, setCountdownTargetPartId] = useState<string | null>(null);
  const [callTime, setCallTime] = useState<string>("");
  const [stageOrientation, setStageOrientation] = useState<FrontDirection>("bottom");
  const [flashSubpartId, setFlashSubpartId] = useState<string | null>(null);
  const [currentSubpartId, setCurrentSubpartId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevTimeToNextRef = useRef<number | null>(null);
  const lastFlashRef = useRef<string | null>(null);

  const orderedParts = useMemo(() => {
    return [...parts].sort((a, b) => {
      const aTime = typeof a.timepoint_seconds === "number" ? a.timepoint_seconds : Number.POSITIVE_INFINITY;
      const bTime = typeof b.timepoint_seconds === "number" ? b.timepoint_seconds : Number.POSITIVE_INFINITY;
      if (aTime === bTime) return (a.order || 0) - (b.order || 0);
      return aTime - bTime;
    });
  }, [parts]);

  const timepointParts = useMemo(() => {
    return orderedParts.filter((p) => typeof p.timepoint_seconds === "number");
  }, [orderedParts]);

  const currentIndex = useMemo(() => {
    if (timepointParts.length === 0) return -1;
    let idx = 0;
    for (let i = 0; i < timepointParts.length; i++) {
      const start = timepointParts[i].timepoint_seconds || 0;
      const end = timepointParts[i].timepoint_end_seconds;
      if (currentTime >= start && (end === null || end === undefined || currentTime < end)) {
        idx = i;
      } else if (currentTime >= start) {
        idx = i;
      }
    }
    return idx;
  }, [timepointParts, currentTime]);

  const currentPart = currentIndex >= 0 ? timepointParts[currentIndex] : null;
  const nextPart = currentIndex >= 0 ? timepointParts[currentIndex + 1] : null;
  const timeToNext = nextPart ? Math.max(0, (nextPart.timepoint_seconds || 0) - currentTime) : null;

  const formatTime = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "--:--";
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const allPeople = useMemo(() => {
    const names = new Set<string>();
    Object.values(positionsByPart).forEach((list) => {
      list.forEach((p) => names.add(p.student_name || "Unknown"));
    });
    Object.values(subpartAssignments).forEach((list) => {
      list.forEach((name) => names.add(name || "Unknown"));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [positionsByPart, subpartAssignments]);

  const filteredParts = useMemo(() => {
    if (!personFilter) return orderedParts;
    return orderedParts.filter((part) => {
      const posNames = (positionsByPart[part.id] || []).map((p) => p.student_name);
      if (posNames.includes(personFilter)) return true;
      const subparts = subpartsByPart[part.id] || [];
      return subparts.some((sub) => (subpartAssignments[sub.id] || []).includes(personFilter));
    });
  }, [orderedParts, personFilter, positionsByPart, subpartsByPart, subpartAssignments]);

  const playRing = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      gain.connect(ctx.destination);

      const beep = (start: number) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 880;
        osc.connect(gain);
        osc.start(start);
        osc.stop(start + 0.18);
      };

      const now = ctx.currentTime;
      beep(now);
      beep(now + 0.35);
      beep(now + 0.7);
      setTimeout(() => ctx.close(), 1200);
    } catch {
      // ignore audio errors
    }
  };

  const playBeep = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = 0.3;
      gain.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(gain);
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + 0.15);
      setTimeout(() => ctx.close(), 300);
    } catch {
      // ignore
    }
  };

  const startJumpCountdown = (targetTime: number, partId: string) => {
    if (!audioRef.current) return;
    setCountdownTargetTime(targetTime);
    setCountdownTargetPartId(partId);
    setCountdown(5);
    playBeep();
    let tick = 5;
    const interval = setInterval(() => {
      tick -= 1;
      if (tick <= 0) {
        clearInterval(interval);
        setCountdown(null);
        setCountdownTargetTime(null);
        setCountdownTargetPartId(null);
        audioRef.current!.currentTime = targetTime;
        audioRef.current!.play();
        return;
      }
      setCountdown(tick);
      playBeep();
    }, 1000);
  };

  useEffect(() => {
    if (!ringEnabled) {
      prevTimeToNextRef.current = timeToNext;
      return;
    }
    if (timeToNext === null) {
      prevTimeToNextRef.current = timeToNext;
      return;
    }
    const prev = prevTimeToNextRef.current;
    if ((prev === null || prev > 10) && timeToNext <= 10) {
      playRing();
    }
    prevTimeToNextRef.current = timeToNext;
  }, [timeToNext, ringEnabled]);


  useEffect(() => {
    const fetchPositions = async () => {
      setLoadingPositions(true);
      try {
        const entries = await Promise.all(
          parts.map(async (part) => {
            const res = await fetch(`/api/stage-positions?partId=${part.id}`);
            if (!res.ok) return [part.id, []] as const;
            const data = await res.json();
            const mapped = (data || []).map((p: any) => ({
              student_id: p.student_id,
              student_name: p.student_name || "Unknown",
              x: p.x,
              y: p.y,
            }));
            return [part.id, mapped] as const;
          })
        );
        const map: Record<string, PositionEntry[]> = {};
        entries.forEach(([partId, list]) => {
          map[partId] = list;
        });
        setPositionsByPart(map);
        const subpartsEntries = await Promise.all(
          parts.map(async (part) => {
            const res = await fetch(`/api/subparts?partId=${part.id}`);
            if (!res.ok) return [part.id, []] as const;
            const data = await res.json();
            const normalized = (data || []).map((item: any) => ({
              id: item.id,
              part_id: item.part_id,
              title: item.title,
              description: item.description ?? null,
              timepoint_seconds: item.timepoint_seconds ?? null,
              timepoint_end_seconds: item.timepoint_end_seconds ?? null,
            }));
            return [part.id, normalized] as const;
          })
        );
        const subpartsMap: Record<string, SubpartItem[]> = {};
        subpartsEntries.forEach(([partId, list]) => {
          subpartsMap[partId] = list;
        });
        setSubpartsByPart(subpartsMap);

        const allSubpartIds = subpartsEntries.flatMap(([, list]) => list.map((s) => s.id));
        const assignmentEntries = await Promise.all(
          allSubpartIds.map(async (subpartId) => {
            const res = await fetch(`/api/subpart-order?subpartId=${subpartId}`);
            if (!res.ok) return [subpartId, []] as const;
            const data = await res.json();
            const names = (data || []).map((item: any) => item.student_name || "Unknown");
            return [subpartId, names] as const;
          })
        );
        const assignmentMap: Record<string, string[]> = {};
        assignmentEntries.forEach(([subpartId, list]) => {
          assignmentMap[subpartId] = list;
        });
        setSubpartAssignments(assignmentMap);

        const subpartPositionsEntries = await Promise.all(
          allSubpartIds.map(async (subpartId) => {
            const res = await fetch(`/api/subpart-positions?subpartId=${subpartId}`);
            if (!res.ok) return [subpartId, false] as const;
            const data = await res.json();
            return [subpartId, Array.isArray(data) && data.length > 0] as const;
          })
        );
        const posMap: Record<string, boolean> = {};
        subpartPositionsEntries.forEach(([subpartId, hasPositions]) => {
          posMap[subpartId] = hasPositions;
        });
        setSubpartHasPositions(posMap);
      } finally {
        setLoadingPositions(false);
      }
    };

    fetchPositions();
  }, [parts, performanceId]);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await fetch(`/api/performances/${performanceId}`);
        if (!res.ok) return;
        const data = await res.json();
        setCallTime(data?.call_time || "");
        if (data?.stage_orientation) {
          setStageOrientation(data.stage_orientation === "top" ? "top" : "bottom");
        }
      } catch {
        // ignore
      }
    };
    fetchPerformance();
  }, [performanceId]);

  const renderSubpartOverlay = (part: PartItem | null) => {
    if (!part) return null;
    const subparts = subpartsByPart[part.id] || [];
    if (subparts.length === 0) return null;
    const items = subparts
      .map((sub) => {
        const names = subpartAssignments[sub.id] || [];
        const hasPositions = subpartHasPositions[sub.id] || false;
        if (names.length === 0 || hasPositions) return null;
        return { title: sub.title, names, description: sub.description || null };
      })
      .filter(Boolean) as Array<{ title: string; names: string[]; description?: string | null }>;
    if (items.length === 0) return null;

    return (
      <div className="bg-white border border-indigo-200 rounded-lg p-5 shadow-sm min-h-[220px]">
        <div className="text-sm uppercase tracking-wide text-indigo-600 font-semibold mb-2">
          Subpart Assignments
        </div>
        <div className="space-y-3 text-base text-gray-700">
          {items.map((item) => (
            <div key={item.title}>
              <div className="font-semibold text-gray-900">{item.title}</div>
              {item.description && (
                <div className="text-sm text-gray-500">{item.description}</div>
              )}
              <div className="text-gray-600">{item.names.join(", ")}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGrid = (title: string, part: PartItem | null, isNext: boolean) => {
    const positions = part ? positionsByPart[part.id] || [] : [];
    const titleSize = isNext ? "text-5xl" : "text-4xl";
    const labelSize = isNext ? "text-base" : "text-sm";
    const frameClass = isNext ? "border-purple-700 bg-purple-100" : "border-blue-700 bg-blue-100";
    const gridFill = isNext ? "from-purple-200 to-purple-300" : "from-blue-200 to-blue-300";
    return (
      <div className={`rounded-lg border p-4 shadow-sm ${frameClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className={`${labelSize} uppercase tracking-wide text-gray-600`}>{title}</div>
            <div className={`${titleSize} font-semibold text-gray-900`}>{part ? part.name : "—"}</div>
          </div>
          {isNext && timeToNext !== null && timeToNext <= 10 && (
            <div className="text-7xl font-extrabold text-red-600 animate-pulse">
              {Math.ceil(timeToNext)}
            </div>
          )}
        </div>
        {isNext && timeToNext !== null && timeToNext <= 10 && (
          <div className="mb-2 text-3xl font-extrabold text-red-600 animate-pulse">
            GET READY
          </div>
        )}
        <div
          className={`border border-gray-300 bg-gradient-to-b ${gridFill} relative mx-auto`}
          style={{
            width: GRID_COLS * CELL_SIZE,
            height: GRID_ROWS * CELL_SIZE,
            backgroundImage: `
              linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)
            `,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          }}
        >
          {stageOrientation === "bottom" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
          )}
          {stageOrientation === "top" && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          )}
          <div
            className="absolute text-red-600 font-bold text-xs bg-white bg-opacity-80 px-2 py-1 rounded"
            style={{
              ...(stageOrientation === "bottom" && { bottom: 5, left: "50%", transform: "translateX(-50%)" }),
              ...(stageOrientation === "top" && { top: 5, left: "50%", transform: "translateX(-50%)" }),
            }}
          >
            FRONT
          </div>
          {Array.from({ length: GRID_ROWS }).map((_, y) =>
            Array.from({ length: GRID_COLS }).map((_, x) => (
              <div
                key={`${x}-${y}`}
                className="absolute"
                style={{
                  left: x * CELL_SIZE,
                  top: y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              />
            ))
          )}
          {positions.map((pos) => (
            <div
              key={`${pos.student_id}-${pos.x}-${pos.y}`}
              className="absolute flex items-center justify-center"
              style={{
                left: pos.x * CELL_SIZE,
                top: pos.y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            >
              <div className="w-14 h-14 bg-blue-600 text-white text-base font-bold rounded-full flex items-center justify-center shadow-md">
                {getInitials(pos.student_name)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTimeline = (part: PartItem | null) => {
    if (!part) return null;
    const subparts = subpartsByPart[part.id] || [];
    if (subparts.length === 0) return null;
    const segments = subparts
      .map((sub) => {
        const rawStart = typeof sub.timepoint_seconds === "number" ? sub.timepoint_seconds : Number(sub.timepoint_seconds);
        const rawEnd = typeof sub.timepoint_end_seconds === "number" ? sub.timepoint_end_seconds : Number(sub.timepoint_end_seconds);
        const start = Number.isFinite(rawStart) ? rawStart : NaN;
        const end = Number.isFinite(rawEnd) ? rawEnd : NaN;
        if (!Number.isFinite(start)) return null;
        return {
          id: sub.id,
          title: sub.title,
          start,
          end: Number.isFinite(end) ? end : start,
        };
      })
      .filter(Boolean) as Array<{ id: string; title: string; start: number; end: number }>;
    if (segments.length === 0) return null;

    const partStart =
      typeof part.timepoint_seconds === "number"
        ? part.timepoint_seconds
        : Math.min(...segments.map((s) => s.start));
    const partEnd =
      typeof part.timepoint_end_seconds === "number"
        ? part.timepoint_end_seconds
        : Math.max(...segments.map((s) => s.end));
    const total = Math.max(1, partEnd - partStart);
    const playhead = Math.min(1, Math.max(0, (currentTime - partStart) / total)) * 100;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
          Subpart Timeline
        </div>
        <div className="relative h-16 rounded bg-slate-50 border border-slate-200 overflow-hidden">
          {segments.map((seg, idx) => {
            const left = ((seg.start - partStart) / total) * 100;
            const width = Math.max(2, ((seg.end - seg.start) / total) * 100);
            const isCurrent = currentSubpartId === seg.id;
            return (
              <div key={seg.id}>
                <div
                  className={`absolute top-0 h-full text-white text-base font-bold px-2 py-1 flex flex-col items-center justify-center text-center overflow-hidden leading-tight transition-all ${
                    flashSubpartId === seg.id
                      ? "bg-emerald-500 border-2 border-emerald-700"
                      : isCurrent
                        ? "bg-emerald-600 border-2 border-emerald-800 shadow-[0_0_12px_rgba(16,185,129,0.85)] animate-pulse"
                        : "bg-orange-700 border-2 border-orange-900"
                  }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <div>{seg.title}</div>
                  <div className="text-sm opacity-90">Subpart</div>
                </div>
                {idx < segments.length - 1 && (
                  <div
                    className="absolute top-0 h-full w-[4px] bg-orange-900"
                    style={{ left: `${left + width}%` }}
                  />
                )}
              </div>
            );
          })}
          <div
            className="absolute top-0 h-full w-[3px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
            style={{ left: `${playhead}%` }}
          />
        </div>
        <div className="mt-1 text-[11px] text-gray-500">
          {formatTime(partStart)} - {formatTime(partEnd)}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!currentPart) return;
    const subparts = subpartsByPart[currentPart.id] || [];
    if (subparts.length === 0) return;
    const segments = subparts
      .map((sub) => {
        const rawStart = typeof sub.timepoint_seconds === "number" ? sub.timepoint_seconds : Number(sub.timepoint_seconds);
        const rawEnd = typeof sub.timepoint_end_seconds === "number" ? sub.timepoint_end_seconds : Number(sub.timepoint_end_seconds);
        const start = Number.isFinite(rawStart) ? rawStart : NaN;
        const end = Number.isFinite(rawEnd) ? rawEnd : NaN;
        if (!Number.isFinite(start)) return null;
        return { id: sub.id, start, end: Number.isFinite(end) ? end : start };
      })
      .filter(Boolean) as Array<{ id: string; start: number; end: number }>;
    if (segments.length === 0) return;

    const active = segments.find((seg) => currentTime >= seg.start && currentTime <= seg.end);
    setCurrentSubpartId(active ? active.id : null);

    const hit = segments.find((seg) => currentTime >= seg.start && currentTime < seg.start + 0.35);
    if (hit && lastFlashRef.current !== hit.id) {
      lastFlashRef.current = hit.id;
      setFlashSubpartId(hit.id);
      setTimeout(() => {
        setFlashSubpartId((prev) => (prev === hit.id ? null : prev));
      }, 350);
    }
  }, [currentTime, currentPart, subpartsByPart]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex">
      <div className="flex-1 bg-gray-100 overflow-auto">
        <div className="w-full h-full p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <AppLogo className="border border-gray-200 bg-white text-gray-400" size={32} />
                <div className="text-sm uppercase tracking-wide text-gray-500">Rehearse Mode</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">Live Stage View</div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-2xl font-semibold text-gray-900 mb-4">Parts</div>
              <div className="text-xs text-gray-500 mb-3">
                Select a part to jump to that timepoint.
              </div>
              <div className="space-y-5">
                {filteredParts.map((part, idx) => {
                  const isCurrent = currentPart?.id === part.id;
                  const isNext = nextPart?.id === part.id;
                  return (
                    <div
                      key={part.id}
                      className={`border rounded p-2 cursor-pointer transition-colors ${
                        isCurrent ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900 text-xl">{part.name}</div>
                        {isNext && (
                          <span className="text-base font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                            NEXT
                          </span>
                        )}
                      </div>
                      <div className="text-base text-gray-500">
                        {typeof part.timepoint_seconds === "number" ? formatTime(part.timepoint_seconds) : "No timepoint"}
                      </div>
                      {isNext && timeToNext !== null && timeToNext <= 10 && (
                        <div className="text-4xl font-extrabold text-red-600 animate-pulse">
                          {Math.ceil(timeToNext)}
                        </div>
                      )}
                      <div className="text-base text-gray-600 mt-1">
                        {(positionsByPart[part.id] || []).length === 0
                          ? "No positions"
                          : (positionsByPart[part.id] || []).map((p, idx) => (
                              <span key={`${part.id}-pos-${p.student_id}-${idx}`}>
                                {idx > 0 ? ", " : ""}
                                <span className={p.student_name === personFilter ? "font-bold text-emerald-600" : ""}>
                                  {p.student_name}
                                </span>
                              </span>
                            ))}
                      </div>
                      {(subpartsByPart[part.id] || []).length > 0 && (
                        <div className="mt-3 space-y-3 text-sm text-gray-700">
                          {(subpartsByPart[part.id] || []).map((sub, subIdx) => {
                            const assigned = subpartAssignments[sub.id] || [];
                            const parsedStart =
                              typeof sub.timepoint_seconds === "number"
                                ? sub.timepoint_seconds
                                : sub.timepoint_seconds !== null && sub.timepoint_seconds !== undefined
                                  ? parseFloat(String(sub.timepoint_seconds))
                                  : NaN;
                            const parsedEnd =
                              typeof sub.timepoint_end_seconds === "number"
                                ? sub.timepoint_end_seconds
                                : sub.timepoint_end_seconds !== null && sub.timepoint_end_seconds !== undefined
                                  ? parseFloat(String(sub.timepoint_end_seconds))
                                  : NaN;
                            const hasTime = Number.isFinite(parsedStart);
                            return (
                              <div
                                key={sub.id}
                                className={hasTime ? "" : ""}
                              >
                                <div className="font-semibold text-gray-900">
                                  {subIdx + 1}. {sub.title}
                                </div>
                                <div className="text-gray-600">
                                  Assigned:{" "}
                                  {assigned.length === 0
                                    ? "—"
                                    : assigned.map((name, nameIdx) => (
                                        <span key={`${sub.id}-assigned-${nameIdx}`}>
                                          {nameIdx > 0 ? ", " : ""}
                                          <span className={name === personFilter ? "font-bold text-emerald-600" : ""}>
                                            {name}
                                          </span>
                                        </span>
                                      ))}
                                </div>
                                <div className="text-gray-500">
                                  Notes: {sub.description ? sub.description : "—"}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  Time: {Number.isFinite(parsedStart) ? formatTime(parsedStart) : "--:--"} / {Number.isFinite(parsedEnd) ? formatTime(parsedEnd) : "--:--"}
                                </div>
                                {hasTime && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startJumpCountdown(parsedStart, part.id);
                                    }}
                                    className="mt-1 text-[11px] text-indigo-600 hover:text-indigo-800 underline"
                                  >
                                    Jump to {sub.title} subpart
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rawTime = (part as any).timepoint_seconds;
                            const startTime =
                              typeof rawTime === "number"
                                ? rawTime
                                : rawTime !== null && rawTime !== undefined
                                  ? parseFloat(rawTime)
                                  : null;
                            if (startTime === null || Number.isNaN(startTime)) return;
                            startJumpCountdown(startTime, part.id);
                          }}
                          className="text-xs text-blue-700 hover:text-blue-900 underline"
                        >
                          Jump to part
                        </button>
                      </div>
                      {countdownTargetPartId === part.id && countdown !== null && (
                        <div className="mt-2 text-center text-3xl font-extrabold text-red-600 animate-pulse">
                          {countdown}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

              <div className="space-y-6">
                {renderTimeline(currentPart)}
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                  {renderGrid("Next", nextPart, true)}
                  {renderGrid("Current", currentPart, false)}
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
                    Current part
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-purple-600" />
                    Next part
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-blue-600 border border-blue-800" />
                    Student position
                  </div>
                </div>
                {(currentPart || nextPart) && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-700">
                    <div className="font-semibold text-gray-900 mb-2">Legend</div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-2">
                          Current Part
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Array.from(
                            new Map(
                              (currentPart ? positionsByPart[currentPart.id] || [] : []).map((p) => [
                                p.student_id,
                                p,
                              ])
                            ).values()
                          ).map((pos) => (
                            <div key={`current-${currentPart?.id}-${pos.student_id}`} className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                {getInitials(pos.student_name)}
                              </div>
                              <span className="truncate">{pos.student_name}</span>
                            </div>
                          ))}
                          {(currentPart ? positionsByPart[currentPart.id] || [] : []).length === 0 && (
                            <div className="text-[11px] text-gray-500">No positions</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide mb-2">
                          Next Part
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Array.from(
                            new Map(
                              (nextPart ? positionsByPart[nextPart.id] || [] : []).map((p) => [
                                p.student_id,
                                p,
                              ])
                            ).values()
                          ).map((pos) => (
                            <div key={`next-${nextPart?.id}-${pos.student_id}`} className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                {getInitials(pos.student_name)}
                              </div>
                              <span className="truncate">{pos.student_name}</span>
                            </div>
                          ))}
                          {(nextPart ? positionsByPart[nextPart.id] || [] : []).length === 0 && (
                            <div className="text-[11px] text-gray-500">No positions</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="min-h-[180px]">{renderSubpartOverlay(currentPart)}</div>
                  <div className="min-h-[180px]">{renderSubpartOverlay(nextPart)}</div>
                </div>

                <div className="max-w-xl space-y-3">
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-blue-600 bg-blue-50 p-3">
                    <div className="text-xs font-extrabold uppercase tracking-widest text-blue-700">
                      Filter by person
                    </div>
                    <select
                      value={personFilter}
                      onChange={(e) => setPersonFilter(e.target.value)}
                      className="min-w-[160px] px-2 py-1 border border-blue-200 rounded text-sm bg-white"
                    >
                      <option value="">All</option>
                      {allPeople.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <div className="ml-auto flex items-center gap-3 text-xs font-semibold text-blue-700">
                      {callTime && (
                        <div>
                          Call Time: <span className="font-bold">{callTime}</span>
                        </div>
                      )}
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ringEnabled}
                          onChange={(e) => setRingEnabled(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Ring at T-10
                      </label>
                    </div>
                  </div>
                  <MusicPlayer
                    musicUrl={musicUrl || undefined}
                    onTimeUpdate={(t) => setCurrentTime(t)}
                    audioRef={audioRef}
                  />
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
