import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId");
    const performanceId = request.nextUrl.searchParams.get("performanceId");
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    let query = supabase
      .from("uniform_assignments")
      .select(
        "id, uniform_item_id, student_id, student_name, performance_id, distributed_at, returned_at, uniform_items(item_number, uniform_types(name))"
      )
      .eq("student_id", studentId)
      .is("returned_at", null);

    if (performanceId) {
      query = query.eq("performance_id", performanceId);
    }

    const { data, error } = await query.order("distributed_at", { ascending: false }).limit(1);
    if (error) throw error;
    const record = (data || [])[0];
    if (!record) return NextResponse.json({});

    const uniformItem = Array.isArray(record.uniform_items)
      ? record.uniform_items[0]
      : record.uniform_items;
    const uniformType = Array.isArray(uniformItem?.uniform_types)
      ? uniformItem.uniform_types[0]
      : uniformItem?.uniform_types;

    return NextResponse.json({
      assignment_id: record.id,
      item_number: uniformItem?.item_number || null,
      type_name: uniformType?.name || null,
      performance_id: record.performance_id || null,
      distributed_at: record.distributed_at,
    });
  } catch (error) {
    console.error("Error fetching uniform for student:", error);
    return NextResponse.json({ error: "Failed to fetch uniform assignment" }, { status: 500 });
  }
}
