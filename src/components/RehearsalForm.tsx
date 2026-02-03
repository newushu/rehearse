"use client";

import { useState } from "react";

interface DateEntry {
  date: string;
  time: string;
  location: string;
}

interface RehearsalFormProps {
  onSubmit: (title: string, dateEntries: DateEntry[]) => Promise<void>;
  isLoading?: boolean;
}

export function RehearsalForm({ onSubmit, isLoading = false }: RehearsalFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    dateEntries: [{ date: "", time: "", location: "" }],
  });
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      title: e.target.value,
    });
  };

  const handleDateEntryChange = (index: number, field: string, value: string) => {
    const newEntries = [...formData.dateEntries];
    newEntries[index] = {
      ...newEntries[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      dateEntries: newEntries,
    });
  };

  const addDateEntry = () => {
    setFormData({
      ...formData,
      dateEntries: [...formData.dateEntries, { date: "", time: "", location: "" }],
    });
  };

  const removeDateEntry = (index: number) => {
    setFormData({
      ...formData,
      dateEntries: formData.dateEntries.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const filledEntries = formData.dateEntries.filter(
      (entry) => entry.date && entry.time && entry.location
    );

    if (!formData.title || filledEntries.length === 0) {
      setError("Please fill in title and at least one complete date/time/location entry");
      return;
    }

    try {
      await onSubmit(formData.title, filledEntries);
      setFormData({ title: "", dateEntries: [{ date: "", time: "", location: "" }] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={handleTitleChange}
          placeholder="e.g., Full Cast Rehearsal"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-gray-700 font-semibold mb-4">
          Schedule Dates & Times * (Each date can have different time/location)
        </label>
        <div className="space-y-4">
          {formData.dateEntries.map((entry, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 font-medium mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) => handleDateEntryChange(index, "date", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 font-medium mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={entry.time}
                    onChange={(e) => handleDateEntryChange(index, "time", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 font-medium mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={entry.location}
                    onChange={(e) => handleDateEntryChange(index, "location", e.target.value)}
                    placeholder="e.g., Studio A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              {formData.dateEntries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDateEntry(index)}
                  className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addDateEntry}
          className="mt-3 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 font-medium"
        >
          + Add Another Date
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {isLoading ? "Scheduling..." : "Schedule Rehearsal"}
      </button>
    </form>
  );
}
