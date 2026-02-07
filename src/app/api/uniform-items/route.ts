import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const typeId = request.nextUrl.searchParams.get("typeId");
    const runQuery = async (withCreatedAt: boolean) => {
      let query = supabase
        .from("uniform_items")
        .select(
          withCreatedAt
            ? "id,item_number,uniform_type_id,created_at,uniform_assignments(id,student_id,student_name,performance_id,distributed_at,returned_at,created_at)"
            : "id,item_number,uniform_type_id,created_at,uniform_assignments(id,student_id,student_name,performance_id,distributed_at,returned_at)"
        )
        .order("item_number", { ascending: true });
      if (typeId) query = query.eq("uniform_type_id", typeId);
      return query;
    };

    const { data, error } = await runQuery(true);
    if (!error) return NextResponse.json(data || []);

    if (error && error.code === "42703") {
      const retry = await runQuery(false);
      const { data: fallbackData, error: fallbackError } = await retry;
      if (fallbackError) throw fallbackError;
      return NextResponse.json(fallbackData || []);
    }

    throw error;
  } catch (error) {
    console.error("Error fetching uniform items:", error);
    return NextResponse.json({ error: "Failed to fetch uniform items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uniform_type_id, item_number } = await request.json();
    if (!uniform_type_id || !item_number) {
      return NextResponse.json(
        { error: "Missing required fields: uniform_type_id, item_number" },
        { status: 400 }
      );
    }
    const { data: existing, error: checkError } = await supabase
      .from("uniform_items")
      .select("id")
      .eq("uniform_type_id", uniform_type_id)
      .ilike("item_number", item_number);
    if (checkError) throw checkError;
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Item number already exists" }, { status: 409 });
    }
    const { data, error } = await supabase
      .from("uniform_items")
      .insert([{ uniform_type_id, item_number }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating uniform item:", error);
    return NextResponse.json({ error: "Failed to create uniform item" }, { status: 500 });
  }
}
