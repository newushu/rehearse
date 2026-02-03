import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const SETTINGS_KEY = "global";
const BUCKET = "app-assets";

export async function GET() {
  try {
    const { data: settings, error } = await supabase
      .from("app_settings")
      .select("logo_file_path, logo_file_name")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error) throw error;

    let logoUrl: string | null = null;
    if (settings?.logo_file_path) {
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(settings.logo_file_path);
      logoUrl = publicUrlData?.publicUrl || null;
    }

    return NextResponse.json({
      logoUrl,
      logoFileName: settings?.logo_file_name || null,
      logoFilePath: settings?.logo_file_path || null,
    });
  } catch (error) {
    console.error("Error fetching app logo:", error);
    return NextResponse.json(
      { error: "Failed to fetch app logo" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: PNG, JPG, SVG, WebP" },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-z0-9_.-]/gi, "-");
    const filePath = `logo/app-logo-${timestamp}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: updated, error: updateError } = await supabase
      .from("app_settings")
      .upsert({
        key: SETTINGS_KEY,
        logo_file_path: filePath,
        logo_file_name: file.name,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (updateError) throw updateError;

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      logoUrl: publicUrlData?.publicUrl || null,
      logoFileName: updated.logo_file_name,
      logoFilePath: updated.logo_file_path,
    });
  } catch (error) {
    console.error("Error uploading app logo:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to upload app logo", details },
      { status: 500 }
    );
  }
}
