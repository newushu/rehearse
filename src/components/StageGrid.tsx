"use client";

import { useEffect, useRef, useState } from "react";
import { StagePosition } from "@/types";

interface StageGridProps {
  partId: string;
  onPositionChange: (position: StagePosition) => Promise<void>;
}

const GRID_SIZE = 10;
const CELL_SIZE = 40;

export function StageGrid({ partId, onPositionChange }: StageGridProps) {
  const [positions, setPositions] = useState<Map<number, StagePosition>>(new Map());
  const [draggedPosition, setDraggedPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [gridScale, setGridScale] = useState(1);
  const baseSize = GRID_SIZE * CELL_SIZE;

  useEffect(() => {
    async function fetchPositions() {
      try {
        const response = await fetch(`/api/stage-positions?partId=${partId}`);
        if (!response.ok) throw new Error("Failed to fetch positions");
        const data = await response.json();
        const map = new Map<number, StagePosition>(
          (data as StagePosition[]).map((pos, idx) => [idx, pos])
        );
        setPositions(map);
      } catch (error) {
        console.error("Error fetching positions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPositions();
  }, [partId]);

  useEffect(() => {
    const el = gridWrapRef.current;
    if (!el) return;
    const updateScale = () => {
      const width = el.clientWidth;
      if (!width) return;
      setGridScale(Math.min(1, width / baseSize));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [baseSize]);

  const handleGridClick = async (x: number, y: number) => {
    if (draggedPosition === null) return;

    const position = positions.get(draggedPosition);
    if (position) {
      try {
        await onPositionChange({ ...position, x, y });
        const newPositions = new Map(positions);
        newPositions.set(draggedPosition, { ...position, x, y });
        setPositions(newPositions);
        setDraggedPosition(null);
      } catch (error) {
        console.error("Error updating position:", error);
      }
    }
  };

  const handleGridDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleGridDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scale = gridScale || 1;
    const x = Math.floor((e.clientX - rect.left) / (CELL_SIZE * scale));
    const y = Math.floor((e.clientY - rect.top) / (CELL_SIZE * scale));
    handleGridClick(Math.min(x, GRID_SIZE - 1), Math.min(y, GRID_SIZE - 1));
  };

  if (loading) {
    return <div className="text-center py-4">Loading stage positions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Stage Layout (Drag to position)</h3>
          <div
            ref={gridWrapRef}
            className="w-full overflow-hidden"
            style={{ height: baseSize * gridScale }}
          >
            <div
              className="border-2 border-gray-400 bg-gradient-to-b from-amber-100 to-amber-50 cursor-pointer relative"
              style={{
                width: baseSize,
                height: baseSize,
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)
                `,
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                transform: `scale(${gridScale})`,
                transformOrigin: "top left",
              }}
              onDragOver={handleGridDragOver}
              onDrop={handleGridDrop}
            >
              {Array.from(positions.values()).map((pos) => (
                <div
                  key={pos.id}
                  draggable
                  onDragStart={() =>
                    setDraggedPosition(
                      Array.from(positions.entries()).find(([, p]) => p.id === pos.id)?.[0] ?? null
                    )
                  }
                  className="absolute w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-move hover:bg-blue-600"
                  style={{
                    left: pos.x * CELL_SIZE + CELL_SIZE / 2 - 16,
                    top: pos.y * CELL_SIZE + CELL_SIZE / 2 - 16,
                    backgroundColor:
                      draggedPosition ===
                      Array.from(positions.entries()).find(([, p]) => p.id === pos.id)?.[0]
                        ? "#2563eb"
                        : "#3b82f6",
                  }}
                  title={`Position: (${pos.x}, ${pos.y})`}
                >
                  {Array.from(positions.entries()).find(([, p]) => p.id === pos.id)?.[0] ?? 0}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-48">
          <h3 className="font-semibold mb-2">Legend</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
              <span>Student Position</span>
            </div>
            <p className="text-gray-600 text-xs mt-4">
              Drag and drop student markers to reposition them on stage. Use the grid to align students in formation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
