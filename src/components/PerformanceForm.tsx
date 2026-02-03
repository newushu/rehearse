"use client";

import { useState } from "react";

interface PerformanceFormProps {
  onSubmit: (entries: Array<{
    title: string;
    description: string;
    date: string;
    location: string;
    call_time: string;
    rehearsals: Array<{ title: string; date: string; time: string; location: string }>;
  }>) => Promise<void>;
  isLoading?: boolean;
}

export function PerformanceForm({ onSubmit, isLoading = false }: PerformanceFormProps) {
  const DEFAULT_TIMEZONE = "America/New_York";
  const [entries, setEntries] = useState([
    {
      title: "",
      description: "",
      date: "",
      location: "",
      call_time: "",
      timezone: DEFAULT_TIMEZONE,
      rehearsals: [] as Array<{ title: string; date: string; time: string; location: string }>,
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  const updateEntry = (index: number, field: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        date: "",
        location: "",
        call_time: "",
        timezone: DEFAULT_TIMEZONE,
        rehearsals: [],
      },
    ]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const addRehearsal = (index: number) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index
          ? {
              ...entry,
              rehearsals: [
                ...entry.rehearsals,
                { title: "", date: "", time: "", location: "" },
              ],
            }
          : entry
      )
    );
  };

  const updateRehearsal = (index: number, rIndex: number, field: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index
          ? {
              ...entry,
              rehearsals: entry.rehearsals.map((reh, ri) =>
                ri === rIndex ? { ...reh, [field]: value } : reh
              ),
            }
          : entry
      )
    );
  };

  const removeRehearsal = (index: number, rIndex: number) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index
          ? { ...entry, rehearsals: entry.rehearsals.filter((_, ri) => ri !== rIndex) }
          : entry
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const missingIndex = entries.findIndex(
      (entry) => !entry.title || !entry.date || !entry.location
    );
    if (missingIndex !== -1) {
      setError(`Please fill in all required fields for performance #${missingIndex + 1}`);
      return;
    }

    try {
      await onSubmit(entries);
      setEntries([
        {
          title: "",
          description: "",
          date: "",
          location: "",
          call_time: "",
          timezone: DEFAULT_TIMEZONE,
          rehearsals: [],
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error: {error}</p>
          {error.includes("supabaseUrl") && (
            <p className="text-sm mt-2">
              📌 Make sure to configure your .env.local file with Supabase credentials. See QUICK_START.md for instructions.
            </p>
          )}
        </div>
      )}

      {entries.map((entry, index) => (
        <div key={`performance-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Performance #{index + 1}</h3>
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            )}
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Performance Title *
            </label>
            <input
              type="text"
              value={entry.title}
              onChange={(e) => updateEntry(index, "title", e.target.value)}
              placeholder="e.g., Spring Recital 2026"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Time *
              </label>
              <input
                type="datetime-local"
                value={entry.date}
                onChange={(e) => updateEntry(index, "date", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Call Time
              </label>
              <input
                type="time"
                value={entry.call_time}
                onChange={(e) => updateEntry(index, "call_time", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Location *
              </label>
              <input
                type="text"
                value={entry.location}
                onChange={(e) => updateEntry(index, "location", e.target.value)}
                placeholder="e.g., Main Auditorium"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Timezone: {entry.timezone}
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Notes
            </label>
            <textarea
              value={entry.description}
              onChange={(e) => updateEntry(index, "description", e.target.value)}
              placeholder="Add any details about this performance..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900">Rehearsals (optional)</div>
              <button
                type="button"
                onClick={() => addRehearsal(index)}
                className="text-xs text-blue-700 hover:text-blue-900"
              >
                + Add rehearsal
              </button>
            </div>
            {entry.rehearsals.length === 0 && (
              <div className="text-xs text-gray-500">No rehearsals added.</div>
            )}
            <div className="space-y-3">
              {entry.rehearsals.map((reh, rIndex) => (
                <div key={`reh-${index}-${rIndex}`} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={reh.title}
                      onChange={(e) => updateRehearsal(index, rIndex, "title", e.target.value)}
                      placeholder="Rehearsal title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      value={reh.date}
                      onChange={(e) => updateRehearsal(index, rIndex, "date", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="time"
                      value={reh.time}
                      onChange={(e) => updateRehearsal(index, rIndex, "time", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      value={reh.location}
                      onChange={(e) => updateRehearsal(index, rIndex, "location", e.target.value)}
                      placeholder="Location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRehearsal(index, rIndex)}
                    className="mt-2 text-xs text-red-600 hover:text-red-800"
                  >
                    Remove rehearsal
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addEntry}
        className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium"
      >
        + Add Another Performance
      </button>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {isLoading ? "Creating..." : "Create Performance"}
      </button>
    </form>
  );
}
