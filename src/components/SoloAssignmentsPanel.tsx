"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SoloAssignment } from "@/types";

interface RosterStudent {
  student_id: string;
  name: string;
  email: string;
  part_id: string | null;
}

interface SoloAssignmentsPanelProps {
  performanceId: string;
  partId: string;
  isGroup: boolean;
  compact?: boolean;
}

export function SoloAssignmentsPanel({
  performanceId,
  partId,
  isGroup,
  compact = false,
}: SoloAssignmentsPanelProps) {
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [assignments, setAssignments] = useState<SoloAssignment[]>([]);
  const [newEntries, setNewEntries] = useState<Array<{ student_id: string; order: string; solo_name: string; notes: string }>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOrder, setEditOrder] = useState<string>("");
  const [editSoloName, setEditSoloName] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoster = useCallback(async () => {
    try {
      const res = await fetch(`/api/performances/${performanceId}/roster`);
      if (!res.ok) throw new Error("Failed to fetch roster");
      const data = await res.json();
      setRoster(data);
    } catch (err) {
      console.error("Error fetching roster:", err);
    }
  }, [performanceId]);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/solo-assignments?partId=${partId}`);
      if (!res.ok) throw new Error("Failed to fetch solo assignments");
      const data: SoloAssignment[] = await res.json();
      setAssignments(data);
    } catch (err) {
      console.error("Error fetching solo assignments:", err);
    }
  }, [partId]);

  useEffect(() => {
    if (!partId || isGroup) return;
    fetchRoster();
    fetchAssignments();
  }, [fetchRoster, fetchAssignments, partId, isGroup]);

  const availableStudents = useMemo(() => {
    return roster.filter((student) => student.part_id === partId || !student.part_id);
  }, [roster, partId]);

  const updateNewEntry = (
    index: number,
    field: "student_id" | "order" | "solo_name" | "notes",
    value: string
  ) => {
    setNewEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const addNewEntry = () => {
    setNewEntries((prev) => [
      ...prev,
      { student_id: "", order: "", solo_name: "", notes: "" },
    ]);
  };

  const removeNewEntry = (index: number) => {
    setNewEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const toInsert = newEntries
        .filter((entry) => entry.student_id)
        .map((entry) => ({
          part_id: partId,
          student_id: entry.student_id,
          order: entry.order ? Number(entry.order) : null,
          solo_name: entry.solo_name ?? "",
          notes: entry.notes ?? "",
        }));

      if (toInsert.length > 0) {
        const res = await fetch("/api/solo-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toInsert),
        });
        if (!res.ok) throw new Error("Failed to save solo assignments");
      }

      await fetchAssignments();
      setNewEntries([]);
    } catch (err) {
      console.error("Error saving solo assignments:", err);
      setError(err instanceof Error ? err.message : "Failed to save solo assignments");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (assignment: SoloAssignment) => {
    setEditingId(assignment.id);
    setEditOrder(assignment.order !== null && assignment.order !== undefined ? String(assignment.order) : "");
    setEditSoloName(assignment.solo_name ?? "");
    setEditNotes(assignment.notes ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditOrder("");
    setEditSoloName("");
    setEditNotes("");
  };

  const saveEdit = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/solo-assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: editOrder === "" ? null : Number(editOrder),
          solo_name: editSoloName,
          notes: editNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed to update solo assignment");
      await fetchAssignments();
      cancelEdit();
    } catch (err) {
      console.error("Error updating solo assignment:", err);
      setError(err instanceof Error ? err.message : "Failed to update solo assignment");
    }
  };

  if (isGroup) return null;

  return (
    <div className={`${compact ? "text-xs" : "text-sm"}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">Solo List</h4>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Check names, set order, and enter solo name + notes.
      </p>
      {error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-2 py-1 rounded mb-2 text-xs">
          {error}
        </div>
      )}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {assignments.length === 0 ? (
          <p className="text-xs text-gray-500">No solos added yet.</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="border border-gray-200 rounded p-2 bg-white">
              {editingId === assignment.id ? (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    {assignment.student_name || "Unknown"}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 w-10">Order</label>
                    <input
                      type="number"
                      value={editOrder}
                      onChange={(e) => setEditOrder(e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                      min="1"
                    />
                    <label className="text-xs text-gray-600 w-12">Solo</label>
                    <input
                      type="text"
                      value={editSoloName}
                      onChange={(e) => setEditSoloName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                  </div>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(assignment.id)}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-gray-900">
                      {assignment.order ?? "-"} • {assignment.student_name || "Unknown"}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(assignment)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/solo-assignments?id=${assignment.id}`, {
                            method: "DELETE",
                          });
                          await fetchAssignments();
                        }}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {assignment.solo_name && (
                    <div className="text-xs text-gray-700">Solo: {assignment.solo_name}</div>
                  )}
                  {assignment.notes && (
                    <div className="text-xs text-gray-500 whitespace-pre-wrap">
                      Notes: {assignment.notes}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}

        {newEntries.map((entry, index) => (
          <div key={`new-${index}`} className="border border-blue-200 rounded p-2 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={entry.student_id}
                onChange={(e) => updateNewEntry(index, "student_id", e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="">Select student</option>
                {availableStudents.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={entry.order}
                onChange={(e) => updateNewEntry(index, "order", e.target.value)}
                placeholder="Order"
                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                min="1"
              />
              <button
                type="button"
                onClick={() => removeNewEntry(index)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              value={entry.solo_name}
              onChange={(e) => updateNewEntry(index, "solo_name", e.target.value)}
              placeholder="Solo name"
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs mb-2"
            />
            <textarea
              value={entry.notes}
              onChange={(e) => updateNewEntry(index, "notes", e.target.value)}
              placeholder="Notes (musical notes, cues, etc.)"
              rows={2}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addNewEntry}
        className="mt-3 px-3 py-1 bg-gray-200 text-gray-900 rounded text-xs hover:bg-gray-300"
      >
        + Add Solo
      </button>
    </div>
  );
}
