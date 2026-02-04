import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET rehearsals for a performance (or all rehearsals if no performanceId)
export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");

    let query = supabase
      .from("rehearsals")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });
    if (performanceId) {
      query = query.eq("performance_id", performanceId);
    }
    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching rehearsals:", error);
    return NextResponse.json(
      { error: "Failed to fetch rehearsals" },
      { status: 500 }
    );
  }
}

// POST new rehearsal
export async function POST(request: NextRequest) {
  try {
    const { performance_id, title, date, time, location } = await request.json();

    if (!performance_id || !title || !date || !time || !location) {
      return NextResponse.json(
        {
          error: "Missing required fields: performance_id, title, date, time, location",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("rehearsals")
      .insert([{ performance_id, title, date, time, location }])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating rehearsal:", error);
    return NextResponse.json(
      { error: "Failed to create rehearsal" },
      { status: 500 }
    );
  }
}
