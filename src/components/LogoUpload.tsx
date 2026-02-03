"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function LogoUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/app-logo");
        if (!res.ok) return;
        const data = await res.json();
        setLogoUrl(data.logoUrl || null);
        setLogoName(data.logoFileName || null);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/app-logo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setLogoUrl(data.logoUrl || null);
      setLogoName(data.logoFileName || null);
      setSuccess(true);

      e.currentTarget.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="font-bold text-lg text-gray-900 mb-4">App Logo</h3>

      {logoUrl && (
        <div className="mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
            <Image
              src={logoUrl}
              alt="App logo preview"
              width={64}
              height={64}
              unoptimized
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="text-sm text-gray-600">
            <div className="font-semibold text-gray-900">Current Logo</div>
            <div>{logoName || "Uploaded logo"}</div>
          </div>
        </div>
      )}

      {!logoUrl && (
        <div className="mb-4 text-sm text-gray-600">
          No logo uploaded yet. Upload one to display it across the app and exports.
        </div>
      )}

      <label className="block">
        <div className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50 hover:bg-blue-50">
          <div className="text-center">
            <p className="text-2xl mb-2">🖼️</p>
            <p className="text-sm font-semibold text-gray-700">
              {loading ? "Uploading..." : "Click to upload logo"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, SVG, WebP (max 5MB)
            </p>
          </div>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
        />
      </label>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-900">❌ {error}</p>
        </div>
      )}

      {success && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-900">✅ Logo uploaded successfully!</p>
        </div>
      )}
    </div>
  );
}
