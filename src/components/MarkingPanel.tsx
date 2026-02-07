"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Part } from "@/types";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";

type PartItem = Part & {
  timepoint_seconds?: number | null;
  timepoint_end_seconds?: number | null;
  timeline_row?: number | null;
};

interface SubpartItem {
  id: string;
  part_id: string;
  title: string;
  timepoint_seconds?: number | null;
  timepoint_end_seconds?: number | null;
  order?: number | null;
}

interface Mark {
  id: string;
  time: number;
  createdAt: string;
}

interface MarkRow {
  id: string;
  label: string;
  note?: string;
  marks: Mark[];
}

type AssignmentValue =
  | string
  | {
      markId?: string;
      time: number;
    };

interface MarkingPanelProps {
  performanceId: string;
  parts: PartItem[];
  musicUrl?: string | null;
  performanceTitle?: string;
  onPartsUpdated: (parts: PartItem[]) => void;
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTimeDetailed(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function parseTimeString(value: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.max(0, parseFloat(trimmed));
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
    return Math.max(0, mins * 60 + secs);
  }
  return null;
}

function uuid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function MarkingPanel({ performanceId, parts, musicUrl, performanceTitle, onPartsUpdated }: MarkingPanelProps) {
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [assignments, setAssignments] = useState<Record<string, AssignmentValue>>({});
  const [subpartsByPart, setSubpartsByPart] = useState<Record<string, SubpartItem[]>>({});
  const [newSubpartTitle, setNewSubpartTitle] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("New Marking Session");
  const [customTitle, setCustomTitle] = useState(false);
  const [sessionList, setSessionList] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [allSessions, setAllSessions] = useState(false);
  const [performanceNameMap, setPerformanceNameMap] = useState<Record<string, string>>({});
  const [musicDuration, setMusicDuration] = useState<number | null>(null);
  const audioCleanupRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [manualTimelineLength, setManualTimelineLength] = useState<number>(180);
  const [partTimelineOverrides, setPartTimelineOverrides] = useState<Record<string, { start: number | null; end: number | null }>>({});
  const [subpartTimelineOverrides, setSubpartTimelineOverrides] = useState<Record<string, { start: number | null; end: number | null }>>({});
  const [draggingPartId, setDraggingPartId] = useState<string | null>(null);
  const dragStateRef = useRef<{ partId: string; duration: number; offsetSec: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ partId: string; time: number } | null>(null);
  const [partStartInput, setPartStartInput] = useState<Record<string, string>>({});
  const [partEndInput, setPartEndInput] = useState<Record<string, string>>({});
  const [subpartStartInput, setSubpartStartInput] = useState<Record<string, string>>({});
  const [subpartEndInput, setSubpartEndInput] = useState<Record<string, string>>({});
  const [manualTimeInput, setManualTimeInput] = useState<Record<string, string>>({});
  const [openSubpartsPartId, setOpenSubpartsPartId] = useState<string | null>(null);
  const [manualRowCount, setManualRowCount] = useState(1);
  const [partRowOverrides, setPartRowOverrides] = useState<Record<string, number>>({});
  const [assignmentHistory, setAssignmentHistory] = useState<Record<string, Array<{ prev: AssignmentValue | undefined; label: string; at: string }>>>({});
  const [openHistoryTarget, setOpenHistoryTarget] = useState<string | null>(null);

  
  const timelineLength = useMemo(() => {
    const times: number[] = [];
    parts.forEach((part) => {
      const override = partTimelineOverrides[part.id];
      const start = override?.start ?? part.timepoint_seconds ?? null;
      const end = override?.end ?? part.timepoint_end_seconds ?? null;
      if (start !== null) times.push(start);
      if (end !== null) times.push(end);
      if (start !== null && end === null) times.push(start + 10);
    });
    Object.values(subpartsByPart).flat().forEach((sub) => {
      const override = subpartTimelineOverrides[sub.id];
      const start = override?.start ?? sub.timepoint_seconds ?? null;
      const end = override?.end ?? sub.timepoint_end_seconds ?? null;
      if (start !== null) times.push(start);
      if (end !== null) times.push(end);
      if (start !== null && end === null) times.push(start + 10);
    });
    const maxTime = times.length ? Math.max(...times) : 0;
    if (musicDuration && Number.isFinite(musicDuration)) return Math.max(musicDuration, maxTime, 10);
    return Math.max(manualTimelineLength, maxTime, 10);
  }, [musicDuration, manualTimelineLength, parts, subpartsByPart, partTimelineOverrides, subpartTimelineOverrides]);
useEffect(() => {
    return () => {
      audioCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!draggingPartId) return;
    const handleMove = (event: MouseEvent) => {
      if (!timelineRef.current || !dragStateRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const raw = ratio * timelineLength - dragStateRef.current.offsetSec;
      const duration = dragStateRef.current.duration;
      const start = Math.max(0, Math.min(timelineLength - duration, raw));
      const snapped = Math.round(start);
      setPartStartEnd(dragStateRef.current.partId, snapped, snapped + duration);
      setDragPreview({ partId: dragStateRef.current.partId, time: snapped });
    };
    const handleUp = () => {
      setDraggingPartId(null);
      dragStateRef.current = null;
      setDragPreview(null);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingPartId, timelineLength]);

  const handleAudioReady = (audio: HTMLAudioElement | null) => {
    if (audioCleanupRef.current) audioCleanupRef.current();
    if (!audio) {
      setMusicDuration(null);
      audioCleanupRef.current = null;
      return;
    }
    const update = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : null;
      setMusicDuration(duration);
    };
    audio.addEventListener("loadedmetadata", update);
    audio.addEventListener("durationchange", update);
    update();
    audioCleanupRef.current = () => {
      audio.removeEventListener("loadedmetadata", update);
      audio.removeEventListener("durationchange", update);
    };
  };

  const assignedMarkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(assignments).forEach((value) => {
      if (typeof value === "string") {
        counts[value] = (counts[value] || 0) + 1;
      } else if (value?.markId) {
        counts[value.markId] = (counts[value.markId] || 0) + 1;
      }
    });
    return counts;
  }, [assignments]);

