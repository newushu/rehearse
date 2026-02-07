"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_TIMEZONE, formatDisplayDateTime } from "@/lib/datetime";

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, itemsRes, rosterRes] = await Promise.all([
        fetch("/api/uniform-types"),
        fetch("/api/uniform-items"),
        fetch(`/api/performances/${performanceId}/roster`),
      ]);
      const [typesData, itemsData, rosterData] = await Promise.all([
        typesRes.ok ? typesRes.json() : [],
        itemsRes.ok ? itemsRes.json() : [],
        rosterRes.ok ? rosterRes.json() : [],
      ]);
      setTypes(typesData || []);
      setItems(itemsData || []);
      setRoster(rosterData || []);
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

  const handleAssign = async (signupId: string, itemId: string | null) => {
    const res = await fetch(`/api/signups/${signupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_uniform_item_id: itemId }),
    });
    if (!res.ok) {
      alert("Failed to assign uniform");
      return;
    }
    setRoster((prev) =>
      prev.map((row) =>
        row.signup_id === signupId ? { ...row, assigned_uniform_item_id: itemId } : row
      )
    );
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
                  return (
                    <span
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("uniformItemId", item.id);
                      }}
                      title={status}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isDistributed
                          ? "bg-slate-800 text-white cursor-grab ring-2 ring-amber-400"
                          : "bg-slate-900 text-white cursor-grab"
                      }`}
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
        <div className="grid grid-cols-5 gap-0 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
          <div className="px-3 py-2">Student</div>
          <div className="px-3 py-2">Assigned</div>
          <div className="px-3 py-2">Status</div>
          <div className="px-3 py-2">Given</div>
          <div className="px-3 py-2">Returned</div>
        </div>
        {roster.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No roster yet.</div>
        )}
        {roster.map((row) => {
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
          const isGiven = Boolean(activePerf && activePerf.distributed_at);
          const isReturned = Boolean(latestPerf && latestPerf.returned_at);
          const isAssignedOnly = Boolean(assignedItem && !isGiven && !isReturned);
          const chipColor = !assignedItem
            ? "bg-gray-100 text-gray-600 border-gray-200"
            : isMismatch
              ? "bg-red-100 text-red-700 border-red-300"
              : isReturned
                ? "bg-blue-100 text-blue-700 border-blue-300"
                : isGiven
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-amber-100 text-amber-700 border-amber-300";
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
                ? `Given ${formatDisplayDateTime(activePerf!.distributed_at as string, DEFAULT_TIMEZONE)}`
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

          return (
            <div
              key={row.signup_id}
              className="grid grid-cols-5 gap-0 border-b border-gray-200 last:border-b-0 text-sm"
            >
              <div className="px-3 py-3 font-semibold text-gray-900">{row.name}</div>
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
                  handleAssign(row.signup_id, itemId);
                }}
              >
                {assignedItem ? (
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${chipColor}`}>
                      {typeById[assignedItem.uniform_type_id]?.name || "Uniform"} #{assignedItem.item_number}
                    </span>
                    {isMismatch && (
                      <span className="text-[10px] font-semibold text-red-600">Not available</span>
                    )}
                    <button
                      onClick={() => handleAssign(row.signup_id, null)}
                      className="text-[10px] text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 border border-dashed border-gray-300 rounded px-2 py-1 w-fit">
                    Drop uniform here
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
              <div className="px-3 py-3">
                <button
                  onClick={() => assignedItem && handleReturn(assignedItem)}
                  disabled={!assignedItem || !activePerf || !activePerf.distributed_at}
                  className="px-3 py-1 rounded text-xs bg-blue-600 text-white disabled:bg-gray-300"
                >
                  {isReturned ? "Returned ✓" : "Not Returned"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
