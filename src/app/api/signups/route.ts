import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET signups
export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");
    const studentId = request.nextUrl.searchParams.get("studentId");
    const studentIdsParam = request.nextUrl.searchParams.get("studentIds");
    const includePerformance =
      request.nextUrl.searchParams.get("includePerformance") === "1";

    const studentIds = (studentIdsParam || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    let query = supabase.from("student_signups").select("*");

    if (performanceId) {
      query = query.eq("performance_id", performanceId);
    }

    if (studentId) {
      query = query.eq("student_id", studentId);
    }
    if (studentIds.length > 0) {
      query = query.in("student_id", studentIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!includePerformance) {
      return NextResponse.json(data);
    }

    const performanceIds = Array.from(
      new Set((data || []).map((row: any) => row.performance_id).filter(Boolean))
    );

    if (performanceIds.length === 0) {
      return NextResponse.json(data || []);
    }

    const { data: performances, error: perfError } = await supabase
      .from("performances")
      .select("*")
      .in("id", performanceIds);

    if (perfError) throw perfError;

    const performanceById = new Map(
      (performances || []).map((perf: any) => [perf.id, perf])
    );

    const enriched = (data || []).map((row: any) => ({
      ...row,
      performance: performanceById.get(row.performance_id) || null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching signups:", error);
    return NextResponse.json(
      { error: "Failed to fetch signups" },
      { status: 500 }
    );
  }
}

// POST new signup
export async function POST(request: NextRequest) {
  try {
    const { performance_id, student_id, part_id, status } = await request.json();

    if (!performance_id || !student_id) {
      return NextResponse.json(
        { error: "Missing required fields: performance_id, student_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("student_signups")
      .insert([
        {
          performance_id,
          student_id,
          part_id,
          status: status || "registered",
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating signup:", error);
    return NextResponse.json(
      { error: "Failed to create signup" },
      { status: 500 }
    );
  }
}
