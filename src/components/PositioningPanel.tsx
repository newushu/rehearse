"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AppLogo } from "@/components/AppLogo";

interface RosterStudent {
  student_id: string;
  name: string;
  part_name: string | null;
}

interface PositionEntry {
  student_id: string;
  name: string;
  x: number;
  y: number;
  id?: string;
}

interface PositioningPanelProps {
  performanceId: string;
  partId: string;
  partName?: string | null;
  partDescription?: string | null;
  partTimepointSeconds?: number | null;
  partTimepointEndSeconds?: number | null;
  isGroup?: boolean;
  onSavePositions: (positions: PositionEntry[]) => Promise<void>;
}

const GRID_COLS = 12;
const GRID_ROWS = 9;
const CELL_SIZE = 64;

type FrontDirection = "bottom" | "top";

// Generate initials with conflict detection
function generateInitials(name: string, allNames: string[]): string {
  if (!name || name.length === 0) return "?";
  
  const firstLetter = name.charAt(0).toUpperCase();
  
  // Check if any other name starts with the same letter
  const conflicts = allNames.filter(
    (n) => n !== name && n.charAt(0).toUpperCase() === firstLetter
  );
  
  if (conflicts.length > 0) {
    // Use first 2 letters if conflicts exist
    return name.slice(0, 2).toUpperCase();
  }
  
  return firstLetter;
}

