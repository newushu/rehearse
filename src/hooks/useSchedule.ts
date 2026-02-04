import { useEffect, useState } from "react";

export interface SchedulePerformance {
  id: string;
  title: string;
  date: string;
  location: string;
  timezone?: string;
}

export interface ScheduleRehearsal {
  id: string;
  performance_id: string;
  title: string;
  date: string;
  time: string;
  location: string;
}

export function useSchedule() {
  const [performances, setPerformances] = useState<SchedulePerformance[]>([]);
  const [rehearsals, setRehearsals] = useState<ScheduleRehearsal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchSchedule() {
      try {
        const [perfRes, rehRes] = await Promise.all([
          fetch("/api/performances"),
          fetch("/api/rehearsals"),
        ]);
        if (!perfRes.ok) throw new Error("Failed to fetch performances");
        if (!rehRes.ok) throw new Error("Failed to fetch rehearsals");
        const perfData = await perfRes.json();
        const rehData = await rehRes.json();
        if (!mounted) return;
        setPerformances(perfData || []);
        setRehearsals(rehData || []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load schedule");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSchedule();
    return () => {
      mounted = false;
    };
  }, []);

  return { performances, rehearsals, loading, error };
}
