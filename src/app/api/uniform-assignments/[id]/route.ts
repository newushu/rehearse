import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing assignment id" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const updateData: { returned_at?: string | null; distributed_at?: string | null } = {};
    if (body && typeof body === "object" && "returned_at" in body) {
      updateData.returned_at = body.returned_at ?? null;
    } else {
      updateData.returned_at = new Date().toISOString();
    }
    if (body && typeof body === "object" && "distributed_at" in body) {
      updateData.distributed_at = body.distributed_at ?? null;
    }
    const { data, error } = await supabase
      .from("uniform_assignments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating uniform assignment:", error);
    return NextResponse.json({ error: "Failed to update uniform assignment" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing assignment id" }, { status: 400 });
    }
    const { error } = await supabase.from("uniform_assignments").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting uniform assignment:", error);
    return NextResponse.json({ error: "Failed to delete uniform assignment" }, { status: 500 });
  }
}

