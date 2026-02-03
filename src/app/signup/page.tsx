"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { usePerformances } from "@/hooks/usePerformances";
import { StudentPositioningView } from "@/components/StudentPositioningView";
import { AppBrand } from "@/components/AppBrand";

export default function StudentSignup() {
  const [activeTab, setActiveTab] = useState<"browse" | "mySignups">(
    "browse"
  );
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string | null>(null);
  const { performances, loading } = usePerformances();
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-green-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <AppBrand href="/" />
          <div className="flex gap-4">
            <Link href="/" className="hover:bg-green-800 px-3 py-2 rounded">
              Home
            </Link>
            <span className="px-3 py-2 bg-green-800 rounded">Student Signup</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sign Up for Performances
          </h1>
          <p className="text-gray-600">
            Browse available performances and sign up for your favorite parts
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "browse"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            Browse Performances
          </button>
          <button
            onClick={() => setActiveTab("mySignups")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "mySignups"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            My Sign-ups
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {activeTab === "browse" && (
            <BrowsePerformances 
              performances={performances}
              loading={loading}
              selectedPerformanceId={selectedPerformanceId}
              onSelectPerformance={setSelectedPerformanceId}
              studentEmail={studentEmail}
              studentName={studentName}
              onStudentEmailChange={setStudentEmail}
              onStudentNameChange={setStudentName}
            />
          )}
          {activeTab === "mySignups" && <MySignups />}
        </div>
      </div>
    </div>
  );
}

interface BrowsePerformancesProps {
  performances: any[];
  loading: boolean;
  selectedPerformanceId: string | null;
  onSelectPerformance: (id: string | null) => void;
  studentEmail: string;
  studentName: string;
  onStudentEmailChange: (email: string) => void;
  onStudentNameChange: (name: string) => void;
}

