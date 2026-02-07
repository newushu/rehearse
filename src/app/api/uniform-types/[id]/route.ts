import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, code } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }
    const nextCode =
      typeof code === "string" && code.trim().length > 0 ? code.trim().toUpperCase() : null;
    const { data: currentType } = await supabase
      .from("uniform_types")
      .select("code")
      .eq("id", id)
      .single();
    const prevCode = currentType?.code || null;
    const { data, error } = await supabase
      .from("uniform_types")
      .update({ name, code: nextCode })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    if (nextCode && nextCode !== prevCode) {
      const { data: items, error: itemsError } = await supabase
        .from("uniform_items")
        .select("id,item_number")
        .eq("uniform_type_id", id);
      if (itemsError) throw itemsError;
      const updates = (items || []).map((item: any) => {
        const parts = String(item.item_number || "").split("-");
        if (parts.length >= 2) {
          parts[0] = nextCode;
          return { id: item.id, item_number: parts.join("-") };
        }
        return { id: item.id, item_number: item.item_number };
      });
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from("uniform_items")
          .upsert(updates, { onConflict: "id" });
        if (updateError) throw updateError;
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating uniform type:", error);
    return NextResponse.json({ error: "Failed to update uniform type" }, { status: 500 });
  }
}