export function PositioningPanel({
  performanceId,
  partId,
  partName = null,
  partDescription = null,
  partTimepointSeconds = null,
  partTimepointEndSeconds = null,
  isGroup = true,
  onSavePositions,
}: PositioningPanelProps) {
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [positions, setPositions] = useState<PositionEntry[]>([]);
  const [draggedStudent, setDraggedStudent] = useState<string | null>(null);
  const [draggedFromGrid, setDraggedFromGrid] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frontDirection, setFrontDirection] = useState<FrontDirection>("bottom");
  const [lastSavedTime, setLastSavedTime] = useState<number>(Date.now());
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [gridScale, setGridScale] = useState(1);
  const baseWidth = GRID_COLS * CELL_SIZE;
  const baseHeight = GRID_ROWS * CELL_SIZE;
  const autoSaveIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = React.useRef(false);
  const [subparts, setSubparts] = useState<Array<{ id: string; title: string; description?: string | null; mode?: string; timepoint_seconds?: number | null; timepoint_end_seconds?: number | null }>>([]);
  const [selectedSubpartId, setSelectedSubpartId] = useState<string | null>(null);
  const [subpartPositions, setSubpartPositions] = useState<Record<string, PositionEntry[]>>({});
  const [subpartOrder, setSubpartOrder] = useState<Record<string, Array<{ id: string; student_id: string; student_name: string }>>>({});
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [draggingSubpartId, setDraggingSubpartId] = useState<string | null>(null);
  const [editingPartName, setEditingPartName] = useState(false);
  const [partNameDraft, setPartNameDraft] = useState(partName || "");
  const [partNameSaving, setPartNameSaving] = useState(false);
  const [editingPartNotes, setEditingPartNotes] = useState(false);
  const [partNotesDraft, setPartNotesDraft] = useState(partDescription || "");
  const [partNotesSaving, setPartNotesSaving] = useState(false);
  const [editingPartTime, setEditingPartTime] = useState(false);
  const [partStartMin, setPartStartMin] = useState("");
  const [partStartSec, setPartStartSec] = useState("");
  const [partEndMin, setPartEndMin] = useState("");
  const [partEndSec, setPartEndSec] = useState("");
  const [partTimeSaving, setPartTimeSaving] = useState(false);
  const [partTimeOverride, setPartTimeOverride] = useState<{ start: number | null; end: number | null } | null>(null);
  const [sourceOptions, setSourceOptions] = useState<Array<{ key: string; label: string }>>([]);
  const [selectedSourceKey, setSelectedSourceKey] = useState("");
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [applyingQuick, setApplyingQuick] = useState(false);

  const fetchSubparts = useCallback(async () => {
    try {
      const subRes = await fetch(`/api/subparts?partId=${partId}`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubparts(subData || []);
        const ids = new Set((subData || []).map((s: any) => s.id));
        if ((subData || []).length === 0 || (selectedSubpartId && !ids.has(selectedSubpartId))) {
          setSelectedSubpartId(null);
        }
      }
    } catch (err) {
      console.error("Error fetching subparts:", err);
    }
  }, [partId, selectedSubpartId]);

  const fetchRosterOnly = useCallback(async () => {
    try {
      const rosterRes = await fetch(`/api/performances/${performanceId}/roster`);
      if (!rosterRes.ok) throw new Error("Failed to fetch roster");
      const rosterData = await rosterRes.json();
      const partRoster = rosterData.filter(
        (s: any) => s.part_id === partId || !s.part_id
      );
      setRoster(partRoster);
    } catch (err) {
      console.error("Error fetching roster:", err);
    }
  }, [performanceId, partId]);

  // Fetch roster, existing positions, and performance orientation
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch performance orientation
        const perfRes = await fetch(`/api/performances/${performanceId}`);
        if (perfRes.ok) {
          const perf = await perfRes.json();
          if (perf.stage_orientation) {
            setFrontDirection(perf.stage_orientation === "top" ? "top" : "bottom");
          }
        }

        // Fetch roster
        await fetchRosterOnly();

        // Fetch subparts
        await fetchSubparts();

        // Fetch existing positions
        const posRes = await fetch(`/api/stage-positions?partId=${partId}`);
        if (!posRes.ok) throw new Error("Failed to fetch positions");
        const posData = await posRes.json();
        setPositions(
          posData.map((p: any) => ({
            student_id: p.student_id || "",
            name: p.student_name || "Unknown",
            x: p.x,
            y: p.y,
            id: p.id,
          }))
        );
        
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [performanceId, partId, isGroup, fetchSubparts, fetchRosterOnly]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchRosterOnly();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchRosterOnly]);

  useEffect(() => {
    const el = gridWrapRef.current;
    if (!el) return;
    const updateScale = () => {
      const width = el.clientWidth;
      if (!width) return;
      setGridScale(Math.min(1, width / baseWidth));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [baseWidth]);

  useEffect(() => {
    setPartNameDraft(partName || "");
  }, [partName]);

  useEffect(() => {
    setPartNotesDraft(partDescription || "");
  }, [partDescription]);

  useEffect(() => {
    setPartTimeOverride({
      start: typeof partTimepointSeconds === "number" ? partTimepointSeconds : null,
      end: typeof partTimepointEndSeconds === "number" ? partTimepointEndSeconds : null,
    });
    const startSplit = splitTime(partTimepointSeconds ?? null);
    const endSplit = splitTime(partTimepointEndSeconds ?? null);
    setPartStartMin(startSplit.min);
    setPartStartSec(startSplit.sec);
    setPartEndMin(endSplit.min);
    setPartEndSec(endSplit.sec);
  }, [partTimepointSeconds, partTimepointEndSeconds]);

  useEffect(() => {
    setSelectedSubpartId(null);
  }, [partId]);

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch(`/api/parts?performanceId=${performanceId}`);
      if (!res.ok) return;
      const partsData = await res.json();
      const partOptions = (partsData || []).map((p: any) => ({
        key: `part:${p.id}`,
        label: `Part: ${p.name}`,
      }));

      const subpartsEntries = await Promise.all(
        (partsData || []).map(async (p: any) => {
          const subRes = await fetch(`/api/subparts?partId=${p.id}`);
          if (!subRes.ok) return [];
          const subData = await subRes.json();
          return (subData || []).map((s: any) => ({
            key: `subpart:${s.id}`,
            label: `Subpart: ${p.name} - ${s.title}`,
          }));
        })
      );

      const subpartOptions = subpartsEntries.flat();
      setSourceOptions([...partOptions, ...subpartOptions]);
    } catch (err) {
      console.error("Error loading position sources:", err);
    }
  }, [performanceId]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const refreshSubpartsAndSources = useCallback(async () => {
    await fetchSubparts();
    await loadSources();
  }, [fetchSubparts, loadSources]);

  useEffect(() => {
    const handleFocus = () => {
      refreshSubpartsAndSources();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshSubpartsAndSources();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshSubpartsAndSources]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshSubpartsAndSources();
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [refreshSubpartsAndSources]);

  useEffect(() => {
    if (!selectedSubpartId) return;
    const fetchSubpartData = async () => {
      try {
        const [posRes, orderRes] = await Promise.all([
          fetch(`/api/subpart-positions?subpartId=${selectedSubpartId}`),
          fetch(`/api/subpart-order?subpartId=${selectedSubpartId}`),
        ]);
        if (posRes.ok) {
          const data = await posRes.json();
          setSubpartPositions((prev) => ({
            ...prev,
            [selectedSubpartId]: (data || []).map((p: any) => ({
              student_id: p.student_id || "",
              name: p.student_name || "Unknown",
              x: p.x,
              y: p.y,
              id: p.id,
            })),
          }));
        }
        if (orderRes.ok) {
          const data = await orderRes.json();
          setSubpartOrder((prev) => ({
            ...prev,
            [selectedSubpartId]: (data || []).map((item: any) => ({
              id: item.id,
              student_id: item.student_id,
              student_name: item.student_name || "Unknown",
            })),
          }));
        }
      } catch (err) {
        console.error("Error fetching subpart data:", err);
      }
    };

    fetchSubpartData();
  }, [selectedSubpartId]);

  // Auto-save effect
  useEffect(() => {
    const autoSave = async () => {
      if (!hasChangesRef.current) return;

      try {
        setSaving(true);
        if (selectedSubpartId && subparts.length > 0) {
          const payload = (subpartPositions[selectedSubpartId] || []).map((p) => ({
            subpart_id: selectedSubpartId,
            student_id: p.student_id,
            x: p.x,
            y: p.y,
          }));
          await fetch("/api/subpart-positions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subpart_id: selectedSubpartId,
              positions: payload,
            }),
          });
        } else {
          await onSavePositions(positions);
        }
        
        await fetch(`/api/performances/${performanceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage_orientation: frontDirection }),
        });
        
        hasChangesRef.current = false;
        setLastSavedTime(Date.now());
        setError(null);
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setSaving(false);
      }
    };

    // Set up auto-save interval
    autoSaveIntervalRef.current = setInterval(autoSave, 6000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [positions, frontDirection, performanceId, onSavePositions, selectedSubpartId, subparts, subpartPositions]);

  const handleDragStart = (studentId: string, fromGrid: boolean = false) => {
    setDraggedStudent(studentId);
    setDraggedFromGrid(fromGrid);
    setDraggingOrderId(null);
  };

  const handleGridDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const toLogicalY = (displayY: number) =>
    frontDirection === "top" ? GRID_ROWS - 1 - displayY : displayY;

  const toDisplayY = (logicalY: number) =>
    frontDirection === "top" ? GRID_ROWS - 1 - logicalY : logicalY;

  const toLogicalX = (displayX: number) =>
    frontDirection === "top" ? GRID_COLS - 1 - displayX : displayX;

  const toDisplayX = (logicalX: number) =>
    frontDirection === "top" ? GRID_COLS - 1 - logicalX : logicalX;

  const clampToGrid = (value: number, max: number) => {
    if (Number.isNaN(value)) return 0;
    if (value < 0) return 0;
    if (value > max) return max;
    return value;
  };

  const formatDuration = (start: number | null | undefined, end: number | null | undefined) => {
    if (typeof start !== "number" || typeof end !== "number") return "";
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
    const total = Math.max(0, end - start);
    const mins = Math.floor(total / 60);
    const secs = Math.round(total % 60);
    return `${mins}m ${secs}s`;
  };

  const formatTime = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "--:--";
    const total = Math.max(0, Math.floor(value));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  const handleGridDrop = async (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    if (!draggedStudent) return;
    if (subparts.length > 0 && !canPosition) return;

    let student = roster.find((s) => s.student_id === draggedStudent);
    
    // If dragging from grid, get name from positions
    if (draggedFromGrid && !student) {
      const pos = positions.find((p) => p.student_id === draggedStudent);
      if (pos) {
        student = {
          student_id: draggedStudent,
          name: pos.name,
          part_name: null,
        };
      }
    }
    
    if (!student) return;

    const activePositions =
      selectedSubpartId && subparts.length > 0
        ? subpartPositions[selectedSubpartId] || []
        : positions;

    // Always remove old position first (whether from roster or grid)
    const filtered = activePositions.filter((p) => p.student_id !== draggedStudent);

    // Add at new position
    const newPositions = [
      ...filtered,
      {
        student_id: draggedStudent,
        name: student.name,
        x: toLogicalX(x),
        y: toLogicalY(y),
      },
    ];
    if (selectedSubpartId && subparts.length > 0) {
      setSubpartPositions((prev) => ({ ...prev, [selectedSubpartId]: newPositions }));
      await addMissingAssignedFromPositions(
        newPositions,
        subpartOrder[selectedSubpartId] || []
      );
    } else {
      setPositions(newPositions);
    }
    hasChangesRef.current = true;

    setDraggedStudent(null);
    setDraggedFromGrid(false);
  };

  const removeFromStage = (studentId: string) => {
    const persistPositions = async (nextPositions: PositionEntry[]) => {
      try {
        if (selectedSubpartId && subparts.length > 0) {
          await fetch("/api/subpart-positions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subpart_id: selectedSubpartId,
              positions: nextPositions.map((p) => ({
                subpart_id: selectedSubpartId,
                student_id: p.student_id,
                x: p.x,
                y: p.y,
              })),
            }),
          });
        } else {
          await onSavePositions(nextPositions);
        }
        hasChangesRef.current = false;
        setLastSavedTime(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save positions");
        hasChangesRef.current = true;
      }
    };

    if (selectedSubpartId && subparts.length > 0) {
      const current = subpartPositions[selectedSubpartId] || [];
      const nextPositions = current.filter((p) => p.student_id !== studentId);
      setSubpartPositions((prev) => ({
        ...prev,
        [selectedSubpartId]: nextPositions,
      }));
      persistPositions(nextPositions);
    } else {
      const nextPositions = positions.filter((p) => p.student_id !== studentId);
      setPositions(nextPositions);
      persistPositions(nextPositions);
    }
    hasChangesRef.current = true;
  };

  const resetPositions = () => {
    if (selectedSubpartId && subparts.length > 0) {
      setSubpartPositions((prev) => ({ ...prev, [selectedSubpartId]: [] }));
    } else {
      setPositions([]);
    }
    hasChangesRef.current = true;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Save positions
    if (selectedSubpartId && subparts.length > 0) {
        const payload = (subpartPositions[selectedSubpartId] || []).map((p) => ({
          subpart_id: selectedSubpartId,
          student_id: p.student_id,
          x: p.x,
          y: p.y,
        }));
        await fetch("/api/subpart-positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subpart_id: selectedSubpartId,
            positions: payload,
          }),
        });
      } else {
        await onSavePositions(positions);
      }
      
      // Save stage orientation at performance level
      await fetch(`/api/performances/${performanceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_orientation: frontDirection }),
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save positions");
    } finally {
      setSaving(false);
    }
  };

  const persistOrder = useCallback(async (items: Array<{ id: string; student_id: string; student_name: string }>) => {
    if (!selectedSubpartId) return;
    setSubpartOrder((prev) => ({ ...prev, [selectedSubpartId]: items }));
    await fetch("/api/subpart-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        items.map((item, idx) => ({
          subpart_id: selectedSubpartId,
          student_id: item.student_id,
          order: idx + 1,
        }))
      ),
    });
  }, [selectedSubpartId]);

  const addToOrder = async (studentId: string, studentName: string) => {
    if (!selectedSubpartId) return;
    const next = [...orderItems, { id: `temp-${Date.now()}`, student_id: studentId, student_name: studentName }];
    await persistOrder(next);
  };

  const addMissingAssignedFromPositions = useCallback(async (
    positionsList: PositionEntry[],
    currentItems: Array<{ id: string; student_id: string; student_name: string }>
  ) => {
    if (!selectedSubpartId) return;
    const existing = new Set(currentItems.map((item) => item.student_id));
    const missing = positionsList
      .filter((pos) => pos.student_id && !existing.has(pos.student_id))
      .map((pos) => ({
        id: `temp-${Date.now()}-${pos.student_id}`,
        student_id: pos.student_id,
        student_name: pos.name,
      }));
    if (missing.length === 0) return;
    const next = [...currentItems, ...missing];
    await persistOrder(next);
  }, [persistOrder, selectedSubpartId]);

  const handleReorderSubparts = useCallback(async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= subparts.length) return;
    const next = [...subparts];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setSubparts(next);
    try {
      await Promise.all(
        next.map((sub, idx) =>
          fetch(`/api/subparts/${sub.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: idx + 1 }),
          })
        )
      );
    } catch (err) {
      console.error("Error reordering subparts:", err);
      await fetchSubparts();
    }
  }, [subparts, fetchSubparts]);

  useEffect(() => {
    if (!selectedSubpartId) return;
    const positionsList = subpartPositions[selectedSubpartId] || [];
    const items = subpartOrder[selectedSubpartId] || [];
    if (positionsList.length === 0) return;
    addMissingAssignedFromPositions(positionsList, items);
  }, [selectedSubpartId, subpartPositions, subpartOrder, addMissingAssignedFromPositions]);

  const loadSourcePositions = async () => {
    if (!selectedSourceKey) return [];
    const [type, id] = selectedSourceKey.split(":");
    if (!id) return [];
    const url =
      type === "subpart"
        ? `/api/subpart-positions?subpartId=${id}`
        : `/api/stage-positions?partId=${id}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to fetch source positions");
    }
    const data = await res.json();
    return (data || []).map((p: any) => ({
      student_id: p.student_id || "",
      name: p.student_name || "Unknown",
      x: p.x,
      y: p.y,
    })) as PositionEntry[];
  };

  const applyQuickPositions = async () => {
    if (!selectedSourceKey) return;
    setApplyingQuick(true);
    try {
      const sourcePositions = await loadSourcePositions();
      const mapped = sourcePositions.map((p) => {
        const flippedX = flipHorizontal ? GRID_COLS - 1 - p.x : p.x;
        return {
          ...p,
          x: clampToGrid(flippedX, GRID_COLS - 1),
          y: clampToGrid(p.y, GRID_ROWS - 1),
        };
      });

      if (selectedSubpartId && subparts.length > 0) {
        setSubpartPositions((prev) => ({ ...prev, [selectedSubpartId]: mapped }));
        await addMissingAssignedFromPositions(
          mapped,
          subpartOrder[selectedSubpartId] || []
        );
        await fetch("/api/subpart-positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subpart_id: selectedSubpartId,
            positions: mapped.map((p) => ({
              subpart_id: selectedSubpartId,
              student_id: p.student_id,
              x: p.x,
              y: p.y,
            })),
          }),
        });
      } else {
        setPositions(mapped);
        await onSavePositions(mapped);
      }

      hasChangesRef.current = false;
      setLastSavedTime(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply positions");
    } finally {
      setApplyingQuick(false);
    }
  };

  const activeSubpart = subparts.find((s) => s.id === selectedSubpartId);
  const orderedSubparts = useMemo(() => {
    const list = [...subparts];
    return list.sort((a, b) => {
      const aStart = typeof a.timepoint_seconds === "number" ? a.timepoint_seconds : Number.POSITIVE_INFINITY;
      const bStart = typeof b.timepoint_seconds === "number" ? b.timepoint_seconds : Number.POSITIVE_INFINITY;
      if (aStart !== bStart) return aStart - bStart;
      return (a.title || "").localeCompare(b.title || "");
    });
  }, [subparts]);
  const subpartDuration = activeSubpart
    ? formatDuration(activeSubpart.timepoint_seconds as any, activeSubpart.timepoint_end_seconds as any)
    : "";
  const effectivePartStart = partTimeOverride?.start ?? partTimepointSeconds ?? null;
  const effectivePartEnd = partTimeOverride?.end ?? partTimepointEndSeconds ?? null;
  const partDuration = formatDuration(effectivePartStart, effectivePartEnd);
  const subpartMode = activeSubpart?.mode || "position";
  const canPosition = subparts.length === 0 || subpartMode !== "order";
  const canOrder = subparts.length > 0;
  const orderItems = useMemo(
    () => (selectedSubpartId ? subpartOrder[selectedSubpartId] || [] : []),
    [selectedSubpartId, subpartOrder]
  );
  const orderIndexByStudentId = useMemo(() => {
    const map: Record<string, number> = {};
    orderItems.forEach((item, idx) => {
      if (item.student_id) map[item.student_id] = idx + 1;
    });
    return map;
  }, [orderItems]);

  const activePositions =
    selectedSubpartId && subparts.length > 0
      ? subpartPositions[selectedSubpartId] || []
      : positions;
  const positionedStudents = new Set(activePositions.map((p) => p.student_id));
  const availableStudents = roster;

  // Generate legend with initials (deduplicated)
  const uniqueStudents = new Map<string, typeof positions[0]>();
  activePositions.forEach((pos) => {
    if (!uniqueStudents.has(pos.student_id)) {
      uniqueStudents.set(pos.student_id, pos);
    }
  });
  
  const legendData = Array.from(uniqueStudents.values()).map((pos) => ({
    student_id: pos.student_id,
    name: pos.name,
    initials: generateInitials(pos.name, Array.from(uniqueStudents.values()).map((p) => p.name)),
  }));

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Roster List */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hidden lg:block">
          <h3 className="font-semibold text-gray-900 mb-2">
            Students ({availableStudents.length})
          </h3>
          <p className="text-[11px] text-gray-500 mb-3">
            Positioned students stay here so you can assign them to subparts.
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableStudents.length === 0 ? (
              <p className="text-gray-500 text-sm">No students yet.</p>
            ) : (
              availableStudents.map((student) => {
                const isPositioned = positionedStudents.has(student.student_id);
                return (
                  <div
                    key={student.student_id}
                    draggable
                    onDragStart={() => handleDragStart(student.student_id, false)}
                    className={`p-3 rounded border cursor-move hover:shadow-md transition-all ${
                      isPositioned
                        ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
                        : "bg-white border-blue-200 hover:border-blue-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-gray-900">
                        {student.name}
                      </p>
                      {isPositioned && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                          Positioned
                        </span>
                      )}
                    </div>
                    {student.part_name && (
                      <p className="text-xs text-gray-600">{student.part_name}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {canOrder && selectedSubpartId && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">
                Assigned Students
              </h4>
              <p className="text-[11px] text-gray-500 mb-2">
                Drag students here to assign them to this subpart.
              </p>
              <div
                className="bg-white p-2 rounded border border-gray-200"
                onDragOver={(e) => e.preventDefault()}
                onDrop={async () => {
                  if (draggingOrderId) return;
                  if (!draggedStudent) return;
                  if (orderItems.some((item) => item.student_id === draggedStudent)) return;
                  const student = roster.find((s) => s.student_id === draggedStudent);
                  if (!student) return;
                  await addToOrder(student.student_id, student.name);
                }}
              >
                <div className="space-y-2">
                  {orderItems.length === 0 ? (
                    <div className="text-xs text-gray-500 border border-dashed border-gray-300 rounded p-2 text-center">
                      Drop students here
                    </div>
                  ) : (
                    orderItems.map((item, idx) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => {
                          setDraggingOrderId(item.id);
                          setDraggedStudent(null);
                          setDraggedFromGrid(false);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async () => {
                          if (!draggingOrderId) return;
                          const fromIdx = orderItems.findIndex((i) => i.id === draggingOrderId);
                          const toIdx = orderItems.findIndex((i) => i.id === item.id);
                          if (fromIdx < 0 || toIdx < 0) return;
                          const next = [...orderItems];
                          const [moved] = next.splice(fromIdx, 1);
                          next.splice(toIdx, 0, moved);
                          await persistOrder(next);
                          setDraggingOrderId(null);
                        }}
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-2 py-1"
                      >
                        <div className="text-xs text-gray-900">
                          <span className="text-gray-500 mr-1">{idx + 1}.</span>
                          {item.student_name}
                        </div>
                        <button
                          onClick={async () => {
                            const next = orderItems.filter((i) => i.id !== item.id);
                            await persistOrder(next);
                          }}
                          className="text-[10px] text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {!selectedSubpartId && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">
                Assigned Students (Part)
              </h4>
              <div className="bg-white p-2 rounded border border-gray-200">
                {positions.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center">No positioned students</div>
                ) : (
                  <div className="space-y-2">
                    {positions.map((pos, idx) => (
                      <div
                        key={pos.id || `${pos.student_id}-${idx}`}
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-2 py-1"
                      >
                        <div className="text-xs text-gray-900">{pos.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stage Grid */}
        <div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <AppLogo size={24} className="border border-gray-200 bg-white text-gray-400" />
                  <h3 className="font-semibold text-gray-900">Stage Layout</h3>
                  {editingPartName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={partNameDraft}
                        onChange={(e) => setPartNameDraft(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={async () => {
                          if (!partId) return;
                          const nextName = partNameDraft.trim();
                          if (!nextName) return;
                          setPartNameSaving(true);
                          try {
                            const res = await fetch(`/api/parts/${partId}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ name: nextName }),
                            });
                            if (!res.ok) throw new Error("Failed to update part name");
                            setEditingPartName(false);
                          } catch (err) {
                            alert(
                              err instanceof Error
                                ? err.message
                                : "Failed to update part name"
                            );
                          } finally {
                            setPartNameSaving(false);
                          }
                        }}
                        disabled={partNameSaving}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:bg-gray-400"
                      >
                        {partNameSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPartName(false);
                          setPartNameDraft(partName || "");
                        }}
                        className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xl font-semibold text-gray-900">
                        {partName ? partName : ""}
                      </span>
                      <button
                        onClick={() => setEditingPartName(true)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit name
                      </button>
                    </>
                  )}
                </div>
                <div className="mt-2">
                  {editingPartNotes ? (
                    <div className="space-y-2">
                      <textarea
                        value={partNotesDraft}
                        onChange={(e) => setPartNotesDraft(e.target.value)}
                        rows={2}
                        placeholder="Add part notes..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            if (!partId) return;
                            setPartNotesSaving(true);
                            try {
                              const res = await fetch(`/api/parts/${partId}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ description: partNotesDraft || null }),
                              });
                              if (!res.ok) throw new Error("Failed to update part notes");
                              setEditingPartNotes(false);
                            } catch (err) {
                              alert(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to update part notes"
                              );
                            } finally {
                              setPartNotesSaving(false);
                            }
                          }}
                          disabled={partNotesSaving}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:bg-gray-400"
                        >
                          {partNotesSaving ? "Saving..." : "Save notes"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingPartNotes(false);
                            setPartNotesDraft(partDescription || "");
                          }}
                          className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className="text-sm text-gray-600">
                        {partDescription ? partDescription : "No notes yet."}
                      </p>
                      <button
                        onClick={() => setEditingPartNotes(true)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit notes
                      </button>
                    </div>
                  )}
                  {partDuration && (
                    <div className="mt-1 text-xs text-gray-500">
                      Duration: {partDuration}
                    </div>
                  )}
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-600">Timepoint</div>
                      {!editingPartTime && (
                        <button
                          onClick={() => setEditingPartTime(true)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Edit time
                        </button>
                      )}
                    </div>
                    {editingPartTime ? (
                      <div className="mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[10px] text-gray-500">Start (m / s)</div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                value={partStartMin}
                                onChange={(e) => setPartStartMin(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={partStartSec}
                                onChange={(e) => setPartStartSec(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500">End (m / s)</div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                value={partEndMin}
                                onChange={(e) => setPartEndMin(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={partEndSec}
                                onChange={(e) => setPartEndSec(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const start = composeSeconds(partStartMin, partStartSec);
                              const end = composeSeconds(partEndMin, partEndSec);
                              if (start !== null && end !== null && end < start) {
                                alert("End time must be after start time.");
                                return;
                              }
                              setPartTimeSaving(true);
                              try {
                                const res = await fetch(`/api/parts/${partId}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    timepoint_seconds: start,
                                    timepoint_end_seconds: end,
                                  }),
                                });
                                if (!res.ok) throw new Error("Failed to update timepoint");
                                setPartTimeOverride({ start, end });
                                setEditingPartTime(false);
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "Failed to update timepoint");
                              } finally {
                                setPartTimeSaving(false);
                              }
                            }}
                            disabled={partTimeSaving}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-xs disabled:bg-gray-400"
                          >
                            {partTimeSaving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              const startSplit = splitTime(effectivePartStart);
                              const endSplit = splitTime(effectivePartEnd);
                              setPartStartMin(startSplit.min);
                              setPartStartSec(startSplit.sec);
                              setPartEndMin(endSplit.min);
                              setPartEndSec(endSplit.sec);
                              setEditingPartTime(false);
                            }}
                            className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-gray-600">
                        {formatTime(effectivePartStart)} - {formatTime(effectivePartEnd)}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Front of stage: {frontDirection === "bottom" ? "Bottom" : "Top"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Subpart</span>
                <select
                  value={selectedSubpartId || ""}
                  onChange={(e) => setSelectedSubpartId(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                  disabled={subparts.length === 0}
                >
                  <option value="">Part positions</option>
                  {subparts.length === 0 && (
                    <option value="" disabled>
                      No subparts yet
                    </option>
                  )}
                  {orderedSubparts.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.title}
                    </option>
                  ))}
                </select>
                {activeSubpart?.description && (
                  <span className="text-[10px] text-gray-500">
                    {activeSubpart.description}
                  </span>
                )}
                {subpartDuration && (
                  <span className="text-[10px] text-gray-500">
                    Duration: {subpartDuration}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3 text-xs">
                  {saving && (
                    <span className="text-blue-600 font-semibold">Auto-saving...</span>
                  )}
                  {!saving && hasChangesRef.current && (
                    <span className="text-orange-600 font-semibold">
                      Unsaved changes (auto-saves in 6s)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={frontDirection}
                    onChange={(e) => setFrontDirection(e.target.value as FrontDirection)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bottom">Front - Bottom</option>
                    <option value="top">Front - Top</option>
                  </select>
                  <button
                    onClick={resetPositions}
                    className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 font-medium text-sm"
                  >
                    Reset All
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium text-sm"
                  >
                    {saving ? "Saving..." : "Save Positions"}
                  </button>
                </div>
              </div>
            </div>

            {subparts.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Subparts</div>
                <div className="flex flex-wrap gap-2">
                  {orderedSubparts.map((sub, idx) => (
                    <button
                      key={sub.id}
                      draggable
                      onDragStart={() => setDraggingSubpartId(sub.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!draggingSubpartId) return;
                        const fromIdx = subparts.findIndex((s) => s.id === draggingSubpartId);
                        const toIdx = subparts.findIndex((s) => s.id === sub.id);
                        if (fromIdx < 0 || toIdx < 0) return;
                        handleReorderSubparts(fromIdx, toIdx);
                        setDraggingSubpartId(null);
                      }}
                      onClick={() => setSelectedSubpartId(sub.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        selectedSubpartId === sub.id
                          ? "bg-blue-600 text-white border-blue-700"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                      title="Drag to reorder"
                    >
                      {idx + 1}. {sub.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            {activePositions.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Legend</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {legendData.map((item) => (
                    <div key={item.student_id} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {item.initials}
                      </div>
                      <span className="text-gray-700 truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="font-medium text-gray-900 text-sm mb-2">Quick Position</div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
                <select
                  value={selectedSourceKey}
                  onChange={(e) => setSelectedSourceKey(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="">Select a part or subpart...</option>
                  {sourceOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={applyQuickPositions}
                  disabled={!selectedSourceKey || applyingQuick}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:bg-gray-400"
                >
                  {applyingQuick ? "Applying..." : "Apply"}
                </button>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={flipHorizontal}
                  onChange={(e) => setFlipHorizontal(e.target.checked)}
                  className="h-4 w-4"
                />
                Horizontal flip before applying
              </label>
            </div>

            {subparts.length > 0 && (
              <div className="text-sm text-gray-700 font-medium text-center">
                {activeSubpart?.title || "Subpart"}
              </div>
            )}

            {/* Grid */}
            <div className="flex items-center justify-center gap-3">
              {orderedSubparts.length > 0 && canPosition && (
                <button
                  onClick={() => {
                    const idx = orderedSubparts.findIndex((s) => s.id === selectedSubpartId);
                    if (idx > 0) setSelectedSubpartId(orderedSubparts[idx - 1].id);
                  }}
                  disabled={!selectedSubpartId || orderedSubparts.findIndex((s) => s.id === selectedSubpartId) === 0}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 text-xs"
                >
                  Prev
                </button>
              )}
              <div
                ref={gridWrapRef}
                className="w-full overflow-hidden"
                style={{ height: baseHeight * gridScale }}
              >
                <div
                  className="border-2 border-gray-400 bg-gradient-to-b from-amber-100 to-amber-50 relative mx-auto"
                  style={{
                    width: baseWidth,
                    height: baseHeight,
                    backgroundImage: `
                  linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)
                `,
                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                    transform: `scale(${gridScale})`,
                    transformOrigin: "top left",
                  }}
                  onDragOver={handleGridDragOver}
                >
                  {/* Front of Stage Indicator */}
                  {frontDirection === "bottom" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500"></div>
                  )}
                  {frontDirection === "top" && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
                  )}

                  {/* Front Label */}
                  <div
                    className="absolute text-red-600 font-bold text-xs bg-white bg-opacity-80 px-2 py-1 rounded"
                    style={{
                      ...(frontDirection === "bottom" && { bottom: 5, left: "50%", transform: "translateX(-50%)" }),
                      ...(frontDirection === "top" && { top: 5, left: "50%", transform: "translateX(-50%)" }),
                    }}
                  >
                    FRONT
                  </div>

                  {selectedSubpartId && subparts.length > 0 && activePositions.length === 0 && (
                    <div className="absolute top-8 left-0 right-0 text-center text-2xl font-bold text-gray-500">
                      {activeSubpart?.title || "Subpart"}
                    </div>
                  )}

                  {/* Grid Cells */}
                  {Array.from({ length: GRID_ROWS }).map((_, y) =>
                    Array.from({ length: GRID_COLS }).map((_, x) => (
                      <div
                        key={`${x}-${y}`}
                        onDrop={(e) => handleGridDrop(e, x, y)}
                        onDragOver={handleGridDragOver}
                        className="absolute cursor-cell hover:bg-blue-100 hover:bg-opacity-30 transition-colors"
                        style={{
                          left: x * CELL_SIZE,
                          top: y * CELL_SIZE,
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                        }}
                      />
                    ))
                  )}

                  {/* Positioned Students */}
                  {activePositions.map((pos, idx) => {
                    const initials = generateInitials(pos.name, activePositions.map((p) => p.name));
                    const orderIndex = orderIndexByStudentId[pos.student_id];
                    return (
                      <div
                        key={pos.id || `${pos.student_id}-${pos.x}-${pos.y}-${idx}`}
                        draggable
                        onDragStart={() => handleDragStart(pos.student_id, true)}
                        className="absolute flex items-center justify-center group cursor-move"
                        style={{
                          left: toDisplayX(pos.x) * CELL_SIZE,
                          top: toDisplayY(pos.y) * CELL_SIZE,
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                        }}
                      >
                        <div className="relative w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg group-hover:bg-blue-600 transition-colors">
                          {initials}
                          {orderIndex ? (
                            <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center shadow">
                              {orderIndex}
                            </div>
                          ) : null}
                          <button
                            onClick={() => removeFromStage(pos.student_id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Remove from stage"
                          >
                            x
                          </button>
                        </div>
                        <div className="absolute bottom-full mb-1 whitespace-nowrap bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {pos.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {orderedSubparts.length > 0 && canPosition && (
                <button
                  onClick={() => {
                    const idx = orderedSubparts.findIndex((s) => s.id === selectedSubpartId);
                    if (idx >= 0 && idx < orderedSubparts.length - 1) setSelectedSubpartId(orderedSubparts[idx + 1].id);
                  }}
                  disabled={!selectedSubpartId || orderedSubparts.findIndex((s) => s.id === selectedSubpartId) === orderedSubparts.length - 1}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 text-xs"
                >
                  Next
                </button>
              )}
            </div>

            {canOrder && selectedSubpartId && null}

            {/* Positioned Students List */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">
                Positioned ({activePositions.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activePositions.map((pos, idx) => (
                  <div
                    key={pos.id || `${pos.student_id}-${pos.x}-${pos.y}-${idx}`}
                    className="bg-white p-2 rounded border border-green-200 text-sm"
                  >
                    <p className="font-medium text-gray-900">{pos.name}</p>
                    <p className="text-xs text-gray-600">
                      ({pos.x}, {pos.y})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



