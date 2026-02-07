import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const performanceId = searchParams.get("performanceId");
    if (!performanceId) {
      return NextResponse.json({ error: "Missing performanceId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("rehearse_notes")
      .select("id, performance_id, part_id, subpart_id, note, updated_at")
      .eq("performance_id", performanceId);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching rehearse notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { performance_id, part_id, subpart_id, note } = await request.json();
    if (!performance_id || !part_id) {
      return NextResponse.json({ error: "Missing performance_id or part_id" }, { status: 400 });
    }

    const cleanNote = typeof note === "string" ? note.trim() : "";
    if (!cleanNote) {
      const { error: deleteError } = await supabase
        .from("rehearse_notes")
        .delete()
        .eq("performance_id", performance_id)
        .eq("part_id", part_id)
        .eq("subpart_id", subpart_id ?? null);

      if (deleteError) throw deleteError;
      return NextResponse.json({ deleted: true });
    }

    const { data, error } = await supabase
      .from("rehearse_notes")
      .upsert(
        {
          performance_id,
          part_id,
          subpart_id: subpart_id ?? null,
          note: cleanNote,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "performance_id,part_id,subpart_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error saving rehearse note:", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
