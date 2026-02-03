import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET contacts for a performance
export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");
    if (!performanceId) {
      return NextResponse.json(
        { error: "performanceId query parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("performance_contacts")
      .select("*")
      .eq("performance_id", performanceId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching performance contacts:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to fetch performance contacts", details },
      { status: 500 }
    );
  }
}

// POST new contact
export async function POST(request: NextRequest) {
  try {
    const { performance_id, name, phone, include_in_export } = await request.json();

    if (!performance_id || !name || !phone) {
      return NextResponse.json(
        { error: "Missing required fields: performance_id, name, phone" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("performance_contacts")
      .insert([
        {
          performance_id,
          name,
          phone,
          include_in_export: include_in_export ?? true,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0], { status: 201 });
  } catch (error) {
    console.error("Error creating performance contact:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to create performance contact", details },
      { status: 500 }
    );
  }
}
