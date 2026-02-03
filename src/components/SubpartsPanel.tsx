"use client";

import { useEffect, useState } from "react";

interface SubpartItem {
  id: string;
  part_id: string;
  title: string;
  description?: string | null;
  mode?: string | null;
  timepoint_seconds?: number | null;
  timepoint_end_seconds?: number | null;
}

interface SubpartsPanelProps {
  partId: string | null;
}

export function SubpartsPanel({ partId }: SubpartsPanelProps) {
  const [subparts, setSubparts] = useState<SubpartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTimepointMin, setNewTimepointMin] = useState("");
  const [newTimepointSec, setNewTimepointSec] = useState("");
  const [newTimepointEndMin, setNewTimepointEndMin] = useState("");
  const [newTimepointEndSec, setNewTimepointEndSec] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTimepointMin, setEditTimepointMin] = useState("");
  const [editTimepointSec, setEditTimepointSec] = useState("");
  const [editTimepointEndMin, setEditTimepointEndMin] = useState("");
  const [editTimepointEndSec, setEditTimepointEndSec] = useState("");

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

  const fetchSubparts = async () => {
    if (!partId) {
      setSubparts([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/subparts?partId=${partId}`);
      if (!res.ok) throw new Error("Failed to fetch subparts");
      const data = await res.json();
      setSubparts(data || []);
    } catch (err) {
      console.error("Error fetching subparts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubparts();
  }, [partId]);

  if (!partId) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Subparts / Solos</h3>
        <button
          onClick={fetchSubparts}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-xs text-gray-500 mb-2">Loading...</div>}

      {subparts.length === 0 && !loading && (
        <div className="text-xs text-gray-500 mb-2">No subparts yet.</div>
      )}

      <div className="space-y-2">
        {subparts.map((sub) => (
          <div key={sub.id} className="border border-gray-200 rounded p-2 text-xs">
            {editingId === sub.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editTimepointMin}
                    onChange={(e) => setEditTimepointMin(e.target.value)}
                    placeholder="Start m"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editTimepointSec}
                    onChange={(e) => setEditTimepointSec(e.target.value)}
                    placeholder="Start s"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editTimepointEndMin}
                    onChange={(e) => setEditTimepointEndMin(e.target.value)}
                    placeholder="End m"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editTimepointEndSec}
                    onChange={(e) => setEditTimepointEndSec(e.target.value)}
                    placeholder="End s"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/subparts/${sub.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: editTitle,
                            description: editDescription,
                            timepoint_seconds: composeSeconds(editTimepointMin, editTimepointSec),
                            timepoint_end_seconds: composeSeconds(editTimepointEndMin, editTimepointEndSec),
                          }),
                        });
                        if (!res.ok) throw new Error("Failed to update subpart");
                        setEditingId(null);
                        await fetchSubparts();
                      } catch (err) {
                        alert(
                          err instanceof Error
                            ? err.message
                            : "Failed to update subpart"
                        );
                      }
                    }}
                    className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-gray-800">{sub.title}</div>
                  {sub.mode && (
                    <div className="text-[10px] text-gray-400">Mode: {sub.mode}</div>
                  )}
                  {sub.description && (
                    <div className="text-gray-600">{sub.description}</div>
                  )}
                  {sub.timepoint_seconds !== null || sub.timepoint_end_seconds !== null ? (
                    <div className="text-[10px] text-gray-400">
                      Time: {formatTime(sub.timepoint_seconds)} - {formatTime(sub.timepoint_end_seconds)}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400">
                      Time: --:-- - --:--
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(sub.id);
                      setEditTitle(sub.title);
                      setEditDescription(sub.description || "");
                      const start = splitTime(sub.timepoint_seconds);
                      const end = splitTime(sub.timepoint_end_seconds);
                      setEditTimepointMin(start.min);
                      setEditTimepointSec(start.sec);
                      setEditTimepointEndMin(end.min);
                      setEditTimepointEndSec(end.sec);
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete this subpart?")) return;
                      try {
                        const res = await fetch(`/api/subparts/${sub.id}`, {
                          method: "DELETE",
                        });
                        if (!res.ok) throw new Error("Failed to delete subpart");
                        await fetchSubparts();
                      } catch (err) {
                        alert(
                          err instanceof Error
                            ? err.message
                            : "Failed to delete subpart"
                        );
                      }
                    }}
                    className="text-[10px] text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="font-semibold text-gray-700 text-xs mb-2">
          Add Subpart
        </div>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Subpart title"
          className="w-full px-2 py-1 border border-gray-300 rounded text-xs mb-2"
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          className="w-full px-2 py-1 border border-gray-300 rounded text-xs mb-2"
        />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="number"
            min="0"
            value={newTimepointMin}
            onChange={(e) => setNewTimepointMin(e.target.value)}
            placeholder="Start m"
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            value={newTimepointSec}
            onChange={(e) => setNewTimepointSec(e.target.value)}
            placeholder="Start s"
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="number"
            min="0"
            value={newTimepointEndMin}
            onChange={(e) => setNewTimepointEndMin(e.target.value)}
            placeholder="End m"
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            value={newTimepointEndSec}
            onChange={(e) => setNewTimepointEndSec(e.target.value)}
            placeholder="End s"
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
          />
        </div>
        <button
          onClick={async () => {
            const title = newTitle.trim();
            const description = newDescription.trim();
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
                  timepoint_seconds: composeSeconds(newTimepointMin, newTimepointSec),
                  timepoint_end_seconds: composeSeconds(newTimepointEndMin, newTimepointEndSec),
                }),
              });
              if (!res.ok) throw new Error("Failed to create subpart");
              setNewTitle("");
              setNewDescription("");
              setNewTimepointMin("");
              setNewTimepointSec("");
              setNewTimepointEndMin("");
              setNewTimepointEndSec("");
              await fetchSubparts();
            } catch (err) {
              alert(err instanceof Error ? err.message : "Failed to create subpart");
            }
          }}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
        >
          Add Subpart
        </button>
      </div>
    </div>
  );
}
