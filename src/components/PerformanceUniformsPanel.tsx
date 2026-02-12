"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_TIMEZONE, formatDisplayDateTime } from "@/lib/datetime";

type UniformType = { id: string; name: string; color?: string | null };
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
type RosterEntry = {
  signup_id: string;
  student_id: string;
  name: string;
  assigned_uniform_item_id?: string | null;
};

interface PerformanceUniformsPanelProps {
  performanceId: string;
}

export function PerformanceUniformsPanel({ performanceId }: PerformanceUniformsPanelProps) {
  const [types, setTypes] = useState<UniformType[]>([]);
  const [items, setItems] = useState<UniformItem[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignCodeByRow, setAssignCodeByRow] = useState<Record<string, string>>({});
  const [historyStudent, setHistoryStudent] = useState<RosterEntry | null>(null);
  const [performanceMeta, setPerformanceMeta] = useState<Record<string, { title: string; date?: string | null }>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, itemsRes, rosterRes, perfsRes] = await Promise.all([
        fetch("/api/uniform-types"),
        fetch("/api/uniform-items"),
        fetch(`/api/performances/${performanceId}/roster`),
        fetch("/api/performances"),
      ]);
      const [typesData, itemsData, rosterData, perfsData] = await Promise.all([
        typesRes.ok ? typesRes.json() : [],
        itemsRes.ok ? itemsRes.json() : [],
        rosterRes.ok ? rosterRes.json() : [],
        perfsRes.ok ? perfsRes.json() : [],
      ]);
      setTypes(typesData || []);
      setItems(itemsData || []);
      setRoster(rosterData || []);
      const metaMap: Record<string, { title: string; date?: string | null }> = {};
      (perfsData || []).forEach((perf: any) => {
        if (perf?.id) {
          metaMap[perf.id] = {
            title: perf.title || perf.name || perf.id,
            date: perf.date || null,
          };
        }
      });
      setPerformanceMeta(metaMap);
    } finally {
      setLoading(false);
    }
  }, [performanceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const itemsByType = useMemo(() => {
    const map: Record<string, UniformItem[]> = {};
    items.forEach((item) => {
      map[item.uniform_type_id] = map[item.uniform_type_id] || [];
      map[item.uniform_type_id].push(item);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.item_number.localeCompare(b.item_number))
    );
    return map;
  }, [items]);

  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => a.name.localeCompare(b.name));
  }, [roster]);

  const itemById = useMemo(() => {
    const map: Record<string, UniformItem> = {};
    items.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [items]);

  const typeById = useMemo(() => {
    const map: Record<string, UniformType> = {};
    types.forEach((type) => {
      map[type.id] = type;
    });
    return map;
  }, [types]);

  const currentPerformanceTime = useMemo(() => {
    const date = performanceMeta[performanceId]?.date;
    if (!date) return null;
    const time = new Date(date).getTime();
    return Number.isFinite(time) ? time : null;
  }, [performanceId, performanceMeta]);

  const getPerformanceTime = (perfId: string | null) => {
    if (!perfId) return null;
    const date = performanceMeta[perfId]?.date;
    if (!date) return null;
    const time = new Date(date).getTime();
    return Number.isFinite(time) ? time : null;
  };

  const getPerformanceLabel = (perfId: string | null) => {
    if (!perfId) return "Unknown performance";
    return performanceMeta[perfId]?.title || perfId;
  };

  const getNextUse = (item: UniformItem | null, studentId: string) => {
    if (!item) return null;
    const baseTime = currentPerformanceTime ?? Date.now();
    const list = (item.uniform_assignments || [])
      .filter((assign) => !assign.returned_at && assign.performance_id)
      .map((assign) => ({
        assign,
        time: getPerformanceTime(assign.performance_id || null),
      }))
      .filter((entry) => entry.time !== null && (entry.time as number) > baseTime)
      .sort((a, b) => (a.time as number) - (b.time as number));
    if (list.length === 0) return null;
    return list[0].assign;
  };

  const holdingByStudent = useMemo(() => {
    const map: Record<string, UniformItem[]> = {};
    items.forEach((item) => {
      const active = (item.uniform_assignments || []).find(
        (assign) => assign.distributed_at && !assign.returned_at && assign.student_id
      );
      if (active?.student_id) {
        map[active.student_id] = map[active.student_id] || [];
        map[active.student_id].push(item);
      }
    });
    return map;
  }, [items]);

  const getActiveAssignment = (item?: UniformItem | null) => {
    if (!item) return null;
    const list = item.uniform_assignments || [];
    return list.find((assign) => !assign.returned_at) || null;
  };

  const getLatestAssignment = (item?: UniformItem | null) => {
    if (!item) return null;
    const list = (item.uniform_assignments || []).slice();
    list.sort(
      (a, b) =>
        new Date(b.distributed_at || 0).getTime() - new Date(a.distributed_at || 0).getTime()
    );
    return list[0] || null;
  };

  const getActiveAssignmentForPerformance = (item: UniformItem, perfId: string) => {
    const list = item.uniform_assignments || [];
    return list.find((assign) => !assign.returned_at && assign.performance_id === perfId) || null;
  };

  const getLatestAssignmentForPerformance = (item: UniformItem, perfId: string) => {
    const list = (item.uniform_assignments || []).filter((assign) => assign.performance_id === perfId);
    list.sort(
      (a, b) =>
        new Date(b.distributed_at || 0).getTime() - new Date(a.distributed_at || 0).getTime()
    );
    return list[0] || null;
  };

  const getActiveAssignments = (item?: UniformItem | null) => {
    if (!item) return [];
    return (item.uniform_assignments || []).filter((assignment) => !assignment.returned_at);
  };

  const getItemStatusLabel = (item?: UniformItem | null) => {
    const activeList = getActiveAssignments(item);
    if (activeList.length === 0) return "On hand";
    if (activeList.length > 1) return "Assigned in multiple performances";
    const active = activeList[0];
    if (active.distributed_at) {
      return `Distributed to ${active.student_name || "Unknown"}${active.performance_id && active.performance_id !== performanceId ? " (other performance)" : ""}`;
    }
    return `Assigned to ${active.student_name || "Unknown"}${active.performance_id && active.performance_id !== performanceId ? " (other performance)" : ""}`;
  };

  const getHistoryByItemForStudent = (studentId: string) => {
    const map = new Map<string, UniformAssignment[]>();
    items.forEach((item) => {
      const assignments = (item.uniform_assignments || []).filter(
        (assignment) => assignment.student_id === studentId
      );
      if (assignments.length > 0) {
        assignments.sort((a, b) => {
          const aTime = new Date(a.distributed_at || a.returned_at || 0).getTime();
          const bTime = new Date(b.distributed_at || b.returned_at || 0).getTime();
          return bTime - aTime;
        });
        map.set(item.id, assignments);
      }
    });
    return map;
  };

  const handleAssign = async (row: RosterEntry, itemId: string | null) => {
    if (!itemId) {
      const assignedItem = row.assigned_uniform_item_id
        ? itemById[row.assigned_uniform_item_id] || null
        : null;
      if (assignedItem) {
        const existing = (assignedItem.uniform_assignments || []).find(
          (assignment) =>
            assignment.performance_id === performanceId &&
            assignment.student_id === row.student_id &&
            !assignment.returned_at
        );
        if (existing?.distributed_at) {
          alert("Cannot clear an assignment that is already distributed.");
          return;
        }
        if (existing?.id) {
          await fetch(`/api/uniform-assignments/${existing.id}`, { method: "DELETE" });
        }
      }
    }

    if (itemId) {
      const item = itemById[itemId];
      const existing = (item?.uniform_assignments || []).find(
        (assignment) =>
          assignment.performance_id === performanceId &&
          !assignment.returned_at &&
          assignment.student_id !== row.student_id
      );
      if (existing) {
        alert("Uniform already assigned for this performance.");
        return;
      }
    }

    const res = await fetch(`/api/signups/${row.signup_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_uniform_item_id: itemId }),
    });
    if (!res.ok) {
      alert("Failed to assign uniform");
      return;
    }
    setRoster((prev) =>
      prev.map((entry) =>
        entry.signup_id === row.signup_id
          ? { ...entry, assigned_uniform_item_id: itemId }
          : entry
      )
    );

    if (itemId) {
      const item = itemById[itemId];
      const existing = (item?.uniform_assignments || []).find(
        (assignment) =>
          assignment.performance_id === performanceId &&
          assignment.student_id === row.student_id &&
          !assignment.returned_at
      );
      if (!existing) {
        const activeList = getActiveAssignments(item);
        const distributedMatch = activeList.find(
          (assignment) =>
            assignment.student_id === row.student_id && Boolean(assignment.distributed_at)
        );
        const inheritedDistributedAt = distributedMatch?.distributed_at || null;
        const assignRes = await fetch("/api/uniform-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uniform_item_id: itemId,
            student_id: row.student_id,
            student_name: row.name,
            performance_id: performanceId,
            distributed_at: inheritedDistributedAt,
          }),
        });
        if (!assignRes.ok) {
          const data = await assignRes.json().catch(() => ({}));
          if (data?.error) alert(data.error);
        }
      } else if (!existing.distributed_at) {
        const activeList = getActiveAssignments(item);
        const distributedMatch = activeList.find(
          (assignment) =>
            assignment.student_id === row.student_id && Boolean(assignment.distributed_at)
        );
        if (distributedMatch?.distributed_at) {
          await fetch(`/api/uniform-assignments/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              distributed_at: distributedMatch.distributed_at,
              returned_at: null,
            }),
          });
        }
      }
    }
  };

  const handleGive = async (row: RosterEntry, item: UniformItem) => {
    const activeAny = getActiveAssignment(item);
    const activePerf = getActiveAssignmentForPerformance(item, performanceId);
    if (activeAny) {
      if (activeAny.student_id === row.student_id && activeAny.performance_id === performanceId) {
        if (activeAny.distributed_at) {
          alert("Uniform is already marked as given to this student for this performance.");
          return;
        }
      } else {
        alert(`Uniform is already assigned to ${activeAny.student_name || "someone else"}. Return it first.`);
        return;
      }
    }
    const confirmed = window.confirm(`Mark uniform #${item.item_number} as given to ${row.name}?`);
    if (!confirmed) return;
    let res: Response | null = null;
    if (activePerf && !activePerf.distributed_at) {
      res = await fetch(`/api/uniform-assignments/${activePerf.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distributed_at: new Date().toISOString(), returned_at: null }),
      });
    } else {
      res = await fetch("/api/uniform-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniform_item_id: item.id,
          student_id: row.student_id,
          student_name: row.name,
          performance_id: performanceId,
          distributed_at: new Date().toISOString(),
        }),
      });
    }
    if (!res.ok) {
      alert("Failed to mark as given");
      return;
    }
    await loadData();
  };

  const handleReturn = async (item: UniformItem) => {
    const active = getActiveAssignmentForPerformance(item, performanceId);
    if (!active || !active.distributed_at) return;
    const confirmed = window.confirm(
      `Mark uniform #${item.item_number} as returned from ${active.student_name || "someone"}?`
    );
    if (!confirmed) return;
    const res = await fetch(`/api/uniform-assignments/${active.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returned_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      alert("Failed to mark as returned");
      return;
    }
    await loadData();
  };

  if (loading) {
    return <div className="text-gray-600">Loading uniforms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Uniform choices</div>
        <div className="space-y-3">
          {types.length === 0 && <div className="text-sm text-gray-500">No uniform types yet.</div>}
          {types.map((type) => (
            <div key={type.id}>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{type.name}</div>
              <div className="flex flex-wrap gap-2">
                {(itemsByType[type.id] || [])
                  .slice()
                  .sort((a, b) => a.item_number.localeCompare(b.item_number))
                  .map((item) => {
                  const latest = getLatestAssignment(item);
                  const active = getActiveAssignment(item);
                  const status = active
                    ? active.distributed_at
                      ? `Distributed to ${active.student_name || "Unknown"}`
                      : `Assigned to ${active.student_name || "Unknown"}`
                    : "On hand";
                  const isDistributed = Boolean(active && active.distributed_at);
                  const typeColor = type.color || "#0f172a";
                  return (
                    <span
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("uniformItemId", item.id);
                      }}
                      title={status}
                      className={`px-3 py-1 rounded-full text-xs font-semibold text-white cursor-grab ${
                        isDistributed ? "bg-black ring-2 ring-yellow-400" : ""
                      }`}
                      style={isDistributed ? undefined : { backgroundColor: typeColor }}
                    >
                      {type.name} #{item.item_number}
                      {isDistributed && (
                        <span className="ml-2 text-[10px] font-semibold">
                          (Distributed to {active?.student_name || "Unknown"})
                        </span>
                      )}
                    </span>
                  );
                })}
                {(itemsByType[type.id] || []).length === 0 && (
                  <div className="text-xs text-gray-500">No items</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-6 gap-0 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
          <div className="px-3 py-2">Student</div>
          <div className="px-3 py-2">Assigned</div>
          <div className="px-3 py-2">Status</div>
          <div className="px-3 py-2">Next Use</div>
          <div className="px-3 py-2">Given</div>
          <div className="px-3 py-2">Returned</div>
        </div>
        {sortedRoster.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No roster yet.</div>
        )}
        <div className="max-h-[420px] overflow-y-auto">
          {sortedRoster.map((row) => {
          const assignedItem = row.assigned_uniform_item_id
            ? itemById[row.assigned_uniform_item_id] || null
            : null;
          const activeAny = assignedItem ? getActiveAssignment(assignedItem) : null;
          const activePerf = assignedItem ? getActiveAssignmentForPerformance(assignedItem, performanceId) : null;
          const latestPerf = assignedItem ? getLatestAssignmentForPerformance(assignedItem, performanceId) : null;
          const isMismatch = !!(
            assignedItem &&
            activeAny &&
            activeAny.student_id &&
            activeAny.student_id !== row.student_id
          );
          const activeAssignments = getActiveAssignments(assignedItem);
          const distributedMatch = activeAssignments.find(
            (assignment) =>
              assignment.student_id === row.student_id && Boolean(assignment.distributed_at)
          );
          const inheritedDistributedAt = distributedMatch?.distributed_at || null;
          const isGiven = Boolean(activePerf && activePerf.distributed_at) || Boolean(inheritedDistributedAt);
          const isReturned = Boolean(latestPerf && latestPerf.returned_at);
          const isAssignedOnly = Boolean(assignedItem && !isGiven && !isReturned);
          const chipColor = !assignedItem
            ? "bg-gray-100 text-gray-600 border-gray-200"
            : isMismatch
              ? "bg-red-100 text-red-700 border-red-300"
              : isGiven
                ? "bg-black text-white border-yellow-400 ring-2 ring-yellow-400"
                : "text-white border-transparent";
          const statusLabel = !assignedItem
            ? "Unassigned"
            : isReturned
              ? "Returned"
              : isGiven
                ? `Given to ${activePerf?.student_name || row.name}`
                : "Assigned";
          const statusDetail = !assignedItem
            ? null
            : isReturned
              ? `Returned ${formatDisplayDateTime(latestPerf!.returned_at as string, DEFAULT_TIMEZONE)}`
              : isGiven
                ? `Given ${formatDisplayDateTime((activePerf?.distributed_at || inheritedDistributedAt) as string, DEFAULT_TIMEZONE)}`
                : isAssignedOnly
                  ? "Assigned"
                  : null;
          const statusClass = !assignedItem
            ? "bg-gray-100 text-gray-600 border-gray-200"
            : isReturned
              ? "bg-blue-100 text-blue-700 border-blue-300"
              : isGiven
                ? "bg-gray-700 text-white border-gray-700"
                : "bg-amber-100 text-amber-700 border-amber-300";
          const nextUse = getNextUse(assignedItem, row.student_id);
          const nextUseSameStudent = Boolean(nextUse && nextUse.student_id === row.student_id);
          const nextUseDate = nextUse?.performance_id
            ? performanceMeta[nextUse.performance_id]?.date || null
            : null;
          const nextUseLabel = nextUse
            ? nextUseSameStudent
              ? `${row.name} is assigned for ${getPerformanceLabel(nextUse.performance_id || null)}${
                  nextUseDate ? ` (${formatDisplayDateTime(nextUseDate, DEFAULT_TIMEZONE)})` : ""
                } coming up.`
              : `Warning: ${getPerformanceLabel(nextUse.performance_id || null)}${
                  nextUseDate ? ` (${formatDisplayDateTime(nextUseDate, DEFAULT_TIMEZONE)})` : ""
                } needs this uniform for ${nextUse.student_name || "another student"}.`
            : "—";

          return (
            <div
              key={row.signup_id}
              className="grid grid-cols-6 gap-0 border-b border-gray-200 last:border-b-0 text-sm"
            >
              <div className="px-3 py-3 font-semibold text-gray-900 flex items-center gap-2">
                <span>{row.name}</span>
                {!nextUseSameStudent && nextUse && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    !
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryStudent(row)}
                  className="text-[10px] px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  History
                </button>
              </div>
              <div
                className="px-3 py-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const itemId = e.dataTransfer.getData("uniformItemId");
                  if (!itemId) return;
                  const item = itemById[itemId];
                  const active = item ? getActiveAssignment(item) : null;
                  if (active && active.distributed_at) {
                    const activeName = (active.student_name || "").trim().toLowerCase();
                    const rowName = row.name.trim().toLowerCase();
                    if (!activeName || activeName !== rowName) {
                      alert(
                        `Uniform #${item?.item_number || ""} is already distributed to ${active.student_name || "someone"}.`
                      );
                      return;
                    }
                  }
                  handleAssign(row, itemId);
                }}
              >
                {assignedItem ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${chipColor}`}
                      style={{
                        backgroundColor:
                          assignedItem && !isGiven
                            ? typeById[assignedItem.uniform_type_id]?.color || undefined
                            : undefined,
                      }}
                    >
                      {typeById[assignedItem.uniform_type_id]?.name || "Uniform"} #{assignedItem.item_number}
                    </span>
                    {isMismatch && (
                      <span className="text-[10px] font-semibold text-red-600">Not available</span>
                    )}
                    <button
                      onClick={() => handleAssign(row, null)}
                      className="text-[10px] text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="w-full">
                    {holdingByStudent[row.student_id]?.length ? (
                      <div className="mb-2 text-[11px] text-amber-700">
                        Currently holding:{" "}
                        {holdingByStudent[row.student_id].map((item) => {
                          const typeName = typeById[item.uniform_type_id]?.name || "Uniform";
                          return `${typeName} #${item.item_number}`;
                        }).join(", ")}
                      </div>
                    ) : null}
                    <input
                      value={assignCodeByRow[row.signup_id] || ""}
                      onChange={(e) =>
                        setAssignCodeByRow((prev) => ({
                          ...prev,
                          [row.signup_id]: e.target.value,
                        }))
                      }
                      list={`uniform-options-${row.signup_id}`}
                      placeholder={
                        holdingByStudent[row.student_id]?.length
                          ? `Currently holding: ${holdingByStudent[row.student_id]
                              .map((item) => item.item_number)
                              .join(", ")}`
                          : "Drop uniform here or type code"
                      }
                      className="w-full px-2 py-1 border border-dashed border-gray-300 rounded text-xs text-gray-700"
                    />
                    <datalist id={`uniform-options-${row.signup_id}`}>
                      {items.map((item) => (
                        <option key={item.id} value={item.item_number} />
                      ))}
                    </datalist>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-600">
                      {items
                        .filter((item) =>
                          (assignCodeByRow[row.signup_id] || "").trim()
                            ? item.item_number.toLowerCase().includes((assignCodeByRow[row.signup_id] || "").trim().toLowerCase())
                            : false
                        )
                        .slice(0, 3)
                        .map((item) => (
                          <span key={`${row.signup_id}-${item.id}`} className="px-2 py-1 bg-gray-100 rounded-full">
                            {item.item_number} ({getItemStatusLabel(item)})
                          </span>
                        ))}
                    </div>
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const value = (assignCodeByRow[row.signup_id] || "").trim();
                          if (!value) return;
                          const match = items.find(
                            (item) => item.item_number.toLowerCase() === value.toLowerCase()
                          );
                          if (!match) {
                            alert("Uniform not found.");
                            return;
                          }
                          handleAssign(row, match.id);
                        }}
                        className="px-2 py-1 text-xs rounded bg-gray-800 text-white"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-3 py-3 text-xs text-gray-700">
                <div>
                  <span className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-semibold ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
                {statusDetail && <div className="text-[10px] text-gray-500">{statusDetail}</div>}
              </div>
              <div className="px-3 py-3 text-[11px] text-gray-700">
                <div
                  className={
                    nextUse && !nextUseSameStudent
                      ? "border border-red-300 bg-red-50 text-red-700 rounded px-2 py-1"
                      : ""
                  }
                >
                  {nextUseLabel}
                </div>
              </div>
              <div className="px-3 py-3">
                <button
                  onClick={() => assignedItem && handleGive(row, assignedItem)}
                  disabled={
                    !assignedItem ||
                    Boolean(
                      activePerf &&
                        activePerf.student_id === row.student_id &&
                        Boolean(activePerf.distributed_at)
                    )
                  }
                  className="px-3 py-1 rounded text-xs bg-emerald-600 text-white disabled:bg-gray-300"
                >
                  {isGiven ? "Given" : `Give to ${row.name}`}
                </button>
              </div>
              <div className="px-3 py-3 flex items-center gap-2">
                <button
                  onClick={() => assignedItem && handleReturn(assignedItem)}
                  disabled={!assignedItem || !activePerf || !activePerf.distributed_at}
                  className="px-3 py-1 rounded text-xs bg-blue-600 text-white disabled:bg-gray-300"
                >
                  {isReturned ? "Returned ✓" : "Not Returned"}
                </button>
                {!isReturned && nextUse && !nextUseSameStudent && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    !
                  </span>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {historyStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 w-full max-w-2xl shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Uniform History</div>
                <div className="text-lg font-semibold text-gray-900">{historyStudent.name}</div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="mt-3 max-h-[70vh] overflow-y-auto space-y-3 text-sm text-gray-700">
              {Array.from(getHistoryByItemForStudent(historyStudent.student_id).entries()).map(
                ([itemId, assignments]) => {
                  const item = itemById[itemId];
                  return (
                    <div key={itemId} className="border border-gray-200 rounded p-3">
                      <div className="font-semibold text-gray-900">
                        {item ? `#${item.item_number}` : "Uniform Item"}
                      </div>
                      <div className="mt-2 space-y-2">
                        {assignments.map((assignment) => (
                          <div key={assignment.id} className="text-xs text-gray-600">
                            {assignment.performance_id && (
                              <div>
                                Performance: {performanceMeta[assignment.performance_id]?.title || assignment.performance_id}
                              </div>
                            )}
                            <div>
                              Assigned:{" "}
                              {assignment.distributed_at || assignment.returned_at
                                ? formatDisplayDateTime(
                                    assignment.distributed_at || assignment.returned_at || "",
                                    DEFAULT_TIMEZONE
                                  )
                                : "—"}
                            </div>
                            <div>
                              Distributed:{" "}
                              {assignment.distributed_at
                                ? formatDisplayDateTime(assignment.distributed_at, DEFAULT_TIMEZONE)
                                : "—"}
                            </div>
                            <div>
                              Returned:{" "}
                              {assignment.returned_at
                                ? formatDisplayDateTime(assignment.returned_at, DEFAULT_TIMEZONE)
                                : "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
              {getHistoryByItemForStudent(historyStudent.student_id).size === 0 && (
                <div className="text-sm text-gray-500">No uniform history for this student.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
