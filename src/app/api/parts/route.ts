import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET parts for a performance
export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");

    if (!performanceId) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabase
      .from("parts")
      .select("*")
      .eq("performance_id", performanceId)
      .order("order", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching parts:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}

// POST new part
export async function POST(request: NextRequest) {
  try {
    const { performance_id, name, description, order, is_group } = await request.json();

    if (!performance_id || !name) {
      return NextResponse.json(
        { error: "Missing required fields: performance_id, name" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("parts")
      .insert([
        {
          performance_id,
          name,
          description,
          order: order || 0,
          is_group: is_group ?? true,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating part:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to create part", details },
      { status: 500 }
    );
  }
}