  useEffect(() => {
    if (rows.length === 0) {
      const firstRow = { id: uuid(), label: "Row 1", note: "", marks: [] };
      setRows([firstRow]);
      setActiveRowId(firstRow.id);
    }
  }, [rows.length]);

  useEffect(() => {
    if (customTitle) return;
    const title = `${new Date().toLocaleString(undefined, { timeZone: DEFAULT_TIMEZONE, timeZoneName: "short" })} · ${performanceTitle || "Performance"}`;
    setSessionTitle(title);
  }, [performanceTitle, customTitle]);

  const getPartStartEnd = useCallback((part: PartItem) => {
    const override = partTimelineOverrides[part.id];
    const start = override?.start ?? part.timepoint_seconds ?? null;
    const end = override?.end ?? part.timepoint_end_seconds ?? null;
    return { start, end };
  }, [partTimelineOverrides]);

  const setPartStartEnd = (partId: string, start: number | null, end: number | null) => {
    setPartTimelineOverrides((prev) => ({
      ...prev,
      [partId]: { start, end },
    }));
  };

  const setSubpartStartEnd = (subpartId: string, start: number | null, end: number | null) => {
    setSubpartTimelineOverrides((prev) => ({
      ...prev,
      [subpartId]: { start, end },
    }));
  };

