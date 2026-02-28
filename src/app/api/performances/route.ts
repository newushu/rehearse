import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const READ_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=300",
};

// GET all performances
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("performances")
      .select("*")
      .order("date", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data, { headers: READ_CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching performances:", error);
    return NextResponse.json(
      { error: "Failed to fetch performances" },
      { status: 500 }
    );
  }
}

// POST new performance
export async function POST(request: NextRequest) {
  try {
    const { title, description, date, location, call_time, timezone } = await request.json();

    if (!title || !date || !location) {
      return NextResponse.json(
        { error: "Missing required fields: title, date, location" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("performances")
      .insert([{ title, description, date, location, call_time, timezone }])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating performance:", error);
    return NextResponse.json(
      { error: "Failed to create performance" },
      { status: 500 }
    );
  }
}
