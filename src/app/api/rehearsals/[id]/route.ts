import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// UPDATE rehearsal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { title, date, time, location } = await request.json();

    const { data, error } = await supabase
      .from("rehearsals")
      .update({ title, date, time, location })
      .eq("id", params.id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Error updating rehearsal:", error);
    return NextResponse.json(
      { error: "Failed to update rehearsal" },
      { status: 500 }
    );
  }
}

// DELETE rehearsal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from("rehearsals")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting rehearsal:", error);
    return NextResponse.json(
      { error: "Failed to delete rehearsal" },
      { status: 500 }
    );
  }
}
