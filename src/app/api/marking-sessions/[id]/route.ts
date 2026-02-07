import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET single marking session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("marking_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching marking session:", error);
    return NextResponse.json(
      { error: "Failed to fetch marking session" },
      { status: 500 }
    );
  }
}

// DELETE marking session
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from("marking_sessions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting marking session:", error);
    return NextResponse.json(
      { error: "Failed to delete marking session" },
      { status: 500 }
    );
  }
}


