import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const VALID_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"];
const MAX_SIZE = 15 * 1024 * 1024;

async function updatePerformanceMusic(id: string, filePath: string, fileName: string) {
  const { data: updateData, error: updateError } = await supabase
    .from("performances")
    .update({
      music_file_path: filePath,
      music_file_name: fileName,
    })
    .eq("id", id)
    .select();

  if (updateError) throw updateError;

  const { data: publicUrlData } = supabase.storage
    .from("performance-music")
    .getPublicUrl(filePath);

  return NextResponse.json({
    success: true,
    filePath,
    publicUrl: publicUrlData?.publicUrl,
    performance: updateData[0],
  });
}

// POST music file upload
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";

    // New flow: file uploaded directly to Supabase from client, API only saves metadata.
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const filePath = typeof body?.filePath === "string" ? body.filePath : "";
      const fileName = typeof body?.fileName === "string" ? body.fileName : "";

      if (!filePath || !fileName) {
        return NextResponse.json(
          { error: "Missing filePath or fileName" },
          { status: 400 }
        );
      }

      return updatePerformanceMusic(id, filePath, fileName);
    }

    // Legacy flow: file posted to this endpoint as multipart/form-data.
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: MP3, WAV, OGG, WebM" },
        { status: 400 }
      );
    }

    // Validate file size (max 15MB)
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 15MB limit" },
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

    const { error: uploadError } = await supabase.storage
      .from("performance-music")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return updatePerformanceMusic(id, filePath, file.name);
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


