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

interface EquipmentItem {
  id: string;
  performance_id: string;
  name: string;
  initial_side?: StageSide | null;
  created_at?: string;
}

interface EquipmentUsage {
  id: string;
  equipment_id: string;
  part_id: string;
  subpart_id: string | null;
  student_id: string;
  student_name?: string;
}

type StageSide = "OS" | "SL" | "SR";
const DEFAULT_SIDE: StageSide = "OS";

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
  const [subpartOrder, setSubpartOrder] = useState<
    Record<string, Array<{ id: string; student_id: string; student_name: string; start_side?: StageSide | null; end_side?: StageSide | null }>>
  >({});
  const [partSides, setPartSides] = useState<Record<string, Array<{ id: string; student_id: string; student_name: string; start_side?: StageSide | null; end_side?: StageSide | null }>>>({});
  const [draggingSideStudent, setDraggingSideStudent] = useState<string | null>(null);
  const [draggingSideMeta, setDraggingSideMeta] = useState<{
    student_id: string;
    field: "start_side" | "end_side";
    side: StageSide;
  } | null>(null);
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
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [equipmentUsage, setEquipmentUsage] = useState<EquipmentUsage[]>([]);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [equipmentStudentDraft, setEquipmentStudentDraft] = useState<Record<string, string>>({});
  const [allPartsForEquipment, setAllPartsForEquipment] = useState<
    Array<{ id: string; name: string; order: number; timepoint_seconds?: number | null }>
  >([]);
  const [allSubpartsByPart, setAllSubpartsByPart] = useState<
    Record<string, Array<{ id: string; title: string; part_id: string; timepoint_seconds?: number | null; order?: number | null }>>
  >({});
  const [allPartSides, setAllPartSides] = useState<
    Record<string, Array<{ student_id: string; start_side?: StageSide | null; end_side?: StageSide | null }>>
  >({});
  const [allSubpartSides, setAllSubpartSides] = useState<
    Record<string, Array<{ student_id: string; start_side?: StageSide | null; end_side?: StageSide | null }>>
  >({});

  const orderedSubparts = useMemo(() => {
    const list = [...subparts];
    return list.sort((a, b) => {
      const aStart = typeof a.timepoint_seconds === "number" ? a.timepoint_seconds : Number.POSITIVE_INFINITY;
      const bStart = typeof b.timepoint_seconds === "number" ? b.timepoint_seconds : Number.POSITIVE_INFINITY;
      if (aStart !== bStart) return aStart - bStart;
      return (a.title || "").localeCompare(b.title || "");
    });
  }, [subparts]);

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

  const fetchEquipmentData = useCallback(async () => {
    if (!performanceId) return;
    setEquipmentLoading(true);
    try {
      const [equipmentRes, usageRes] = await Promise.all([
        fetch(`/api/equipment?performanceId=${performanceId}`),
        fetch(`/api/equipment-usage?performanceId=${performanceId}`),
      ]);
      if (equipmentRes.ok) {
        const data = await equipmentRes.json();
        setEquipmentItems(data || []);
      }
      if (usageRes.ok) {
        const data = await usageRes.json();
        setEquipmentUsage(data || []);
      }
    } catch (err) {
      console.error("Error fetching equipment:", err);
    } finally {
      setEquipmentLoading(false);
    }
  }, [performanceId]);

  const fetchEquipmentParts = useCallback(async () => {
    if (!performanceId) return;
    try {
      const partsRes = await fetch(`/api/parts?performanceId=${performanceId}`);
      if (!partsRes.ok) return;
      const partsData = await partsRes.json();
      setAllPartsForEquipment(partsData || []);

      const subpartEntries = await Promise.all(
        (partsData || []).map(async (part: any) => {
          const res = await fetch(`/api/subparts?partId=${part.id}`);
          if (!res.ok) return [part.id, []] as const;
          const data = await res.json();
          return [part.id, data || []] as const;
        })
      );
      const subpartsMap: Record<string, any[]> = {};
      subpartEntries.forEach(([pid, list]) => {
        subpartsMap[pid] = list;
      });
      setAllSubpartsByPart(subpartsMap);

      const partSidesEntries = await Promise.all(
        (partsData || []).map(async (part: any) => {
          const res = await fetch(`/api/part-sides?partId=${part.id}`);
          if (!res.ok) return [part.id, []] as const;
          const data = await res.json();
          return [part.id, data || []] as const;
        })
      );
      const partSidesMap: Record<string, any[]> = {};
      partSidesEntries.forEach(([pid, list]) => {
        partSidesMap[pid] = list;
      });
      setAllPartSides(partSidesMap);

      const subpartIds = Object.values(subpartsMap).flat().map((sub: any) => sub.id);
      const subpartSidesEntries = await Promise.all(
        subpartIds.map(async (subpartId: string) => {
          const res = await fetch(`/api/subpart-order?subpartId=${subpartId}`);
          if (!res.ok) return [subpartId, []] as const;
          const data = await res.json();
          return [subpartId, data || []] as const;
        })
      );
      const subpartSidesMap: Record<string, any[]> = {};
      subpartSidesEntries.forEach(([sid, list]) => {
        subpartSidesMap[sid] = list;
      });
      setAllSubpartSides(subpartSidesMap);
    } catch (err) {
      console.error("Error fetching equipment parts:", err);
    }
  }, [performanceId]);

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
    fetchEquipmentData();
    fetchEquipmentParts();
  }, [fetchEquipmentData, fetchEquipmentParts]);

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
              start_side: item.start_side ?? DEFAULT_SIDE,
              end_side: item.end_side ?? DEFAULT_SIDE,
            })),
          }));
        }
      } catch (err) {
        console.error("Error fetching subpart data:", err);
      }
    };

    fetchSubpartData();
  }, [selectedSubpartId]);

  useEffect(() => {
    if (subparts.length > 0) return;
    const fetchPartSides = async () => {
      try {
        const res = await fetch(`/api/part-sides?partId=${partId}`);
        if (!res.ok) return;
        const data = await res.json();
        setPartSides((prev) => ({
          ...prev,
          [partId]: (data || []).map((item: any) => ({
            id: item.id,
            student_id: item.student_id,
            student_name: item.student_name || "Unknown",
            start_side: item.start_side ?? DEFAULT_SIDE,
            end_side: item.end_side ?? DEFAULT_SIDE,
          })),
        }));
      } catch (err) {
        console.error("Error fetching part sides:", err);
      }
    };
    fetchPartSides();
  }, [partId, subparts.length]);

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

  const persistOrder = useCallback(async (items: Array<{ id: string; student_id: string; student_name: string; start_side?: StageSide | null; end_side?: StageSide | null }>) => {
    if (!selectedSubpartId) return;
    setSubpartOrder((prev) => ({ ...prev, [selectedSubpartId]: items }));
    setAllSubpartSides((prev) => ({ ...prev, [selectedSubpartId]: items }));
    await fetch("/api/subpart-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        items.map((item, idx) => ({
          subpart_id: selectedSubpartId,
          student_id: item.student_id,
          order: idx + 1,
          start_side: item.start_side ?? DEFAULT_SIDE,
          end_side: item.end_side ?? DEFAULT_SIDE,
        }))
      ),
    });
  }, [selectedSubpartId]);

  const addToOrder = async (studentId: string, studentName: string) => {
    if (!selectedSubpartId) return;
    const next = [
      ...orderItems,
      {
        id: `temp-${Date.now()}`,
        student_id: studentId,
        student_name: studentName,
        start_side: DEFAULT_SIDE,
        end_side: DEFAULT_SIDE,
      },
    ];
    await persistOrder(next);
  };

  const addMissingAssignedFromPositions = useCallback(async (
    positionsList: PositionEntry[],
    currentItems: Array<{ id: string; student_id: string; student_name: string; start_side?: StageSide | null; end_side?: StageSide | null }>
  ) => {
    if (!selectedSubpartId) return;
    const existing = new Set(currentItems.map((item) => item.student_id));
    const missing = positionsList
      .filter((pos) => pos.student_id && !existing.has(pos.student_id))
      .map((pos) => ({
        id: `temp-${Date.now()}-${pos.student_id}`,
        student_id: pos.student_id,
        student_name: pos.name,
        start_side: DEFAULT_SIDE,
        end_side: DEFAULT_SIDE,
      }));
    if (missing.length === 0) return;
    const next = [...currentItems, ...missing];
    await persistOrder(next);
  }, [persistOrder, selectedSubpartId]);

  const orderItems = useMemo(
    () => (selectedSubpartId ? subpartOrder[selectedSubpartId] || [] : []),
    [selectedSubpartId, subpartOrder]
  );
  const partSideItems = useMemo(
    () => (subparts.length === 0 ? partSides[partId] || [] : []),
    [partSides, partId, subparts.length]
  );

  const persistPartSides = useCallback(
    async (items: Array<{ id: string; student_id: string; student_name: string; start_side?: StageSide | null; end_side?: StageSide | null }>) => {
      setPartSides((prev) => ({ ...prev, [partId]: items }));
      setAllPartSides((prev) => ({ ...prev, [partId]: items }));
      await fetch("/api/part-sides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          items.map((item) => ({
            part_id: partId,
            student_id: item.student_id,
            start_side: item.start_side ?? DEFAULT_SIDE,
            end_side: item.end_side ?? DEFAULT_SIDE,
          }))
        ),
      });
    },
    [partId]
  );

  const ensureRosterSides = useCallback(async () => {
    const base = subparts.length > 0 ? orderItems : partSideItems;
    if (roster.length === 0) return;
    const existing = new Map(base.map((item) => [item.student_id, item]));
    const next = [...base];

    let prevEndByStudent = new Map<string, StageSide>();
    if (subparts.length > 0 && selectedSubpartId) {
      const idx = orderedSubparts.findIndex((s) => s.id === selectedSubpartId);
      if (idx > 0) {
        const prevId = orderedSubparts[idx - 1]?.id;
        const prevItems = prevId ? subpartOrder[prevId] || [] : [];
        prevEndByStudent = new Map(
          prevItems.map((item) => [item.student_id, (item.end_side || DEFAULT_SIDE) as StageSide])
        );
      }
    }

    roster.forEach((student) => {
      if (existing.has(student.student_id)) return;
      const fallback = prevEndByStudent.get(student.student_id) || DEFAULT_SIDE;
      next.push({
        id: `temp-${Date.now()}-${student.student_id}`,
        student_id: student.student_id,
        student_name: student.name,
        start_side: fallback,
        end_side: fallback,
      });
    });

    if (next.length === base.length) return;
    if (subparts.length > 0) {
      await persistOrder(next);
    } else {
      await persistPartSides(next);
    }
  }, [orderItems, partSideItems, roster, subparts.length, selectedSubpartId, orderedSubparts, subpartOrder, persistOrder, persistPartSides]);

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

  useEffect(() => {
    ensureRosterSides();
  }, [ensureRosterSides]);

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

  useEffect(() => {
    if (subparts.length === 0) return;
    if (selectedSubpartId) return;
    if (orderedSubparts.length > 0) {
      setSelectedSubpartId(orderedSubparts[0].id);
    }
  }, [subparts.length, orderedSubparts, selectedSubpartId]);
  const subpartDuration = activeSubpart
    ? formatDuration(activeSubpart.timepoint_seconds as any, activeSubpart.timepoint_end_seconds as any)
    : "";
  const effectivePartStart = partTimeOverride?.start ?? partTimepointSeconds ?? null;
  const effectivePartEnd = partTimeOverride?.end ?? partTimepointEndSeconds ?? null;
  const partDuration = formatDuration(effectivePartStart, effectivePartEnd);
  const subpartMode = activeSubpart?.mode || "position";
  const canPosition = subparts.length === 0 || subpartMode !== "order";
  const canOrder = subparts.length > 0;
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
  const sideItems = subparts.length > 0 ? orderItems : partSideItems;
  const unassignedStartCount = sideItems.filter((item) => !item.start_side).length;
  const unassignedEndCount = sideItems.filter((item) => !item.end_side).length;
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
  const rosterById = useMemo(() => {
    const map = new Map<string, string>();
    roster.forEach((student) => map.set(student.student_id, student.name));
    return map;
  }, [roster]);

  const currentSegmentKey = selectedSubpartId && subparts.length > 0 ? `subpart:${selectedSubpartId}` : `part:${partId}`;

  const equipmentSegments = useMemo(() => {
    const segments: Array<{
      key: string;
      part_id: string;
      subpart_id: string | null;
      label: string;
      timepoint?: number | null;
      orderFallback: number;
    }> = [];
    allPartsForEquipment.forEach((part, partIdx) => {
      const subs = allSubpartsByPart[part.id] || [];
      if (subs.length > 0) {
        subs.forEach((sub, subIdx) => {
          segments.push({
            key: `subpart:${sub.id}`,
            part_id: part.id,
            subpart_id: sub.id,
            label: sub.title || part.name,
            timepoint: sub.timepoint_seconds ?? null,
            orderFallback: partIdx * 100 + subIdx,
          });
        });
      } else {
        segments.push({
          key: `part:${part.id}`,
          part_id: part.id,
          subpart_id: null,
          label: part.name,
          timepoint: part.timepoint_seconds ?? null,
          orderFallback: partIdx * 100,
        });
      }
    });
    return segments.sort((a, b) => {
      const aTime = typeof a.timepoint === "number" ? a.timepoint : Number.POSITIVE_INFINITY;
      const bTime = typeof b.timepoint === "number" ? b.timepoint : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return a.orderFallback - b.orderFallback;
    });
  }, [allPartsForEquipment, allSubpartsByPart]);

  const segmentIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    equipmentSegments.forEach((seg, idx) => map.set(seg.key, idx));
    return map;
  }, [equipmentSegments]);

  const segmentSides = useMemo(() => {
    const map = new Map<string, Map<string, { start_side?: StageSide | null; end_side?: StageSide | null }>>();
    equipmentSegments.forEach((seg) => {
      const items =
        seg.subpart_id && allSubpartSides[seg.subpart_id]
          ? allSubpartSides[seg.subpart_id]
          : allPartSides[seg.part_id] || [];
      const byStudent = new Map<string, { start_side?: StageSide | null; end_side?: StageSide | null }>();
      items.forEach((item) => {
        byStudent.set(item.student_id, {
          start_side: item.start_side ?? null,
          end_side: item.end_side ?? null,
        });
      });
      map.set(seg.key, byStudent);
    });
    return map;
  }, [equipmentSegments, allPartSides, allSubpartSides]);

  const usageBySegment = useMemo(() => {
    const map = new Map<string, EquipmentUsage[]>();
    equipmentUsage.forEach((usage) => {
      const key = usage.subpart_id ? `subpart:${usage.subpart_id}` : `part:${usage.part_id}`;
      const list = map.get(key) || [];
      list.push(usage);
      map.set(key, list);
    });
    return map;
  }, [equipmentUsage]);

  const usageByEquipment = useMemo(() => {
    const map = new Map<string, EquipmentUsage[]>();
    equipmentUsage.forEach((usage) => {
      const list = map.get(usage.equipment_id) || [];
      list.push(usage);
      map.set(usage.equipment_id, list);
    });
    return map;
  }, [equipmentUsage]);

  const equipmentDisplay = useMemo(() => {
    const currentIdx = segmentIndexByKey.get(currentSegmentKey) ?? -1;
    return equipmentItems.map((equipment) => {
      const usageList = usageByEquipment.get(equipment.id) || [];
      const activeUsage = usageList.find((u) => {
        const key = u.subpart_id ? `subpart:${u.subpart_id}` : `part:${u.part_id}`;
        return key === currentSegmentKey;
      });

      let startSide: StageSide | null = null;
      let endSide: StageSide | null = null;
      let activeStudentName =
        activeUsage?.student_name || (activeUsage ? rosterById.get(activeUsage.student_id) || "" : "");

      if (activeUsage) {
        const sideMap = segmentSides.get(currentSegmentKey);
        const sides = sideMap?.get(activeUsage.student_id);
        startSide = (sides?.start_side as StageSide) || null;
        endSide = (sides?.end_side as StageSide) || null;
      } else if (currentIdx >= 0) {
        let prevSide: StageSide | null = equipment.initial_side ?? null;
        for (let idx = currentIdx - 1; idx >= 0; idx -= 1) {
          const seg = equipmentSegments[idx];
          const list = usageBySegment.get(seg.key) || [];
          const usage = list.find((u) => u.equipment_id === equipment.id);
          if (!usage) continue;
          const sideMap = segmentSides.get(seg.key);
          const sides = sideMap?.get(usage.student_id);
          prevSide = (sides?.end_side as StageSide) || prevSide;
          break;
        }
        startSide = prevSide;
        endSide = null;
      }

      return {
        equipment,
        activeUsage,
        activeStudentName,
        startSide,
        endSide,
        isActive: Boolean(activeUsage),
      };
    }).sort((a, b) => Number(b.isActive) - Number(a.isActive));
  }, [
    equipmentItems,
    equipmentSegments,
    usageByEquipment,
    usageBySegment,
    segmentSides,
    segmentIndexByKey,
    currentSegmentKey,
    rosterById,
  ]);

  const uniqueSideList = useCallback(
    (list: typeof sideItems) => {
      const seen = new Set<string>();
      return list.filter((item) => {
        if (seen.has(item.student_id)) return false;
        seen.add(item.student_id);
        return true;
      });
    },
    []
  );

  useEffect(() => {
    setEquipmentStudentDraft((prev) => {
      const next = { ...prev };
      equipmentDisplay.forEach((item) => {
        if (item.activeUsage?.student_id) {
          next[item.equipment.id] = item.activeUsage.student_id;
        }
      });
      return next;
    });
  }, [equipmentDisplay]);

  const handleAddEquipment = useCallback(async () => {
    const name = newEquipmentName.trim();
    if (!name) return;
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        performance_id: performanceId,
        name,
        initial_side: null,
      }),
    });
    if (!res.ok) return;
    const created = await res.json();
    setEquipmentItems((prev) => [...prev, created]);
    setNewEquipmentName("");
  }, [newEquipmentName, performanceId]);

  const handleUpdateEquipment = useCallback(async (id: string, payload: Partial<EquipmentItem>) => {
    const res = await fetch(`/api/equipment/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setEquipmentItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)));
  }, []);

  const handleToggleEquipmentActive = useCallback(
    async (equipmentId: string, active: boolean) => {
      const segment = currentSegmentKey;
      const isSubpart = segment.startsWith("subpart:");
      const subpartId = isSubpart ? segment.replace("subpart:", "") : null;
      const selectedStudent = equipmentStudentDraft[equipmentId];
      if (active) {
        if (!selectedStudent) return;
        const res = await fetch("/api/equipment-usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            equipment_id: equipmentId,
            part_id: partId,
            subpart_id: subpartId,
            student_id: selectedStudent,
          }),
        });
        if (!res.ok) return;
        const created = await res.json();
        setEquipmentUsage((prev) => {
          const filtered = prev.filter((u) => !(u.equipment_id === equipmentId && u.part_id === partId && (u.subpart_id || null) === (subpartId || null)));
          return [
            ...filtered,
            {
              ...created,
              student_name: rosterById.get(selectedStudent) || created.student_name,
            },
          ];
        });
      } else {
        const query = new URLSearchParams({
          equipment_id: equipmentId,
          part_id: partId,
        });
        if (subpartId) query.set("subpart_id", subpartId);
        const res = await fetch(`/api/equipment-usage?${query.toString()}`, { method: "DELETE" });
        if (!res.ok) return;
        setEquipmentUsage((prev) =>
          prev.filter(
            (u) =>
              !(u.equipment_id === equipmentId && u.part_id === partId && (u.subpart_id || null) === (subpartId || null))
          )
        );
      }
    },
    [currentSegmentKey, equipmentStudentDraft, partId, rosterById]
  );

  const saveEquipmentUsage = useCallback(
    async (equipmentId: string, studentId: string) => {
      const segment = currentSegmentKey;
      const isSubpart = segment.startsWith("subpart:");
      const subpartId = isSubpart ? segment.replace("subpart:", "") : null;
      if (!studentId) return;
      const res = await fetch("/api/equipment-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: equipmentId,
          part_id: partId,
          subpart_id: subpartId,
          student_id: studentId,
        }),
      });
      if (!res.ok) return;
      const created = await res.json();
      setEquipmentUsage((prev) => {
        const filtered = prev.filter((u) => !(u.equipment_id === equipmentId && u.part_id === partId && (u.subpart_id || null) === (subpartId || null)));
        return [
          ...filtered,
          {
            ...created,
            student_name: rosterById.get(studentId) || created.student_name,
          },
        ];
      });
    },
    [currentSegmentKey, partId, rosterById]
  );

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
                const sideInfo = sideItems.find((item) => item.student_id === student.student_id);
                const startSide = sideInfo?.start_side || DEFAULT_SIDE;
                const endSide = sideInfo?.end_side || DEFAULT_SIDE;
                return (
                  <div
                    key={student.student_id}
                    draggable
                    onDragStart={() => {
                      handleDragStart(student.student_id, false);
                      setDraggingSideStudent(student.student_id);
                    }}
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
                    <div className="text-[10px] text-gray-500 mt-1">
                      Start: <span className="font-semibold text-gray-700">{startSide}</span>{" "}
                      End: <span className="font-semibold text-gray-700">{endSide}</span>
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-[11px] text-gray-500">
                  Everyone has a start and end side (OS, SL, SR).
                </p>
                {subparts.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedSubpartId) return;
                      const idx = orderedSubparts.findIndex((s) => s.id === selectedSubpartId);
                      if (idx <= 0) return;
                      const prevId = orderedSubparts[idx - 1]?.id;
                      if (!prevId) return;
                      const prevItems = subpartOrder[prevId] || [];
                      const endByStudent = new Map(
                        prevItems.map((item) => [item.student_id, item.end_side || DEFAULT_SIDE])
                      );
                      const next = orderItems.map((item) => ({
                        ...item,
                        start_side:
                          (endByStudent.get(item.student_id) as StageSide | undefined) ||
                          item.start_side ||
                          DEFAULT_SIDE,
                      }));
                      await persistOrder(next);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Set start from previous end
                  </button>
                )}
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
            <div className="flex items-start justify-center gap-3">
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

              {/* Stage Right (left of grid) */}
              <div className="space-y-3 w-48">
                {(["start_side", "end_side"] as const).map((field) => (
                  <div key={`sr-${field}`} className="bg-white border border-gray-200 rounded p-2">
                    <div className="text-[11px] font-semibold text-gray-700 mb-1">
                      Stage Right {field === "start_side" ? "Start" : "End"}
                    </div>
                    <div
                      className="border border-dashed border-gray-300 rounded p-2 min-h-[64px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async () => {
                        if (!draggingSideStudent) return;
                        const next = sideItems.map((item) =>
                          item.student_id === draggingSideStudent
                            ? { ...item, [field]: "SR" as StageSide }
                            : item
                        );
                        if (subparts.length > 0) {
                          await persistOrder(next);
                        } else {
                          await persistPartSides(next);
                        }
                        setDraggingSideStudent(null);
                        setDraggingSideMeta(null);
                      }}
                    >
                      <div className="flex flex-wrap gap-2">
                          {uniqueSideList(
                            sideItems.filter((item) => (item[field] || DEFAULT_SIDE) === "SR")
                          ).map((item, idx, list) => {
                            const active = positionedStudents.has(item.student_id);
                            return (
                              <span
                                key={`sr-${field}-${item.student_id}-${idx}`}
                                draggable
                                onDragStart={() => {
                                  setDraggingSideStudent(item.student_id);
                                  setDraggingSideMeta({ student_id: item.student_id, field, side: "SR" });
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={async () => {
                                  if (!draggingSideMeta) return;
                                  if (draggingSideMeta.field === field && draggingSideMeta.side === "SR") {
                                    const ids = list.map((entry) => entry.student_id);
                                    const from = ids.indexOf(draggingSideMeta.student_id);
                                    const to = ids.indexOf(item.student_id);
                                    if (from < 0 || to < 0 || from === to) return;
                                    const reordered = [...list];
                                    const [moved] = reordered.splice(from, 1);
                                    reordered.splice(to, 0, moved);
                                    const orderMap = new Map(
                                      reordered.map((entry, index) => [entry.student_id, index])
                                    );
                                    const next = sideItems.slice().sort((a, b) => {
                                      const aIdx = orderMap.get(a.student_id);
                                      const bIdx = orderMap.get(b.student_id);
                                      if (aIdx === undefined || bIdx === undefined) return 0;
                                      return aIdx - bIdx;
                                    });
                                    if (subparts.length > 0) {
                                      await persistOrder(next);
                                    } else {
                                      await persistPartSides(next);
                                    }
                                    setDraggingSideMeta(null);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-full text-[10px] border cursor-move ${
                                  active
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                    : "bg-gray-100 text-gray-700 border-gray-300"
                                }`}
                              >
                                {idx + 1}. {item.student_name}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-[10px] text-gray-500">
                  Start not set: {unassignedStartCount} • End not set: {unassignedEndCount}
                </div>
              </div>

              <div
                ref={gridWrapRef}
                className="w-full overflow-hidden"
                style={{ height: baseHeight * gridScale }}
              >
                <div className="mb-2 bg-white border border-gray-200 rounded p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-gray-700 mb-1">
                        Start On Stage (OS)
                      </div>
                      <div
                        className="border border-dashed border-gray-300 rounded p-2 min-h-[52px]"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async () => {
                          if (!draggingSideStudent) return;
                          const next = sideItems.map((item) =>
                            item.student_id === draggingSideStudent
                              ? { ...item, start_side: "OS" as StageSide }
                              : item
                          );
                          if (subparts.length > 0) {
                            await persistOrder(next);
                          } else {
                            await persistPartSides(next);
                          }
                          setDraggingSideStudent(null);
                          setDraggingSideMeta(null);
                        }}
                      >
                        <div className="flex flex-wrap gap-2">
                          {uniqueSideList(
                            sideItems.filter((item) => (item.start_side || DEFAULT_SIDE) === "OS")
                          ).map((item, idx) => {
                            const active = positionedStudents.has(item.student_id);
                            return (
                              <span
                                  key={`os-start-${item.student_id}-${idx}`}
                                  draggable
                                  onDragStart={() => {
                                    setDraggingSideStudent(item.student_id);
                                    setDraggingSideMeta({ student_id: item.student_id, field: "start_side", side: "OS" });
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[10px] border cursor-move ${
                                    active
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                      : "bg-gray-100 text-gray-700 border-gray-300"
                                  }`}
                                >
                                  {idx + 1}. {item.student_name}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-gray-700 mb-1">
                        End On Stage (OS)
                      </div>
                      <div
                        className="border border-dashed border-gray-300 rounded p-2 min-h-[52px]"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async () => {
                          if (!draggingSideStudent) return;
                          const next = sideItems.map((item) =>
                            item.student_id === draggingSideStudent
                              ? { ...item, end_side: "OS" as StageSide }
                              : item
                          );
                          if (subparts.length > 0) {
                            await persistOrder(next);
                          } else {
                            await persistPartSides(next);
                          }
                          setDraggingSideStudent(null);
                          setDraggingSideMeta(null);
                        }}
                      >
                        <div className="flex flex-wrap gap-2">
                          {uniqueSideList(
                            sideItems.filter((item) => (item.end_side || DEFAULT_SIDE) === "OS")
                          ).map((item, idx) => {
                            const active = positionedStudents.has(item.student_id);
                            return (
                              <span
                                  key={`os-end-${item.student_id}-${idx}`}
                                  draggable
                                  onDragStart={() => {
                                    setDraggingSideStudent(item.student_id);
                                    setDraggingSideMeta({ student_id: item.student_id, field: "end_side", side: "OS" });
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[10px] border cursor-move ${
                                    active
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                      : "bg-gray-100 text-gray-700 border-gray-300"
                                  }`}
                                >
                                  {idx + 1}. {item.student_name}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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

              {/* Stage Left (right of grid) */}
              <div className="space-y-3 w-48">
                {(["start_side", "end_side"] as const).map((field) => (
                  <div key={`sl-${field}`} className="bg-white border border-gray-200 rounded p-2">
                    <div className="text-[11px] font-semibold text-gray-700 mb-1">
                      Stage Left {field === "start_side" ? "Start" : "End"}
                    </div>
                    <div
                      className="border border-dashed border-gray-300 rounded p-2 min-h-[64px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async () => {
                        if (!draggingSideStudent) return;
                        const next = sideItems.map((item) =>
                          item.student_id === draggingSideStudent
                            ? { ...item, [field]: "SL" as StageSide }
                            : item
                        );
                        if (subparts.length > 0) {
                          await persistOrder(next);
                        } else {
                          await persistPartSides(next);
                        }
                        setDraggingSideStudent(null);
                        setDraggingSideMeta(null);
                      }}
                    >
                      <div className="flex flex-wrap gap-2">
                        {uniqueSideList(
                          sideItems.filter((item) => (item[field] || DEFAULT_SIDE) === "SL")
                        ).map((item, idx) => {
                          const active = positionedStudents.has(item.student_id);
                          return (
                            <span
                                key={`sl-${field}-${item.student_id}-${idx}`}
                                draggable
                                onDragStart={() => {
                                  setDraggingSideStudent(item.student_id);
                                  setDraggingSideMeta({ student_id: item.student_id, field, side: "SL" });
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={async () => {
                                  if (!draggingSideMeta) return;
                                    if (draggingSideMeta.field === field && draggingSideMeta.side === "SL") {
                                      const list = uniqueSideList(
                                        sideItems.filter((row) => (row[field] || DEFAULT_SIDE) === "SL")
                                      );
                                      const ids = list.map((entry) => entry.student_id);
                                      const from = ids.indexOf(draggingSideMeta.student_id);
                                      const to = ids.indexOf(item.student_id);
                                      if (from < 0 || to < 0 || from === to) return;
                                      const reordered = [...list];
                                    const [moved] = reordered.splice(from, 1);
                                    reordered.splice(to, 0, moved);
                                    const orderMap = new Map(
                                      reordered.map((entry, index) => [entry.student_id, index])
                                    );
                                    const next = sideItems.slice().sort((a, b) => {
                                      const aIdx = orderMap.get(a.student_id);
                                      const bIdx = orderMap.get(b.student_id);
                                      if (aIdx === undefined || bIdx === undefined) return 0;
                                      return aIdx - bIdx;
                                    });
                                    if (subparts.length > 0) {
                                      await persistOrder(next);
                                    } else {
                                      await persistPartSides(next);
                                    }
                                    setDraggingSideMeta(null);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-full text-[10px] border cursor-move ${
                                  active
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                    : "bg-gray-100 text-gray-700 border-gray-300"
                                }`}
                              >
                                {idx + 1}. {item.student_name}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ))}
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

            {/* Equipment Panel */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h4 className="font-semibold text-gray-900">Equipment</h4>
                <div className="ml-auto flex items-center gap-2">
                  <input
                    value={newEquipmentName}
                    onChange={(e) => setNewEquipmentName(e.target.value)}
                    placeholder="Add equipment"
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <button
                    onClick={handleAddEquipment}
                    className="px-2 py-1 bg-gray-900 text-white rounded text-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 mb-3">
                Active equipment shows at the top. Start side follows the previous active end. Set an initial side for first use.
              </div>
              {equipmentLoading ? (
                <div className="text-xs text-gray-500">Loading equipment…</div>
              ) : equipmentDisplay.length === 0 ? (
                <div className="text-xs text-gray-500">No equipment yet.</div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {equipmentDisplay.map((item) => {
                    const selectedStudent = equipmentStudentDraft[item.equipment.id] || "";
                    const selectedStudentName = rosterById.get(selectedStudent) || "";
                    const sameName = selectedStudentName && selectedStudentName === item.equipment.name;
                    return (
                      <div
                        key={item.equipment.id}
                        className={`border rounded-lg p-3 ${item.isActive ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={item.equipment.name}
                            onChange={(e) =>
                              setEquipmentItems((prev) =>
                                prev.map((eq) => (eq.id === item.equipment.id ? { ...eq, name: e.target.value } : eq))
                              )
                            }
                            onBlur={() =>
                              handleUpdateEquipment(item.equipment.id, { name: item.equipment.name })
                            }
                            className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                          />
                          <select
                            value={selectedStudent}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEquipmentStudentDraft((prev) => ({
                                ...prev,
                                [item.equipment.id]: value,
                              }));
                              if (item.isActive && value) {
                                void saveEquipmentUsage(item.equipment.id, value);
                              }
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-xs"
                          >
                            <option value="">Select performer</option>
                            {roster.map((student) => (
                              <option key={student.student_id} value={student.student_id}>
                                {student.name}
                              </option>
                            ))}
                          </select>
                          <label className="text-xs text-gray-700 flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={item.isActive}
                              onChange={(e) => handleToggleEquipmentActive(item.equipment.id, e.target.checked)}
                              className="h-3 w-3"
                            />
                            Active
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-gray-600">
                          <span className="font-semibold text-gray-700">Start:</span>{" "}
                          <span>{item.startSide || "Unset"}</span>
                          <span className="font-semibold text-gray-700">End:</span>{" "}
                          <span>{item.endSide || "—"}</span>
                          {item.activeStudentName && (
                            <span className="ml-auto text-[10px] text-gray-500">
                              Using: {item.activeStudentName}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[10px] text-gray-500">Initial side:</span>
                          {(["OS", "SL", "SR"] as StageSide[]).map((side) => (
                            <button
                              key={`${item.equipment.id}-${side}`}
                              type="button"
                              onClick={() => handleUpdateEquipment(item.equipment.id, { initial_side: side })}
                              className={`px-2 py-0.5 rounded-full text-[10px] border ${
                                (item.equipment.initial_side || "") === side
                                  ? "bg-gray-900 text-white border-gray-900"
                                  : "bg-white text-gray-700 border-gray-300"
                              }`}
                            >
                              {side}
                            </button>
                          ))}
                          {selectedStudent && (
                            <button
                              type="button"
                              onClick={() => handleUpdateEquipment(item.equipment.id, { name: selectedStudentName })}
                              className="text-[10px] px-2 py-0.5 rounded border border-gray-300 text-gray-600"
                            >
                              Use performer name
                            </button>
                          )}
                        </div>
                        {sameName && (
                          <div className="text-[10px] text-amber-600 mt-1">
                            Equipment name matches performer. Consider renaming.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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



