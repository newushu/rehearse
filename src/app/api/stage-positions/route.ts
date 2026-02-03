import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET stage positions for a part
export async function GET(request: NextRequest) {
  try {
    const partId = request.nextUrl.searchParams.get("partId");

    if (!partId) {
      return NextResponse.json(
        { error: "partId query parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("stage_positions")
      .select(`
        *,
        students:student_id (
          id,
          name,
          email
        )
      `)
      .eq("part_id", partId);

    if (error) throw error;

    // Transform data to include student_name for easier use
    const transformedData = data.map((pos: any) => ({
      ...pos,
      student_name: pos.students?.name || "Unknown",
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching stage positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch stage positions" },
      { status: 500 }
    );
  }
}

// POST new stage position or bulk update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle bulk update (array of positions)
    if (Array.isArray(body)) {
      const positions = body;

      if (positions.length === 0) {
        const partId = request.nextUrl.searchParams.get("partId");
        if (partId) {
          await supabase.from("stage_positions").delete().eq("part_id", partId);
        }
        return NextResponse.json([], { status: 201 });
      }

      // Get part_id from first position
      const partId = positions[0].part_id;

      // Delete existing positions for this part
      if (partId) {
        await supabase
          .from("stage_positions")
          .delete()
          .eq("part_id", partId);
      }

      // Insert new positions
      const { data, error } = await supabase
        .from("stage_positions")
        .insert(positions)
        .select();

      if (error) throw error;

      return NextResponse.json(data, { status: 201 });
    }

    // Handle bulk update (object with part_id + positions)
    if (body && typeof body === "object" && "part_id" in body) {
      const partId = body.part_id as string;
      const positions = Array.isArray(body.positions) ? body.positions : [];

      if (!partId) {
        return NextResponse.json(
          { error: "part_id is required" },
          { status: 400 }
        );
      }

      // Delete existing positions for this part
      await supabase.from("stage_positions").delete().eq("part_id", partId);

      if (positions.length === 0) {
        return NextResponse.json([], { status: 201 });
      }

      const { data, error } = await supabase
        .from("stage_positions")
        .insert(positions)
        .select();

      if (error) throw error;

      return NextResponse.json(data, { status: 201 });
    }

    // Handle single position
    const { part_id, student_id, x, y } = body;

    if (!part_id || x === undefined || y === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: part_id, x, y" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("stage_positions")
      .insert([{ part_id, student_id, x, y }])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating stage position:", error);
    return NextResponse.json(
      { error: "Failed to create stage position" },
      { status: 500 }
    );
  }
}
