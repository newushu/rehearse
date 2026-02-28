import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const READ_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=300",
};

// GET subparts for a part
export async function GET(request: NextRequest) {
  try {
    const partId = request.nextUrl.searchParams.get("partId");
    const partIdsParam = request.nextUrl.searchParams.get("partIds");
    const partIds = (partIdsParam || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!partId && partIds.length === 0) {
      return NextResponse.json(
        { error: "partId or partIds query parameter is required" },
        { status: 400 }
      );
    }

    let query = supabase.from("subparts").select("*");
    if (partId) {
      query = query.eq("part_id", partId);
    } else {
      query = query.in("part_id", partIds);
    }

    const { data, error } = await query.order("order", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || [], { headers: READ_CACHE_HEADERS });
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
