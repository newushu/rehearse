import { useState, useEffect } from "react";
import { Part } from "@/types";

export function useParts(performanceId: string | null) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!performanceId) {
      setParts([]);
      setLoading(false);
      return;
    }

    async function fetchParts() {
      try {
        const response = await fetch(`/api/parts?performanceId=${performanceId}`);
        if (!response.ok) throw new Error("Failed to fetch parts");
        const data = await response.json();
        setParts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchParts();
  }, [performanceId]);

  const createPart = async (
    name: string,
    description: string,
    order: number,
    isGroup: boolean
  ) => {
    if (!performanceId) throw new Error("Performance ID is required");
    try {
      const response = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performance_id: performanceId,
          name,
          description,
          order,
          is_group: isGroup,
        }),
      });
      if (!response.ok) throw new Error("Failed to create part");
      const newPart = await response.json();
      setParts([...parts, newPart]);
      return newPart;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  const deletePart = async (id: string) => {
    try {
      const response = await fetch(`/api/parts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete part");
      setParts(parts.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  return {
    parts,
    loading,
    error,
    createPart,
    deletePart,
    setParts,
  };
}
