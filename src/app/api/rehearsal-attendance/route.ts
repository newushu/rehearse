import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET attendance records for a performance
export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");

    if (!performanceId) {
      return NextResponse.json(
        { error: "performanceId query parameter is required" },
        { status: 400 }
      );
    }

    const { data: rehearsals, error: rehError } = await supabase
      .from("rehearsals")
      .select("id")
      .eq("performance_id", performanceId);

    if (rehError) throw rehError;

    const rehearsalIds = (rehearsals || []).map((r: any) => r.id);
    if (rehearsalIds.length === 0) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabase
      .from("rehearsal_attendance")
      .select("id, rehearsal_id, student_id, status, created_at, updated_at")
      .in("rehearsal_id", rehearsalIds);

    if (error) throw error;

    const normalized = (data || []).map((record: any) => ({
      id: record.id,
      rehearsal_id: record.rehearsal_id,
      student_id: record.student_id,
      status: record.status,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching rehearsal attendance:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to fetch rehearsal attendance", details },
      { status: 500 }
    );
  }
}

// POST upsert attendance record
export async function POST(request: NextRequest) {
  try {
    const { rehearsal_id, student_id, status } = await request.json();

    if (!rehearsal_id || !student_id || !status) {
      return NextResponse.json(
        {
          error: "Missing required fields: rehearsal_id, student_id, status",
        },
        { status: 400 }
      );
    }

    if (status !== "present" && status !== "absent") {
      return NextResponse.json(
        { error: "status must be present or absent" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("rehearsal_attendance")
      .upsert(
        [{ rehearsal_id, student_id, status, updated_at: new Date().toISOString() }],
        { onConflict: "rehearsal_id,student_id" }
      )
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0], { status: 201 });
  } catch (error) {
    console.error("Error saving rehearsal attendance:", error);
    return NextResponse.json(
      { error: "Failed to save rehearsal attendance" },
      { status: 500 }
    );
  }
}

// DELETE attendance record
export async function DELETE(request: NextRequest) {
  try {
    const rehearsalId = request.nextUrl.searchParams.get("rehearsalId");
    const studentId = request.nextUrl.searchParams.get("studentId");

    if (!rehearsalId || !studentId) {
      return NextResponse.json(
        { error: "rehearsalId and studentId query parameters are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("rehearsal_attendance")
      .delete()
      .match({ rehearsal_id: rehearsalId, student_id: studentId });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting rehearsal attendance:", error);
    return NextResponse.json(
      { error: "Failed to delete rehearsal attendance" },
      { status: 500 }
    );
  }
}
