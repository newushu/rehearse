import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// POST music file upload
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: MP3, WAV, OGG, WebM" },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    const filename = `performance-${id}-${timestamp}-${file.name}`;
    const filePath = `music/${filename}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error: uploadError } = await supabase.storage
      .from("performance-music")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("performance-music")
      .getPublicUrl(filePath);

    // Update performance with music file path
    const { data: updateData, error: updateError } = await supabase
      .from("performances")
      .update({
        music_file_path: filePath,
        music_file_name: file.name,
      })
      .eq("id", id)
      .select();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      filePath,
      publicUrl: publicUrlData?.publicUrl,
      performance: updateData[0],
    });
  } catch (error) {
    console.error("Error uploading music:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to upload music file", details },
      { status: 500 }
    );
  }
}