  const updateSubpartTimepoints = async (sub: SubpartItem, start: number | null, end: number | null) => {
    const prevStart = sub.timepoint_seconds ?? null;
    const prevEnd = sub.timepoint_end_seconds ?? null;
    setSubpartStartEnd(sub.id, start, end);
    setSubpartsByPart((prev) => {
      const next = { ...prev };
      const updatedList = (next[sub.part_id] || []).map((item) =>
        item.id === sub.id ? { ...item, timepoint_seconds: start, timepoint_end_seconds: end } : item
      );
      next[sub.part_id] = updatedList.sort((a, b) => {
        const aStart = typeof a.timepoint_seconds === "number" ? a.timepoint_seconds : Number.POSITIVE_INFINITY;
        const bStart = typeof b.timepoint_seconds === "number" ? b.timepoint_seconds : Number.POSITIVE_INFINITY;
        if (aStart !== bStart) return aStart - bStart;
        return (a.order ?? 0) - (b.order ?? 0);
      });
      return next;
    });
    try {
      const res = await fetch(`/api/subparts/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timepoint_seconds: start,
          timepoint_end_seconds: end,
        }),
      });
      if (!res.ok) throw new Error("Failed to update timepoint");
      const updated = await res.json();
      if (updated) {
        setSubpartsByPart((prev) => {
          const next = { ...prev };
          next[sub.part_id] = (next[sub.part_id] || []).map((item) =>
            item.id === sub.id ? { ...item, ...updated } : item
          );
          return next;
        });
      }
      window.dispatchEvent(new CustomEvent("subparts-updated", { detail: { partId: sub.part_id } }));
    } catch (err) {
      setSubpartStartEnd(sub.id, prevStart, prevEnd);
      setSubpartsByPart((prev) => {
        const next = { ...prev };
        const updatedList = (next[sub.part_id] || []).map((item) =>
          item.id === sub.id ? { ...item, timepoint_seconds: prevStart, timepoint_end_seconds: prevEnd } : item
        );
        next[sub.part_id] = updatedList;
        return next;
      });
      console.error(err);
      alert("Failed to update timepoints");
    }
  };

  const getSubpartStartEnd = (sub: SubpartItem) => {
    const override = subpartTimelineOverrides[sub.id];
    const parent = parts.find((p) => p.id === sub.part_id);
    const parentTimes = parent ? getPartStartEnd(parent) : { start: null, end: null };
    const start = override?.start ?? sub.timepoint_seconds ?? parentTimes.start ?? null;
    const end = override?.end ?? sub.timepoint_end_seconds ?? parentTimes.end ?? null;
    return { start, end };
  };

  useEffect(() => {
    if (!performanceId) return;
    const fetchSubparts = async () => {
      const entries = await Promise.all(
        parts.map(async (part) => {
          const res = await fetch(`/api/subparts?partId=${part.id}`);
          if (!res.ok) return [part.id, []] as const;
          const data = await res.json();
          return [part.id, data || []] as const;
        })
      );
      const map: Record<string, SubpartItem[]> = {};
      entries.forEach(([partId, list]) => {
        map[partId] = list;
      });
      setSubpartsByPart(map);
    };
    fetchSubparts();
  }, [performanceId, parts]);

  useEffect(() => {
    if (!parts || parts.length === 0) return;
    setPartRowOverrides((prev) => {
      const next = { ...prev };
      parts.forEach((part) => {
        if (part.timeline_row !== null && part.timeline_row !== undefined) {
          next[part.id] = part.timeline_row;
        }
      });
      return next;
    });
  }, [parts]);

  useEffect(() => {
    if (!performanceId) return;
    const fetchSessions = async () => {
      const res = await fetch(
        allSessions ? "/api/marking-sessions?all=1" : `/api/marking-sessions?performanceId=${performanceId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSessionList(data || []);
    };
    fetchSessions();
  }, [performanceId, allSessions]);

  useEffect(() => {
    const fetchPerformanceNames = async () => {
      const res = await fetch("/api/performances");
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, string> = {};
      (data || []).forEach((perf: any) => {
        map[perf.id] = perf.title || "Performance";
      });
      setPerformanceNameMap(map);
    };
    fetchPerformanceNames();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (event.code === "Space") {
        event.preventDefault();
        const rowId = activeRowId || rows[0]?.id;
        if (!rowId) return;
        const mark: Mark = {
          id: uuid(),
          time: currentTime,
          createdAt: new Date().toISOString(),
        };
        setRows((prev) =>
          prev.map((row) =>
            row.id === rowId ? { ...row, marks: [...row.marks, mark] } : row
          )
        );
      }

      if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        const nextIndex = rows.length + 1;
        const newRow: MarkRow = {
          id: uuid(),
          label: `Row ${nextIndex}`,
          note: "",
          marks: [],
        };
        setRows((prev) => {
          const idx = activeRowId ? prev.findIndex((r) => r.id === activeRowId) : prev.length - 1;
          if (idx === -1) return [...prev, newRow];
          const next = [...prev];
          next.splice(idx + 1, 0, newRow);
          return next;
        });
        setActiveRowId(newRow.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRowId, currentTime, rows]);

  const handleDropToRow = (rowId: string, markId: string) => {
    setRows((prev) => {
      let moved: Mark | null = null;
      const removed = prev.map((row) => {
        const nextMarks = row.marks.filter((m) => {
          if (m.id === markId) {
            moved = m;
            return false;
          }
          return true;
        });
        return { ...row, marks: nextMarks };
      });
      if (!moved) return prev;
      return removed.map((row) =>
        row.id === rowId ? { ...row, marks: [...row.marks, moved!] } : row
      );
    });
  };

  const handleRemoveMark = (rowId: string, markId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, marks: row.marks.filter((m) => m.id !== markId) } : row
      )
    );
  };

  const getMarkTimeById = (markId: string) => {
    for (const row of rows) {
      const mark = row.marks.find((m) => m.id === markId);
      if (mark) return mark.time;
    }
    return null;
  };

  const timelineDefaultDuration = 10;

  const partColorClasses = useMemo(() => {
    const palette = [
      "bg-amber-50 border-amber-300 text-amber-950",
      "bg-emerald-50 border-emerald-300 text-emerald-950",
      "bg-sky-50 border-sky-300 text-sky-950",
      "bg-rose-50 border-rose-300 text-rose-950",
      "bg-lime-50 border-lime-300 text-lime-950",
      "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-950",
      "bg-orange-50 border-orange-300 text-orange-950",
      "bg-teal-50 border-teal-300 text-teal-950",
    ];
    const map: Record<string, string> = {};
    parts.forEach((part, index) => {
      map[part.id] = palette[index % palette.length];
    });
    return map;
  }, [parts]);

  const persistSubpartOrder = async (partId: string, list: SubpartItem[]) => {
    await Promise.all(
      list.map((sub, idx) =>
        fetch(`/api/subparts/${sub.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: idx + 1 }),
        })
      )
    );
  };

  const moveSubpart = (partId: string, subpartId: string, direction: "up" | "down") => {
    setSubpartsByPart((prev) => {
      const next = { ...prev };
      const list = [...(next[partId] || [])];
      const idx = list.findIndex((s) => s.id === subpartId);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= list.length) return prev;
      const [item] = list.splice(idx, 1);
      list.splice(target, 0, item);
      next[partId] = list;
      void persistSubpartOrder(partId, list);
      return next;
    });
  };

  const timelineData = useMemo(() => {
    type TimelineItem = {
      id: string;
      name: string;
      start: number;
      end: number;
      missingEnd: boolean;
    };
    const assigned: Array<{
      id: string;
      name: string;
      start: number;
      end: number;
      missingEnd: boolean;
    }> = [];
    const unassigned: PartItem[] = [];

    parts.forEach((part) => {
      const { start, end } = getPartStartEnd(part);
      if (start === null) {
        unassigned.push(part);
        return;
      }
      const resolvedEnd = end ?? start + timelineDefaultDuration;
      assigned.push({
        id: part.id,
        name: part.name,
        start,
        end: resolvedEnd,
        missingEnd: end === null,
      });
    });

    assigned.sort((a, b) => a.start - b.start);

    const rows: Array<{ id: string; items: TimelineItem[]; manual?: boolean }> = [];
    const ensureRow = (index: number) => {
      while (rows.length <= index) {
        rows.push({ id: uuid(), items: [] });
      }
    };

    assigned.forEach((item) => {
      const sourcePart = parts.find((p) => p.id === item.id);
      const overrideRow = partRowOverrides[item.id] ?? sourcePart?.timeline_row ?? undefined;
      if (overrideRow !== undefined) {
        ensureRow(overrideRow);
        rows[overrideRow].items.push(item);
        return;
      }
      let placed = false;
      for (const row of rows) {
        const last = row.items[row.items.length - 1];
        if (!last || item.start >= last.end) {
          row.items.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push({ id: uuid(), items: [item] });
      }
    });

    rows.forEach((row) => row.items.sort((a, b) => a.start - b.start));

    const autoRowCount = rows.length;
    if (manualRowCount > rows.length) {
      for (let i = rows.length; i < manualRowCount; i += 1) {
        rows.push({ id: uuid(), items: [], manual: true });
      }
    }

    return { rows, unassigned, autoRowCount };
  }, [parts, manualRowCount, partRowOverrides, getPartStartEnd]);

  const orderedPartsForList = useMemo(() => {
    const items = [...parts];
    return items.sort((a, b) => {
      const aStart = getPartStartEnd(a).start;
      const bStart = getPartStartEnd(b).start;
      if (typeof aStart === "number" && typeof bStart === "number") {
        if (aStart !== bStart) return aStart - bStart;
        return (a.order || 0) - (b.order || 0);
      }
      if (typeof aStart === "number") return -1;
      if (typeof bStart === "number") return 1;
      return (a.order || 0) - (b.order || 0);
    });
  }, [parts, getPartStartEnd]);

  const normalizeAssignments = (rowsSnapshot: MarkRow[], raw: Record<string, AssignmentValue>) => {
    const normalized: Record<string, AssignmentValue> = {};
    Object.entries(raw || {}).forEach(([key, value]) => {
      if (typeof value === "string") {
        const mark = rowsSnapshot.flatMap((r) => r.marks).find((m) => m.id === value);
        if (mark) {
          normalized[key] = { markId: value, time: mark.time };
        }
      } else if (value && typeof value === "object") {
        normalized[key] = value;
      }
    });
    return normalized;
  };

  const getAssignedTime = (targetKey: string) => {
    const value = assignments[targetKey];
    if (!value) return null;
    if (typeof value === "string") {
      for (const row of rows) {
        const mark = row.marks.find((m) => m.id === value);
        if (mark) return mark.time;
      }
      return null;
    }
    return value.time ?? null;
  };

  const getTimeFromAssignment = (value: AssignmentValue | undefined) => {
    if (!value) return null;
    if (typeof value === "string") {
      for (const row of rows) {
        const mark = row.marks.find((m) => m.id === value);
        if (mark) return mark.time;
      }
      return null;
    }
    return value.time ?? null;
  };

  const pushAssignmentHistory = (targetKey: string, prevValue: AssignmentValue | undefined) => {
    const [type, id, field] = targetKey.split(":") as ["part" | "subpart", string, "start" | "end"];
    const existingTime = getExistingTime(type, id, field);
    const prevTime = getTimeFromAssignment(prevValue);
    const displayTime = prevTime ?? existingTime;
    const label = displayTime !== null ? formatTime(displayTime) : "Unassigned";
    const at = new Date().toLocaleString(undefined, { timeZone: DEFAULT_TIMEZONE, timeZoneName: "short" });
    setAssignmentHistory((prev) => ({
      ...prev,
      [targetKey]: [{ prev: prevValue, label, at }, ...(prev[targetKey] || [])].slice(0, 6),
    }));
  };

  const undoAssignment = (targetKey: string) => {
    const history = assignmentHistory[targetKey];
    if (!history || history.length === 0) return;
    const [latest, ...rest] = history;
    setAssignmentHistory((prev) => ({ ...prev, [targetKey]: rest }));
    setAssignments((prev) => {
      const next = { ...prev };
      if (!latest.prev) {
        delete next[targetKey];
      } else {
        next[targetKey] = latest.prev;
      }
      return next;
    });
  };

  const getExistingTime = (type: "part" | "subpart", id: string, field: "start" | "end") => {
    if (type === "part") {
      const part = parts.find((p) => p.id === id);
      if (!part) return null;
      return field === "start" ? part.timepoint_seconds ?? null : part.timepoint_end_seconds ?? null;
    }
    const sub = Object.values(subpartsByPart).flat().find((s) => s.id === id);
    if (!sub) return null;
    return field === "start" ? sub.timepoint_seconds ?? null : sub.timepoint_end_seconds ?? null;
  };

  const assignMarkToTarget = (targetKey: string, markId: string) => {
    const [type, id, field] = targetKey.split(":") as ["part" | "subpart", string, "start" | "end"];
    const markTime = rows.flatMap((r) => r.marks).find((m) => m.id === markId)?.time;
    if (markTime === undefined) return;

    const oppositeField: "start" | "end" = field === "start" ? "end" : "start";
    const assignedOpposite = getAssignedTime(`${type}:${id}:${oppositeField}`);
    const existingOpposite = getExistingTime(type, id, oppositeField);
    const oppositeTime = assignedOpposite ?? existingOpposite;

    if (field === "end" && oppositeTime !== null && markTime < oppositeTime) {
      alert("End time cannot be before start time.");
      return;
    }
    if (field === "start" && oppositeTime !== null && markTime > oppositeTime) {
      alert("Start time cannot be after end time.");
      return;
    }

    setAssignments((prev) => {
      pushAssignmentHistory(targetKey, prev[targetKey]);
      return { ...prev, [targetKey]: { markId, time: markTime } };
    });
  };

  const clearAssignment = (targetKey: string) => {
    setAssignments((prev) => {
      pushAssignmentHistory(targetKey, prev[targetKey]);
      const next = { ...prev };
      delete next[targetKey];
      return next;
    });
  };

  const renderTimeTarget = (type: "part" | "subpart", id: string, field: "start" | "end") => {
    const targetKey = `${type}:${id}:${field}`;
    const assignedValue = assignments[targetKey];
    const assignedMarkId = typeof assignedValue === "string" ? assignedValue : assignedValue?.markId;
    const assignedTime = getAssignedTime(targetKey);
    const existingTime = getExistingTime(type, id, field);
    const showTime = assignedTime !== null ? assignedTime : existingTime;
    const history = assignmentHistory[targetKey] || [];

    return (
      <div
        className={`relative border border-dashed rounded px-2 py-1 text-xs flex flex-wrap items-center gap-2 ${
          assignedMarkId ? "border-emerald-400 bg-emerald-50" : "border-gray-300 bg-white"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const markId = e.dataTransfer.getData("markId");
          if (!markId) return;
          assignMarkToTarget(targetKey, markId);
        }}
      >
        <span className="text-gray-500 uppercase">{field}</span>
        <span className="font-semibold text-gray-800">
          {showTime !== null ? formatTime(showTime) : "--:--"}
        </span>
        <input
          value={manualTimeInput[targetKey] ?? ""}
          onChange={(e) =>
            setManualTimeInput((prev) => ({ ...prev, [targetKey]: e.target.value }))
          }
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const parsed = parseTimeString(manualTimeInput[targetKey] ?? "");
            if (parsed === null) return;
            setAssignments((prev) => ({
              ...prev,
              [targetKey]: { time: parsed },
            }));
            setManualTimeInput((prev) => ({ ...prev, [targetKey]: "" }));
          }}
          placeholder="mm:ss"
          className="px-1 py-0.5 border border-gray-200 rounded text-[10px] w-14"
        />
        {assignedMarkId && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white">
            Chip
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => undoAssignment(targetKey)}
              className="text-[10px] text-gray-700 hover:text-gray-900"
              title="Undo last change"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => setOpenHistoryTarget((prev) => (prev === targetKey ? null : targetKey))}
            className="text-[10px] text-gray-500 hover:text-gray-700"
            title="History"
          >
            Log
          </button>
          {assignedMarkId && (
            <button
              onClick={() => clearAssignment(targetKey)}
              className="text-red-600 hover:text-red-800"
              title="Remove"
            >
              x
            </button>
          )}
        </div>
        {openHistoryTarget === targetKey && (
          <div className="absolute right-0 top-full mt-1 w-44 rounded border border-gray-200 bg-white shadow-lg p-2 text-[10px] text-gray-600 z-20">
            {history.length === 0 && <div>No history yet</div>}
            {history.map((entry, idx) => (
              <div key={`${entry.at}-${idx}`} className="border-b border-gray-100 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
                <div className="font-semibold text-gray-800">{entry.label}</div>
                <div>{entry.at}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleSaveSession = async () => {
    const payload = {
      performance_id: performanceId,
      title: sessionTitle || "Marking Session",
      rows,
      assignments,
    };
    const res = await fetch("/api/marking-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created = await res.json();
      setSessionList((prev) => [created, ...prev]);
    }
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      const updatesByPart: Record<string, any> = {};
      const updatesBySubpart: Record<string, any> = {};

      Object.entries(assignments).forEach(([key, value]) => {
        const [type, id, field] = key.split(":") as ["part" | "subpart", string, "start" | "end"];
        const markId = typeof value === "string" ? value : value?.markId;
        const markTime = typeof value === "string"
          ? rows.flatMap((r) => r.marks).find((m) => m.id === value)?.time
          : value?.time;
        if (markTime === undefined || markTime === null) return;
        if (type === "part") {
          updatesByPart[id] = updatesByPart[id] || {};
          updatesByPart[id][field === "start" ? "timepoint_seconds" : "timepoint_end_seconds"] = markTime;
        } else {
          updatesBySubpart[id] = updatesBySubpart[id] || {};
          updatesBySubpart[id][field === "start" ? "timepoint_seconds" : "timepoint_end_seconds"] = markTime;
        }
      });

      const updatedParts: PartItem[] = [];
      const updatedSubparts: SubpartItem[] = [];
      await Promise.all(
        Object.entries(updatesByPart).map(async ([partId, payload]) => {
          const res = await fetch(`/api/parts/${partId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const updated = await res.json();
            updatedParts.push(updated);
          }
        })
      );

      await Promise.all(
        Object.entries(updatesBySubpart).map(async ([subpartId, payload]) => {
          const res = await fetch(`/api/subparts/${subpartId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const updated = await res.json();
            if (updated) updatedSubparts.push(updated);
          }
        })
      );

      if (updatedParts.length > 0) {
        onPartsUpdated(
          parts.map((part) => updatedParts.find((u) => u.id === part.id) || part)
        );
      }
      if (updatedSubparts.length > 0) {
        setSubpartsByPart((prev) => {
          const next = { ...prev };
          updatedSubparts.forEach((sub) => {
            next[sub.part_id] = (next[sub.part_id] || []).map((s) =>
              s.id === sub.id ? { ...s, ...sub } : s
            );
          });
          return next;
        });
      }
    } finally {
      setSaving(false);
    }
  };
  const handleSaveTimeline = async () => {
    setSaving(true);
    try {
      const updatesByPart: Record<string, any> = {};
      const updatesBySubpart: Record<string, any> = {};

      parts.forEach((part) => {
        const { start, end } = getPartStartEnd(part);
        const rowOverride = partRowOverrides[part.id] ?? part.timeline_row ?? null;
        if (start !== null || rowOverride !== null) {
          updatesByPart[part.id] = {
            timepoint_seconds: start,
            timepoint_end_seconds: end ?? null,
            timeline_row: rowOverride,
          };
        } else if (part.timeline_row !== null && part.timeline_row !== undefined) {
          updatesByPart[part.id] = {
            timeline_row: null,
          };
        }
      });

      Object.values(subpartsByPart).flat().forEach((sub) => {
        const override = subpartTimelineOverrides[sub.id];
        const start = override?.start ?? sub.timepoint_seconds ?? null;
        const end = override?.end ?? sub.timepoint_end_seconds ?? null;
        if (start !== null) {
          updatesBySubpart[sub.id] = {
            timepoint_seconds: start,
            timepoint_end_seconds: end ?? null,
          };
        }
      });

      const updatedParts: PartItem[] = [];
      await Promise.all(
        Object.entries(updatesByPart).map(async ([partId, payload]) => {
          const res = await fetch(`/api/parts/${partId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const updated = await res.json();
            updatedParts.push(updated);
          }
        })
      );

      await Promise.all(
        Object.entries(updatesBySubpart).map(async ([subpartId, payload]) => {
          await fetch(`/api/subparts/${subpartId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        })
      );

      if (updatedParts.length > 0) {
        onPartsUpdated(
          parts.map((part) => updatedParts.find((u) => u.id === part.id) || part)
        );
      }
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="w-full -mx-4 px-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-lg font-semibold text-gray-900">Timeline</div>
            <div className="ml-auto flex items-center gap-2">
              {!musicDuration && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>Timeline length (sec)</span>
                  <input
                    type="number"
                    min={10}
                    value={manualTimelineLength}
                    onChange={(e) => setManualTimelineLength(parseInt(e.target.value || "0", 10) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              )}
              <button
                onClick={() => setManualRowCount((prev) => prev + 1)}
                className="px-3 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
              >
                Add Row
              </button>
              <button
                onClick={handleSaveTimeline}
                disabled={saving}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save Timeline"}
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Drag parts to move them. Drop chips or type times to set Start/End.
          </div>
          <div className="mt-3 space-y-4">
            {timelineData.rows.map((row, rowIndex) => (
              <div key={row.id} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <span>Row {rowIndex + 1}</span>
                  {rowIndex >= timelineData.autoRowCount && row.items.length === 0 && (
                    <button
                      onClick={() =>
                        setManualRowCount((prev) => Math.max(1, prev - 1))
                      }
                      className="ml-auto text-[11px] text-gray-500 hover:text-gray-800"
                    >
                      Remove row
                    </button>
                  )}
                </div>
                <div
                  ref={rowIndex === 0 ? timelineRef : undefined}
                  className="relative h-36 border border-gray-200 rounded bg-gray-50 overflow-visible"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const partId = e.dataTransfer.getData("partId");
                    if (!partId) return;
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    const start = Math.max(0, Math.min(timelineLength - timelineDefaultDuration, Math.round(ratio * timelineLength)));
                    const part = parts.find((p) => p.id === partId);
                    const { start: existingStart, end: existingEnd } = part ? getPartStartEnd(part) : { start: null, end: null };
                    const duration = existingStart !== null && existingEnd !== null ? existingEnd - existingStart : timelineDefaultDuration;
                    setPartStartEnd(partId, start, start + Math.max(1, duration));
                    setPartRowOverrides((prev) => ({ ...prev, [partId]: rowIndex }));
                  }}
                >
                  {row.items.map((item) => {
                    const left = (item.start / timelineLength) * 100;
                    const width = ((item.end - item.start) / timelineLength) * 100;
                    const part = parts.find((p) => p.id === item.id);
                    const subparts = part ? subpartsByPart[part.id] || [] : [];
                    const orderedSubparts = [...subparts].sort((a, b) => {
                      const aStart = getSubpartStartEnd(a).start ?? Number.POSITIVE_INFINITY;
                      const bStart = getSubpartStartEnd(b).start ?? Number.POSITIVE_INFINITY;
                      if (aStart !== bStart) return aStart - bStart;
                      return a.title.localeCompare(b.title);
                    });
                    const partColor = partColorClasses[item.id] || "bg-white border-gray-300 text-gray-900";
                    const { start, end } = part ? getPartStartEnd(part) : { start: null, end: null };
                    return (
                      <div
                        key={item.id}
                        className={`absolute top-2 h-[120px] rounded border px-3 py-2 shadow-sm cursor-move ${partColor} ${
                          item.missingEnd ? "border-blue-400" : ""
                        }`}
                        style={{ left: `${left}%`, width: `${Math.max(4, width)}%` }}
                        onMouseDown={(e) => {
                          const target = e.target as HTMLElement;
                          if (["INPUT", "TEXTAREA", "BUTTON"].includes(target.tagName)) return;
                          if (!timelineRef.current) return;
                          const rect = timelineRef.current.getBoundingClientRect();
                          const ratio = (e.clientX - rect.left) / rect.width;
                          const offsetSec = ratio * timelineLength - item.start;
                          dragStateRef.current = {
                            partId: item.id,
                            duration: item.end - item.start,
                            offsetSec,
                          };
                          setDraggingPartId(item.id);
                          setDragPreview({ partId: item.id, time: item.start });
                        }}
                      >
                        {dragPreview?.partId === item.id && (
                          <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-gray-900 text-white text-[10px]">
                            {formatTimeDetailed(dragPreview.time)}
                          </div>
                        )}
                        <div className="text-sm font-semibold truncate">{item.name}</div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                          <div
                            className={`border border-dashed rounded px-1 py-0.5 ${
                              item.missingEnd ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white"
                            }`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const markId = e.dataTransfer.getData("markId");
                              if (!markId) return;
                              const markTime = getMarkTimeById(markId);
                              if (markTime === null) return;
                              const nextEnd = end !== null && markTime > end ? markTime : end;
                              setPartStartEnd(item.id, markTime, nextEnd);
                            }}
                          >
                            Start:
                            <input
                              className="ml-1 w-12 bg-transparent"
                              value={partStartInput[item.id] ?? (start !== null ? formatTime(start) : "")}
                              onChange={(e) => {
                                const nextValue = e.target.value;
                                setPartStartInput((prev) => ({ ...prev, [item.id]: nextValue }));
                                const parsed = parseTimeString(nextValue);
                                if (parsed === null) return;
                                if (end !== null && parsed > end) return;
                                setPartStartEnd(item.id, parsed, end);
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                const value = parseTimeString(partStartInput[item.id] ?? "");
                                if (value === null) return;
                                if (end !== null && value > end) return;
                                setPartStartEnd(item.id, value, end);
                                setPartStartInput((prev) => ({ ...prev, [item.id]: "" }));
                              }}
                            />
                          </div>
                          <div
                            className={`border border-dashed rounded px-1 py-0.5 ${
                              item.missingEnd ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white"
                            }`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const markId = e.dataTransfer.getData("markId");
                              if (!markId) return;
                              const markTime = getMarkTimeById(markId);
                              if (markTime === null) return;
                              if (start !== null && markTime < start) return;
                              setPartStartEnd(item.id, start, markTime);
                            }}
                          >
                            End:
                            <input
                              className="ml-1 w-12 bg-transparent"
                              value={partEndInput[item.id] ?? (end !== null ? formatTime(end) : "")}
                              onChange={(e) => {
                                const nextValue = e.target.value;
                                setPartEndInput((prev) => ({ ...prev, [item.id]: nextValue }));
                                const parsed = parseTimeString(nextValue);
                                if (parsed === null) return;
                                if (start !== null && parsed < start) return;
                                setPartStartEnd(item.id, start, parsed);
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                const value = parseTimeString(partEndInput[item.id] ?? "");
                                if (value === null) return;
                                if (start !== null && value < start) return;
                                setPartStartEnd(item.id, start, value);
                                setPartEndInput((prev) => ({ ...prev, [item.id]: "" }));
                              }}
                            />
                          </div>
                        </div>
                        {subparts.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {orderedSubparts.map((sub) => (
                                <span
                                  key={sub.id}
                                  className="px-2 py-0.5 rounded-full bg-white/80 text-[10px] border border-gray-200"
                                  title={sub.title}
                                >
                                  {sub.title}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() =>
                                setOpenSubpartsPartId((prev) => (prev === item.id ? null : item.id))
                              }
                              className="mt-2 text-[11px] text-blue-700 hover:text-blue-900 underline"
                            >
                              {openSubpartsPartId === item.id ? "Hide subparts" : "Subparts"}
                            </button>
                          </div>
                        )}
                        {openSubpartsPartId === item.id && (
                          <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 relative">
                            <button
                              onClick={() => setOpenSubpartsPartId(null)}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center text-sm"
                              aria-label="Close subparts"
                            >
                              ×
                            </button>
                            <div className="text-xs font-semibold text-gray-800 mb-2 pr-6">
                              Subparts for {item.name}
                            </div>
                            <div className="space-y-2">
                              {orderedSubparts.map((sub) => {
                                const subTimes = getSubpartStartEnd(sub);
                                return (
                                  <div key={sub.id} className="flex items-center gap-2 text-xs">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-800 truncate">{sub.title}</div>
                                      <div className="mt-1 flex items-center gap-1">
                                        <input
                                          className="w-12 bg-white border border-gray-200 rounded px-1"
                                          value={subpartStartInput[sub.id] ?? (subTimes.start !== null ? formatTime(subTimes.start) : "")}
                                          onChange={(e) =>
                                            setSubpartStartInput((prev) => ({ ...prev, [sub.id]: e.target.value }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key !== "Enter") return;
                                            const value = parseTimeString(subpartStartInput[sub.id] ?? "");
                                            if (value === null) return;
                                            if (subTimes.end !== null && value > subTimes.end) return;
                                            updateSubpartTimepoints(sub, value, subTimes.end);
                                            setSubpartStartInput((prev) => ({ ...prev, [sub.id]: "" }));
                                          }}
                                        />
                                        <input
                                          className="w-12 bg-white border border-gray-200 rounded px-1"
                                          value={subpartEndInput[sub.id] ?? (subTimes.end !== null ? formatTime(subTimes.end) : "")}
                                          onChange={(e) =>
                                            setSubpartEndInput((prev) => ({ ...prev, [sub.id]: e.target.value }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key !== "Enter") return;
                                            const value = parseTimeString(subpartEndInput[sub.id] ?? "");
                                            if (value === null) return;
                                            if (subTimes.start !== null && value < subTimes.start) return;
                                            updateSubpartTimepoints(sub, subTimes.start, value);
                                            setSubpartEndInput((prev) => ({ ...prev, [sub.id]: "" }));
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <button
                                        onClick={() => moveSubpart(item.id, sub.id, "up")}
                                        className="px-2 py-0.5 border border-gray-200 rounded text-[10px]"
                                      >
                                        Up
                                      </button>
                                      <button
                                        onClick={() => moveSubpart(item.id, sub.id, "down")}
                                        className="px-2 py-0.5 border border-gray-200 rounded text-[10px]"
                                      >
                                        Down
                                      </button>
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
              </div>
            ))}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-600">Unassigned</div>
              <div className="flex flex-wrap gap-2">
                {timelineData.unassigned.length === 0 && (
                  <div className="text-xs text-gray-500">All parts assigned</div>
                )}
                {timelineData.unassigned.map((part) => (
                  <div
                    key={part.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("partId", part.id)}
                    className={`px-2 py-1 rounded text-xs cursor-move ${partColorClasses[part.id] || "bg-gray-200 text-gray-800"}`}
                  >
                    {part.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xl font-bold text-gray-900 mb-2">Parts & Subparts</div>
          <div className="text-xs text-gray-500 mb-4">
            Drop time chips onto Start/End. Only dropped chips change timepoints when saved.
          </div>
          <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
            {orderedPartsForList.map((part) => (
              <div key={part.id} className="border border-gray-200 rounded-lg p-3">
                <div className="font-semibold text-gray-900 mb-2">{part.name}</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {renderTimeTarget("part", part.id, "start")}
                  {renderTimeTarget("part", part.id, "end")}
                </div>
                {(subpartsByPart[part.id] || []).length > 0 && (
                  <div className="mt-2 space-y-2">
                    {([...subpartsByPart[part.id]]).sort((a, b) => {
                      const aStart = typeof a.timepoint_seconds === "number" ? a.timepoint_seconds : Number.POSITIVE_INFINITY;
                      const bStart = typeof b.timepoint_seconds === "number" ? b.timepoint_seconds : Number.POSITIVE_INFINITY;
                      if (aStart !== bStart) return aStart - bStart;
                      return (a.order ?? 0) - (b.order ?? 0);
                    }).map((sub) => (
                      <div key={sub.id} className="border border-gray-100 rounded p-2 bg-gray-50">
                        <div className="text-sm font-semibold text-gray-800">{sub.title}</div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {renderTimeTarget("subpart", sub.id, "start")}
                          {renderTimeTarget("subpart", sub.id, "end")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubpartTitle[part.id] || ""}
                    onChange={(e) =>
                      setNewSubpartTitle((prev) => ({ ...prev, [part.id]: e.target.value }))
                    }
                    placeholder="Add subpart"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <button
                    onClick={async () => {
                      const title = (newSubpartTitle[part.id] || "").trim();
                      if (!title) return;
                      const nextOrder = (subpartsByPart[part.id] || []).length + 1;
                      const res = await fetch("/api/subparts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ part_id: part.id, title, order: nextOrder }),
                      });
                      if (res.ok) {
                        const created = await res.json();
                        setSubpartsByPart((prev) => ({
                          ...prev,
                          [part.id]: [...(prev[part.id] || []), created].sort((a, b) => {
                            const aStart = typeof a.timepoint_seconds === "number" ? a.timepoint_seconds : Number.POSITIVE_INFINITY;
                            const bStart = typeof b.timepoint_seconds === "number" ? b.timepoint_seconds : Number.POSITIVE_INFINITY;
                            if (aStart !== bStart) return aStart - bStart;
                            return (a.order ?? 0) - (b.order ?? 0);
                          }),
                        }));
                        setNewSubpartTitle((prev) => ({ ...prev, [part.id]: "" }));
                      }
                    }}
                    className="px-2 py-1 bg-gray-900 text-white rounded text-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xl font-bold text-gray-900">Marking Session</div>
            <div className="ml-auto flex gap-2 items-center">
              <input
                value={sessionTitle}
                onChange={(e) => {
                  setSessionTitle(e.target.value);
                  setCustomTitle(true);
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
                placeholder="Session title"
              />
              <button
                onClick={handleSaveSession}
                className="px-3 py-1 bg-gray-900 text-white rounded text-sm"
              >
                Save Session
              </button>
              <button
                onClick={handleApply}
                disabled={saving}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Apply Timepoints"}
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Hotkeys: Space = mark time, E = new row. Works while music is playing or paused.
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Music length: {musicDuration ? formatTime(musicDuration) : "ï¿½"}
          </div>
          <div className="mt-3 bg-gray-50 border border-dashed border-gray-300 rounded p-3 text-xs text-gray-500">
            Waveform view: not available yet. We can add a waveform preview in a follow-up.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={selectedSessionId}
              onChange={async (e) => {
                const id = e.target.value;
                setSelectedSessionId(id);
                if (!id) return;
                const res = await fetch(`/api/marking-sessions/${id}`);
                if (!res.ok) return;
                const data = await res.json();
                setSessionTitle(data.title || "Marking Session");
                setCustomTitle(true);
                const nextRows = (data.rows || []).map((row: MarkRow) => ({
                  ...row,
                  note: row.note || "",
                }));
                setRows(nextRows);
                setAssignments(normalizeAssignments(nextRows, data.assignments || {}));
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">Load saved session...</option>
              {sessionList.map((sess) => (
                <option key={sess.id} value={sess.id}>
                  {sess.title || "Untitled"} ï¿½ {performanceNameMap[sess.performance_id] || "Performance"} ï¿½ {new Date(sess.created_at).toLocaleString(undefined, { timeZone: DEFAULT_TIMEZONE, timeZoneName: "short" })}
                </option>
              ))}
            </select>
            <label className="text-xs text-gray-600 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSessions}
                onChange={(e) => setAllSessions(e.target.checked)}
                className="h-4 w-4"
              />
              Show sessions from all performances
            </label>
            <button
              onClick={() => {
                const firstRow = { id: uuid(), label: "Row 1", note: "", marks: [] };
                setRows([firstRow]);
                setActiveRowId(firstRow.id);
                setAssignments({});
                setSelectedSessionId("");
                setCustomTitle(false);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              New Session
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-lg font-semibold text-gray-900 mb-3">Mark Chips</div>
          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.id}
                onClick={() => setActiveRowId(row.id)}
                className={`border rounded-lg p-3 cursor-pointer ${
                  activeRowId === row.id ? "border-blue-400 bg-blue-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setActiveRowId(row.id)}
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      activeRowId === row.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {row.label}
                  </button>
                  <span className="text-xs text-gray-500">Drop chips into the empty slot to organize.</span>
                  {rows.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRows((prev) => prev.filter((r) => r.id !== row.id));
                        if (activeRowId === row.id) {
                          const fallback = rows.find((r) => r.id !== row.id);
                          setActiveRowId(fallback ? fallback.id : null);
                        }
                      }}
                      className="ml-auto text-xs text-red-600 hover:text-red-800"
                    >
                      Delete Row
                    </button>
                  )}
                </div>
                <input
                  value={row.note || ""}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, note: e.target.value } : r))
                    )
                  }
                  placeholder="Row notes..."
                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs mb-2"
                />
                <div className="flex flex-wrap gap-2">
                  {row.marks.map((mark) => {
                    const usage = assignedMarkCounts[mark.id] || 0;
                    const colorClass =
                      usage >= 2
                        ? "bg-gray-200 text-gray-700"
                        : usage === 1
                          ? "bg-yellow-200 text-yellow-900"
                          : "bg-indigo-100 text-indigo-800";
                    return (
                    <div
                      key={mark.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("markId", mark.id);
                      }}
                      className={`px-2 py-1 rounded text-xs cursor-move ${colorClass}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{formatTime(mark.time)}</span>
                        <button
                          onClick={() => handleRemoveMark(row.id, mark.id)}
                          className="text-[10px] text-gray-600 hover:text-gray-800"
                          title="Remove chip"
                        >
                          ï¿½
                        </button>
                      </div>
                    </div>
                    );
                  })}
                  <div
                    className="px-2 py-1 border border-dashed border-gray-300 rounded text-xs text-gray-500"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const markId = e.dataTransfer.getData("markId");
                      if (!markId) return;
                      handleDropToRow(row.id, markId);
                    }}
                  >
                    Empty slot
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                  Times:{" "}
                  {row.marks.length === 0
                    ? "ï¿½"
                    : row.marks.map((m) => formatTime(m.time)).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <MusicPlayer
            musicUrl={musicUrl || undefined}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onAudioReady={handleAudioReady}
            audioRef={audioRef}
          />
        </div>
        </div>
      </div>
    </div>
  );
}

