function BrowsePerformances({
  performances,
  loading,
  selectedPerformanceId,
  onSelectPerformance,
  studentEmail,
  studentName,
  onStudentEmailChange,
  onStudentNameChange,
}: BrowsePerformancesProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [performanceDetails, setPerformanceDetails] = useState<any>(null);
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    if (selectedPerformanceId) {
      fetchPerformanceDetails(selectedPerformanceId);
    }
  }, [selectedPerformanceId]);

  const fetchPerformanceDetails = async (perfId: string) => {
    try {
      const response = await fetch(`/api/performances/${perfId}`);
      if (!response.ok) throw new Error("Failed to fetch details");
      const data = await response.json();
      setPerformanceDetails(data);
      setSelectedPart(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!studentName || !studentEmail) {
      setError("Please enter your name and email");
      return;
    }

    if (!selectedPerformanceId) {
      setError("Please select a performance");
      return;
    }

    setSigningUp(true);

    try {
      // First, create or get student (allows siblings with same email but different names)
      const studentResponse = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: studentName, email: studentEmail }),
      });

      if (!studentResponse.ok) {
        const errorData = await studentResponse.json();
        throw new Error(errorData.error || "Failed to register student");
      }

      const student = await studentResponse.json();
      if (!student || !student.id) {
        console.error("Invalid student response:", student);
        throw new Error("Invalid student data received");
      }
      const studentId = student.id;

      // Create signup
      const signupResponse = await fetch("/api/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performance_id: selectedPerformanceId,
          student_id: studentId,
          part_id: selectedPart || null,
          status: "registered",
        }),
      });

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        throw new Error(errorData.error || "Failed to sign up");
      }

      setSuccess("Successfully signed up for the performance!");
      setSelectedPart(null);
      onSelectPerformance(null);
      setPerformanceDetails(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSigningUp(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading performances...</div>;
  }

  if (performances.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No performances available at the moment.</p>
        <p className="text-gray-500 text-sm">Check back soon for upcoming events!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Available Performances</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performances List */}
        <div className="space-y-3">
          {performances.map((perf) => (
            <button
              key={perf.id}
              onClick={() => onSelectPerformance(perf.id)}
              className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                selectedPerformanceId === perf.id
                  ? "border-green-600 bg-green-50"
                  : "border-gray-200 hover:border-green-400"
              }`}
            >
              <h3 className="font-semibold text-gray-900">{perf.title}</h3>
              <div className="text-sm text-gray-600 mt-2">
                <div>📅 {new Date(perf.date).toLocaleDateString()}</div>
                <div>📍 {perf.location}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Signup Form */}
        <div>
          {selectedPerformanceId ? (
            <form onSubmit={handleSignup} className="p-6 bg-gray-50 rounded-lg border-2 border-green-200 space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Sign Up</h3>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => onStudentNameChange(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => onStudentEmailChange(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Select Part (Optional)
                </label>
                {performanceDetails?.parts && performanceDetails.parts.length > 0 ? (
                  <select
                    value={selectedPart || ""}
                    onChange={(e) => setSelectedPart(e.target.value || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Any Part --</option>
                    {performanceDetails.parts.map((part: any) => (
                      <option key={part.id} value={part.id}>
                        {part.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                    No parts available for this performance. You can still sign up as a general participant.
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={signingUp}
                className="w-full px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {signingUp ? "Signing up..." : "Sign Up"}
              </button>
            </form>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-600">
              <p>Select a performance to sign up</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MySignupsProps {}

function MySignups({}: MySignupsProps) {
  const [studentName, setStudentName] = useState("");
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setError(null);

    if (!studentName.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      // Get all students and find by name
      const studentsRes = await fetch("/api/students");
      const allStudents = await studentsRes.json();
      const student = allStudents.find(
        (s: any) => s.name.toLowerCase() === studentName.toLowerCase()
      );

      if (!student) {
        setError(`No student found with name "${studentName}"`);
        setSignups([]);
      } else {
        // Fetch signups for this student
        const signupsRes = await fetch(`/api/signups?studentId=${student.id}`);
        const signupsData = await signupsRes.json();

        // Enrich with performance details
        const enriched = await Promise.all(
          signupsData.map(async (signup: any) => {
            const perfRes = await fetch(`/api/performances/${signup.performance_id}`);
            const perf = await perfRes.json();
            return { ...signup, performance: perf };
          })
        );

        setSignups(enriched);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch signups");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">View Your Sign-ups</h2>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Enter your full name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {!searched ? (
        <div className="text-center py-12 text-gray-500">
          <p>Enter your name above to view your sign-ups</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : signups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">You haven&apos;t signed up for any performances yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {signups.map((signup) => (
            <SignupCard key={signup.id} signup={signup} studentName={studentName} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SignupCardProps {
  signup: any;
  studentName: string;
}

function SignupCard({ signup, studentName }: SignupCardProps) {
  const [positioning, setPositioning] = useState<any[]>([]);
  const [loadingPos, setLoadingPos] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showPositioningView, setShowPositioningView] = useState(false);

  const fetchPositioning = useCallback(async () => {
    try {
      setLoadingPos(true);
      // Get all parts for this performance
      const perfRes = await fetch(`/api/performances/${signup.performance_id}`);
      const perf = await perfRes.json();

      if (!perf.parts || perf.parts.length === 0) {
        setPositioning([]);
        return;
      }

      // Get positioning for each part
      const posData: any[] = [];
      for (const part of perf.parts) {
        const posRes = await fetch(`/api/stage-positions?partId=${part.id}`);
        const positions = await posRes.json();
        const isPositioned = positions.some(
          (p: any) => p.student_id === signup.student_id
        );
        if (isPositioned) {
          const pos = positions.find((p: any) => p.student_id === signup.student_id);
          posData.push({
            part_name: part.name,
            x: pos.x,
            y: pos.y,
            positioned: true,
          });
        } else {
          posData.push({
            part_name: part.name,
            positioned: false,
          });
        }
      }
      setPositioning(posData);
    } catch (err) {
      console.error("Error fetching positioning:", err);
    } finally {
      setLoadingPos(false);
    }
  }, [signup.performance_id, signup.student_id]);

  useEffect(() => {
    fetchPositioning();
  }, [fetchPositioning]);

  if (showPositioningView) {
    return (
      <div className="border border-green-200 rounded-lg bg-white overflow-hidden">
        {/* Header with back button */}
        <div className="p-6 bg-green-50 border-b border-green-200 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900">
            {signup.performance?.title || "Performance"}
          </h3>
          <button
            onClick={() => setShowPositioningView(false)}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
          >
            ← Back to Signups
          </button>
        </div>
        {/* Positioning View */}
        <div className="p-6">
          <StudentPositioningView
            performanceId={signup.performance_id}
            studentId={signup.student_id}
            studentName={studentName}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-green-200 rounded-lg bg-green-50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 text-left hover:bg-green-100 transition-colors"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">
              Performance: {signup.performance?.title || "Unknown"}
            </h3>
            <div className="text-sm text-gray-600 mt-2">
              <div>📅 Date: {signup.performance?.date
                ? new Date(signup.performance.date).toLocaleDateString()
                : "N/A"}</div>
              <div>📍 Location: {signup.performance?.location || "N/A"}</div>
              <div>
                Status: <span className="capitalize px-2 py-1 bg-green-200 rounded text-green-900 text-xs font-semibold">
                  {signup.status}
                </span>
              </div>
            </div>
          </div>
          <div className="text-2xl text-gray-600">
            {expanded ? "▼" : "▶"}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-green-200 p-6 bg-white">
          {signup.part && (
            <div className="mb-4 pb-4 border-b border-green-200">
              <span className="font-semibold text-gray-700">Signed Up For Part:</span>{" "}
              <span className="text-gray-600 font-medium">{signup.part}</span>
            </div>
          )}

          {/* Positioning Info */}
          {positioning.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Your Positioning for Each Part:</h4>
              <div className="space-y-2 mb-4">
                {positioning.map((pos, idx) => (
                  <div key={idx} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                    <span className="font-medium text-gray-900">{pos.part_name}:</span>{" "}
                    {pos.positioned ? (
                      <span className="text-green-700 font-semibold">
                        ✓ Grid position ({pos.x}, {pos.y})
                      </span>
                    ) : (
                      <span className="text-gray-500">Not positioned yet</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowPositioningView(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
              >
                View Positioning Grid →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
