import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { item_number } = await request.json();
    if (!item_number) {
      return NextResponse.json({ error: "Missing item_number" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("uniform_items")
      .update({ item_number })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating uniform item:", error);
    return NextResponse.json({ error: "Failed to update uniform item" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }
    const { error } = await supabase
      .from("uniform_items")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting uniform item:", error);
    return NextResponse.json({ error: "Failed to delete uniform item" }, { status: 500 });
  }
}


