"use client";

import { useMemo, useState, useEffect } from "react";
import { useSchedule } from "@/hooks/useSchedule";
import {
  formatDisplayDateTime,
  formatTimeInTimeZone,
  formatTimeString,
  getDateKeyInTimeZone,
  zonedDateTimeLocalToUtcIso,
  DEFAULT_TIMEZONE,
} from "@/lib/datetime";

type ScheduleItem = {
  id: string;
  type: "performance" | "rehearsal";
  dateKey: string;
  title: string;
  timeLabel: string;
  sortTime: number;
  location: string;
  performanceTitle?: string;
  performanceId?: string;
  timezone?: string;
  isoDate?: string;
};

interface ScheduleViewProps {
  title?: string;
  accent?: "blue" | "green";
}

export function ScheduleView({ title = "Performance Schedule", accent = "blue" }: ScheduleViewProps) {
  const { performances, rehearsals, loading, error } = useSchedule();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [performanceFilter, setPerformanceFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [rosterByPerformance, setRosterByPerformance] = useState<Record<string, string[]>>({});
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const items = useMemo(() => {
    const performanceMap = new Map<string, { title: string; timezone: string }>();
    for (const perf of performances) {
      performanceMap.set(perf.id, {
        title: perf.title,
        timezone: DEFAULT_TIMEZONE,
      });
    }

    const perfItems: ScheduleItem[] = performances.map((perf) => {
      const timeZone = DEFAULT_TIMEZONE;
      const dateKey = getDateKeyInTimeZone(perf.date, timeZone);
      return {
        id: perf.id,
        type: "performance",
        dateKey,
        title: perf.title,
        timeLabel: formatTimeInTimeZone(perf.date, timeZone),
        sortTime: new Date(perf.date).getTime(),
        location: perf.location,
        performanceId: perf.id,
        timezone: timeZone,
        isoDate: perf.date,
      };
    });

    const rehItems: ScheduleItem[] = rehearsals.map((reh) => {
      const rehIso = zonedDateTimeLocalToUtcIso(`${reh.date}T${reh.time}`, DEFAULT_TIMEZONE);
      const rehDateTime = new Date(rehIso || `${reh.date}T${reh.time}`);
      const perfMeta = performanceMap.get(reh.performance_id);
      const timeZone = perfMeta?.timezone || DEFAULT_TIMEZONE;
      return {
        id: reh.id,
        type: "rehearsal",
        dateKey: reh.date,
        title: reh.title,
        timeLabel: formatTimeString(reh.time),
        sortTime: Number.isNaN(rehDateTime.getTime()) ? 0 : rehDateTime.getTime(),
        location: reh.location,
        performanceTitle: perfMeta?.title,
        performanceId: reh.performance_id,
        timezone: timeZone,
      };
    });

    return [...perfItems, ...rehItems].sort((a, b) => {
      if (a.dateKey === b.dateKey) {
        return a.sortTime - b.sortTime;
      }
      return a.dateKey.localeCompare(b.dateKey);
    });
  }, [performances, rehearsals]);

  const filteredItems = useMemo(() => {
    const perfQuery = performanceFilter.trim().toLowerCase();
    const studentQuery = studentFilter.trim().toLowerCase();
    return items.filter((item) => {
      if (perfQuery) {
        const perfText = `${item.title} ${item.performanceTitle || ""}`.toLowerCase();
        if (!perfText.includes(perfQuery)) return false;
      }
      if (studentQuery) {
        const perfId = item.performanceId;
        if (!perfId) return false;
        const roster = rosterByPerformance[perfId] || [];
        if (!roster.some((name) => name.toLowerCase().includes(studentQuery))) return false;
      }
      return true;
    });
  }, [items, performanceFilter, studentFilter, rosterByPerformance]);

  const todayKey = getDateKeyInTimeZone(new Date().toISOString(), DEFAULT_TIMEZONE);

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    for (const item of filteredItems) {
      map[item.dateKey] = map[item.dateKey] || [];
      map[item.dateKey].push(item);
    }
    return map;
  }, [filteredItems]);

  useEffect(() => {
    if (!studentFilter.trim()) return;
    const missing = performances.filter((perf) => !rosterByPerformance[perf.id]);
    if (missing.length === 0) return;
    let active = true;
    (async () => {
      const entries = await Promise.all(
        missing.map(async (perf) => {
          try {
            const res = await fetch(`/api/performances/${perf.id}/roster`);
            if (!res.ok) return [perf.id, []] as const;
            const data = await res.json();
            const names = (data || []).map((row: any) => row.name || "Unknown");
            return [perf.id, names] as const;
          } catch {
            return [perf.id, []] as const;
          }
        })
      );
      if (!active) return;
      setRosterByPerformance((prev) => {
        const next = { ...prev };
        entries.forEach(([id, names]) => {
          next[id] = names;
        });
        return next;
      });
    })();
    return () => {
      active = false;
    };
  }, [studentFilter, performances, rosterByPerformance]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handle = () => setIsMobile(mq.matches);
    handle();
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  useEffect(() => {
    if (isMobile && view === "calendar") {
      setView("list");
    }
  }, [isMobile, view]);

  const accentClasses = accent === "green"
    ? { active: "bg-green-600 text-white", pill: "bg-green-100 text-green-800" }
    : { active: "bg-blue-600 text-white", pill: "bg-blue-100 text-blue-800" };

  const palette = useMemo(
    () => [
      { reh: "bg-blue-600 text-white", perf: "bg-blue-600 text-white" },
      { reh: "bg-emerald-600 text-white", perf: "bg-emerald-600 text-white" },
      { reh: "bg-rose-600 text-white", perf: "bg-rose-600 text-white" },
      { reh: "bg-amber-600 text-white", perf: "bg-amber-600 text-white" },
      { reh: "bg-indigo-600 text-white", perf: "bg-indigo-600 text-white" },
      { reh: "bg-teal-600 text-white", perf: "bg-teal-600 text-white" },
    ],
    []
  );

  const colorByPerformanceId = useMemo(() => {
    const map: Record<string, { reh: string; perf: string }> = {};
    performances.forEach((perf, idx) => {
      map[perf.id] = palette[idx % palette.length];
    });
    return map;
  }, [performances, palette]);

  const getChipClasses = (item: ScheduleItem) => {
    const paletteEntry = item.performanceId ? colorByPerformanceId[item.performanceId] : null;
    if (!paletteEntry) return accentClasses.pill;
    return item.type === "performance" ? paletteEntry.perf : paletteEntry.reh;
  };

  const getCalendarChipClasses = (item: ScheduleItem) => {
    const base = getChipClasses(item);
    if (item.type === "performance") {
      return `${base} ring-2 ring-black ring-offset-2 ring-offset-gray-100`;
    }
    return base;
  };

  const getShortLabel = (item: ScheduleItem) => (item.type === "performance" ? "Perf" : "Reh");

  const getChipText = (item: ScheduleItem) => {
    if (item.type === "rehearsal") {
      const perfName = item.performanceTitle || "Performance";
      return `Reh: ${item.timeLabel} - ${perfName}`;
    }
    return `Perf: ${item.timeLabel} - ${item.title}`;
  };

  const getChipTitle = (item: ScheduleItem) => {
    const when = getItemTimeLabel(item);
    const perf = item.type === "rehearsal" && item.performanceTitle ? `For: ${item.performanceTitle}` : "";
    const lines = [
      item.title,
      perf,
      `When: ${when}`,
      item.location ? `Where: ${item.location}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const getTimeZoneLabel = (timeZone?: string) => {
    if (!timeZone) return "";
    if (timeZone === DEFAULT_TIMEZONE) return "ET";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || timeZone;
  };

  const getItemTimeLabel = (item: ScheduleItem) => {
    if (item.type === "performance" && item.timezone) {
      return formatDisplayDateTime(item.isoDate || "", item.timezone);
    }
    if (item.timezone) {
      return `${item.timeLabel} (${getTimeZoneLabel(item.timezone)})`;
    }
    return item.timeLabel;
  };

  const monthLabel = monthCursor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of filteredItems) {
      if (!map.has(item.dateKey)) map.set(item.dateKey, []);
      map.get(item.dateKey)!.push(item);
    }
    return map;
  }, [filteredItems]);

  const upcomingGrouped = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of filteredItems) {
      if (item.dateKey < todayKey) continue;
      if (!map.has(item.dateKey)) map.set(item.dateKey, []);
      map.get(item.dateKey)!.push(item);
    }
    return map;
  }, [filteredItems, todayKey]);
  const formatDateKeyLabel = (dateKey: string) => {
    const [y, m, d] = dateKey.split("-").map((val) => parseInt(val, 10));
    if (!y || !m || !d) return dateKey;
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return date.toLocaleDateString(undefined, {
      timeZone: DEFAULT_TIMEZONE,
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading schedule...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">Performances and rehearsals, day by day.</p>
          {isMobile && (
            <p className="text-xs text-gray-500 mt-2">
              Tip: Rotate your phone for a better calendar view.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value)}
            placeholder="Filter by performance"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <input
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            placeholder="Filter by student"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-lg font-semibold ${view === "list" ? accentClasses.active : "bg-white text-gray-700 border border-gray-200"}`}
          >
            List
          </button>
          {!isMobile && (
            <button
              onClick={() => setView("calendar")}
              className={`px-4 py-2 rounded-lg font-semibold ${view === "calendar" ? accentClasses.active : "bg-white text-gray-700 border border-gray-200"}`}
            >
              Calendar
            </button>
          )}
        </div>
      </div>

      {view === "list" && (
        <div className="space-y-6">
          {[...upcomingGrouped.keys()].map((dateKey) => (
            <div
              key={dateKey}
              className={`border border-gray-200 rounded-lg p-4 ${dateKey < todayKey ? "bg-gray-100 text-gray-500" : "bg-gray-50"}`}
            >
              <div className="mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-900 text-white">
                  {formatDateKeyLabel(dateKey)}
                </span>
              </div>
              <div className="space-y-2">
                {upcomingGrouped.get(dateKey)!.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {item.title}
                        {item.type === "rehearsal" && item.performanceTitle && (
                          <span className="text-xs text-gray-500 ml-2">
                            (for {item.performanceTitle})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{item.location}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-700 flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className={`px-3 py-1 rounded-full text-[clamp(10px,1.6vw,12px)] leading-tight font-semibold max-w-full ${getChipClasses(item)}`}
                        title={getChipTitle(item)}
                      >
                        {getChipText(item)}
                      </button>
                      <span>
                        {getItemTimeLabel(item)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {upcomingGrouped.size === 0 && (
            <div className="text-center py-12 text-gray-500">No scheduled items yet.</div>
          )}
          {selectedItem && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    {getShortLabel(selectedItem)} Details
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{selectedItem.title}</div>
                  {selectedItem.type === "rehearsal" && selectedItem.performanceTitle && (
                    <div className="text-sm text-gray-500">for {selectedItem.performanceTitle}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <div>
                  <span className="font-semibold">When:</span> {getItemTimeLabel(selectedItem)}
                </div>
                <div>
                  <span className="font-semibold">Location:</span> {selectedItem.location || "—"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "calendar" && !isMobile && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
              className="px-3 py-1 rounded border border-gray-200 text-gray-600"
            >
              Prev
            </button>
            <div className="text-lg font-semibold text-gray-900">{monthLabel}</div>
            <button
              onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
              className="px-3 py-1 rounded border border-gray-200 text-gray-600"
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 text-xs font-semibold text-gray-500 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startWeekday }).map((_, idx) => (
              <div key={`empty-${idx}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayItems = eventsByDate[dateKey] || [];
              const isPast = dateKey < todayKey;
              return (
                <div
                  key={dateKey}
                  className={`border border-gray-200 rounded-lg p-2 ${isPast ? "bg-gray-50 text-gray-400" : ""}`}
                >
                  <div className="text-xs font-semibold text-gray-700 mb-1">{day}</div>
                  <div className="space-y-1">
                    {dayItems.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`w-full text-left px-2 py-1 rounded-full text-[clamp(9px,1.6vw,11px)] leading-tight font-semibold whitespace-normal break-words ${getCalendarChipClasses(item)}`}
                        title={getChipTitle(item)}
                        onClick={() => setSelectedItem(item)}
                      >
                        {getChipText(item)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedItem && (
            <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    {getShortLabel(selectedItem)} Details
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{selectedItem.title}</div>
                  {selectedItem.type === "rehearsal" && selectedItem.performanceTitle && (
                    <div className="text-sm text-gray-500">for {selectedItem.performanceTitle}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <div>
                  <span className="font-semibold">When:</span> {getItemTimeLabel(selectedItem)}
                </div>
                <div>
                  <span className="font-semibold">Location:</span> {selectedItem.location || "—"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
