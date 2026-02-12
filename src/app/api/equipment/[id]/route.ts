import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, initial_side } = body || {};

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (initial_side !== undefined) updateData.initial_side = initial_side || null;

    const { data, error } = await supabase
      .from("performance_equipment")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;
    return NextResponse.json(data?.[0]);
  } catch (error) {
    console.error("Error updating equipment:", error);
    return NextResponse.json({ error: "Failed to update equipment" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase.from("performance_equipment").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting equipment:", error);
    return NextResponse.json({ error: "Failed to delete equipment" }, { status: 500 });
  }
}
