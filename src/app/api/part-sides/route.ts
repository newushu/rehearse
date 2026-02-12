import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const partId = request.nextUrl.searchParams.get("partId");
    if (!partId) {
      return NextResponse.json({ error: "partId query parameter is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("part_sides")
      .select("id, part_id, student_id, start_side, end_side, students:student_id(id,name,email)")
      .eq("part_id", partId)
      .order("student_id", { ascending: true });

    if (error) throw error;

    const normalized = (data || []).map((row: any) => ({
      id: row.id,
      part_id: row.part_id,
      student_id: row.student_id,
      student_name: row.students?.name || "Unknown",
      start_side: row.start_side ?? null,
      end_side: row.end_side ?? null,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching part sides:", error);
    return NextResponse.json({ error: "Failed to fetch part sides" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : [];
    if (items.length === 0) return NextResponse.json([], { status: 200 });

    if (!items.every((item: any) => item.part_id && item.student_id)) {
      return NextResponse.json({ error: "part_id and student_id are required" }, { status: 400 });
    }

    const partId = items[0].part_id;
    await supabase.from("part_sides").delete().eq("part_id", partId);

    const rows = items.map((item: any) => ({
      part_id: item.part_id,
      student_id: item.student_id,
      start_side: item.start_side ?? null,
      end_side: item.end_side ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from("part_sides").insert(rows).select();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error saving part sides:", error);
    return NextResponse.json({ error: "Failed to save part sides" }, { status: 500 });
  }
}
