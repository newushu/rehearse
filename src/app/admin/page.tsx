"use client";

import { useState } from "react";
import Link from "next/link";
import { usePerformances } from "@/hooks/usePerformances";
import { PerformanceForm } from "@/components/PerformanceForm";
import { PerformancesList } from "@/components/PerformancesList";
import { LogoUpload } from "@/components/LogoUpload";
import { AppBrand } from "@/components/AppBrand";
import { ScheduleView } from "@/components/ScheduleView";
import { AdminSignOutButton } from "@/components/AdminSignOutButton";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";
import { UniformsPanel } from "@/components/UniformsPanel";
import { AdminRosterPanel } from "@/components/AdminRosterPanel";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<
    "performances" | "schedule" | "branding" | "uniforms" | "roster"
  >("performances");
  const [showForm, setShowForm] = useState(false);
  const { performances, loading, createPerformance, deletePerformance } = usePerformances();

  const handleCreatePerformance = async (entries: Array<{
    title: string;
    description: string;
    date: string;
    location: string;
    call_time: string;
    timezone?: string;
    rehearsals: Array<{ title: string; date: string; time: string; location: string }>;
  }>) => {
    for (const entry of entries) {
      const created = await createPerformance(
        entry.title,
        entry.description,
        entry.date,
        entry.location,
        entry.call_time,
        entry.timezone || DEFAULT_TIMEZONE
      );

      const rehearsals = (entry.rehearsals || []).filter(
        (reh) => reh.date && reh.time && reh.location
      );
      for (const reh of rehearsals) {
        await fetch("/api/rehearsals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            performance_id: created.id,
            title: reh.title || `${entry.title} Rehearsal`,
            date: reh.date,
            time: reh.time,
            location: reh.location,
          }),
        });
      }
    }
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-blue-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <AppBrand href="/" />
          <div className="flex gap-4">
            <Link href="/" className="hover:bg-blue-800 px-3 py-2 rounded">
              Home
            </Link>
            <span className="px-3 py-2 bg-blue-800 rounded">Admin Panel</span>
            <AdminSignOutButton className="px-3 py-2 bg-blue-700 rounded hover:bg-blue-600 text-sm" />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage performances, rehearsals, parts, and stage positioning
          </p>
        </div>

        {/* Menu Tabs */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setActiveSection("performances")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeSection === "performances"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            Performances
          </button>
          <button
            onClick={() => setActiveSection("schedule")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeSection === "schedule"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveSection("branding")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeSection === "branding"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            Branding
          </button>
          <button
            onClick={() => setActiveSection("uniforms")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeSection === "uniforms"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            Uniforms
          </button>
          <button
            onClick={() => setActiveSection("roster")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeSection === "roster"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            Full Roster
          </button>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {activeSection === "performances" && (
            <PerformancesSection
              performances={performances}
              loading={loading}
              showForm={showForm}
              onToggleForm={() => setShowForm(!showForm)}
              onCreatePerformance={handleCreatePerformance}
              onDeletePerformance={deletePerformance}
            />
          )}
          {activeSection === "schedule" && (
            <ScheduleView title="Studio Schedule" accent="blue" />
          )}
          {activeSection === "branding" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Branding</h2>
              <div className="max-w-md">
                <LogoUpload />
              </div>
            </div>
          )}
          {activeSection === "uniforms" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Uniforms</h2>
              <UniformsPanel />
            </div>
          )}
          {activeSection === "roster" && (
            <div className="space-y-4">
              <AdminRosterPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PerformancesSectionProps {
  performances: any[];
  loading: boolean;
  showForm: boolean;
  onToggleForm: () => void;
  onCreatePerformance: (entries: Array<{
    title: string;
    description: string;
    date: string;
    location: string;
    call_time: string;
    rehearsals: Array<{ title: string; date: string; time: string; location: string }>;
  }>) => Promise<void>;
  onDeletePerformance: (id: string) => Promise<void>;
}

function PerformancesSection({
  performances,
  loading,
  showForm,
  onToggleForm,
  onCreatePerformance,
  onDeletePerformance,
}: PerformancesSectionProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Performances</h2>
        <button
          onClick={onToggleForm}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          {showForm ? "Cancel" : "+ Create New Performance"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <PerformanceForm onSubmit={onCreatePerformance} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading performances...</p>
        </div>
      ) : (
        <PerformancesList
          performances={performances}
          onDelete={onDeletePerformance}
        />
      )}
    </div>
  );
}
