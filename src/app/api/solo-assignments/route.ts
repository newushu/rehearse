import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET solo assignments for a part
export async function GET(request: NextRequest) {
  try {
    const partId = request.nextUrl.searchParams.get("partId");

    if (!partId) {
      return NextResponse.json(
        { error: "partId query parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("solo_assignments")
      .select(
        "id, part_id, student_id, order, solo_name, notes, created_at, updated_at, students:student_id(id, name, email)"
      )
      .eq("part_id", partId)
      .order("order", { ascending: true, nullsFirst: false });

    if (error) throw error;

    const normalized = (data || []).map((row: any) => ({
      id: row.id,
      part_id: row.part_id,
      student_id: row.student_id,
      order: row.order,
      solo_name: row.solo_name,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      student_name: row.students?.name || "Unknown",
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching solo assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch solo assignments" },
      { status: 500 }
    );
  }
}

// POST upsert solo assignments (single or bulk)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = Array.isArray(body) ? body : [body];

    if (payload.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const rows = payload.map((item: any) => ({
      part_id: item.part_id,
      student_id: item.student_id,
      order: item.order ?? null,
      solo_name: item.solo_name ?? null,
      notes: item.notes ?? null,
      updated_at: new Date().toISOString(),
    }));

    if (!rows.every((row) => row.part_id && row.student_id)) {
      return NextResponse.json(
        { error: "part_id and student_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("solo_assignments")
      .insert(rows)
      .select();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error saving solo assignments:", error);
    return NextResponse.json(
      { error: "Failed to save solo assignments" },
      { status: 500 }
    );
  }
}

// DELETE solo assignment
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const partId = request.nextUrl.searchParams.get("partId");
    const studentId = request.nextUrl.searchParams.get("studentId");

    if (!id && (!partId || !studentId)) {
      return NextResponse.json(
        { error: "id or (partId and studentId) query parameters are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("solo_assignments")
      .delete()
      .match(id ? { id } : { part_id: partId, student_id: studentId });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting solo assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete solo assignment" },
      { status: 500 }
    );
  }
}
