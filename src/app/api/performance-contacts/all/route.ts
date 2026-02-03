import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET all unique contacts across performances
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("performance_contacts")
      .select("name,phone");

    if (error) throw error;

    const map = new Map<string, { name: string; phone: string }>();
    (data || []).forEach((row: any) => {
      const key = `${row.name}||${row.phone}`;
      if (!map.has(key)) {
        map.set(key, { name: row.name, phone: row.phone });
      }
    });

    return NextResponse.json(Array.from(map.values()));
  } catch (error) {
    console.error("Error fetching all contacts:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to fetch contacts", details },
      { status: 500 }
    );
  }
}
