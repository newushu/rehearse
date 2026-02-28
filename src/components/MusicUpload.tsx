"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface MusicUploadProps {
  performanceId: string;
  performanceTitle: string;
  currentMusicFile?: string;
  onUploadSuccess?: (filePath: string, publicUrl: string) => void;
}

export function MusicUpload({
  performanceId,
  performanceTitle,
  currentMusicFile,
  onUploadSuccess,
}: MusicUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const timestamp = Date.now();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `performance-${performanceId}-${timestamp}-${safeFileName}`;
      const filePath = `music/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("performance-music")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const response = await fetch(
        `/api/performances/${performanceId}/upload-music`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath,
            fileName: file.name,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setSuccess(true);
      onUploadSuccess?.(data.filePath, data.publicUrl);

      // Reset input
      input.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="font-bold text-lg text-gray-900 mb-4">Performance Music</h3>

      {currentMusicFile && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-900">
            <span className="font-semibold">✓ Music Uploaded:</span> {currentMusicFile}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <label className="block">
          <div className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50 hover:bg-blue-50">
            <div className="text-center">
              <p className="text-2xl mb-2">🎵</p>
              <p className="text-sm font-semibold text-gray-700">
                {loading ? "Uploading..." : "Click to upload music"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                MP3, WAV, OGG, WebM (max 15MB)
              </p>
            </div>
          </div>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={loading}
            className="hidden"
          />
        </label>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-900">❌ {error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-900">✓ Music uploaded successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
}
