"use client";

import { Part, Subpart } from "@/types";
import { useState, useEffect, useMemo } from "react";

interface PartsListProps {
  parts: Part[];
  performanceId: string;
  onDelete: (id: string) => void;
  onReorder?: (parts: Part[]) => void;
  onSelect?: (partId: string) => void;
  selectedPartId?: string | null;
  variant?: "manage" | "select";
  enableDrag?: boolean;
  showPositionedNames?: boolean;
  compact?: boolean;
}

export function PartsList({
  parts,
  performanceId,
  onDelete,
  onReorder,
  onSelect,
  selectedPartId,
  variant = "manage",
  enableDrag = true,
  showPositionedNames = true,
  compact = false,
}: PartsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTimepointMin, setEditTimepointMin] = useState("");
  const [editTimepointSec, setEditTimepointSec] = useState("");
  const [editTimepointEndMin, setEditTimepointEndMin] = useState("");
  const [editTimepointEndSec, setEditTimepointEndSec] = useState("");
  const [editIsGroup, setEditIsGroup] = useState(true);
  const [positionedCounts, setPositionedCounts] = useState<Record<string, number>>({});
  const [positionedNames, setPositionedNames] = useState<Record<string, string[]>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [subpartsMap, setSubpartsMap] = useState<Record<string, Subpart[]>>({});
  const [newSubpartTitle, setNewSubpartTitle] = useState<Record<string, string>>({});
  const [newSubpartDescription, setNewSubpartDescription] = useState<Record<string, string>>({});
  const [newSubpartTimepointMin, setNewSubpartTimepointMin] = useState<Record<string, string>>({});
  const [newSubpartTimepointSec, setNewSubpartTimepointSec] = useState<Record<string, string>>({});
  const [newSubpartTimepointEndMin, setNewSubpartTimepointEndMin] = useState<Record<string, string>>({});
  const [newSubpartTimepointEndSec, setNewSubpartTimepointEndSec] = useState<Record<string, string>>({});
  const [editingSubpartId, setEditingSubpartId] = useState<string | null>(null);
  const [editSubpartTitle, setEditSubpartTitle] = useState<string>("");
  const [editSubpartDescription, setEditSubpartDescription] = useState<string>("");
  const [editSubpartTimepointMin, setEditSubpartTimepointMin] = useState<string>("");
  const [editSubpartTimepointSec, setEditSubpartTimepointSec] = useState<string>("");
  const [editSubpartTimepointEndMin, setEditSubpartTimepointEndMin] = useState<string>("");
  const [editSubpartTimepointEndSec, setEditSubpartTimepointEndSec] = useState<string>("");
  const [draggingSubpartId, setDraggingSubpartId] = useState<string | null>(null);
  const [draggingSubpartPartId, setDraggingSubpartPartId] = useState<string | null>(null);

  const displayParts = useMemo(() => {
    const items = [...parts];
    return items.sort((a, b) => {
      const aHas = typeof (a as any).timepoint_seconds === "number";
      const bHas = typeof (b as any).timepoint_seconds === "number";
      if (aHas && bHas) {
        const aTime = (a as any).timepoint_seconds as number;
        const bTime = (b as any).timepoint_seconds as number;
        if (aTime !== bTime) return aTime - bTime;
        return (a.order || 0) - (b.order || 0);
      }
      if (aHas !== bHas) return aHas ? -1 : 1;
      return (a.order || 0) - (b.order || 0);
    });
  }, [parts]);

  const splitTime = (value: any) => {
    if (value === null || value === undefined || value === "") return { min: "", sec: "" };
    const total = Number(value);
    if (!Number.isFinite(total)) return { min: "", sec: "" };
    const mins = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    return { min: String(mins), sec: String(secs) };
  };

  const composeSeconds = (minStr: string, secStr: string) => {
    if (!minStr && !secStr) return null;
    const mins = minStr ? parseInt(minStr, 10) : 0;
    const secs = secStr ? parseFloat(secStr) : 0;
    if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
    return mins * 60 + secs;
  };

  const formatTime = (value: any) => {
    if (value === null || value === undefined || value === "") return "--:--";
    const total = Number(value);
    if (!Number.isFinite(total)) return "--:--";
    const mins = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Fetch positioned count for each part on mount
  useEffect(() => {
    parts.forEach((part) => {
      fetchPositionedCount(part.id);
      fetchSubparts(part.id);
    });
  }, [parts]);

  // Fetch positioned count for each part
  const fetchPositionedCount = async (partId: string) => {
    try {
      const res = await fetch(`/api/stage-positions?partId=${partId}`);
      const positions = await res.json();
      setPositionedCounts((prev) => ({
        ...prev,
        [partId]: positions.length,
      }));
      setPositionedNames((prev) => ({
        ...prev,
        [partId]: positions.map((pos: any) => pos.student_name || "Unknown"),
      }));
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  };

  const fetchSubparts = async (partId: string) => {
    try {
      const res = await fetch(`/api/subparts?partId=${partId}`);
      if (!res.ok) throw new Error("Failed to fetch subparts");
      const data = await res.json();
      setSubpartsMap((prev) => ({
        ...prev,
        [partId]: data || [],
      }));
    } catch (error) {
      console.error("Error fetching subparts:", error);
    }
  };

  const handleAddSubpart = async (partId: string) => {
    const title = (newSubpartTitle[partId] || "").trim();
    const description = (newSubpartDescription[partId] || "").trim();
    const timepointSeconds = composeSeconds(newSubpartTimepointMin[partId] || "", newSubpartTimepointSec[partId] || "");
    const timepointEnd = composeSeconds(newSubpartTimepointEndMin[partId] || "", newSubpartTimepointEndSec[partId] || "");
    if (!title) return;
    try {
      const res = await fetch("/api/subparts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_id: partId,
          title,
          description: description || null,
          mode: "position",
          timepoint_seconds: timepointSeconds,
          timepoint_end_seconds: timepointEnd,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.details || data?.error || "Failed to create subpart");
      }
      await fetchSubparts(partId);
      setNewSubpartTitle((prev) => ({ ...prev, [partId]: "" }));
      setNewSubpartDescription((prev) => ({ ...prev, [partId]: "" }));
      setNewSubpartTimepointMin((prev) => ({ ...prev, [partId]: "" }));
      setNewSubpartTimepointSec((prev) => ({ ...prev, [partId]: "" }));
      setNewSubpartTimepointEndMin((prev) => ({ ...prev, [partId]: "" }));
      setNewSubpartTimepointEndSec((prev) => ({ ...prev, [partId]: "" }));
    } catch (error) {
      console.error("Error creating subpart:", error);
    }
  };

  const handleDeleteSubpart = async (subpartId: string, partId: string) => {
    try {
      const res = await fetch(`/api/subparts/${subpartId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete subpart");
      await fetchSubparts(partId);
    } catch (error) {
      console.error("Error deleting subpart:", error);
    }
  };

  const startEditSubpart = (subpart: Subpart) => {
    setEditingSubpartId(subpart.id);
    setEditSubpartTitle(subpart.title);
    setEditSubpartDescription(subpart.description || "");
    const start = splitTime((subpart as any).timepoint_seconds);
    const end = splitTime((subpart as any).timepoint_end_seconds);
    setEditSubpartTimepointMin(start.min);
    setEditSubpartTimepointSec(start.sec);
    setEditSubpartTimepointEndMin(end.min);
    setEditSubpartTimepointEndSec(end.sec);
  };

  const cancelEditSubpart = () => {
    setEditingSubpartId(null);
    setEditSubpartTitle("");
    setEditSubpartDescription("");
    setEditSubpartTimepointMin("");
    setEditSubpartTimepointSec("");
    setEditSubpartTimepointEndMin("");
    setEditSubpartTimepointEndSec("");
  };

  const saveEditSubpart = async (subpartId: string, partId: string) => {
    try {
      const res = await fetch(`/api/subparts/${subpartId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editSubpartTitle,
          description: editSubpartDescription,
          timepoint_seconds: composeSeconds(editSubpartTimepointMin, editSubpartTimepointSec),
          timepoint_end_seconds: composeSeconds(editSubpartTimepointEndMin, editSubpartTimepointEndSec),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.details || data?.error || "Failed to update subpart");
      }
      await fetchSubparts(partId);
      cancelEditSubpart();
    } catch (error) {
      console.error("Error updating subpart:", error);
    }
  };

  const handleReorderSubparts = async (partId: string, fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= (subpartsMap[partId]?.length || 0)) return;
    const current = subpartsMap[partId] || [];
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    setSubpartsMap((prev) => ({ ...prev, [partId]: next }));

    try {
      await Promise.all(
        next.map((subpart, idx) =>
          fetch(`/api/subparts/${subpart.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: idx + 1 }),
          })
        )
      );
    } catch (error) {
      console.error("Error reordering subparts:", error);
      await fetchSubparts(partId);
    }
  };

  const handleEdit = (part: Part) => {
    setEditingId(part.id);
    setEditName(part.name);
    setEditDescription(part.description || "");
    const start = splitTime((part as any).timepoint_seconds);
    const end = splitTime((part as any).timepoint_end_seconds);
    setEditTimepointMin(start.min);
    setEditTimepointSec(start.sec);
    setEditTimepointEndMin(end.min);
    setEditTimepointEndSec(end.sec);
    setEditIsGroup(part.is_group !== false);
  };

  const handleSaveEdit = async (partId: string) => {
    try {
      const res = await fetch(`/api/parts/${partId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          timepoint_seconds: composeSeconds(editTimepointMin, editTimepointSec),
          timepoint_end_seconds: composeSeconds(editTimepointEndMin, editTimepointEndSec),
          is_group: editIsGroup,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.details || "Failed to update part");
      }
      
      setEditingId(null);
    } catch (error) {
      console.error("Error updating part:", error);
      alert(`Error updating part: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= displayParts.length) return;
    const newParts = [...displayParts];
    const [moved] = newParts.splice(fromIndex, 1);
    newParts.splice(toIndex, 0, moved);

    // Update order field
    try {
      const updatePromises = newParts.map((part, idx) =>
        fetch(`/api/parts/${part.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: idx + 1 }),
        })
      );
      
      const results = await Promise.all(updatePromises);
      const allOk = results.every(res => res.ok);
      
      if (!allOk) throw new Error("Some updates failed");
      
      // Update displayed order immediately
      const updatedParts = newParts.map((part, idx) => ({
        ...part,
        order: idx + 1,
      }));
      
      if (onReorder) {
        onReorder(updatedParts);
      }
    } catch (error) {
      console.error("Error reordering parts:", error);
    }
  };

  return (
    <div className="space-y-3">
      {displayParts.map((part, index) => {
        const isCompact = compact && editingId !== part.id;
        const typeLabel = part.is_group === false ? "Subparts/Solos" : "Group";
        return (
        <div
          key={part.id}
          draggable={enableDrag}
          onDragStart={() => setDraggingId(part.id)}
          onDragOver={(e) => {
            if (enableDrag) e.preventDefault();
          }}
          onDrop={() => {
            if (!enableDrag || !draggingId || draggingId === part.id) return;
            const fromIndex = displayParts.findIndex((p) => p.id === draggingId);
            const toIndex = displayParts.findIndex((p) => p.id === part.id);
            handleReorder(fromIndex, toIndex);
            setDraggingId(null);
          }}
          onClick={() => onSelect?.(part.id)}
          className={`p-4 border rounded-lg hover:bg-gray-50 ${enableDrag ? "cursor-move" : ""} ${
            selectedPartId === part.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
          }`}
        >
          {editingId === part.id ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Part name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Part description (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={2}
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editIsGroup}
                  onChange={(e) => setEditIsGroup(e.target.checked)}
                  className="h-4 w-4"
                />
                Group part (unchecked = has subparts/solos)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Time (m / s)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editTimepointMin}
                      onChange={(e) => setEditTimepointMin(e.target.value)}
                      placeholder="min"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editTimepointSec}
                      onChange={(e) => setEditTimepointSec(e.target.value)}
                      placeholder="sec"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End Time (m / s)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editTimepointEndMin}
                      onChange={(e) => setEditTimepointEndMin(e.target.value)}
                      placeholder="min"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editTimepointEndSec}
                      onChange={(e) => setEditTimepointEndSec(e.target.value)}
                      placeholder="sec"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(part.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`flex justify-between items-start ${isCompact ? "" : "mb-3"}`}>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{part.name}</h3>
                  {!isCompact && part.description && (
                    <p className="text-sm text-gray-600 mt-1">{part.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{typeLabel}</p>
                </div>
                {variant === "manage" && !isCompact && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleReorder(index, index - 1)}
                      disabled={index === 0}
                      className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 text-sm"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(index, index + 1)}
                      disabled={index === displayParts.length - 1}
                      className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 text-sm"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>

              {isCompact && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {typeLabel}
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    Positioned: {positionedCounts[part.id] ?? "-"}
                  </span>
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                    Order: {part.order}
                  </span>
                  {variant === "manage" && (
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(part);
                        }}
                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Delete this part?")) {
                            onDelete(part.id);
                          }
                        }}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* Timepoint Info */}
              {!isCompact && variant === "manage" && ((part as any).timepoint_seconds !== undefined || (part as any).timepoint_end_seconds !== undefined) && (
                <div className="bg-amber-50 p-2 rounded mb-3 text-sm">
                  <span className="text-gray-600">Music Timepoint:</span>
                  <span className="font-bold text-amber-700 ml-2">
                    {formatTime((part as any).timepoint_seconds)}
                    {" - "}
                    {formatTime((part as any).timepoint_end_seconds)}
                  </span>
                </div>
              )}

              {!isCompact && showPositionedNames && positionedNames[part.id]?.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-700 mb-3">
                  {positionedNames[part.id].join(", ")}
                </div>
              )}


              {!isCompact && subpartsMap[part.id]?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-700 mb-3">
                  <div className="font-semibold text-gray-600 mb-1">Subparts / Solos</div>
                  <div className="space-y-1">
                    {subpartsMap[part.id].map((subpart) => (
                      <div
                        key={subpart.id}
                        className={`flex items-start justify-between gap-2 ${variant === "manage" ? "cursor-move" : ""}`}
                        draggable={variant === "manage"}
                        onDragStart={() => {
                          setDraggingSubpartId(subpart.id);
                          setDraggingSubpartPartId(part.id);
                        }}
                        onDragOver={(e) => {
                          if (variant === "manage") e.preventDefault();
                        }}
                        onDrop={() => {
                          if (variant !== "manage" || !draggingSubpartId || draggingSubpartPartId !== part.id) return;
                          const fromIndex = subpartsMap[part.id].findIndex((s) => s.id === draggingSubpartId);
                          const toIndex = subpartsMap[part.id].findIndex((s) => s.id === subpart.id);
                          handleReorderSubparts(part.id, fromIndex, toIndex);
                          setDraggingSubpartId(null);
                          setDraggingSubpartPartId(null);
                        }}
                      >
                        {editingSubpartId === subpart.id ? (
                          <div className="w-full space-y-2">
                            <input
                              type="text"
                              value={editSubpartTitle}
                              onChange={(e) => setEditSubpartTitle(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <textarea
                              value={editSubpartDescription}
                              onChange={(e) => setEditSubpartDescription(e.target.value)}
                              rows={2}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                value={editSubpartTimepointMin}
                                onChange={(e) => setEditSubpartTimepointMin(e.target.value)}
                                placeholder="Start m"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={editSubpartTimepointSec}
                                onChange={(e) => setEditSubpartTimepointSec(e.target.value)}
                                placeholder="Start s"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                value={editSubpartTimepointEndMin}
                                onChange={(e) => setEditSubpartTimepointEndMin(e.target.value)}
                                placeholder="End m"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={editSubpartTimepointEndSec}
                                onChange={(e) => setEditSubpartTimepointEndSec(e.target.value)}
                                placeholder="End s"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <select
                              value={subpart.mode || "position"}
                              onChange={(e) =>
                                fetch(`/api/subparts/${subpart.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ mode: e.target.value }),
                                }).then(() => fetchSubparts(part.id))
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="position">Position</option>
                              <option value="order">Order</option>
                              <option value="both">Both</option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEditSubpart(subpart.id, part.id);
                                }}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditSubpart();
                                }}
                                className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="font-medium text-gray-800">{subpart.title}</div>
                              {subpart.description && (
                                <div className="text-gray-500">{subpart.description}</div>
                              )}
                              {subpart.mode && (
                                <div className="text-gray-400 text-[10px] mt-1">Mode: {subpart.mode}</div>
                              )}
                              <div className="text-gray-400 text-[10px] mt-1">
                                Time: {formatTime((subpart as any).timepoint_seconds)} - {formatTime((subpart as any).timepoint_end_seconds)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditSubpart(subpart);
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-800"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSubpart(subpart.id, part.id);
                                  }}
                                  className="text-[10px] text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isCompact && (
              <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-700 mb-3">
                <div className="font-semibold text-gray-600 mb-1">Add Subpart</div>
                <input
                  type="text"
                  value={newSubpartTitle[part.id] || ""}
                  onChange={(e) =>
                    setNewSubpartTitle((prev) => ({ ...prev, [part.id]: e.target.value }))
                  }
                  placeholder="Subpart title"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs mb-2"
                  onClick={(e) => e.stopPropagation()}
                />
                <textarea
                  value={newSubpartDescription[part.id] || ""}
                  onChange={(e) =>
                    setNewSubpartDescription((prev) => ({ ...prev, [part.id]: e.target.value }))
                  }
                  placeholder="Description"
                  rows={2}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs mb-2"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="number"
                    min="0"
                    value={newSubpartTimepointMin[part.id] || ""}
                    onChange={(e) =>
                      setNewSubpartTimepointMin((prev) => ({ ...prev, [part.id]: e.target.value }))
                    }
                    placeholder="Start m"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newSubpartTimepointSec[part.id] || ""}
                    onChange={(e) =>
                      setNewSubpartTimepointSec((prev) => ({ ...prev, [part.id]: e.target.value }))
                    }
                    placeholder="Start s"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="number"
                    min="0"
                    value={newSubpartTimepointEndMin[part.id] || ""}
                    onChange={(e) =>
                      setNewSubpartTimepointEndMin((prev) => ({ ...prev, [part.id]: e.target.value }))
                    }
                    placeholder="End m"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newSubpartTimepointEndSec[part.id] || ""}
                    onChange={(e) =>
                      setNewSubpartTimepointEndSec((prev) => ({ ...prev, [part.id]: e.target.value }))
                    }
                    placeholder="End s"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddSubpart(part.id);
                  }}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              )}

              {!isCompact && variant === "manage" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(part)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => fetchPositionedCount(part.id)}
                    className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                  >
                    Refresh Count
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this part?")) {
                        onDelete(part.id);
                      }
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      );
    })}
    </div>
  );
}

















