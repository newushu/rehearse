"use client";

import { useEffect, useState } from "react";
import { DEFAULT_TIMEZONE, formatDisplayDateTime } from "@/lib/datetime";

type Student = {
  id: string;
  name: string;
  email: string | null;
};
type UniformType = { id: string; name: string };
type UniformAssignment = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  performance_id: string | null;
  distributed_at: string | null;
  returned_at: string | null;
};
type UniformItem = {
  id: string;
  uniform_type_id: string;
  item_number: string;
  uniform_assignments?: UniformAssignment[];
};

export function AdminRosterPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { name: string; email: string }>>({});
  const [uniformItems, setUniformItems] = useState<UniformItem[]>([]);
  const [uniformTypes, setUniformTypes] = useState<UniformType[]>([]);
  const [performanceNames, setPerformanceNames] = useState<Record<string, string>>({});

  const loadStudents = async () => {
    setLoading(true);
    try {
      const [res, itemsRes, typesRes, perfRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/uniform-items"),
        fetch("/api/uniform-types"),
        fetch("/api/performances"),
      ]);
      const data = res.ok ? await res.json() : [];
      const items = itemsRes.ok ? await itemsRes.json() : [];
      const types = typesRes.ok ? await typesRes.json() : [];
      const perfs = perfRes.ok ? await perfRes.json() : [];
      const list = Array.isArray(data) ? data : [];
      setStudents(list);
      setUniformItems(Array.isArray(items) ? items : []);
      setUniformTypes(Array.isArray(types) ? types : []);
      const perfMap: Record<string, string> = {};
      (Array.isArray(perfs) ? perfs : []).forEach((perf: any) => {
        if (perf?.id) perfMap[perf.id] = perf.title || perf.name || perf.id;
      });
      setPerformanceNames(perfMap);
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

  const typeById = new Map(uniformTypes.map((t) => [t.id, t.name]));
  const assignedByStudent: Record<string, Array<{ item: UniformItem; performanceIds: Set<string> }>> = {};
  const holdingByStudent: Record<string, Array<{ item: UniformItem; distributed_at: string }>> = {};
  uniformItems.forEach((item) => {
    const assignments = item.uniform_assignments || [];
    const activeAssignments = assignments.filter((a) => !a.returned_at && a.student_id);
    const perfIdsByStudent: Record<string, Set<string>> = {};
    activeAssignments.forEach((assignment) => {
      if (!assignment.student_id) return;
      if (assignment.performance_id) {
        perfIdsByStudent[assignment.student_id] = perfIdsByStudent[assignment.student_id] || new Set();
        perfIdsByStudent[assignment.student_id].add(assignment.performance_id);
      }
      if (assignment.distributed_at) {
        holdingByStudent[assignment.student_id] = holdingByStudent[assignment.student_id] || [];
        holdingByStudent[assignment.student_id].push({
          item,
          distributed_at: assignment.distributed_at,
        });
      }
    });
    Object.entries(perfIdsByStudent).forEach(([studentId, perfIds]) => {
      assignedByStudent[studentId] = assignedByStudent[studentId] || [];
      assignedByStudent[studentId].push({ item, performanceIds: perfIds });
    });
  });

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
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Assigned Uniforms</th>
              <th className="px-4 py-3 text-left">In Possession</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
        </table>
        <div className="max-h-[520px] overflow-y-auto">
          <table className="min-w-full text-sm">
            <tbody>
              {students.map((student) => {
                const values = edits[student.id] || { name: "", email: "" };
                const isDirty =
                  values.name !== (student.name || "") ||
                  values.email !== (student.email || "");
                const assigned = assignedByStudent[student.id] || [];
                const holding = holdingByStudent[student.id] || [];
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
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {assigned.length === 0 ? (
                        "—"
                      ) : (
                        <div className="space-y-1">
                          {assigned.map((entry, idx) => {
                            const typeName = typeById.get(entry.item.uniform_type_id) || "Uniform";
                            const perfNames = Array.from(entry.performanceIds)
                              .map((id) => performanceNames[id] || id)
                              .join(", ");
                            return (
                              <div key={`${student.id}-assigned-${idx}`}>
                                {typeName} #{entry.item.item_number} — {perfNames || "—"}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {holding.length === 0 ? (
                        "—"
                      ) : (
                        <div className="space-y-1">
                          {holding.map((entry, idx) => {
                            const typeName = typeById.get(entry.item.uniform_type_id) || "Uniform";
                            const since = entry.distributed_at
                              ? formatDisplayDateTime(entry.distributed_at, DEFAULT_TIMEZONE)
                              : "—";
                            return (
                              <div key={`${student.id}-holding-${idx}`}>
                                {typeName} #{entry.item.item_number} — Since {since}
                              </div>
                            );
                          })}
                        </div>
                      )}
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
    </div>
  );
}
