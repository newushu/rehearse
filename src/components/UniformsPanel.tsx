"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TIMEZONE, formatDisplayDateTime } from "@/lib/datetime";

type UniformType = { id: string; name: string; code?: string | null; color?: string | null };
type UniformAssignment = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  performance_id: string | null;
  distributed_at: string | null;
  returned_at: string | null;
  created_at?: string | null;
};
type UniformItem = {
  id: string;
  uniform_type_id: string;
  item_number: string;
  uniform_assignments?: UniformAssignment[];
};
type Student = { id: string; name: string };
type Performance = { id: string; title: string };

export function UniformsPanel() {
  const formatIfDate = (value: string | null) =>
    value ? formatDisplayDateTime(value, DEFAULT_TIMEZONE) : "—";
  const [types, setTypes] = useState<UniformType[]>([]);
  const [items, setItems] = useState<UniformItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeCode, setNewTypeCode] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#6b7280");
  const [newItemByType, setNewItemByType] = useState<Record<string, string>>({});
  const [newItemSizeByType, setNewItemSizeByType] = useState<Record<string, string>>({});
  const [newItemSeqByType, setNewItemSeqByType] = useState<Record<string, string>>({});
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignStudentName, setAssignStudentName] = useState("");
  const [assignPerformanceId, setAssignPerformanceId] = useState("");
  const [selectedItem, setSelectedItem] = useState<UniformItem | null>(null);
  const [selectedItemView, setSelectedItemView] = useState<"assignments" | "log">("assignments");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeCode, setEditTypeCode] = useState("");
  const [editTypeColor, setEditTypeColor] = useState("#6b7280");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemNumber, setEditItemNumber] = useState("");
  const [editItemSize, setEditItemSize] = useState("");
  const [editItemSeq, setEditItemSeq] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [typesRes, itemsRes, studentsRes, perfRes] = await Promise.all([
        fetch("/api/uniform-types"),
        fetch("/api/uniform-items"),
        fetch("/api/students"),
        fetch("/api/performances"),
      ]);
      const [typesData, itemsData, studentsData, perfData] = await Promise.all([
        typesRes.ok ? typesRes.json() : [],
        itemsRes.ok ? itemsRes.json() : [],
        studentsRes.ok ? studentsRes.json() : [],
        perfRes.ok ? perfRes.json() : [],
      ]);
      setTypes(typesData || []);
      setItems(itemsData || []);
      setStudents(studentsData || []);
      setPerformances(perfData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const performanceNameById = useMemo(() => {
    const map: Record<string, string> = {};
    performances.forEach((perf) => {
      map[perf.id] = perf.title;
    });
    return map;
  }, [performances]);

  const getActiveAssignment = (item: UniformItem) => {
    const list = item.uniform_assignments || [];
    return list.find((assign) => !assign.returned_at) || null;
  };

  const resetAssignForm = () => {
    setAssigningItemId(null);
    setAssignStudentId("");
    setAssignStudentName("");
    setAssignPerformanceId("");
  };

  const normalizeCode = (value: string) => value.trim().toUpperCase().slice(0, 3);

  const buildItemNumber = (type: UniformType, size: string, seq: string) => {
    const code = normalizeCode(type.code || "");
    const sizePart = size.trim().toUpperCase();
    const seqPart = seq.trim();
    if (!code || !sizePart || !seqPart) return "";
    return `${code}-${sizePart}-${seqPart}`;
  };

  const parseItemNumber = (value: string) => {
    const parts = value.split("-");
    if (parts.length >= 3) {
      return { code: parts[0], size: parts[1], seq: parts.slice(2).join("-") };
    }
    return { code: "", size: "", seq: value };
  };

  const itemsByType = useMemo(() => {
    const map: Record<string, UniformItem[]> = {};
    items.forEach((item) => {
      map[item.uniform_type_id] = map[item.uniform_type_id] || [];
      map[item.uniform_type_id].push(item);
    });
    const sizeOrder = [
      "XXS",
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
      "XXXL",
    ];
    const sizeRank = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return sizeOrder.length + 2;
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) return -100 + numeric;
      const idx = sizeOrder.indexOf(trimmed.toUpperCase());
      return idx === -1 ? sizeOrder.length + 1 : idx;
    };
    Object.values(map).forEach((list) =>
      list.sort((a, b) => {
        const aParts = parseItemNumber(a.item_number);
        const bParts = parseItemNumber(b.item_number);
        const rankDiff = sizeRank(aParts.size) - sizeRank(bParts.size);
        if (rankDiff !== 0) return rankDiff;
        const aSeq = Number(aParts.seq);
        const bSeq = Number(bParts.seq);
        if (Number.isFinite(aSeq) && Number.isFinite(bSeq) && aSeq !== bSeq) {
          return aSeq - bSeq;
        }
        return a.item_number.localeCompare(b.item_number);
      })
    );
    return map;
  }, [items]);

  const getActiveCount = (item: UniformItem) => {
    const list = item.uniform_assignments || [];
    return list.filter((assign) => !assign.returned_at).length;
  };

  const getAssignmentCount = (item: UniformItem) => {
    const list = item.uniform_assignments || [];
    return list.length;
  };

  const getSuggestions = (value: string) => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    return students.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 5);
  };

  const updateAssignmentStatus = async (
    assignmentId: string,
    action: "distribute" | "return"
  ) => {
    const payload =
      action === "return"
        ? { returned_at: new Date().toISOString() }
        : { returned_at: null, distributed_at: new Date().toISOString() };
    const res = await fetch(`/api/uniform-assignments/${assignmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("Failed to update uniform status");
      return;
    }
    await loadData();
  };

  const deleteAssignment = async (assignmentId: string) => {
    const res = await fetch(`/api/uniform-assignments/${assignmentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Failed to remove assignment");
      return;
    }
    await loadData();
  };

  const activeLogAssignment =
    selectedItem?.uniform_assignments?.find((assignment) => !assignment.returned_at) || null;
  const activeLogId = activeLogAssignment?.id || null;

  if (loading) {
    return <div className="text-gray-600">Loading uniforms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={newTypeColor}
          onChange={(e) => setNewTypeColor(e.target.value)}
          className="h-10 w-12 rounded border border-gray-300"
          title="Uniform color"
        />
        <input
          value={newTypeCode}
          onChange={(e) => setNewTypeCode(e.target.value)}
          placeholder="Code (e.g., A)"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32"
        />
        <input
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          placeholder="New uniform type (e.g., Black Tee)"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[220px]"
        />
        <button
          onClick={async () => {
            const name = newTypeName.trim();
            const code = normalizeCode(newTypeCode);
            if (!name) return;
            const res = await fetch("/api/uniform-types", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, code, color: newTypeColor }),
            });
            if (res.ok) {
              setNewTypeName("");
              setNewTypeCode("");
              setNewTypeColor("#6b7280");
              await loadData();
            } else {
              alert("Failed to create uniform type");
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          Add Uniform Type
        </button>
      </div>

      {types.length === 0 && (
        <div className="text-sm text-gray-500">No uniform types yet.</div>
      )}

      {types.map((type) => (
        <div key={type.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            {editingTypeId === type.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={editTypeColor}
                  onChange={(e) => setEditTypeColor(e.target.value)}
                  className="h-9 w-10 rounded border border-gray-300"
                  title="Uniform color"
                />
                <input
                  value={editTypeCode}
                  onChange={(e) => setEditTypeCode(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded text-sm w-24"
                />
                <input
                  value={editTypeName}
                  onChange={(e) => setEditTypeName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={async () => {
                    const nextName = editTypeName.trim();
                    const nextCode = normalizeCode(editTypeCode);
                    if (!nextName) return;
                    const res = await fetch(`/api/uniform-types/${type.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: nextName, code: nextCode, color: editTypeColor }),
                    });
                    if (res.ok) {
                      setEditingTypeId(null);
                      await loadData();
                    } else {
                      alert("Failed to update uniform type");
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingTypeId(null)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
                {type.color && (
                  <span
                    className="h-3 w-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: type.color }}
                  />
                )}
                {type.code && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                    Code: {type.code}
                  </span>
                )}
                <button
                  onClick={() => {
                    setEditingTypeId(type.id);
                    setEditTypeName(type.name);
                    setEditTypeCode(type.code || "");
                    setEditTypeColor(type.color || "#6b7280");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">
                  {type.code ? `${normalizeCode(type.code)}-` : "Code-"}
                </span>
                <input
                  value={newItemSizeByType[type.id] || ""}
                  onChange={(e) =>
                    setNewItemSizeByType((prev) => ({ ...prev, [type.id]: e.target.value }))
                  }
                  placeholder="Size"
                  className="px-3 py-2 border border-gray-300 rounded text-sm w-20"
                />
                <input
                  value={newItemSeqByType[type.id] || ""}
                  onChange={(e) =>
                    setNewItemSeqByType((prev) => ({ ...prev, [type.id]: e.target.value }))
                  }
                  placeholder="#"
                  className="px-3 py-2 border border-gray-300 rounded text-sm w-20"
                />
              </div>
              <button
                onClick={async () => {
                  const itemNumber = buildItemNumber(type, newItemSizeByType[type.id] || "", newItemSeqByType[type.id] || "");
                  if (!itemNumber) {
                    alert("Enter a uniform code, size, and number before adding an item.");
                    return;
                  }
                  const existing = (itemsByType[type.id] || []).some(
                    (item) => item.item_number.toLowerCase() === itemNumber.toLowerCase()
                  );
                  if (existing) {
                    alert("That size/number already exists for this uniform type.");
                    return;
                  }
                  const res = await fetch("/api/uniform-items", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uniform_type_id: type.id, item_number: itemNumber }),
                  });
                  if (res.ok) {
                    setNewItemByType((prev) => ({ ...prev, [type.id]: "" }));
                    setNewItemSizeByType((prev) => ({ ...prev, [type.id]: "" }));
                    setNewItemSeqByType((prev) => ({ ...prev, [type.id]: "" }));
                    await loadData();
                  } else {
                    alert("Failed to add item");
                  }
                }}
                className="px-3 py-2 bg-gray-900 text-white rounded text-sm"
              >
                Add Item
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-2">
              <div>Item</div>
              <div>Status</div>
              <div>Assignments</div>
              <div>Log</div>
              <div>Assign</div>
            </div>
            {(itemsByType[type.id] || []).map((item) => {
              const activeAssignments = (item.uniform_assignments || []).filter(
                (assignment) => !assignment.returned_at
              );
              const active = activeAssignments[0] || null;
              const statusLabel =
                activeAssignments.length > 1
                  ? "Multiple assignments"
                  : active
                    ? active.distributed_at
                      ? "Distributed"
                      : "Assigned"
                    : "On hand";
              const assignmentCount = getAssignmentCount(item);
              const activeCount = getActiveCount(item);
              const suggestionList = assigningItemId === item.id
                ? getSuggestions(assignStudentName || "")
                : [];
              return (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm grid grid-cols-5 gap-2 items-center text-sm"
                >
                  <div>
                    {editingItemId === item.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {type.code ? `${normalizeCode(type.code)}-` : "Code-"}
                        </span>
                        <input
                          value={editItemSize}
                          onChange={(e) => setEditItemSize(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-16"
                        />
                        <input
                          value={editItemSeq}
                          onChange={(e) => setEditItemSeq(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-16"
                        />
                        <button
                          onClick={async () => {
                            const nextNumber = buildItemNumber(type, editItemSize, editItemSeq);
                            if (!nextNumber) return;
                            const res = await fetch(`/api/uniform-items/${item.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ item_number: nextNumber }),
                            });
                            if (res.ok) {
                              setEditingItemId(null);
                              await loadData();
                            } else {
                              alert("Failed to update item number");
                            }
                          }}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingItemId(null)}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="text-left"
                        >
                          <span
                            className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: type.color || "#374151" }}
                          >
                            #{item.item_number}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingItemId(item.id);
                            const parsed = parseItemNumber(item.item_number);
                            setEditItemNumber(item.item_number);
                            setEditItemSize(parsed.size);
                            setEditItemSeq(parsed.seq);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete uniform item #${item.item_number}?`)) return;
                            const res = await fetch(`/api/uniform-items/${item.id}`, {
                              method: "DELETE",
                            });
                            if (res.ok) {
                              await loadData();
                            } else {
                              alert("Failed to delete item");
                            }
                          }}
                          className="text-[10px] text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <span
                      className={`text-[10px] uppercase px-2 py-1 rounded-full font-semibold ${
                        active
                          ? active.distributed_at
                            ? "bg-purple-100 text-purple-700"
                            : "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    {activeAssignments.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {activeAssignments.length > 1 ? (
                          <div className="text-[10px] text-gray-500">Multiple assignments</div>
                        ) : (
                          <>
                            <div>{active?.student_name || "Unknown"}</div>
                            {active?.performance_id && (
                              <div className="text-[10px] text-gray-500">
                                Performance:{" "}
                                {performanceNameById[active.performance_id] || active.performance_id}
                              </div>
                            )}
                            {active?.distributed_at && (
                              <div className="text-[10px] text-gray-500">
                                Given {formatDisplayDateTime(active.distributed_at, DEFAULT_TIMEZONE)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setSelectedItemView("assignments");
                      }}
                      className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      {activeCount} active / {assignmentCount} total
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setSelectedItemView("log");
                      }}
                      className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Open log
                    </button>
                  </div>
                  <div>
                    {assigningItemId === item.id ? (
                      <div className="space-y-2">
                        <input
                          value={assignStudentName}
                          onChange={(e) => setAssignStudentName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            const suggestion = getSuggestions(assignStudentName)[0];
                            if (suggestion) {
                              setAssignStudentId(suggestion.id);
                              setAssignStudentName(suggestion.name);
                            }
                          }}
                          placeholder="Type student name"
                          list={`student-suggestions-${item.id}`}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <datalist id={`student-suggestions-${item.id}`}>
                          {suggestionList.map((student) => (
                            <option key={student.id} value={student.name} />
                          ))}
                        </datalist>
                        <select
                          value={assignPerformanceId}
                          onChange={(e) => setAssignPerformanceId(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Performance (optional)</option>
                          {performances.map((perf) => (
                            <option key={perf.id} value={perf.id}>
                              {perf.title}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const res = await fetch("/api/uniform-assignments", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  uniform_item_id: item.id,
                                  student_id: assignStudentId || null,
                                  student_name: assignStudentName || null,
                                  performance_id: assignPerformanceId || null,
                                  distributed_at: null,
                                }),
                              });
                              if (res.ok) {
                                if (assignPerformanceId && assignStudentId) {
                                  try {
                                    const signupRes = await fetch(
                                      `/api/signups?performanceId=${assignPerformanceId}&studentId=${assignStudentId}`
                                    );
                                    if (signupRes.ok) {
                                      const signups = await signupRes.json();
                                      const signup = (signups || [])[0];
                                      if (signup?.id) {
                                        await fetch(`/api/signups/${signup.id}`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            assigned_uniform_item_id: item.id,
                                          }),
                                        });
                                      }
                                    }
                                  } catch {
                                    // ignore signup linking errors
                                  }
                                }
                                await loadData();
                                resetAssignForm();
                              } else {
                                const data = await res.json().catch(() => ({}));
                                alert(data?.error || "Failed to assign uniform");
                              }
                            }}
                            className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
                          >
                            Assign
                          </button>
                          <button
                            onClick={resetAssignForm}
                            className="px-3 py-1 text-xs rounded bg-gray-200 text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningItemId(item.id)}
                        className="px-3 py-1 text-xs rounded bg-blue-600 text-white"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {(itemsByType[type.id] || []).length === 0 && (
              <div className="text-sm text-gray-500">No items yet.</div>
            )}
          </div>
        </div>
      ))}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 w-full max-w-2xl shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  {selectedItemView === "log" ? "Uniform Log" : "Uniform Assignments"}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  #{selectedItem.item_number}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="mt-3 max-h-[70vh] overflow-y-auto space-y-2 text-sm text-gray-700">
              {selectedItemView === "assignments" ? (
                <>
                  {(selectedItem.uniform_assignments || [])
                    .filter((assignment) => !assignment.returned_at)
                    .map((assignment) => (
                      <div key={assignment.id} className="border border-gray-200 rounded p-2">
                        <div className="font-semibold">
                          {assignment.student_name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Distributed:{" "}
                          {formatIfDate(assignment.distributed_at)}
                        </div>
                        {assignment.performance_id && (
                          <div className="text-xs text-gray-500">
                            Performance: {performanceNameById[assignment.performance_id] || assignment.performance_id}
                          </div>
                        )}
                      </div>
                    ))}
                  {(selectedItem.uniform_assignments || []).filter((assignment) => !assignment.returned_at).length === 0 && (
                    <div className="text-sm text-gray-500">No active assignments.</div>
                  )}
                </>
              ) : (
                <>
                  {(selectedItem.uniform_assignments || [])
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.distributed_at || 0).getTime() - new Date(a.distributed_at || 0).getTime()
                    )
                    .map((assignment) => (
                      <div key={assignment.id} className="border border-gray-200 rounded p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold">
                            {assignment.student_name || "Unknown"}
                          </div>
                          {assignment.returned_at ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!confirm("Mark this uniform as distributed again?")) return;
                                updateAssignmentStatus(assignment.id, "distribute");
                              }}
                              disabled={Boolean(activeLogId)}
                              className="px-2 py-1 text-[10px] rounded bg-emerald-600 text-white disabled:bg-gray-300"
                            >
                              Distribute
                            </button>
                          ) : assignment.distributed_at ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!confirm("Mark this uniform as returned?")) return;
                                updateAssignmentStatus(assignment.id, "return");
                              }}
                              disabled={activeLogId !== assignment.id}
                              className="px-2 py-1 text-[10px] rounded bg-blue-600 text-white disabled:bg-gray-300"
                            >
                              Return
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!confirm("Mark this uniform as distributed?")) return;
                                  updateAssignmentStatus(assignment.id, "distribute");
                                }}
                                disabled={Boolean(activeLogId && activeLogId !== assignment.id)}
                                className="px-2 py-1 text-[10px] rounded bg-emerald-600 text-white disabled:bg-gray-300"
                              >
                                Distribute
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!confirm("Remove this assignment?")) return;
                                  deleteAssignment(assignment.id);
                                }}
                                className="px-2 py-1 text-[10px] rounded bg-gray-300 text-gray-800"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
                            assignment.returned_at
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : assignment.distributed_at
                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}
                          >
                            {assignment.returned_at
                              ? "Returned"
                              : assignment.distributed_at
                                ? "Distributed"
                                : "Assigned"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Assigned:{" "}
                          {assignment.created_at
                            ? formatDisplayDateTime(assignment.created_at, DEFAULT_TIMEZONE)
                            : "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                        Distributed:{" "}
                        {formatIfDate(assignment.distributed_at)}
                        </div>
                        {assignment.performance_id && (
                          <div className="text-xs text-gray-500">
                            Performance: {performanceNameById[assignment.performance_id] || assignment.performance_id}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Returned:{" "}
                          {assignment.returned_at
                            ? formatDisplayDateTime(assignment.returned_at, DEFAULT_TIMEZONE)
                            : "—"}
                        </div>
                      </div>
                    ))}
                  {(selectedItem.uniform_assignments || []).length === 0 && (
                    <div className="text-sm text-gray-500">No history yet.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

