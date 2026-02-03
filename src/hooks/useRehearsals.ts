import { useState, useEffect } from "react";
import { Rehearsal } from "@/types";

export function useRehearsals(performanceId: string | null) {
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!performanceId) {
      setRehearsals([]);
      setLoading(false);
      return;
    }

    async function fetchRehearsals() {
      try {
        const response = await fetch(
          `/api/rehearsals?performanceId=${performanceId}`
        );
        if (!response.ok) throw new Error("Failed to fetch rehearsals");
        const data = await response.json();
        setRehearsals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchRehearsals();
  }, [performanceId]);

  const createRehearsal = async (
    title: string,
    dateEntries: Array<{ date: string; time: string; location: string }>
  ) => {
    if (!performanceId) throw new Error("Performance ID is required");
    try {
      // Create a rehearsal for each date entry
      const responses = await Promise.all(
        dateEntries.map((entry) =>
          fetch("/api/rehearsals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              performance_id: performanceId,
              title,
              date: entry.date,
              time: entry.time,
              location: entry.location,
            }),
          })
        )
      );

      for (const response of responses) {
        if (!response.ok) throw new Error("Failed to create rehearsal");
      }

      const newRehearsals = await Promise.all(responses.map((r) => r.json()));
      setRehearsals([...rehearsals, ...newRehearsals]);
      return newRehearsals;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  const deleteRehearsal = async (id: string) => {
    try {
      const response = await fetch(`/api/rehearsals/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete rehearsal");
      setRehearsals(rehearsals.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  const updateRehearsal = async (
    id: string,
    updates: { title: string; date: string; time: string; location: string }
  ) => {
    try {
      const response = await fetch(`/api/rehearsals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update rehearsal");
      const updated = await response.json();
      setRehearsals((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  return {
    rehearsals,
    loading,
    error,
    createRehearsal,
    deleteRehearsal,
    updateRehearsal,
  };
}
