import { useState, useEffect } from "react";
import { Performance } from "@/types";

export function usePerformances() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPerformances() {
      try {
        const response = await fetch("/api/performances");
        if (!response.ok) throw new Error("Failed to fetch performances");
        const data = await response.json();
        setPerformances(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchPerformances();
  }, []);

  const createPerformance = async (
    title: string,
    description: string,
    date: string,
    location: string,
    call_time?: string,
    timezone?: string
  ) => {
    try {
      const response = await fetch("/api/performances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, date, location, call_time, timezone }),
      });
      if (!response.ok) throw new Error("Failed to create performance");
      const newPerformance = await response.json();
      setPerformances([...performances, newPerformance]);
      return newPerformance;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  const deletePerformance = async (id: string) => {
    try {
      const response = await fetch(`/api/performances/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete performance");
      setPerformances(performances.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  return {
    performances,
    loading,
    error,
    createPerformance,
    deletePerformance,
  };
}
