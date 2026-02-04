import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET marking sessions for a performance
export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");
    const all = request.nextUrl.searchParams.get("all") === "1";
    if (!performanceId && !all) {
      return NextResponse.json(
        { error: "performanceId query parameter is required" },
        { status: 400 }
      );
    }

    let query = supabase.from("marking_sessions").select("*").order("created_at", { ascending: false });
    if (!all && performanceId) {
      query = query.eq("performance_id", performanceId);
    }
    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching marking sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch marking sessions" },
      { status: 500 }
    );
  }
}

// POST new marking session
export async function POST(request: NextRequest) {
  try {
    const { performance_id, title, rows, assignments } = await request.json();

    if (!performance_id || !rows || !assignments) {
      return NextResponse.json(
        { error: "Missing required fields: performance_id, rows, assignments" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("marking_sessions")
      .insert([{ performance_id, title: title || null, rows, assignments }])
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0], { status: 201 });
  } catch (error) {
    console.error("Error creating marking session:", error);
    return NextResponse.json(
      { error: "Failed to create marking session" },
      { status: 500 }
    );
  }
}
