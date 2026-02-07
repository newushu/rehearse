import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET single performance with related data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: performance, error: perfError } = await supabase
      .from("performances")
      .select("*")
      .eq("id", id)
      .single();

    if (perfError) throw perfError;

    // Get related rehearsals
    const { data: rehearsals, error: rehError } = await supabase
      .from("rehearsals")
      .select("*")
      .eq("performance_id", id)
      .order("date", { ascending: true });

    if (rehError) throw rehError;

    // Get related parts
    const { data: parts, error: partsError } = await supabase
      .from("parts")
      .select("*")
      .eq("performance_id", id)
      .order("order", { ascending: true });

    if (partsError) throw partsError;

    // Get student signups count
    const { count, error: countError } = await supabase
      .from("student_signups")
      .select("*", { count: "exact", head: true })
      .eq("performance_id", id);

    if (countError) throw countError;

    return NextResponse.json({
      ...performance,
      rehearsals,
      parts,
      signup_count: count || 0,
    });
  } catch (error) {
    console.error("Error fetching performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance" },
      { status: 500 }
    );
  }
}

// UPDATE performance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, description, date, location, stage_orientation, phone_numbers, call_time, timezone } = await request.json();

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (date) updateData.date = date;
    if (location) updateData.location = location;
    if (stage_orientation) updateData.stage_orientation = stage_orientation;
    if (phone_numbers !== undefined) updateData.phone_numbers = phone_numbers;
    if (call_time !== undefined) updateData.call_time = call_time;
    if (timezone !== undefined) updateData.timezone = timezone;

    const { data, error } = await supabase
      .from("performances")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Error updating performance:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to update performance", details },
      { status: 500 }
    );
  }
}

// DELETE performance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from("performances")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting performance:", error);
    return NextResponse.json(
      { error: "Failed to delete performance" },
      { status: 500 }
    );
  }
}


