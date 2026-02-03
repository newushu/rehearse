import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET positions for a subpart
export async function GET(request: NextRequest) {
  try {
    const subpartId = request.nextUrl.searchParams.get("subpartId");
    if (!subpartId) {
      return NextResponse.json(
        { error: "subpartId query parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("subpart_positions")
      .select(
        `
        *,
        students:student_id (
          id,
          name,
          email
        )
      `
      )
      .eq("subpart_id", subpartId);

    if (error) throw error;

    const transformed = (data || []).map((pos: any) => ({
      ...pos,
      student_name: pos.students?.name || "Unknown",
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching subpart positions:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to fetch subpart positions", details },
      { status: 500 }
    );
  }
}

// POST bulk update positions for a subpart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const positions = Array.isArray(body) ? body : [];

    if (Array.isArray(body)) {
      if (positions.length === 0) {
        const subpartId = request.nextUrl.searchParams.get("subpartId");
        if (subpartId) {
          await supabase.from("subpart_positions").delete().eq("subpart_id", subpartId);
        }
        return NextResponse.json([], { status: 201 });
      }

      const subpartId = positions[0].subpart_id;
      if (!subpartId) {
        return NextResponse.json(
          { error: "subpart_id is required" },
          { status: 400 }
        );
      }

      await supabase
        .from("subpart_positions")
        .delete()
        .eq("subpart_id", subpartId);

      const { data, error } = await supabase
        .from("subpart_positions")
        .insert(positions)
        .select();

      if (error) throw error;

      return NextResponse.json(data, { status: 201 });
    }

    if (body && typeof body === "object" && "subpart_id" in body) {
      const subpartId = body.subpart_id as string;
      const nextPositions = Array.isArray(body.positions) ? body.positions : [];

      if (!subpartId) {
        return NextResponse.json(
          { error: "subpart_id is required" },
          { status: 400 }
        );
      }

      await supabase
        .from("subpart_positions")
        .delete()
        .eq("subpart_id", subpartId);

      if (nextPositions.length === 0) {
        return NextResponse.json([], { status: 201 });
      }

      const { data, error } = await supabase
        .from("subpart_positions")
        .insert(nextPositions)
        .select();

      if (error) throw error;

      return NextResponse.json(data, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error saving subpart positions:", error);
    return NextResponse.json(
      { error: "Failed to save subpart positions" },
      { status: 500 }
    );
  }
}
