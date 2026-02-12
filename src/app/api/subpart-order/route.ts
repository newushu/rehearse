import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET order list for a subpart
export async function GET(request: NextRequest) {
  try {
    const subpartId = request.nextUrl.searchParams.get("subpartId");
    if (!subpartId) {
      return NextResponse.json(
        { error: "subpartId query parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("subpart_order")
      .select(
        "id, subpart_id, student_id, order, start_side, end_side, created_at, updated_at, students:student_id(id, name, email)"
      )
      .eq("subpart_id", subpartId)
      .order("order", { ascending: true });

    if (error) throw error;

    const normalized = (data || []).map((row: any) => ({
      id: row.id,
      subpart_id: row.subpart_id,
      student_id: row.student_id,
      order: row.order,
      student_name: row.students?.name || "Unknown",
      start_side: row.start_side ?? null,
      end_side: row.end_side ?? null,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching subpart order:", error);
    return NextResponse.json(
      { error: "Failed to fetch subpart order" },
      { status: 500 }
    );
  }
}

// POST bulk replace order list for a subpart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : [];
    if (items.length === 0) return NextResponse.json([], { status: 200 });

    if (!items.every((item: any) => item.subpart_id && item.student_id !== undefined)) {
      return NextResponse.json(
        { error: "subpart_id and student_id are required" },
        { status: 400 }
      );
    }

    const subpartId = items[0].subpart_id;
    if (!subpartId) {
      return NextResponse.json(
        { error: "subpart_id is required" },
        { status: 400 }
      );
    }

    await supabase
      .from("subpart_order")
      .delete()
      .eq("subpart_id", subpartId);

    const rows = items.map((item: any) => ({
      subpart_id: item.subpart_id,
      student_id: item.student_id,
      order: item.order ?? 0,
      start_side: item.start_side ?? null,
      end_side: item.end_side ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("subpart_order")
      .insert(rows)
      .select();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error saving subpart order:", error);
    return NextResponse.json(
      { error: "Failed to save subpart order" },
      { status: 500 }
    );
  }
}

// DELETE item from order list
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("subpart_order")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subpart order item:", error);
    return NextResponse.json(
      { error: "Failed to delete subpart order item" },
      { status: 500 }
    );
  }
}
