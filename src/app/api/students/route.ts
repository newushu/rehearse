import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET all students
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

// POST new student
export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const normalizedEmail =
      typeof email === "string" && email.trim().length > 0 ? email.trim() : null;

    // Check if student with this exact name and email exists
    if (normalizedEmail) {
      try {
        const { data: exactMatches } = await supabase
          .from("students")
          .select("*")
          .eq("email", normalizedEmail)
          .eq("name", name);

        if (exactMatches && exactMatches.length > 0) {
          // Return existing student with exact name match
          return NextResponse.json(exactMatches[0], { status: 200 });
        }
      } catch (checkErr) {
        console.error("Error checking existing student:", checkErr);
        // Continue to create new student if check fails
      }
    }

    // Create new student even if email exists (for siblings with different names)
    const { data, error } = await supabase
      .from("students")
      .insert([{ name, email: normalizedEmail }])
      .select();

    if (error) {
      console.error("Error inserting student:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.error("No data returned after insert");
      throw new Error("Failed to create student - no data returned");
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating student:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create student";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
