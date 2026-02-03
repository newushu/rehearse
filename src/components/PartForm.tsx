"use client";

import { useState } from "react";

interface PartFormProps {
  onSubmit: (name: string, description: string, order: number, isGroup: boolean) => Promise<any>;
  isLoading?: boolean;
}

export function PartForm({ onSubmit, isLoading = false }: PartFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    order: 0,
    is_group: true,
  });
  const [partType, setPartType] = useState<"group" | "subparts">("group");
  const [subparts, setSubparts] = useState<Array<{ title: string; notes: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.type === "number" ? Number(e.target.value) : e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name) {
      setError("Part name is required");
      return;
    }

    try {
      const isGroup = partType === "group";
      const trimmed = subparts
        .map((s) => ({ title: s.title.trim(), notes: s.notes.trim() }))
        .filter((s) => s.title.length > 0);

      if (!isGroup && trimmed.length === 0) {
        setError("Add at least one subpart for this part.");
        return;
      }

      const createdPart = await onSubmit(
        formData.name,
        formData.description,
        formData.order,
        isGroup
      );

      if (!isGroup) {
        await Promise.all(
          trimmed.map((s) =>
            fetch("/api/subparts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                part_id: createdPart.id,
                title: s.title,
                description: s.notes || null,
                mode: "position",
              }),
            })
          )
        );
      }

      setFormData({ name: "", description: "", order: 0, is_group: true });
      setPartType("group");
      setSubparts([]);
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
          Part Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Lead Dancers, Background Chorus"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Details about this part/choreography..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="radio"
          checked={partType === "group"}
          onChange={() => setPartType("group")}
          className="h-4 w-4"
        />
        Group part
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="radio"
          checked={partType === "subparts"}
          onChange={() => setPartType("subparts")}
          className="h-4 w-4"
        />
        Part with subparts / solos
      </label>

      {partType === "subparts" && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="text-sm font-semibold text-gray-700">Subparts</div>
          {subparts.length === 0 && (
            <div className="text-xs text-gray-500">Add at least one subpart.</div>
          )}
          <div className="space-y-2">
            {subparts.map((sub, idx) => (
              <div key={`subpart-${idx}`} className="border border-gray-200 rounded p-2">
                <input
                  type="text"
                  value={sub.title}
                  onChange={(e) => {
                    const next = [...subparts];
                    next[idx] = { ...next[idx], title: e.target.value };
                    setSubparts(next);
                  }}
                  placeholder={`Subpart ${idx + 1} title`}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                />
                <textarea
                  value={sub.notes}
                  onChange={(e) => {
                    const next = [...subparts];
                    next[idx] = { ...next[idx], notes: e.target.value };
                    setSubparts(next);
                  }}
                  placeholder="Notes"
                  rows={2}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  type="button"
                  onClick={() => setSubparts(subparts.filter((_, i) => i !== idx))}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSubparts([...subparts, { title: "", notes: "" }])}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
          >
            Add Subpart
          </button>
        </div>
      )}

      <div>
        <label className="block text-gray-700 font-semibold mb-2">
          Order
        </label>
        <input
          type="number"
          name="order"
          value={formData.order}
          onChange={handleChange}
          min="0"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {isLoading ? "Adding..." : "Add Part"}
      </button>
    </form>
  );
}
