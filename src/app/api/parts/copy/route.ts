import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { source_performance_id, target_performance_id, copy_timepoints } =
      await request.json();

    if (!source_performance_id || !target_performance_id) {
      return NextResponse.json(
        { error: "Missing required fields: source_performance_id, target_performance_id" },
        { status: 400 }
      );
    }

    const { data: sourceParts, error: sourceError } = await supabase
      .from("parts")
      .select("id,name,description,order,is_group,timepoint_seconds,timepoint_end_seconds,timeline_row")
      .eq("performance_id", source_performance_id)
      .order("order", { ascending: true });

    if (sourceError) throw sourceError;

    if (!sourceParts || sourceParts.length === 0) {
      return NextResponse.json([], { status: 201 });
    }

    const { data: targetMax, error: targetMaxError } = await supabase
      .from("parts")
      .select("order")
      .eq("performance_id", target_performance_id)
      .order("order", { ascending: false })
      .limit(1);

    if (targetMaxError) throw targetMaxError;

    const baseOrder =
      targetMax && targetMax.length > 0 && typeof targetMax[0].order === "number"
        ? targetMax[0].order
        : 0;

    const rows = sourceParts.map((part: any, idx: number) => ({
      performance_id: target_performance_id,
      name: part.name,
      description: part.description,
      order: baseOrder + idx + 1,
      is_group: part.is_group ?? true,
      timepoint_seconds: copy_timepoints ? part.timepoint_seconds : null,
      timepoint_end_seconds: copy_timepoints ? part.timepoint_end_seconds : null,
      timeline_row: copy_timepoints ? part.timeline_row : null,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("parts")
      .insert(rows)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json(inserted || [], { status: 201 });
  } catch (error) {
    console.error("Error copying parts:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to copy parts", details },
      { status: 500 }
    );
  }
}
