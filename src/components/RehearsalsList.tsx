"use client";

import { useState } from "react";
import { Rehearsal } from "@/types";

interface RehearsalsListProps {
  rehearsals: Rehearsal[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { title: string; date: string; time: string; location: string }) => Promise<void>;
}

export function RehearsalsList({ rehearsals, onDelete, onUpdate }: RehearsalsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
  });

  const normalizeDateOnly = (value: string) => {
    if (!value) return "";
    return value.split("T")[0];
  };

  const toLocalDateLabel = (iso: string) => {
    if (!iso) return "";
    const value = normalizeDateOnly(iso);
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) {
        return new Date(y, m - 1, d).toLocaleDateString();
      }
    }
    return new Date(iso).toLocaleDateString();
  };

  const startEdit = (rehearsal: Rehearsal) => {
    const dateValue = normalizeDateOnly(rehearsal.date);
    setEditingId(rehearsal.id);
    setEditForm({
      title: rehearsal.title || "",
      date: dateValue,
      time: rehearsal.time || "",
      location: rehearsal.location || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    await onUpdate(id, editForm);
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      {rehearsals.map((rehearsal) => (
        <div key={rehearsal.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
          <div className="flex-1">
            {editingId === rehearsal.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Location"
                  />
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900">{rehearsal.title}</h3>
                <div className="grid grid-cols-2 text-sm text-gray-600 mt-1">
                  <span>📅 {toLocalDateLabel(rehearsal.date)}</span>
                  <span>🕐 {rehearsal.time}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  📍 {rehearsal.location}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {editingId === rehearsal.id ? (
              <>
                <button
                  onClick={() => saveEdit(rehearsal.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startEdit(rehearsal)}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Delete this rehearsal?")) {
                      onDelete(rehearsal.id);
                    }
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
