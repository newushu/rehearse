"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  onUpdatePartTimepoints?: (updatedPart: PartItem) => void;
}

const GRID_COLS = 12;
const GRID_ROWS = 8;
const CURRENT_CELL_SIZE = 34;
const NEXT_CELL_SIZE = 80;
type FrontDirection = "bottom" | "top";

function getInitials(name: string) {
  if (!name) return "?";
  const chunks = name.trim().split(/\s+/);
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return (chunks[0][0] + chunks[chunks.length - 1][0]).toUpperCase();
}

export function RehearseOverlay({ performanceId, parts, musicUrl, onClose, onUpdatePartTimepoints }: RehearseOverlayProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [positionsByPart, setPositionsByPart] = useState<Record<string, PositionEntry[]>>({});
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [ringEnabled, setRingEnabled] = useState(true);
  const [subpartsByPart, setSubpartsByPart] = useState<Record<string, SubpartItem[]>>({});
  const [subpartAssignments, setSubpartAssignments] = useState<Record<string, string[]>>({});
  const [subpartHasPositions, setSubpartHasPositions] = useState<Record<string, boolean>>({});
  const [personFilter, setPersonFilter] = useState("");
  const [notesByKey, setNotesByKey] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteSaving, setNoteSaving] = useState<Record<string, boolean>>({});
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownTargetTime, setCountdownTargetTime] = useState<number | null>(null);
  const [countdownTargetPartId, setCountdownTargetPartId] = useState<string | null>(null);
  const [callTime, setCallTime] = useState<string>("");
  const [performanceTitle, setPerformanceTitle] = useState<string>("");
  const [stageOrientation, setStageOrientation] = useState<FrontDirection>("bottom");
  const [flashSubpartId, setFlashSubpartId] = useState<string | null>(null);
  const [currentSubpartId, setCurrentSubpartId] = useState<string | null>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editStartMin, setEditStartMin] = useState<string>("");
  const [editStartSec, setEditStartSec] = useState<string>("");
  const [editEndMin, setEditEndMin] = useState<string>("");
  const [editEndSec, setEditEndSec] = useState<string>("");
  const [savingPartId, setSavingPartId] = useState<string | null>(null);
  const [partTimeOverrides, setPartTimeOverrides] = useState<
    Record<string, { start: number | null; end: number | null }>
  >({});
  const [expandedPartIds, setExpandedPartIds] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopRange, setLoopRange] = useState<{ start: number; end: number } | null>(null);
  const [pendingLoopRange, setPendingLoopRange] = useState<{ start: number; end: number } | null>(null);
  const [loopSelectMode, setLoopSelectMode] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentGridWrapRef = useRef<HTMLDivElement>(null);
  const nextGridWrapRef = useRef<HTMLDivElement>(null);
  const [currentGridScale, setCurrentGridScale] = useState(1);
  const [nextGridScale, setNextGridScale] = useState(1);
  const prevTimeToNextRef = useRef<number | null>(null);
  const lastFlashRef = useRef<string | null>(null);

  const effectiveParts = useMemo(() => {
    return parts.map((part) => {
      const override = partTimeOverrides[part.id];
      if (!override) return part;
      return {
        ...part,
        timepoint_seconds: override.start,
        timepoint_end_seconds: override.end,
      };
    });
  }, [parts, partTimeOverrides]);

  const orderedParts = useMemo(() => {
    return [...effectiveParts].sort((a, b) => {
      const aTime = typeof a.timepoint_seconds === "number" ? a.timepoint_seconds : Number.POSITIVE_INFINITY;
      const bTime = typeof b.timepoint_seconds === "number" ? b.timepoint_seconds : Number.POSITIVE_INFINITY;
      if (aTime === bTime) return (a.order || 0) - (b.order || 0);
      return aTime - bTime;
    });
  }, [effectiveParts]);

  const timepointParts = useMemo(() => {
    return orderedParts.filter((p) => typeof p.timepoint_seconds === "number");
  }, [orderedParts]);

  const partSegments = useMemo(() => {
    const segments: Array<{ id: string; name: string; start: number; end: number; subparts: SubpartItem[] }> = [];
    const sorted = [...orderedParts].filter((p) => typeof p.timepoint_seconds === "number")
      .sort((a, b) => (a.timepoint_seconds || 0) - (b.timepoint_seconds || 0));
    for (let i = 0; i < sorted.length; i++) {
      const part = sorted[i];
      const start = part.timepoint_seconds || 0;
      const nextStart = i < sorted.length - 1 ? sorted[i + 1].timepoint_seconds || start : null;
      const end =
        typeof part.timepoint_end_seconds === "number"
          ? part.timepoint_end_seconds
          : nextStart !== null
            ? nextStart
            : start + 1;
      segments.push({
        id: part.id,
        name: part.name,
        start,
        end: Math.max(end, start + 0.1),
        subparts: subpartsByPart[part.id] || [],
      });
    }
    return segments;
  }, [orderedParts, subpartsByPart]);

  const partSegmentById = useMemo(() => {
    const map = new Map<string, { start: number; end: number }>();
    partSegments.forEach((seg) => {
      map.set(seg.id, { start: seg.start, end: seg.end });
    });
    return map;
  }, [partSegments]);

  const timelineDuration = useMemo(() => {
    const last = partSegments.reduce((max, seg) => Math.max(max, seg.end), 0);
    return Math.max(duration || 0, last, 1);
  }, [partSegments, duration]);

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

  const formatDuration = (start: number | null | undefined, end: number | null | undefined) => {
    if (typeof start !== "number" || typeof end !== "number") return "";
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
    const total = Math.max(0, end - start);
    const mins = Math.floor(total / 60);
    const secs = Math.round(total % 60);
    return `${mins}m ${secs}s`;
  };

  const getSubpartBounds = (partId: string) => {
    const list = subpartsByPart[partId] || [];
    const starts: number[] = [];
    const ends: number[] = [];
    list.forEach((sub) => {
      if (typeof sub.timepoint_seconds === "number") starts.push(sub.timepoint_seconds);
      if (typeof sub.timepoint_end_seconds === "number") ends.push(sub.timepoint_end_seconds);
    });
    return {
      minStart: starts.length > 0 ? Math.min(...starts) : null,
      maxEnd: ends.length > 0 ? Math.max(...ends) : null,
    };
  };

  const splitTime = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return { min: "", sec: "" };
    const total = Math.max(0, Math.floor(value));
    return { min: String(Math.floor(total / 60)), sec: String(total % 60) };
  };

  const composeSeconds = (minStr: string, secStr: string) => {
    if (!minStr && !secStr) return null;
    const mins = minStr ? parseInt(minStr, 10) : 0;
    const secs = secStr ? parseFloat(secStr) : 0;
    if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
    return mins * 60 + secs;
  };

  const seekTo = (time: number, shouldPlay: boolean = true) => {
    if (!audioRef.current) return;
    const nextTime = Math.max(0, time);
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    if (shouldPlay) {
      audioRef.current.play();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const selectLoopForPart = (partId: string) => {
    const seg = partSegmentById.get(partId);
    if (seg) setPendingLoopRange(seg);
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

  const startEditPartTime = (part: PartItem) => {
    const currentStart =
      typeof part.timepoint_seconds === "number" ? part.timepoint_seconds : null;
    const currentEnd =
      typeof part.timepoint_end_seconds === "number" ? part.timepoint_end_seconds : null;
    const startSplit = splitTime(currentStart);
    const endSplit = splitTime(currentEnd);
    setEditStartMin(startSplit.min);
    setEditStartSec(startSplit.sec);
    setEditEndMin(endSplit.min);
    setEditEndSec(endSplit.sec);
    setEditingPartId(part.id);
    setTimeError(null);
  };

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
    setCountdown(3);
    playBeep();
    let tick = 3;
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
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoaded = () => {
      setDuration(audio.duration || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const el = currentGridWrapRef.current;
    if (!el) return;
    const baseWidth = GRID_COLS * CURRENT_CELL_SIZE;
    const updateScale = () => {
      const width = el.clientWidth;
      if (!width) return;
      setCurrentGridScale(Math.min(1, width / baseWidth));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = nextGridWrapRef.current;
    if (!el) return;
    const baseWidth = GRID_COLS * NEXT_CELL_SIZE;
    const updateScale = () => {
      const width = el.clientWidth;
      if (!width) return;
      setNextGridScale(Math.min(1, width / baseWidth));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!loopEnabled || !loopRange || !audioRef.current) return;
    if (currentTime >= loopRange.end) {
      audioRef.current.currentTime = loopRange.start;
      if (!audioRef.current.paused) {
        audioRef.current.play();
      }
    }
  }, [currentTime, loopEnabled, loopRange]);

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

        const allSubpartIds = subpartsEntries.flatMap(([, list]) => list.map((s: SubpartItem) => s.id));
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

  const refreshSubpartsForPart = useCallback(async (partId: string) => {
    try {
      const res = await fetch(`/api/subparts?partId=${partId}`);
      if (!res.ok) return;
      const data = await res.json();
      const normalized = (data || []).map((item: any) => ({
        id: item.id,
        part_id: item.part_id,
        title: item.title,
        description: item.description ?? null,
        timepoint_seconds: item.timepoint_seconds ?? null,
        timepoint_end_seconds: item.timepoint_end_seconds ?? null,
      }));
      setSubpartsByPart((prev) => ({ ...prev, [partId]: normalized }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail as { partId?: string } | undefined;
      if (detail?.partId) {
        refreshSubpartsForPart(detail.partId);
      }
    };
    window.addEventListener("subparts-updated", handleUpdated);
    return () => window.removeEventListener("subparts-updated", handleUpdated);
  }, [refreshSubpartsForPart]);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await fetch(`/api/performances/${performanceId}`);
        if (!res.ok) return;
        const data = await res.json();
        setCallTime(data?.call_time || "");
        setPerformanceTitle(data?.title || "");
        if (data?.stage_orientation) {
          setStageOrientation(data.stage_orientation === "top" ? "top" : "bottom");
        }
      } catch {
        // ignore
      }
    };
    fetchPerformance();
  }, [performanceId]);

  const getNoteKey = useCallback((partId: string, subpartId?: string | null) => {
    return subpartId ? `subpart:${subpartId}` : `part:${partId}`;
  }, []);

  const saveNote = useCallback(
    async (partId: string, subpartId?: string | null) => {
      const key = getNoteKey(partId, subpartId);
      const draft = (noteDrafts[key] ?? notesByKey[key] ?? "").trim();
      const current = (notesByKey[key] ?? "").trim();
      if (draft === current) return;
      setNoteSaving((prev) => ({ ...prev, [key]: true }));
      try {
        const res = await fetch("/api/rehearse-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            performance_id: performanceId,
            part_id: partId,
            subpart_id: subpartId ?? null,
            note: draft,
          }),
        });
        if (!res.ok) throw new Error("Failed to save note");
        if (!draft) {
          setNotesByKey((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        } else {
          setNotesByKey((prev) => ({ ...prev, [key]: draft }));
        }
      } catch (err) {
        console.error(err);
        alert("Failed to save note");
      } finally {
        setNoteSaving((prev) => ({ ...prev, [key]: false }));
      }
    },
    [getNoteKey, notesByKey, noteDrafts, performanceId]
  );

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/rehearse-notes?performanceId=${performanceId}`);
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = {};
        (data || []).forEach((item: any) => {
          const key = getNoteKey(item.part_id, item.subpart_id);
          map[key] = item.note || "";
        });
        setNotesByKey(map);
      } catch {
        // ignore
      }
    };
    fetchNotes();
  }, [performanceId, getNoteKey]);

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

  const renderGrid = (title: string, part: PartItem | null, isNext: boolean, cellSize: number) => {
    const positions = part ? positionsByPart[part.id] || [] : [];
    const titleSize = isNext ? "text-5xl" : "text-4xl";
    const labelSize = isNext ? "text-base" : "text-sm";
    const frameClass = isNext ? "border-purple-700 bg-purple-100" : "border-blue-700 bg-blue-100";
    const gridFill = isNext ? "from-purple-200 to-purple-300" : "from-blue-200 to-blue-300";
    const markerSize = Math.max(18, Math.round(cellSize * 0.7));
    const markerText = cellSize >= 70 ? "text-base" : "text-[10px]";
    const baseWidth = GRID_COLS * cellSize;
    const baseHeight = GRID_ROWS * cellSize;
    const gridScale = isNext ? nextGridScale : currentGridScale;
    const gridWrapRef = isNext ? nextGridWrapRef : currentGridWrapRef;
    const subparts = part ? subpartsByPart[part.id] || [] : [];
    const currentSub = part && currentSubpartId
      ? subparts.find((s) => s.id === currentSubpartId)
      : null;
    const nextSub = isNext
      ? subparts
          .filter((s) => typeof s.timepoint_seconds === "number")
          .sort((a, b) => (a.timepoint_seconds || 0) - (b.timepoint_seconds || 0))[0]
      : null;
    const truncate7 = (value: string) => value.slice(0, 7);
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
          ref={gridWrapRef}
          className="w-full overflow-hidden"
          style={{ height: baseHeight * gridScale }}
        >
          <div
            className={`border border-gray-300 bg-gradient-to-b ${gridFill} relative mx-auto`}
            style={{
              width: baseWidth,
              height: baseHeight,
              backgroundImage: `
                linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)
              `,
              backgroundSize: `${cellSize}px ${cellSize}px`,
              transform: `scale(${gridScale})`,
              transformOrigin: "top left",
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
          {!isNext && currentSub && (
            <div className="absolute left-2 top-2 px-2 py-1 bg-white/80 text-amber-700 font-extrabold text-xl rounded shadow">
              {truncate7(currentSub.title || "")}
            </div>
          )}
          {Array.from({ length: GRID_ROWS }).map((_, y) =>
            Array.from({ length: GRID_COLS }).map((_, x) => (
              <div
                key={`${x}-${y}`}
                className="absolute"
                style={{
                  left: x * cellSize,
                  top: y * cellSize,
                  width: cellSize,
                  height: cellSize,
                }}
              />
            ))
          )}
          {positions.map((pos) => (
            <div
              key={`${pos.student_id}-${pos.x}-${pos.y}`}
              className="absolute flex items-center justify-center"
              style={{
                left: pos.x * cellSize,
                top: pos.y * cellSize,
                width: cellSize,
                height: cellSize,
              }}
            >
              <div
                className={`bg-blue-600 text-white ${markerText} font-bold rounded-full flex items-center justify-center shadow-md`}
                style={{ width: markerSize, height: markerSize }}
              >
                {getInitials(pos.student_name)}
              </div>
            </div>
          ))}
          </div>
        </div>
        {isNext && nextSub && (
          <div className="mt-2 text-2xl font-extrabold text-purple-700">
            {truncate7(nextSub.title || "")}
          </div>
        )}
      </div>
    );
  };

  const renderNamesBox = (part: PartItem | null, isNext: boolean) => {
    const positions = part ? positionsByPart[part.id] || [] : [];
    const names = Array.from(
      new Map(positions.map((p) => [p.student_id, p.student_name || "Unknown"])).values()
    );
    const subparts = part ? subpartsByPart[part.id] || [] : [];
    const textSize = isNext ? "text-2xl" : "text-base";
    const infoLabelSize = isNext ? "text-sm" : "text-xs";
    const partDuration = part ? formatDuration(part.timepoint_seconds, part.timepoint_end_seconds) : "";
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm min-h-[72px]">
        <div className={`${infoLabelSize} uppercase tracking-wide text-gray-500 mb-2`}>INFO</div>
        <div className="space-y-3">
          {partDuration && (
            <div className="text-sm text-gray-600">
              Duration: <span className="font-semibold text-gray-900">{partDuration}</span>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">People</div>
            {names.length === 0 ? (
              <div className="text-xs text-gray-500">No positions</div>
            ) : (
              <div className={`flex flex-wrap gap-2 ${textSize} text-gray-800`}>
                {names.map((name) => (
                  <span key={`${part?.id || "none"}-${name}`} className="px-2 py-1 bg-gray-100 rounded">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {subparts.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">Subparts</div>
              <div className="space-y-2 text-sm text-gray-700">
                {subparts.map((sub, idx) => {
                  const assigned = subpartAssignments[sub.id] || [];
                  const subDuration = formatDuration(sub.timepoint_seconds, sub.timepoint_end_seconds);
                  return (
                    <div key={sub.id}>
                      <div className="font-semibold text-gray-900">
                        {idx + 1}. {sub.title}
                      </div>
                      {subDuration && (
                        <div className="text-xs text-gray-500">Duration: {subDuration}</div>
                      )}
                      <div className="text-gray-600">
                        {assigned.length === 0 ? (
                          <span>Assigned: —</span>
                        ) : (
                          <span>
                            Assigned:{" "}
                            {assigned.map((name, aIdx) => (
                              <span key={`${sub.id}-info-${aIdx}`}>
                                {aIdx > 0 ? ", " : ""}
                                {aIdx + 1}. {name}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getTimeFromPointer = (clientX: number) => {
    const el = timelineRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * timelineDuration;
  };

  const handleTimelinePointerDown = (e: React.MouseEvent) => {
    const time = getTimeFromPointer(e.clientX);
    setIsScrubbing(true);
    seekTo(time, false);
  };

  const handleTimelinePointerMove = (e: React.MouseEvent) => {
    if (!isScrubbing) return;
    const time = getTimeFromPointer(e.clientX);
    seekTo(time, false);
  };

  const handleTimelinePointerUp = (e: React.MouseEvent) => {
    if (!isScrubbing) return;
    const time = getTimeFromPointer(e.clientX);
    seekTo(time, true);
    setIsScrubbing(false);
  };

  const renderPerformanceTimeline = () => {
    if (partSegments.length === 0) return null;
    const playhead = Math.min(1, Math.max(0, currentTime / timelineDuration)) * 100;
    const loopStart =
      loopRange ? Math.min(loopRange.start, loopRange.end) : null;
    const loopEnd =
      loopRange ? Math.max(loopRange.start, loopRange.end) : null;
    const palette = [
      "bg-blue-600",
      "bg-emerald-600",
      "bg-amber-600",
      "bg-purple-600",
      "bg-rose-600",
      "bg-teal-600",
    ];
    const paletteLight = [
      "bg-blue-200 text-blue-900",
      "bg-emerald-200 text-emerald-900",
      "bg-amber-200 text-amber-900",
      "bg-purple-200 text-purple-900",
      "bg-rose-200 text-rose-900",
      "bg-teal-200 text-teal-900",
    ];
    const partColorIndexById = new Map(partSegments.map((seg, idx) => [seg.id, idx]));
    const subpartSegments = partSegments
      .flatMap((seg) => {
        const list = subpartsByPart[seg.id] || [];
        const colorIdx = partColorIndexById.get(seg.id) ?? 0;
        return list
          .map((sub) => {
            const rawStart =
              typeof sub.timepoint_seconds === "number"
                ? sub.timepoint_seconds
                : Number(sub.timepoint_seconds);
            if (!Number.isFinite(rawStart)) return null;
            const clampedStart = Math.min(Math.max(rawStart, seg.start), seg.end - 0.1);
            const rawEnd =
              typeof sub.timepoint_end_seconds === "number"
                ? sub.timepoint_end_seconds
                : Number(sub.timepoint_end_seconds);
            const endRaw = Number.isFinite(rawEnd) ? rawEnd : clampedStart + 0.1;
            const clampedEnd = Math.min(Math.max(endRaw, clampedStart + 0.1), seg.end);
            if (clampedEnd <= clampedStart) return null;
            return {
              id: sub.id,
              partId: seg.id,
              title: sub.title,
              start: clampedStart,
              end: clampedEnd,
              colorIdx,
            };
          })
          .filter(Boolean);
      })
      .filter(Boolean) as Array<{
      id: string;
      partId: string;
      title: string;
      start: number;
      end: number;
      colorIdx: number;
    }>;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">Performance Timeline</div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              disabled={!musicUrl}
              className="px-3 py-1 bg-gray-900 text-white rounded text-xs disabled:bg-gray-400"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <div className="text-xs text-gray-600">
              {formatTime(currentTime)} / {formatTime(timelineDuration)}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              Volume
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20"
              />
            </label>
            <button
              onClick={() => {
                if (loopSelectMode && pendingLoopRange) {
                  setLoopRange(pendingLoopRange);
                  setLoopEnabled(true);
                  setLoopSelectMode(false);
                } else {
                  setLoopSelectMode(true);
                  setPendingLoopRange(null);
                }
              }}
              className={`px-3 py-1 rounded text-xs ${
                loopEnabled || loopSelectMode ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {loopSelectMode ? (pendingLoopRange ? "Confirm Loop" : "Select Part") : loopEnabled ? "Loop On" : "Set Loop"}
            </button>
            {loopEnabled && (
              <button
                onClick={() => {
                  setLoopEnabled(false);
                  setLoopRange(null);
                  setPendingLoopRange(null);
                  setLoopSelectMode(false);
                }}
                className="px-3 py-1 rounded text-xs bg-gray-200 text-gray-700"
              >
                Clear Loop
              </button>
            )}
          </div>
        </div>
        <div
          ref={timelineRef}
          className="relative h-24 rounded bg-slate-50 border border-slate-200 overflow-hidden cursor-pointer"
          onMouseDown={handleTimelinePointerDown}
          onMouseMove={handleTimelinePointerMove}
          onMouseUp={handleTimelinePointerUp}
          onMouseLeave={handleTimelinePointerUp}
        >
          {loopStart !== null && loopEnd !== null && (
            <div
              className="absolute top-0 h-full bg-emerald-200/70"
              style={{
                left: `${(loopStart / timelineDuration) * 100}%`,
                width: `${((loopEnd - loopStart) / timelineDuration) * 100}%`,
              }}
            />
          )}
          <div className="absolute top-0 left-0 right-0 h-14">
            {partSegments.map((seg, segIdx) => {
              const left = (seg.start / timelineDuration) * 100;
              const width = Math.max(1, ((seg.end - seg.start) / timelineDuration) * 100);
              const isCurrent = currentPart?.id === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => {
                    if (loopSelectMode) {
                      setPendingLoopRange({ start: seg.start, end: seg.end });
                    } else {
                      seekTo(seg.start, true);
                    }
                  }}
                  className={`absolute top-0 h-full text-base font-semibold px-2 py-1 text-center truncate ${
                    isCurrent ? "bg-blue-700 text-white" : `${palette[segIdx % palette.length]} text-white`
                  } ${loopSelectMode && pendingLoopRange?.start === seg.start ? "ring-2 ring-emerald-300" : ""}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={seg.name}
                >
                  {seg.name}
                </button>
              );
            })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10 border-t border-slate-200 bg-slate-100/80">
            {subpartSegments.map((seg, idx) => {
              const left = (seg.start / timelineDuration) * 100;
              const width = Math.max(1, ((seg.end - seg.start) / timelineDuration) * 100);
              const borderClass = idx % 2 === 0 ? "border-l border-slate-300" : "border-l border-white/60";
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => seekTo(seg.start, true)}
                  className={`absolute top-0 h-full text-xs font-semibold px-2 py-1 text-center truncate ${borderClass} ${paletteLight[seg.colorIdx % paletteLight.length]}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={seg.title}
                >
                  {seg.title}
                </button>
              );
            })}
          </div>
          <div
            className="absolute top-0 h-full w-[3px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
            style={{ left: `${playhead}%` }}
          />
        </div>
        {currentPart && (subpartsByPart[currentPart.id] || []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(subpartsByPart[currentPart.id] || []).map((sub, idx) => {
              const start =
                typeof sub.timepoint_seconds === "number"
                  ? sub.timepoint_seconds
                  : null;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    if (start !== null) seekTo(start, true);
                  }}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50"
                >
                  {idx + 1}. {sub.title}
                </button>
              );
            })}
          </div>
        )}
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
          <audio ref={audioRef} src={musicUrl || undefined} />
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <AppLogo className="border border-gray-200 bg-white text-gray-400" size={32} />
                <div className="text-sm uppercase tracking-wide text-gray-500">Rehearse Mode</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">Live Stage View</div>
              {performanceTitle && (
                <div className="text-sm text-gray-600 mt-1">
                  Performance: <span className="font-semibold text-gray-900">{performanceTitle}</span>
                </div>
              )}
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

          {renderPerformanceTimeline()}

          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-semibold text-gray-900">Parts</div>
              </div>
              <div className="text-xs text-gray-500 mb-3">
                Click a part name to play from its start time.
              </div>
              <div className="space-y-5">
                {filteredParts.map((part, idx) => {
                  const isCurrent = currentPart?.id === part.id;
                  const isNext = nextPart?.id === part.id;
                  const isEditing = editingPartId === part.id;
                  const partStart = typeof part.timepoint_seconds === "number" ? part.timepoint_seconds : null;
                  const partEnd = typeof part.timepoint_end_seconds === "number" ? part.timepoint_end_seconds : null;
                  const partDuration = formatDuration(partStart, partEnd);
                  const partSubparts = subpartsByPart[part.id] || [];
                  const isExpanded = expandedPartIds.has(part.id);
                  return (
                    <div
                      key={part.id}
                      className={`border rounded p-2 cursor-pointer transition-colors ${
                        isCurrent ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                      }`}
                      onClick={() => {
                        if (loopSelectMode) {
                          selectLoopForPart(part.id);
                        }
                      }}
                      onDoubleClick={() => {
                        if (partStart !== null) seekTo(partStart, true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            if (loopSelectMode) {
                              selectLoopForPart(part.id);
                              return;
                            }
                            if (partStart !== null) seekTo(partStart, true);
                          }}
                          className="font-semibold text-gray-900 text-xl text-left"
                        >
                          {part.name}
                        </button>
                        {isNext && (
                          <span className="text-base font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                            NEXT
                          </span>
                        )}
                      </div>
                      <div className="text-base text-gray-500">
                        {partStart !== null ? formatTime(partStart) : "No timepoint"}
                        {partDuration && <span className="ml-2 text-sm text-gray-400">({partDuration})</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {partStart !== null && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startJumpCountdown(partStart, part.id);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Jump to part
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setExpandedPartIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(part.id)) next.delete(part.id);
                              else next.add(part.id);
                              return next;
                            });
                          }}
                          className="px-3 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          {isExpanded ? "Hide Details" : "Expand Details"}
                        </button>
                      </div>
                      {!isExpanded && partSubparts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {partSubparts.map((sub, subIdx) => {
                            const subStart =
                              typeof sub.timepoint_seconds === "number"
                                ? sub.timepoint_seconds
                                : null;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  if (subStart !== null) seekTo(subStart, true);
                                }}
                                className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700"
                              >
                                {subIdx + 1}. {sub.title}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {isExpanded && (
                        <>
                          {isEditing ? (
                            <div className="mt-2 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <div className="text-[11px] font-semibold text-gray-600">Start (m / s)</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={editStartMin}
                                      onChange={(e) => setEditStartMin(e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      value={editStartSec}
                                      onChange={(e) => setEditStartSec(e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-semibold text-gray-600">End (m / s)</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={editEndMin}
                                      onChange={(e) => setEditEndMin(e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      value={editEndSec}
                                      onChange={(e) => setEditEndSec(e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                              </div>
                              {timeError && (
                                <div className="text-[11px] text-red-600">{timeError}</div>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    let start = composeSeconds(editStartMin, editStartSec);
                                    let end = composeSeconds(editEndMin, editEndSec);
                                    const bounds = getSubpartBounds(part.id);
                                    if (bounds.minStart !== null) {
                                      if (start === null || start > bounds.minStart) start = bounds.minStart;
                                    }
                                    if (bounds.maxEnd !== null) {
                                      if (end === null || end < bounds.maxEnd) end = bounds.maxEnd;
                                    }
                                    if (duration > 0) {
                                      if ((start !== null && start > duration) || (end !== null && end > duration)) {
                                        setTimeError("Time exceeds music length. Use a time within the track.");
                                        return;
                                      }
                                    }
                                    if (start !== null && end !== null && end < start) {
                                      setTimeError("End time must be after start time.");
                                      return;
                                    }
                                    setTimeError(null);
                                    setSavingPartId(part.id);
                                    try {
                                      const res = await fetch(`/api/parts/${part.id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          timepoint_seconds: start,
                                          timepoint_end_seconds: end,
                                        }),
                                      });
                                      if (!res.ok) {
                                        const data = await res.json().catch(() => null);
                                        throw new Error(data?.details || data?.error || "Failed to update timepoints");
                                      }
                                      const updated = await res.json();
                                      setPartTimeOverrides((prev) => ({
                                        ...prev,
                                        [part.id]: { start, end },
                                      }));
                                      onUpdatePartTimepoints?.(updated);
                                      setEditingPartId(null);
                                    } catch (err) {
                                      console.error("Failed to update timepoints:", err);
                                      alert("Failed to update timepoints");
                                    } finally {
                                      setSavingPartId(null);
                                    }
                                  }}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50"
                                  disabled={savingPartId === part.id}
                                >
                                  {savingPartId === part.id ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPartId(null);
                                  }}
                                  className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-xs hover:bg-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                        <div className="mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditPartTime(part);
                            }}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 underline"
                          >
                            Edit start/end
                          </button>
                        </div>
                      )}
                      {isNext && timeToNext !== null && timeToNext <= 10 && (
                        <div className="text-4xl font-extrabold text-red-600 animate-pulse">
                          {Math.ceil(timeToNext)}
                        </div>
                      )}
                      {isExpanded && (
                        <div className="mt-3">
                          <div className="text-[11px] font-semibold text-gray-600 mb-1">Notes</div>
                          <textarea
                            value={noteDrafts[getNoteKey(part.id)] ?? notesByKey[getNoteKey(part.id)] ?? ""}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({ ...prev, [getNoteKey(part.id)]: e.target.value }))
                            }
                            onBlur={() => saveNote(part.id)}
                            rows={2}
                            placeholder="Add notes for this part..."
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              onClick={() => saveNote(part.id)}
                              className="px-2 py-0.5 bg-gray-900 text-white rounded text-[11px]"
                              disabled={noteSaving[getNoteKey(part.id)]}
                            >
                              {noteSaving[getNoteKey(part.id)] ? "Saving..." : "Save note"}
                            </button>
                            <span className="text-[10px] text-gray-400">Auto-saves on blur</span>
                          </div>
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
                                {hasTime ? (
                                  <button
                                    type="button"
                                    onClick={() => seekTo(parsedStart, true)}
                                    className="font-semibold text-gray-900 text-left"
                                  >
                                    {subIdx + 1}. {sub.title}
                                  </button>
                                ) : (
                                  <div className="font-semibold text-gray-900">
                                    {subIdx + 1}. {sub.title}
                                  </div>
                                )}
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
                                {notesByKey[getNoteKey(part.id, sub.id)] && (
                                  <div className="text-[10px] text-gray-500 mt-1">
                                    Note: {notesByKey[getNoteKey(part.id, sub.id)]}
                                  </div>
                                )}
                                <div className="mt-1">
                                  <textarea
                                    value={noteDrafts[getNoteKey(part.id, sub.id)] ?? notesByKey[getNoteKey(part.id, sub.id)] ?? ""}
                                    onChange={(e) =>
                                      setNoteDrafts((prev) => ({
                                        ...prev,
                                        [getNoteKey(part.id, sub.id)]: e.target.value,
                                      }))
                                    }
                                    onBlur={() => saveNote(part.id, sub.id)}
                                    rows={2}
                                    placeholder="Add rehearsal notes..."
                                    className="w-full px-2 py-1 border border-gray-200 rounded text-[11px]"
                                  />
                                  <div className="mt-1 flex items-center gap-2">
                                    <button
                                      onClick={() => saveNote(part.id, sub.id)}
                                      className="px-2 py-0.5 bg-gray-900 text-white rounded text-[10px]"
                                      disabled={noteSaving[getNoteKey(part.id, sub.id)]}
                                    >
                                      {noteSaving[getNoteKey(part.id, sub.id)] ? "Saving..." : "Save note"}
                                    </button>
                                  </div>
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
                      {countdownTargetPartId === part.id && countdown !== null && (
                        <div className="mt-2 text-center text-3xl font-extrabold text-red-600 animate-pulse">
                          {countdown}
                        </div>
                      )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,0.6fr)_minmax(420px,1fr)] gap-6 items-start">
                  <div className="space-y-3">
                    {renderGrid("Current", currentPart, false, CURRENT_CELL_SIZE)}
                    {renderNamesBox(currentPart, false)}
                  </div>
                  <div className="space-y-3">
                    {renderGrid("Next", nextPart, true, NEXT_CELL_SIZE)}
                    {renderNamesBox(nextPart, true)}
                  </div>
                </div>

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
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}





