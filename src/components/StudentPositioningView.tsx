"use client";

import { useState, useEffect } from "react";
import { AppLogo } from "@/components/AppLogo";

interface StudentPosition {
  part_name: string;
  part_id: string;
  x: number;
  y: number;
  positioned: boolean;
}

interface StudentPositioningViewProps {
  performanceId: string;
  studentId: string;
  studentName: string;
}

const GRID_SIZE = 10;
const CELL_SIZE = 40;

export function StudentPositioningView({
  performanceId,
  studentId,
  studentName,
}: StudentPositioningViewProps) {
  const [positions, setPositions] = useState<StudentPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);

  useEffect(() => {
    fetchPositions();
  }, [performanceId, studentId]);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      // Get performance with parts
      const perfRes = await fetch(`/api/performances/${performanceId}`);
      const perf = await perfRes.json();

      if (!perf.parts || perf.parts.length === 0) {
        setPositions([]);
        return;
      }

      // Get positioning for each part
      const posData: StudentPosition[] = [];
      for (const part of perf.parts) {
        const posRes = await fetch(`/api/stage-positions?partId=${part.id}`);
        const positions = await posRes.json();
        const studentPos = positions.find(
          (p: any) => p.student_id === studentId
        );

        posData.push({
          part_name: part.name,
          part_id: part.id,
          x: studentPos?.x || 0,
          y: studentPos?.y || 0,
          positioned: !!studentPos,
        });
      }
      setPositions(posData);
    } catch (err) {
      console.error("Error fetching positions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your positions...</div>;
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>No positioning information available for this performance.</p>
      </div>
    );
  }

  const currentPos = positions[selectedPartIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3 mb-2">
          <AppLogo size={28} className="border border-blue-200 bg-white text-blue-400" />
          <h2 className="font-bold text-lg text-gray-900">
            Your Position for {studentName}
          </h2>
        </div>
        <p className="text-sm text-gray-600">
          View your position on stage for each part of the choreography
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Parts List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
            <h3 className="font-semibold text-gray-900 mb-3">All Parts</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {positions.map((pos, idx) => (
                <button
                  key={pos.part_id}
                  onClick={() => setSelectedPartIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    selectedPartIndex === idx
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-white text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{pos.part_name}</span>
                    {pos.positioned ? (
                      <span className="text-sm">✓</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </div>
                  {pos.positioned && (
                    <div className="text-xs mt-1 opacity-75">
                      Position: ({pos.x}, {pos.y})
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            {/* Part Info */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {currentPos.part_name}
                </h3>
                {currentPos.positioned ? (
                  <p className="text-sm text-green-700">
                    ✓ You are positioned in this part
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Not positioned in this part
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPartIndex(Math.max(0, selectedPartIndex - 1))}
                  disabled={selectedPartIndex === 0}
                  className="px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={() =>
                    setSelectedPartIndex(Math.min(positions.length - 1, selectedPartIndex + 1))
                  }
                  disabled={selectedPartIndex === positions.length - 1}
                  className="px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Stage Grid */}
            {currentPos.positioned ? (
              <div className="flex flex-col items-center">
                <div
                  className="border-2 border-gray-400 bg-gradient-to-b from-amber-100 to-amber-50 relative"
                  style={{
                    width: GRID_SIZE * CELL_SIZE,
                    height: GRID_SIZE * CELL_SIZE,
                    backgroundImage: `
                      linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)
                    `,
                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                  }}
                >
                  {/* Your Position */}
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      left: currentPos.x * CELL_SIZE,
                      top: currentPos.y * CELL_SIZE,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                    }}
                  >
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-green-600">
                      {studentName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Your position: Grid ({currentPos.x}, {currentPos.y})
                </p>
              </div>
            ) : (
              <div className="p-8 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">You are not positioned for this part yet.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Check back after rehearsal when positioning is complete.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
