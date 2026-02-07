"use client";

import { Performance } from "@/types";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";
import Link from "next/link";

interface PerformancesListProps {
  performances: Performance[];
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function PerformancesList({
  performances,
  onDelete,
  isLoading = false,
}: PerformancesListProps) {
  const formatLocalDateTime = (value: string, timeZone?: string) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString(undefined, { timeZone: DEFAULT_TIMEZONE, timeZoneName: "short" });
  };

  if (performances.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-4">No performances created yet.</p>
        <p className="text-gray-500 text-sm">Create your first performance to get started!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left">Title</th>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Location</th>
            <th className="px-4 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {performances.map((perf) => (
            <tr key={perf.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold">{perf.title}</td>
              <td className="px-4 py-3">
                {formatLocalDateTime(perf.date, perf.timezone)}
              </td>
              <td className="px-4 py-3">{perf.location}</td>
              <td className="px-4 py-3 text-center space-x-2">
                <Link
                  href={`/admin/performances/${perf.id}`}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Manage
                </Link>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this performance?"
                      )
                    ) {
                      onDelete(perf.id);
                    }
                  }}
                  disabled={isLoading}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm disabled:bg-gray-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
