import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET subparts for a part
export async function GET(request: NextRequest) {
  try {
    const partId = request.nextUrl.searchParams.get("partId");

    if (!partId) {
      return NextResponse.json(
        { error: "partId query parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("subparts")
      .select("*")
      .eq("part_id", partId)
      .order("order", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching subparts:", error);
    return NextResponse.json(
      { error: "Failed to fetch subparts" },
      { status: 500 }
    );
  }
}

// POST new subpart
export async function POST(request: NextRequest) {
  try {
    const { part_id, title, description, order, mode, timepoint_seconds, timepoint_end_seconds } = await request.json();

    if (!part_id || !title) {
      return NextResponse.json(
        { error: "Missing required fields: part_id, title" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("subparts")
      .insert([
        {
          part_id,
          title,
          description: description || null,
          order: order ?? 0,
          mode: mode ?? "position",
          timepoint_seconds: timepoint_seconds ?? null,
          timepoint_end_seconds: timepoint_end_seconds ?? null,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0], { status: 201 });
  } catch (error) {
    console.error("Error creating subpart:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to create subpart", details },
      { status: 500 }
    );
  }
}
