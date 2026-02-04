"use client";

import { useMemo, useState } from "react";
import { useSchedule } from "@/hooks/useSchedule";
import {
  formatDisplayDateTime,
  formatTimeInTimeZone,
  formatTimeString,
  getDateKeyInTimeZone,
} from "@/lib/datetime";

type ScheduleItem = {
  id: string;
  type: "performance" | "rehearsal";
  dateKey: string;
  title: string;
  timeLabel: string;
  location: string;
  performanceTitle?: string;
  timezone?: string;
  isoDate?: string;
};

interface ScheduleViewProps {
  title?: string;
  accent?: "blue" | "green";
}

export function ScheduleView({ title = "Schedule", accent = "blue" }: ScheduleViewProps) {
  const { performances, rehearsals, loading, error } = useSchedule();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  const items = useMemo(() => {
    const performanceMap = new Map<string, string>();
    for (const perf of performances) {
      performanceMap.set(perf.id, perf.title);
    }

    const perfItems: ScheduleItem[] = performances.map((perf) => {
      const timeZone = perf.timezone || "America/New_York";
      const dateKey = getDateKeyInTimeZone(perf.date, timeZone);
      return {
        id: perf.id,
        type: "performance",
        dateKey,
        title: perf.title,
        timeLabel: formatTimeInTimeZone(perf.date, timeZone),
        location: perf.location,
        timezone: timeZone,
        isoDate: perf.date,
      };
    });

    const rehItems: ScheduleItem[] = rehearsals.map((reh) => ({
      id: reh.id,
      type: "rehearsal",
      dateKey: reh.date,
      title: reh.title,
      timeLabel: formatTimeString(reh.time),
      location: reh.location,
      performanceTitle: performanceMap.get(reh.performance_id),
    }));

    return [...perfItems, ...rehItems].sort((a, b) => {
      if (a.dateKey === b.dateKey) {
        return a.timeLabel.localeCompare(b.timeLabel);
      }
      return a.dateKey.localeCompare(b.dateKey);
    });
  }, [performances, rehearsals]);

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of items) {
      if (!map.has(item.dateKey)) map.set(item.dateKey, []);
      map.get(item.dateKey)!.push(item);
    }
    return map;
  }, [items]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    for (const item of items) {
      map[item.dateKey] = map[item.dateKey] || [];
      map[item.dateKey].push(item);
    }
    return map;
  }, [items]);

  const accentClasses = accent === "green"
    ? { active: "bg-green-600 text-white", pill: "bg-green-100 text-green-800" }
    : { active: "bg-blue-600 text-white", pill: "bg-blue-100 text-blue-800" };

  const monthLabel = monthCursor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
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
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-lg font-semibold ${view === "list" ? accentClasses.active : "bg-white text-gray-700 border border-gray-200"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 rounded-lg font-semibold ${view === "calendar" ? accentClasses.active : "bg-white text-gray-700 border border-gray-200"}`}
          >
            Calendar
          </button>
        </div>
      </div>

      {view === "list" && (
        <div className="space-y-6">
          {[...grouped.keys()].map((dateKey) => (
            <div key={dateKey} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="text-lg font-semibold text-gray-900 mb-3">
                {new Date(dateKey + "T00:00:00").toLocaleDateString()}
              </div>
              <div className="space-y-2">
                {grouped.get(dateKey)!.map((item) => (
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
                    <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${accentClasses.pill}`}>
                        {item.type === "performance" ? "Performance" : "Rehearsal"}
                      </span>
                      <span>
                        {item.type === "performance" && item.timezone
                          ? formatDisplayDateTime(item.isoDate || "", item.timezone)
                          : item.timeLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {grouped.size === 0 && (
            <div className="text-center py-12 text-gray-500">No scheduled items yet.</div>
          )}
        </div>
      )}

      {view === "calendar" && (
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
              return (
                <div key={dateKey} className="border border-gray-200 rounded-lg p-2 min-h-[72px]">
                  <div className="text-xs font-semibold text-gray-700 mb-1">{day}</div>
                  {dayItems.slice(0, 3).map((item) => (
                    <div key={item.id} className={`text-[10px] truncate ${accent === "green" ? "text-green-700" : "text-blue-700"}`}>
                      {item.type === "performance" ? "Perf" : "Reh"}: {item.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-gray-500">+{dayItems.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
