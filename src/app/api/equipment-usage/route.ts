import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");
    if (!performanceId) return NextResponse.json([]);

    const { data: equipment, error: equipmentError } = await supabase
      .from("performance_equipment")
      .select("id")
      .eq("performance_id", performanceId);

    if (equipmentError) throw equipmentError;
    const ids = (equipment || []).map((e: any) => e.id);
    if (ids.length === 0) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("equipment_usage")
      .select("id, equipment_id, part_id, subpart_id, student_id, students:student_id(id,name,email)")
      .in("equipment_id", ids)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const normalized = (data || []).map((row: any) => ({
      id: row.id,
      equipment_id: row.equipment_id,
      part_id: row.part_id,
      subpart_id: row.subpart_id ?? null,
      student_id: row.student_id,
      student_name: row.students?.name || "Unknown",
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching equipment usage:", error);
    return NextResponse.json({ error: "Failed to fetch equipment usage" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { equipment_id, part_id, subpart_id, student_id } = body || {};
    if (!equipment_id || !part_id || !student_id) {
      return NextResponse.json({ error: "equipment_id, part_id, student_id are required" }, { status: 400 });
    }

    const deleteQuery = supabase.from("equipment_usage").delete().eq("equipment_id", equipment_id).eq("part_id", part_id);
    if (subpart_id) {
      deleteQuery.eq("subpart_id", subpart_id);
    } else {
      deleteQuery.is("subpart_id", null);
    }
    await deleteQuery;

    const { data, error } = await supabase
      .from("equipment_usage")
      .insert([
        {
          equipment_id,
          part_id,
          subpart_id: subpart_id ?? null,
          student_id,
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(data?.[0], { status: 201 });
  } catch (error) {
    console.error("Error saving equipment usage:", error);
    return NextResponse.json({ error: "Failed to save equipment usage" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const equipmentId = request.nextUrl.searchParams.get("equipment_id");
    const partId = request.nextUrl.searchParams.get("part_id");
    const subpartId = request.nextUrl.searchParams.get("subpart_id");

    if (!equipmentId || !partId) {
      return NextResponse.json({ error: "equipment_id and part_id are required" }, { status: 400 });
    }

    const deleteQuery = supabase.from("equipment_usage").delete().eq("equipment_id", equipmentId).eq("part_id", partId);
    if (subpartId) {
      deleteQuery.eq("subpart_id", subpartId);
    } else {
      deleteQuery.is("subpart_id", null);
    }
    const { error } = await deleteQuery;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting equipment usage:", error);
    return NextResponse.json({ error: "Failed to delete equipment usage" }, { status: 500 });
  }
}
