import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("uniform_types")
      .select("*")
      .order("name");
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching uniform types:", error);
    return NextResponse.json({ error: "Failed to fetch uniform types" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, code } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("uniform_types")
      .insert([{ name, code: code || null }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating uniform type:", error);
    return NextResponse.json({ error: "Failed to create uniform type" }, { status: 500 });
  }
}
