"use client";

import { useEffect, useState } from "react";

type Student = {
  id: string;
  name: string;
  email: string | null;
};

export function AdminRosterPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { name: string; email: string }>>({});

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      const data = res.ok ? await res.json() : [];
      const list = Array.isArray(data) ? data : [];
      setStudents(list);
      const nextEdits: Record<string, { name: string; email: string }> = {};
      list.forEach((student) => {
        nextEdits[student.id] = {
          name: student.name || "",
          email: student.email || "",
        };
      });
      setEdits(nextEdits);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleSave = async (student: Student) => {
    const values = edits[student.id];
    if (!values) return;
    setSavingId(student.id);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim() || null,
        }),
      });
      if (!res.ok) {
        alert("Failed to update student");
        return;
      }
      const updated = await res.json();
      setStudents((prev) =>
        prev.map((item) => (item.id === student.id ? updated : item))
      );
      setEdits((prev) => ({
        ...prev,
        [student.id]: {
          name: updated.name || "",
          email: updated.email || "",
        },
      }));
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = (student: Student) => {
    setEdits((prev) => ({
      ...prev,
      [student.id]: {
        name: student.name || "",
        email: student.email || "",
      },
    }));
  };

  if (loading) {
    return <div className="text-gray-600">Loading roster...</div>;
  }

  if (students.length === 0) {
    return <div className="text-sm text-gray-500">No students found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Full Roster</h2>
        <button
          type="button"
          onClick={loadStudents}
          className="px-3 py-2 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const values = edits[student.id] || { name: "", email: "" };
              const isDirty =
                values.name !== (student.name || "") ||
                values.email !== (student.email || "");
              return (
                <tr key={student.id} className="border-t border-gray-200">
                  <td className="px-4 py-3">
                    <input
                      value={values.name}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [student.id]: { ...values, name: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={values.email}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [student.id]: { ...values, email: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave(student)}
                        disabled={!isDirty || savingId === student.id}
                        className="px-3 py-2 text-xs rounded bg-blue-600 text-white disabled:bg-gray-300"
                      >
                        {savingId === student.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReset(student)}
                        disabled={!isDirty}
                        className="px-3 py-2 text-xs rounded bg-gray-200 text-gray-700 disabled:bg-gray-100"
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
