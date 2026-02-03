"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRehearsals } from "@/hooks/useRehearsals";
import { useParts } from "@/hooks/useParts";
import { usePerformances } from "@/hooks/usePerformances";
import { RehearsalForm } from "@/components/RehearsalForm";
import { RehearsalsList } from "@/components/RehearsalsList";
import { PartForm } from "@/components/PartForm";
import { PartsList } from "@/components/PartsList";
import { RosterPanel } from "@/components/RosterPanel";
import { PositioningPanel } from "@/components/PositioningPanel";
import { MusicUpload } from "@/components/MusicUpload";
import { MusicPlayer } from "@/components/MusicPlayer";
import { RehearseOverlay } from "@/components/RehearseOverlay";
import { AppBrand } from "@/components/AppBrand";
import { SubpartsPanel } from "@/components/SubpartsPanel";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PerformanceDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [performance, setPerformance] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rehearsals" | "parts" | "positioning" | "music" | "info">("rehearsals");
  const [showRehearsalForm, setShowRehearsalForm] = useState(false);
  const [showPartForm, setShowPartForm] = useState(false);
  const [selectedPartForPositioning, setSelectedPartForPositioning] = useState<string | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [showRehearseOverlay, setShowRehearseOverlay] = useState(false);
  const [exportingRehearse, setExportingRehearse] = useState(false);
  const [embedAudioExport, setEmbedAudioExport] = useState(true);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoForm, setInfoForm] = useState({
    title: "",
    call_time: "",
    timezone: "America/New_York",
    date: "",
    location: "",
    description: "",
    phone_numbers: "",
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [savedContacts, setSavedContacts] = useState<Array<{ name: string; phone: string }>>([]);
  const [selectedSavedContact, setSelectedSavedContact] = useState("");

  const { rehearsals, createRehearsal, deleteRehearsal, updateRehearsal } = useRehearsals(id);
  const { parts, createPart, deletePart, setParts } = useParts(id);
  const { performances } = usePerformances();

  const toLocalInputValue = (iso: string) => {
    const date = new Date(iso);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffset);
    return local.toISOString().slice(0, 16);
  };

  const formatLocalDateTime = (value: string, timeZone?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, { timeZone: timeZone || "America/New_York", timeZoneName: "short" });
  };

  useEffect(() => {
    async function fetchPerformance() {
      try {
        const response = await fetch(`/api/performances/${id}`);
        if (!response.ok) throw new Error("Failed to fetch performance");
        const data = await response.json();
        setPerformance(data);
        const localDate = data.date ? toLocalInputValue(data.date) : "";
        setInfoForm({
          title: data.title || "",
          call_time: data.call_time || "",
          timezone: data.timezone || "America/New_York",
          date: localDate,
          location: data.location || "",
          description: data.description || "",
          phone_numbers: data.phone_numbers || "",
        });
        if (data.music_file_path) {
          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/performance-music/${data.music_file_path}`;
          setMusicUrl(publicUrl);
        }
        const contactsRes = await fetch(`/api/performance-contacts?performanceId=${id}`);
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setContacts(contactsData || []);
        }
        const savedRes = await fetch("/api/performance-contacts/all");
        if (savedRes.ok) {
          const savedData = await savedRes.json();
          setSavedContacts(savedData || []);
        }
      } catch (error) {
        console.error("Error fetching performance:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, [id]);

  useEffect(() => {
    if (activeTab !== "positioning") return;
    if (parts.length > 0 && !selectedPartForPositioning) {
      setSelectedPartForPositioning(parts[0].id);
    }
  }, [activeTab, parts, selectedPartForPositioning]);

  const handleExportRehearse = async () => {
    try {
      setExportingRehearse(true);
      const response = await fetch(
        `/api/rehearse-export?performanceId=${id}&embedAudio=${embedAudioExport ? "1" : "0"}`
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Export error:", response.status, errorText);
        throw new Error("Failed to export rehearse HTML");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const safeTitle = (performance?.title || "rehearse-export")
        .toString()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeTitle || "rehearse-export"}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export rehearse HTML");
    } finally {
      setExportingRehearse(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <p className="text-red-600">Performance not found</p>
        <Link href="/admin" className="text-blue-600 hover:underline">
          Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-blue-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <AppBrand href="/" />
          <div className="flex gap-4">
            <Link href="/admin" className="hover:bg-blue-800 px-3 py-2 rounded">
              Admin Panel
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Left Sidebar - Roster */}
        <div className="w-64 bg-white shadow-md p-6 overflow-y-auto border-r border-gray-200">
          <RosterPanel performanceId={id} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-6">
          <div className={`${activeTab === "positioning" ? "max-w-none mx-0" : "max-w-5xl mx-auto"}`}>
            {/* Header */}
            <div className="mb-8">
              <Link href="/admin" className="text-blue-600 hover:underline mb-4 block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {performance.title}
              </h1>
              <div className="grid grid-cols-2 gap-4 text-gray-600">
                <div>
                  <span className="font-semibold">Date:</span>{" "}
                  {infoForm.date ? formatLocalDateTime(infoForm.date, infoForm.timezone) : "—"}
                </div>
                <div>
                  <span className="font-semibold">Location:</span> {performance.location}
                </div>
                <div>
                  <span className="font-semibold">Timezone:</span> {infoForm.timezone}
                </div>
              </div>
              {performance.description && (
                <div className="mt-4 text-gray-600">
                  <span className="font-semibold">Description:</span> {performance.description}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 flex-wrap">
              <button
                onClick={() => setActiveTab("rehearsals")}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === "rehearsals"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                Rehearsals
              </button>
              <button
                onClick={() => setActiveTab("parts")}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === "parts"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                Parts/Choreography
              </button>
              <button
                onClick={() => {
                  setActiveTab("positioning");
                  if (parts.length > 0 && !selectedPartForPositioning) {
                    setSelectedPartForPositioning(parts[0].id);
                  }
                }}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === "positioning"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                Stage Positions
              </button>
              <button
                onClick={() => setActiveTab("music")}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === "music"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                Music & Rehearse
              </button>
              <button
                onClick={() => setActiveTab("info")}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === "info"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                Performance Info
              </button>
            </div>

            {/* Content */}
            {activeTab === "positioning" ? (
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-lg shadow-md p-8">
                  {parts.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-600 mb-4">No parts created yet.</p>
                      <p className="text-sm text-gray-500">Create parts first before positioning students.</p>
                    </div>
                  ) : (
                    selectedPartForPositioning && (
                      <PositioningPanel
                        performanceId={id}
                        partId={selectedPartForPositioning}
                        partName={parts.find((p: any) => p.id === selectedPartForPositioning)?.name}
                        partDescription={parts.find((p: any) => p.id === selectedPartForPositioning)?.description}
                        isGroup={parts.find((p: any) => p.id === selectedPartForPositioning)?.is_group !== false}
                        onSavePositions={async (positions) => {
                          const payload = positions.map((p) => ({
                            part_id: selectedPartForPositioning,
                            student_id: p.student_id,
                            x: p.x,
                            y: p.y,
                          }));
                          const response = await fetch("/api/stage-positions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              part_id: selectedPartForPositioning,
                              positions: payload,
                            }),
                          });
                          if (!response.ok) throw new Error("Failed to save positions");
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8">
                {activeTab === "rehearsals" && (
                  <RehearsalsTabContent
                    rehearsals={rehearsals}
                    showForm={showRehearsalForm}
                    onToggleForm={() => setShowRehearsalForm(!showRehearsalForm)}
                    onCreateRehearsal={createRehearsal}
                    onDeleteRehearsal={deleteRehearsal}
                    onUpdateRehearsal={updateRehearsal}
                  />
                )}
                {activeTab === "parts" && (
                  <PartsTabContent
                    performanceId={id}
                    parts={parts}
                    performances={performances}
                    showForm={showPartForm}
                    onToggleForm={() => setShowPartForm(!showPartForm)}
                    onCreatePart={createPart}
                    onDeletePart={deletePart}
                    onReorderParts={setParts}
                  />
                )}
                {activeTab === "music" && (
                  <div className="space-y-6">
                    {/* Music Upload Section */}
                    <MusicUpload
                      performanceId={id}
                      performanceTitle={performance.title}
                      currentMusicFile={performance.music_file_name}
                      onUploadSuccess={(filePath, publicUrl) => {
                        setMusicUrl(publicUrl);
                        // Refresh performance data
                        setPerformance({ ...performance, music_file_name: filePath.split('/').pop() });
                      }}
                    />

                    {/* Music Player Section */}
                    {musicUrl && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Preview Music</h3>
                        <MusicPlayer musicUrl={musicUrl} performanceTitle={performance.title} />
                      </div>
                    )}

                    {/* Rehearse Mode Section */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border-2 border-purple-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">🎭 Rehearse/Emulate Mode</h3>
                      <p className="text-gray-700 mb-4">
                        Use rehearse mode to play back your choreography with automatic grid transitions based on music timepoints.
                      </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        disabled={!musicUrl || parts.length === 0}
                        onClick={() => setShowRehearseOverlay(true)}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                        >
                          Start Rehearse Mode →
                        </button>
                        <button
                          disabled={!musicUrl || parts.length === 0 || exportingRehearse}
                        onClick={handleExportRehearse}
                        className="px-6 py-3 bg-white text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 font-semibold"
                      >
                        {exportingRehearse ? "Exporting..." : "Export Rehearse HTML"}
                      </button>
                      <label className="flex items-center gap-2 text-sm text-purple-900">
                        <input
                          type="checkbox"
                          checked={embedAudioExport}
                          onChange={(e) => setEmbedAudioExport(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Embed audio in export
                      </label>
                    </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {!musicUrl && "⚠️ Upload music first"}
                        {musicUrl && parts.length === 0 && "⚠️ Create parts and set timepoints"}
                        {musicUrl && parts.length > 0 && "✓ Ready to rehearse"}
                      </p>
                    </div>

                    {/* Timepoint Settings */}
                    {parts.length > 0 && (
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Part Timepoints</h3>
                        <div className="space-y-3">
                          <p className="text-gray-600 text-sm">
                            Click "Edit" on a part to set its music timepoint (when the part should appear during rehearsal).
                          </p>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="font-semibold text-blue-900 mb-2">📋 Parts Timeline:</p>
                            <div className="space-y-2">
                              {parts.map((part: any) => (
                                <div key={part.id} className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-gray-900">{part.name}</span>
                                  {part.timepoint_seconds ? (
                                    <span className="text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                      Start: {part.timepoint_seconds}s
                                      {part.timepoint_end_seconds ? ` - End: ${part.timepoint_end_seconds}s` : ""}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">No timepoint set</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "info" && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Info</h3>
                      {infoError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                          {infoError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-700 font-semibold mb-2">Performance Name</label>
                          <input
                            type="text"
                            value={infoForm.title}
                            onChange={(e) => setInfoForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-semibold mb-2">Date & Time</label>
                          <input
                            type="datetime-local"
                            value={infoForm.date}
                            onChange={(e) => setInfoForm((prev) => ({ ...prev, date: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-semibold mb-2">Call Time</label>
                          <input
                            type="time"
                            value={infoForm.call_time}
                            onChange={(e) => setInfoForm((prev) => ({ ...prev, call_time: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-semibold mb-2">Timezone</label>
                          <input
                            type="text"
                            value={infoForm.timezone}
                            onChange={(e) => setInfoForm((prev) => ({ ...prev, timezone: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="text-xs text-gray-500 mt-1">Use IANA format (e.g., America/New_York)</div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-gray-700 font-semibold mb-2">Location</label>
                          <input
                            type="text"
                            value={infoForm.location}
                            onChange={(e) => setInfoForm((prev) => ({ ...prev, location: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-gray-700 font-semibold mb-2">Description</label>
                        <textarea
                          rows={3}
                          value={infoForm.description}
                          onChange={(e) => setInfoForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mt-4">
                        <label className="block text-gray-700 font-semibold mb-2">Important Phone Numbers</label>
                        <textarea
                          rows={4}
                          placeholder="One per line"
                          value={infoForm.phone_numbers}
                          onChange={(e) => setInfoForm((prev) => ({ ...prev, phone_numbers: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                          <select
                            value={selectedSavedContact}
                            onChange={(e) => setSelectedSavedContact(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Add saved contact...</option>
                            {savedContacts.map((c) => (
                              <option key={`${c.name}-${c.phone}`} value={`${c.name}||${c.phone}`}>
                                {c.name} • {c.phone}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (!selectedSavedContact) return;
                              const [name, phone] = selectedSavedContact.split("||");
                              const line = `${name}: ${phone}`;
                              setInfoForm((prev) => ({
                                ...prev,
                                phone_numbers: prev.phone_numbers
                                  ? `${prev.phone_numbers}\n${line}`
                                  : line,
                              }));
                              setSelectedSavedContact("");
                            }}
                            className="px-3 py-1 bg-gray-900 text-white rounded text-xs"
                          >
                            Add to phone list
                          </button>
                        </div>
                      </div>
                      <div className="mt-6 border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Contacts Directory</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Add contacts and select which ones appear in the export.
                        </p>
                        <div className="flex flex-wrap gap-2 items-center mb-3">
                          <select
                            value={selectedSavedContact}
                            onChange={(e) => setSelectedSavedContact(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Add saved contact...</option>
                            {savedContacts.map((c) => (
                              <option key={`${c.name}-${c.phone}`} value={`${c.name}||${c.phone}`}>
                                {c.name} • {c.phone}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={async () => {
                              if (!selectedSavedContact) return;
                              const [name, phone] = selectedSavedContact.split("||");
                              const res = await fetch("/api/performance-contacts", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  performance_id: id,
                                  name,
                                  phone,
                                  include_in_export: true,
                                }),
                              });
                              if (res.ok) {
                                const created = await res.json();
                                setContacts((prev) => [...prev, created]);
                                setSelectedSavedContact("");
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                          >
                            Add to contacts
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                          <input
                            type="text"
                            placeholder="Name"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <input
                            type="text"
                            placeholder="Phone"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={async () => {
                              if (!contactName.trim() || !contactPhone.trim()) return;
                              const res = await fetch("/api/performance-contacts", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  performance_id: id,
                                  name: contactName.trim(),
                                  phone: contactPhone.trim(),
                                  include_in_export: true,
                                }),
                              });
                              if (res.ok) {
                                const created = await res.json();
                                setContacts((prev) => [...prev, created]);
                                setContactName("");
                                setContactPhone("");
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                          >
                            Add Contact
                          </button>
                        </div>
                        <div className="space-y-2">
                          {contacts.map((contact) => (
                            <div key={contact.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{contact.name}</div>
                                <div className="text-sm text-gray-600">{contact.phone}</div>
                              </div>
                              <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={!!contact.include_in_export}
                                  onChange={async (e) => {
                                    const res = await fetch(`/api/performance-contacts/${contact.id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ include_in_export: e.target.checked }),
                                    });
                                    if (res.ok) {
                                      setContacts((prev) =>
                                        prev.map((c) =>
                                          c.id === contact.id ? { ...c, include_in_export: e.target.checked } : c
                                        )
                                      );
                                    }
                                  }}
                                />
                                Include in export
                              </label>
                              <button
                                onClick={async () => {
                                  const res = await fetch(`/api/performance-contacts/${contact.id}`, {
                                    method: "DELETE",
                                  });
                                  if (res.ok) {
                                    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
                                  }
                                }}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-6">
                        <button
                          onClick={async () => {
                            try {
                              setInfoSaving(true);
                              setInfoError(null);
                              const response = await fetch(`/api/performances/${id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  title: infoForm.title,
                                  date: infoForm.date ? new Date(infoForm.date).toISOString() : null,
                                  call_time: infoForm.call_time,
                                  timezone: infoForm.timezone,
                                  location: infoForm.location,
                                  description: infoForm.description,
                                  phone_numbers: infoForm.phone_numbers,
                                }),
                              });
                              if (!response.ok) {
                                const data = await response.json().catch(() => null);
                                throw new Error(data?.details || data?.error || "Failed to save info");
                              }
                              const updated = await response.json();
                              setPerformance(updated);
                              setInfoForm((prev) => ({
                                ...prev,
                                title: updated.title || "",
                                call_time: updated.call_time || "",
                                timezone: updated.timezone || prev.timezone,
                              }));
                              const contactsRes = await fetch(`/api/performance-contacts?performanceId=${id}`);
                              if (contactsRes.ok) {
                                const contactsData = await contactsRes.json();
                                setContacts(contactsData || []);
                              }
                            } catch (err) {
                              setInfoError(err instanceof Error ? err.message : "Failed to save info");
                            } finally {
                              setInfoSaving(false);
                            }
                          }}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400"
                          disabled={infoSaving}
                        >
                          {infoSaving ? "Saving..." : "Save Info"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {activeTab === "positioning" && parts.length > 0 && (
          <div className="w-80 bg-white shadow-md p-4 border-l border-gray-200">
            <div className="sticky top-20 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Parts & Choreography</h3>
                <p className="text-xs text-gray-500 mb-3">Drag to reorder. Click a card to show positions.</p>
                <PartsList
                  parts={parts}
                  performanceId={id}
                  onDelete={deletePart}
                  onReorder={setParts}
                  onSelect={(partId) => setSelectedPartForPositioning(partId)}
                  selectedPartId={selectedPartForPositioning}
                  variant="select"
                  enableDrag
                  showPositionedNames
                />
              </div>
              <SubpartsPanel partId={selectedPartForPositioning} />
            </div>
          </div>
        )}
      </div>
        {showRehearseOverlay && (
          <RehearseOverlay
            performanceId={id}
            parts={parts}
            musicUrl={musicUrl}
            onClose={() => setShowRehearseOverlay(false)}
          />
        )}
    </div>
  );
}

interface RehearsalsTabContentProps {
  rehearsals: any[];
  showForm: boolean;
  onToggleForm: () => void;
  onCreateRehearsal: (title: string, dateEntries: Array<{ date: string; time: string; location: string }>) => Promise<void>;
  onDeleteRehearsal: (id: string) => Promise<void>;
  onUpdateRehearsal: (id: string, updates: { title: string; date: string; time: string; location: string }) => Promise<void>;
}

function RehearsalsTabContent({
  rehearsals,
  showForm,
  onToggleForm,
  onCreateRehearsal,
  onDeleteRehearsal,
  onUpdateRehearsal,
}: RehearsalsTabContentProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Schedule Rehearsals</h2>
        <button
          onClick={onToggleForm}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          {showForm ? "Cancel" : "+ Schedule Rehearsal"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <RehearsalForm onSubmit={onCreateRehearsal} />
        </div>
      )}

      {rehearsals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No rehearsals scheduled yet.</p>
        </div>
      ) : (
      <RehearsalsList
        rehearsals={rehearsals}
        onDelete={onDeleteRehearsal}
        onUpdate={onUpdateRehearsal}
      />
      )}
    </div>
  );
}

interface PartsTabContentProps {
  performanceId: string;
  parts: any[];
  performances: any[];
  showForm: boolean;
  onToggleForm: () => void;
  onCreatePart: (name: string, description: string, order: number, isGroup: boolean) => Promise<void>;
  onDeletePart: (id: string) => Promise<void>;
  onReorderParts: (parts: any[]) => void;
}

function PartsTabContent({
  performanceId,
  parts,
  performances,
  showForm,
  onToggleForm,
  onCreatePart,
  onDeletePart,
  onReorderParts,
}: PartsTabContentProps) {
  const [copyFromId, setCopyFromId] = useState<string>("");
  const [copyTimepoints, setCopyTimepoints] = useState(true);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const availableSources = (performances || []).filter(
    (perf: any) => perf.id !== performanceId
  );

  return (
    <div>
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-bold text-blue-900 mb-2">Copy Parts from Another Performance</h3>
        <p className="text-sm text-blue-800 mb-3">
          This copies part names/descriptions (and optionally music timepoints). It does not copy grid positions or subparts.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={copyFromId}
            onChange={(e) => setCopyFromId(e.target.value)}
            className="px-3 py-2 border border-blue-300 rounded-lg text-sm min-w-[220px]"
          >
            <option value="">Select performance to copy from...</option>
            {(availableSources as any[]).map((perf) => (
              <option key={perf.id} value={perf.id}>
                {perf.title}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-blue-900">
            <input
              type="checkbox"
              checked={copyTimepoints}
              onChange={(e) => setCopyTimepoints(e.target.checked)}
              className="h-4 w-4"
            />
            Copy music timepoints
          </label>
          <button
            onClick={async () => {
              if (!copyFromId) return;
              setCopying(true);
              setCopyError(null);
              setCopySuccess(null);
              try {
                const res = await fetch("/api/parts/copy", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    source_performance_id: copyFromId,
                    target_performance_id: performanceId,
                    copy_timepoints: copyTimepoints,
                  }),
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || "Failed to copy parts");
                }
                const inserted = await res.json();
                if (Array.isArray(inserted) && inserted.length > 0) {
                  onReorderParts?.([...parts, ...inserted]);
                  setCopySuccess(`Copied ${inserted.length} part(s).`);
                } else {
                  setCopySuccess("No parts found to copy.");
                }
              } catch (err) {
                setCopyError(err instanceof Error ? err.message : "Failed to copy parts");
              } finally {
                setCopying(false);
              }
            }}
            disabled={!copyFromId || copying}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold text-sm"
          >
            {copying ? "Copying..." : "Copy Parts"}
          </button>
        </div>
        {copyError && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {copyError}
          </div>
        )}
        {copySuccess && (
          <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            {copySuccess}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Parts & Choreography</h2>
        <button
          onClick={onToggleForm}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          {showForm ? "Cancel" : "+ Add Part"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <PartForm onSubmit={onCreatePart} />
        </div>
      )}

      {parts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No parts created yet.</p>
        </div>
      ) : (
        <PartsList
          parts={parts}
          performanceId={performanceId}
          onDelete={onDeletePart}
          onReorder={onReorderParts}
        />
      )}
    </div>
  );
}

