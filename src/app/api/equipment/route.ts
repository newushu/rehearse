import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");
    if (!performanceId) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("performance_equipment")
      .select("id, performance_id, name, initial_side, created_at")
      .eq("performance_id", performanceId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { performance_id, name, initial_side } = body || {};
    if (!performance_id || !name) {
      return NextResponse.json({ error: "performance_id and name are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("performance_equipment")
      .insert([
        {
          performance_id,
          name,
          initial_side: initial_side ?? null,
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(data?.[0], { status: 201 });
  } catch (error) {
    console.error("Error creating equipment:", error);
    return NextResponse.json({ error: "Failed to create equipment" }, { status: 500 });
  }
}
