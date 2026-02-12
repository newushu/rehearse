import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

function safeFileName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "rehearse-export";
}

export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");
    if (!performanceId) {
      return NextResponse.json({ error: "performanceId query parameter is required" }, { status: 400 });
    }

      const { data: performance, error: perfError } = await supabase
      .from("performances")
      .select("id,title,description,date,location,call_time,phone_numbers,stage_orientation,timezone,music_file_path,music_file_name")
      .eq("id", performanceId)
      .single();

    if (perfError) {
      return NextResponse.json(
        { error: "Failed to fetch performance", details: perfError.message },
        { status: 500 }
      );
    }
    if (!performance) {
      return NextResponse.json({ error: "Performance not found" }, { status: 404 });
    }

    const { data: contacts, error: contactsError } = await supabase
      .from("performance_contacts")
      .select("id,name,phone,include_in_export")
      .eq("performance_id", performanceId)
      .order("created_at", { ascending: true });

    if (contactsError) throw contactsError;

    const { data: parts, error: partsError } = await supabase
      .from("parts")
      .select("id,name,description,order,timepoint_seconds,timepoint_end_seconds")
      .eq("performance_id", performanceId);

    if (partsError) throw partsError;

    const partIds = (parts || []).map((p: any) => p.id);
    let positionsByPart: Record<string, Array<{ student_id: string; student_name: string; x: number; y: number }>> = {};
    let subpartsByPart: Record<string, Array<{ id: string; title: string; mode?: string | null }>> = {};
    let subpartPositionsBySubpart: Record<string, Array<{ student_id: string; student_name: string; x: number; y: number }>> = {};
    let subpartOrderBySubpart: Record<string, Array<{ student_id: string; student_name: string; start_side?: string | null; end_side?: string | null }>> = {};

    if (partIds.length > 0) {
      const { data: positions, error: posError } = await supabase
        .from("stage_positions")
        .select(
          `
          id,
          part_id,
          student_id,
          x,
          y,
          students:student_id (
            id,
            name
          )
        `
        )
        .in("part_id", partIds);

      if (posError) throw posError;

      positionsByPart = (positions || []).reduce((acc: any, item: any) => {
        if (!acc[item.part_id]) acc[item.part_id] = [];
        acc[item.part_id].push({
          student_id: item.student_id,
          student_name: item.students?.name || "Unknown",
          x: item.x,
          y: item.y,
        });
        return acc;
      }, {});

      const { data: subparts, error: subpartsError } = await supabase
        .from("subparts")
        .select("id,part_id,title,description,mode,order,timepoint_seconds,timepoint_end_seconds")
        .in("part_id", partIds)
        .order("order", { ascending: true });

      if (subpartsError) throw subpartsError;

      subpartsByPart = (subparts || []).reduce((acc: any, item: any) => {
        if (!acc[item.part_id]) acc[item.part_id] = [];
        acc[item.part_id].push({
          id: item.id,
          title: item.title,
          description: item.description ?? null,
          mode: item.mode ?? null,
          timepoint_seconds: item.timepoint_seconds ?? null,
          timepoint_end_seconds: item.timepoint_end_seconds ?? null,
        });
        return acc;
      }, {});

      const subpartIds = (subparts || []).map((s: any) => s.id);
      if (subpartIds.length > 0) {
        const { data: subpartPositions, error: subPosError } = await supabase
          .from("subpart_positions")
          .select(
            `
            id,
            subpart_id,
            student_id,
            x,
            y,
            students:student_id (
              id,
              name
            )
          `
          )
          .in("subpart_id", subpartIds);

        if (subPosError) throw subPosError;

        subpartPositionsBySubpart = (subpartPositions || []).reduce((acc: any, item: any) => {
          if (!acc[item.subpart_id]) acc[item.subpart_id] = [];
          acc[item.subpart_id].push({
            student_id: item.student_id,
            student_name: item.students?.name || "Unknown",
            x: item.x,
            y: item.y,
          });
          return acc;
        }, {});

        const { data: subpartOrder, error: subOrderError } = await supabase
          .from("subpart_order")
          .select(
            `
            id,
            subpart_id,
            student_id,
            "order",
            start_side,
            end_side,
            students:student_id (
              id,
              name
            )
          `
          )
          .in("subpart_id", subpartIds)
          .order("order", { ascending: true });

        if (subOrderError) throw subOrderError;

        subpartOrderBySubpart = (subpartOrder || []).reduce((acc: any, item: any) => {
          if (!acc[item.subpart_id]) acc[item.subpart_id] = [];
          acc[item.subpart_id].push({
            student_id: item.student_id,
            student_name: item.students?.name || "Unknown",
            start_side: item.start_side ?? null,
            end_side: item.end_side ?? null,
          });
          return acc;
        }, {});
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const resolvedMusicPath =
      performance.music_file_path ||
      (performance.music_file_name ? `music/${performance.music_file_name}` : "");
    const musicUrl =
      resolvedMusicPath && baseUrl
        ? `${baseUrl}/storage/v1/object/public/performance-music/${resolvedMusicPath}`
        : "";

    let embeddedAudioDataUrl = "";
    const embedAudio = request.nextUrl.searchParams.get("embedAudio") === "1";
    if (musicUrl && embedAudio) {
      try {
        const audioRes = await fetch(musicUrl);
        if (audioRes.ok) {
          const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
          const arrayBuffer = await audioRes.arrayBuffer();
          const maxBytes = 25 * 1024 * 1024;
          if (arrayBuffer.byteLength <= maxBytes) {
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            embeddedAudioDataUrl = `data:${contentType};base64,${base64}`;
          }
        }
      } catch {
        // ignore embedding errors; fallback to URL
      }
    }

    const payload = {
      performance: {
        id: performance.id,
        title: performance.title,
        stage_orientation: performance.stage_orientation || "bottom",
        description: performance.description || "",
        date: performance.date || "",
        location: performance.location || "",
        call_time: performance.call_time || "",
        timezone: performance.timezone || "America/New_York",
        phone_numbers: performance.phone_numbers || "",
        contacts: (contacts || []).filter((c: any) => c.include_in_export),
      },
      parts: parts || [],
      positionsByPart,
      subpartsByPart,
      subpartPositionsBySubpart,
      subpartOrderBySubpart,
      musicUrl,
      embeddedAudioDataUrl,
      logoUrl: "",
    };

    try {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("logo_file_path")
        .eq("key", "global")
        .maybeSingle();
      if (settings?.logo_file_path) {
        const { data: publicUrlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(settings.logo_file_path);
        payload.logoUrl = publicUrlData?.publicUrl || "";
      }
    } catch {
      // ignore logo errors in export
    }

    const dataJson = JSON.stringify(payload).replace(/</g, "\\u003c");

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rehearse Export</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; background: #0f172a; color: #0f172a; }
      .app { min-height: 100vh; padding: 24px; background: #0f172a; }
      .panel { background: #f8fafc; border-radius: 12px; padding: 16px; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; color: #e2e8f0; gap: 16px; flex-wrap: wrap; }
      .header-brand { display: flex; align-items: center; gap: 12px; }
      .logo-box { width: 84px; height: 84px; border-radius: 12px; border: 1px dashed #475569; display: flex; align-items: center; justify-content: center; color: #94a3b8; background: rgba(15, 23, 42, 0.6); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; overflow: hidden; }
      .brand-inline { display: inline-flex; align-items: center; gap: 8px; }
      .logo-box img { width: 100%; height: 100%; object-fit: contain; display: block; }
      .title { font-size: 22px; font-weight: 700; color: #e2e8f0; }
      .sub { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
      .brand-email { font-size: 11px; color: #94a3b8; }
      .layout { display: grid; grid-template-columns: 340px 1fr; gap: 16px; }
      .parts-list { display: grid; gap: 10px; }
      .part-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #ffffff; }
      .part-card.current { border-color: #3b82f6; background: #eff6ff; }
      .part-card.next { border-color: #a855f7; background: #f5f3ff; }
      .part-name { font-weight: 700; font-size: 16px; }
      .part-time { font-size: 12px; color: #64748b; }
      .part-names { font-size: 12px; color: #475569; margin-top: 6px; }
      .subparts { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #e2e8f0; display: grid; gap: 6px; }
      .subpart-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; }
      .subpart-row { font-size: 12px; color: #334155; }
      .subpart-meta { font-size: 11px; color: #64748b; margin-left: 10px; }
      .grids { display: grid; grid-template-columns: repeat(2, minmax(280px, 1fr)); gap: 16px; }
      .grid-card { background: #ffffff; border-radius: 12px; border: 2px solid #cbd5f5; padding: 16px; }
      .grid-card.next { border-color: #a855f7; background: #f5f3ff; }
      .grid-card.current { border-color: #2563eb; background: #eff6ff; }
      .grid-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
      .grid-title { font-size: 28px; font-weight: 700; margin-top: 4px; }
      .countdown { font-size: 48px; font-weight: 800; color: #dc2626; }
      .get-ready { font-size: 24px; font-weight: 800; color: #dc2626; margin-top: 6px; }
      .grid { position: relative; margin-top: 12px; border: 1px solid #cbd5f5; background: linear-gradient(#e2e8f0, #c7d2fe); }
      .grid.current { background: linear-gradient(#bfdbfe, #93c5fd); }
      .grid.next { background: linear-gradient(#ddd6fe, #c4b5fd); }
      .mini-grids { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
      .mini-card { border: 1px solid #cbd5f5; border-radius: 8px; padding: 6px; background: #ffffff; }
      .mini-title { font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 6px; }
      .mini-grid { position: relative; border: 1px solid #e2e8f0; background: #f8fafc; }
      .mini-circle { width: 16px; height: 16px; border-radius: 999px; background: #1d4ed8; color: #fff; font-weight: 700; font-size: 8px; display: flex; align-items: center; justify-content: center; }
      .circle { width: 42px; height: 42px; border-radius: 999px; background: #1d4ed8; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; }
      .controls { display: flex; align-items: center; gap: 16px; margin-top: 16px; color: #0f172a; }
      .controls label { font-size: 12px; color: #475569; }
      .audio-wrap { margin-top: 16px; }
      .audio-wrap.top { margin-bottom: 16px; }
      .audio-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      .audio-row audio { width: 100%; max-width: 640px; height: 46px; display: block; }
      .notice { color: #b91c1c; font-size: 12px; margin-top: 8px; }
      .footer-brand { margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
      .info-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 12px; }
      .summary-card { background: #ffffff; border: 1px solid #cbd5f5; border-radius: 10px; padding: 12px; margin-bottom: 14px; }
      .summary-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1d4ed8; margin-bottom: 8px; }
      .summary-section { border-top: 1px dashed #e2e8f0; padding-top: 10px; margin-top: 10px; }
      .summary-header { display: grid; gap: 2px; }
      .summary-part { font-size: 14px; font-weight: 700; color: #0f172a; }
      .summary-time { font-size: 12px; color: #475569; }
      .summary-notes { font-size: 12px; color: #334155; }
      .summary-indent-1 { margin-left: 14px; }
      .summary-indent-2 { margin-left: 28px; }
      .summary-subparts { margin-top: 6px; display: grid; gap: 6px; }
      .summary-subpart { font-size: 12px; color: #0f172a; font-weight: 600; }
      .summary-people { font-size: 12px; color: #334155; }
      .summary-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1d4ed8; background: #eff6ff; border: 2px solid #1d4ed8; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
      .summary-overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.7); z-index: 60; padding: 16px; }
      .summary-overlay.active { display: flex; }
      .summary-overlay-card { background: #ffffff; border-radius: 16px; padding: 16px; border: 2px solid #cbd5f5; width: min(760px, 95vw); max-height: 85vh; overflow: auto; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35); }
      .summary-overlay-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }
      .summary-close { border: 1px solid #cbd5f5; background: #f8fafc; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
      .info-row { font-size: 12px; color: #334155; margin-top: 4px; }
      .info-label { font-weight: 700; color: #475569; }
      .phone-list { margin-top: 6px; padding-left: 16px; }
      .phone-list li { font-size: 12px; color: #334155; }
      .filter-bar { margin-top: 0; padding: 10px 12px; border: 2px solid #1d4ed8; border-radius: 10px; background: #eff6ff; display: flex; align-items: center; gap: 10px; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12); }
      .filter-label { font-size: 12px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.08em; }
      .legend { margin-top: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; }
      .legend-title { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
      .legend-grid { display: grid; grid-template-columns: repeat(2, minmax(120px, 1fr)); gap: 6px; font-size: 12px; color: #334155; }
      .legend-item { display: flex; align-items: center; gap: 6px; }
      .legend-dot { width: 18px; height: 18px; border-radius: 999px; background: #1d4ed8; color: #fff; font-weight: 700; font-size: 10px; display: flex; align-items: center; justify-content: center; }
      .jump-link { margin-top: 6px; font-size: 11px; color: #1d4ed8; text-decoration: underline; cursor: pointer; }
      .filter-hit { color: #16a34a; font-weight: 800; }
      .timeline-card { margin-top: 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
      .timeline-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; margin-bottom: 6px; }
      .timeline-track { position: relative; height: 64px; border: 1px solid #cbd5f5; border-radius: 10px; background: #f8fafc; overflow: hidden; }
      .timeline-segment { position: absolute; top: 0; height: 100%; background: #c2410c; border: 2px solid #7c2d12; color: #ffffff; font-size: 12px; font-weight: 700; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4px; line-height: 1.15; transition: box-shadow 0.2s ease, background 0.2s ease; }
      .timeline-current { background: #059669; border-color: #065f46; box-shadow: 0 0 12px rgba(16, 185, 129, 0.85); animation: pulse 1.2s infinite; }
      .timeline-flash { background: #10b981; border-color: #047857; }
      @keyframes pulse { 0% { box-shadow: 0 0 0 rgba(16,185,129,0.6); } 50% { box-shadow: 0 0 14px rgba(16,185,129,0.95); } 100% { box-shadow: 0 0 0 rgba(16,185,129,0.6); } }
      .timeline-divider { position: absolute; top: 0; height: 100%; width: 4px; background: #7c2d12; }
      .timeline-playhead { position: absolute; top: 0; height: 100%; width: 3px; background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.7); }
      .timeline-range { margin-top: 4px; font-size: 11px; color: #64748b; }
      .jump-overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.6); z-index: 50; }
      .jump-overlay.active { display: flex; }
      .jump-overlay-card { background: #ffffff; border-radius: 16px; padding: 24px 32px; border: 3px solid #dc2626; text-align: center; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.35); }
      .jump-overlay-count { font-size: 64px; font-weight: 800; color: #dc2626; line-height: 1; }
      .jump-overlay-label { margin-top: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; color: #475569; font-weight: 700; }
      @media (max-width: 1100px) {
        .layout { grid-template-columns: 1fr; }
        .grids { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="app">
      <div class="jump-overlay" id="jumpOverlay">
        <div class="jump-overlay-card">
          <div class="jump-overlay-count" id="jumpOverlayCount">5</div>
          <div class="jump-overlay-label">Get Ready</div>
        </div>
      </div>
      <div class="header">
        <div class="header-brand">
          <div class="logo-box" id="logoBox">Logo</div>
          <div>
            <div class="title">Rehearse</div>
            <div class="sub brand-inline">
              <span>by ORGN Media</span>
            </div>
            <div class="brand-email">hello@orgnmedia.com</div>
            <div class="title" id="performanceTitle"></div>
          </div>
        </div>
        <div></div>
      </div>

      <div class="audio-wrap top panel">
        <div class="audio-row">
          <button id="playButton" style="padding:10px 16px; border-radius:10px; border:1px solid #cbd5f5; background:#fff; cursor:pointer; font-weight:600;">
            Tap to Play
          </button>
          <audio id="audio" controls></audio>
          <div class="filter-bar">
            <div class="filter-label">Filter by person</div>
            <select id="personFilter" style="padding:6px 8px; border:1px solid #cbd5f5; border-radius:6px;">
              <option value="">All</option>
            </select>
          </div>
          <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.08em;">
            <input type="checkbox" id="ringToggle" checked />
            Ring at T-10
          </label>
          <div style="font-size:11px; color:#475569;">
            Tip: On some mobile devices, turn your phone to landscape mode to view audio controls.
          </div>
        </div>
        <div class="notice" id="audioNotice"></div>
        <div class="notice" id="audioLink"></div>
      </div>
      <div class="timeline-card panel" id="timelineCard">
        <div class="timeline-label">Subpart Timeline</div>
        <div class="timeline-track" id="timelineTrack"></div>
        <div class="timeline-range" id="timelineRange"></div>
      </div>

      <div class="layout">
        <div class="panel">
          <button class="summary-toggle" id="summaryToggle">Open Summary</button>
          <div class="summary-overlay" id="summaryOverlay">
            <div class="summary-overlay-card">
              <div class="summary-overlay-header">
                <div class="summary-title">Summary</div>
                <button class="summary-close" id="summaryClose">Close</button>
              </div>
              <div class="summary-card" id="summaryCard">
            <div class="info-row"><span class="info-label">Date:</span> <span id="summaryDate">--</span></div>
            <div class="info-row"><span class="info-label">Timezone:</span> <span id="summaryTimezone">--</span></div>
            <div class="info-row"><span class="info-label">Call Time:</span> <span id="summaryCallTime">--</span></div>
            <div class="info-row"><span class="info-label">Location:</span> <span id="summaryLocation">--</span></div>
            <div class="info-row"><span class="info-label">Description:</span> <span id="summaryDescription">--</span></div>
            <div class="info-row">
              <span class="info-label">Phone Numbers:</span>
              <ul class="phone-list" id="summaryPhones"></ul>
            </div>
            <div id="summaryParts"></div>
              </div>
            </div>
          </div>
          <div class="info-card">
            <div class="part-name">Performance Info</div>
            <div class="info-row"><span class="info-label">Date:</span> <span id="infoDate">--</span></div>
            <div class="info-row"><span class="info-label">Timezone:</span> <span id="infoTimezone">--</span></div>
            <div class="info-row"><span class="info-label">Call Time:</span> <span id="infoCallTime">--</span></div>
            <div class="info-row"><span class="info-label">Location:</span> <span id="infoLocation">--</span></div>
            <div class="info-row"><span class="info-label">Description:</span> <span id="infoDescription">--</span></div>
            <div class="info-row">
              <span class="info-label">Phone Numbers:</span>
              <ul class="phone-list" id="infoPhones"></ul>
            </div>
          </div>
          <div class="part-name" style="margin-bottom: 10px;">Parts</div>
          <div class="parts-list" id="partsList"></div>
        </div>
        <div class="panel">
          <div class="grids">
            <div class="grid-card next">
              <div class="grid-label">Next</div>
              <div class="grid-title" id="nextName">-</div>
              <div class="countdown" id="nextCountdown"></div>
              <div class="get-ready" id="nextReady"></div>
              <div class="grid next" id="nextGrid"></div>
            </div>
            <div class="grid-card current">
              <div class="grid-label">Current</div>
              <div class="grid-title" id="currentName">-</div>
              <div class="grid current" id="currentGrid"></div>
              <div class="mini-grids" id="currentMiniGrids"></div>
            </div>
          </div>
          
          
          <div class="legend" id="legendWrap">
            <div class="legend-title">Legend</div>
            <div class="legend-grid" id="legendGrid"></div>
          </div>
          <div class="footer-brand">
            <div>Rehearse by ORGN Media</div>
            <div class="brand-email">hello@orgnmedia.com</div>
          </div>
        </div>
      </div>
    </div>

    <script>
      const DATA = ${dataJson};
    </script>
    <script>
      const gridCols = 12;
      const gridRows = 8;
      const cellSize = 50;

      const audio = document.getElementById('audio');
      const playButton = document.getElementById('playButton');
      const audioNotice = document.getElementById('audioNotice');
      const audioLink = document.getElementById('audioLink');
      const ringToggle = document.getElementById('ringToggle');
      const partsList = document.getElementById('partsList');
      const performanceTitle = document.getElementById('performanceTitle');
      const infoDate = document.getElementById('infoDate');
      const infoTimezone = document.getElementById('infoTimezone');
      const infoCallTime = document.getElementById('infoCallTime');
      const infoLocation = document.getElementById('infoLocation');
      const infoDescription = document.getElementById('infoDescription');
      const infoPhones = document.getElementById('infoPhones');
      const summaryDate = document.getElementById('summaryDate');
      const summaryTimezone = document.getElementById('summaryTimezone');
      const summaryCallTime = document.getElementById('summaryCallTime');
      const summaryLocation = document.getElementById('summaryLocation');
      const summaryDescription = document.getElementById('summaryDescription');
      const summaryPhones = document.getElementById('summaryPhones');
      const summaryParts = document.getElementById('summaryParts');
      const summaryToggle = document.getElementById('summaryToggle');
      const summaryOverlay = document.getElementById('summaryOverlay');
      const summaryClose = document.getElementById('summaryClose');
      const currentName = document.getElementById('currentName');
      const nextName = document.getElementById('nextName');
      const nextCountdown = document.getElementById('nextCountdown');
      const nextReady = document.getElementById('nextReady');
      const currentGrid = document.getElementById('currentGrid');
      const nextGrid = document.getElementById('nextGrid');
      const currentMiniGrids = document.getElementById('currentMiniGrids');
      const logoBox = document.getElementById('logoBox');
      const personFilter = document.getElementById('personFilter');
      const legendWrap = document.getElementById('legendWrap');
      const legendGrid = document.getElementById('legendGrid');
      const timelineCard = document.getElementById('timelineCard');
      const timelineTrack = document.getElementById('timelineTrack');
      const timelineRange = document.getElementById('timelineRange');
      const jumpOverlay = document.getElementById('jumpOverlay');
      const jumpOverlayCount = document.getElementById('jumpOverlayCount');

      const orderedParts = [...(DATA.parts || [])].sort((a, b) => {
        const aTime = typeof a.timepoint_seconds === 'number' ? a.timepoint_seconds : Infinity;
        const bTime = typeof b.timepoint_seconds === 'number' ? b.timepoint_seconds : Infinity;
        if (aTime === bTime) return (a.order || 0) - (b.order || 0);
        return aTime - bTime;
      });

      const timepointParts = orderedParts.filter((p) => typeof p.timepoint_seconds === 'number');
      performanceTitle.textContent = DATA.performance?.title || 'Rehearse Export';
      function formatLocalDateTime(value, tz) {
        if (!value) return '--';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '--';
        return date.toLocaleString(undefined, { timeZone: tz || 'America/New_York', timeZoneName: 'short' });
      }

      if (infoDate) infoDate.textContent = formatLocalDateTime(DATA.performance?.date || '', DATA.performance?.timezone);
      if (infoTimezone) infoTimezone.textContent = DATA.performance?.timezone || 'America/New_York';
      if (infoCallTime) infoCallTime.textContent = DATA.performance?.call_time || '--';
      if (infoLocation) infoLocation.textContent = DATA.performance?.location || '--';
      if (infoDescription) infoDescription.textContent = DATA.performance?.description || '--';
      if (summaryDate) summaryDate.textContent = formatLocalDateTime(DATA.performance?.date || '', DATA.performance?.timezone);
      if (summaryTimezone) summaryTimezone.textContent = DATA.performance?.timezone || 'America/New_York';
      if (summaryCallTime) summaryCallTime.textContent = DATA.performance?.call_time || '--';
      if (summaryLocation) summaryLocation.textContent = DATA.performance?.location || '--';
      if (summaryDescription) summaryDescription.textContent = DATA.performance?.description || '--';
      if (infoPhones) {
        infoPhones.innerHTML = '';
        const selectedContacts = (DATA.performance?.contacts || []).map((c) => c.name + ': ' + c.phone);
        const phones = selectedContacts.length > 0
          ? selectedContacts
          : (DATA.performance?.phone_numbers || '').split(/\\r?\\n/).map((p) => p.trim()).filter(Boolean);
        if (phones.length === 0) {
          const li = document.createElement('li');
          li.textContent = '--';
          infoPhones.appendChild(li);
        } else {
          phones.forEach((p) => {
            const li = document.createElement('li');
            li.textContent = p;
            infoPhones.appendChild(li);
          });
        }
      }
      if (summaryPhones) {
        summaryPhones.innerHTML = '';
        const selectedContacts = (DATA.performance?.contacts || []).map((c) => c.name + ': ' + c.phone);
        const phones = selectedContacts.length > 0
          ? selectedContacts
          : (DATA.performance?.phone_numbers || '').split(/\\r?\\n/).map((p) => p.trim()).filter(Boolean);
        if (phones.length === 0) {
          const li = document.createElement('li');
          li.textContent = '--';
          summaryPhones.appendChild(li);
        } else {
          phones.forEach((p) => {
            const li = document.createElement('li');
            li.textContent = p;
            summaryPhones.appendChild(li);
          });
        }
      }

      if (DATA.logoUrl && logoBox) {
        const img = document.createElement('img');
        img.src = DATA.logoUrl;
        img.alt = 'Logo';
        logoBox.textContent = '';
        logoBox.appendChild(img);
      }

      function openSummary() {
        if (summaryOverlay) summaryOverlay.classList.add('active');
      }
      function closeSummary() {
        if (summaryOverlay) summaryOverlay.classList.remove('active');
      }
      if (summaryToggle) summaryToggle.addEventListener('click', openSummary);
      if (summaryClose) summaryClose.addEventListener('click', closeSummary);
      if (summaryOverlay) {
        summaryOverlay.addEventListener('click', (event) => {
          if (event.target === summaryOverlay) closeSummary();
        });
      }

      if (DATA.embeddedAudioDataUrl) {
        audio.src = DATA.embeddedAudioDataUrl;
      } else if (DATA.musicUrl) {
        audio.src = DATA.musicUrl;
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audioLink.innerHTML = 'Audio URL: <a href=\"' + DATA.musicUrl + '\" target=\"_blank\">Open audio</a>';
      } else {
        audioNotice.textContent = 'No music file available in this export.';
      }
      if (audio) {
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        audio.controls = true;
      }
      audio.load();

      playButton.addEventListener('click', async () => {
        try {
          await audio.play();
          audioNotice.textContent = '';
        } catch (e) {
          audioNotice.textContent = 'Tap play again if audio is blocked.';
        }
      });

      audio.addEventListener('error', () => {
        audioNotice.textContent = 'Audio failed to load. Try opening the audio URL.';
      });

      let prevTimeToNext = null;

      function getInitials(name) {
        if (!name) return '?';
        const chunks = name.trim().split(/\\s+/);
        if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
        return (chunks[0][0] + chunks[chunks.length - 1][0]).toUpperCase();
      }

      function getCurrentIndex(currentTime) {
        if (timepointParts.length === 0) return -1;
        let idx = 0;
        for (let i = 0; i < timepointParts.length; i++) {
          const start = timepointParts[i].timepoint_seconds || 0;
          const end = timepointParts[i].timepoint_end_seconds;
          if (currentTime >= start && (end === null || end === undefined || currentTime < end)) {
            idx = i;
          } else if (currentTime >= start) {
            idx = i;
          }
        }
        return idx;
      }

      function formatTime(value) {
        if (value === null || value === undefined || value === '') return '--:--';
        const total = Number(value);
        if (!Number.isFinite(total)) return '--:--';
        const mins = Math.floor(total / 60);
        const secs = Math.floor(total % 60);
        return mins + ':' + String(secs).padStart(2, '0');
      }

      function formatSide(entry) {
        if (!entry) return '';
        const start = entry.start_side || 'OS';
        const end = entry.end_side || start;
        return start === end ? start : (start + '→' + end);
      }

      function playRing() {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();
          const gain = ctx.createGain();
          gain.gain.value = 0.18;
          gain.connect(ctx.destination);

          const beep = (start) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 520;
            osc.connect(gain);
            osc.start(start);
            osc.stop(start + 0.12);
          };

          const now = ctx.currentTime;
          beep(now);
          beep(now + 0.32);
          beep(now + 0.64);
          setTimeout(() => ctx.close(), 1200);
        } catch (e) {}
      }

      function playBeep() {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();
          const gain = ctx.createGain();
          gain.gain.value = 0.16;
          gain.connect(ctx.destination);
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = 520;
          osc.connect(gain);
          const now = ctx.currentTime;
          osc.start(now);
          osc.stop(now + 0.12);
          setTimeout(() => ctx.close(), 300);
        } catch (e) {}
      }

      function renderGrid(container, positions, variant) {
        container.innerHTML = '';
        container.style.width = (gridCols * cellSize) + 'px';
        container.style.height = (gridRows * cellSize) + 'px';
        container.style.backgroundSize = cellSize + 'px ' + cellSize + 'px';
        container.style.backgroundImage =
          'linear-gradient(rgba(0,0,0,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.08) 1px, transparent 1px)';

        if (DATA.performance?.stage_orientation === 'bottom') {
          const line = document.createElement('div');
          line.style.position = 'absolute';
          line.style.left = '0';
          line.style.right = '0';
          line.style.bottom = '0';
          line.style.height = '4px';
          line.style.background = '#ef4444';
          container.appendChild(line);
        } else if (DATA.performance?.stage_orientation === 'top') {
          const line = document.createElement('div');
          line.style.position = 'absolute';
          line.style.left = '0';
          line.style.right = '0';
          line.style.top = '0';
          line.style.height = '4px';
          line.style.background = '#ef4444';
          container.appendChild(line);
        }

        (positions || []).forEach((pos) => {
          const el = document.createElement('div');
          el.style.position = 'absolute';
          el.style.left = (pos.x * cellSize) + 'px';
          el.style.top = (pos.y * cellSize) + 'px';
          el.style.width = cellSize + 'px';
          el.style.height = cellSize + 'px';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';

          const bubble = document.createElement('div');
          bubble.className = 'circle';
          bubble.textContent = getInitials(pos.student_name || '');
          el.appendChild(bubble);
          container.appendChild(el);
        });
      }

      function renderMiniGrids(part) {
        if (!currentMiniGrids) return;
        currentMiniGrids.innerHTML = '';
        if (!part) return;
        const subparts = DATA.subpartsByPart?.[part.id] || [];
        const noTimeline = subparts.filter((sub) => sub.timepoint_seconds === null || sub.timepoint_seconds === undefined);
        if (noTimeline.length === 0) return;
        const miniCell = 14;
        const miniWidth = gridCols * miniCell;
        const miniHeight = gridRows * miniCell;
        noTimeline.forEach((sub) => {
          const wrap = document.createElement('div');
          wrap.className = 'mini-card';
          const title = document.createElement('div');
          title.className = 'mini-title';
          title.textContent = sub.title;
          wrap.appendChild(title);

          const grid = document.createElement('div');
          grid.className = 'mini-grid';
          grid.style.width = miniWidth + 'px';
          grid.style.height = miniHeight + 'px';
          grid.style.backgroundSize = miniCell + 'px ' + miniCell + 'px';
          grid.style.backgroundImage =
            'linear-gradient(rgba(0,0,0,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.08) 1px, transparent 1px)';

          const positions = DATA.subpartPositionsBySubpart?.[sub.id] || [];
          positions.forEach((pos) => {
            const el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.left = (pos.x * miniCell) + 'px';
            el.style.top = (pos.y * miniCell) + 'px';
            const bubble = document.createElement('div');
            bubble.className = 'mini-circle';
            bubble.textContent = getInitials(pos.student_name || '');
            el.appendChild(bubble);
            grid.appendChild(el);
          });
          wrap.appendChild(grid);
          currentMiniGrids.appendChild(wrap);
        });
      }

      function renderLegend(currentPositions, nextPositions) {
        if (!legendGrid) return;
        legendGrid.innerHTML = '';
        const filterName = personFilter ? personFilter.value : '';

        const renderSection = (label, positions, dotClass) => {
          const wrap = document.createElement('div');
          wrap.style.marginBottom = '8px';
          const title = document.createElement('div');
          title.textContent = label;
          title.style.fontSize = '11px';
          title.style.fontWeight = '700';
          title.style.textTransform = 'uppercase';
          title.style.letterSpacing = '0.08em';
          title.style.color = dotClass === 'current' ? '#1d4ed8' : '#7e22ce';
          title.style.marginBottom = '6px';
          wrap.appendChild(title);

          const grid = document.createElement('div');
          grid.className = 'legend-grid';
          const seen = new Set();
          (positions || []).forEach((pos) => {
            const name = pos.student_name || 'Unknown';
            if (seen.has(name)) return;
            seen.add(name);
            const item = document.createElement('div');
            item.className = 'legend-item';

            const dot = document.createElement('div');
            dot.className = 'legend-dot';
            dot.style.background = dotClass === 'current' ? '#1d4ed8' : '#7e22ce';
            dot.textContent = getInitials(name);
            item.appendChild(dot);

            const labelEl = document.createElement('div');
            if (filterName && name === filterName) {
              const strong = document.createElement('strong');
              strong.textContent = name;
              strong.className = 'filter-hit';
              labelEl.appendChild(strong);
            } else {
              labelEl.textContent = name;
            }
            item.appendChild(labelEl);
            grid.appendChild(item);
          });

          if ((positions || []).length === 0) {
            const empty = document.createElement('div');
            empty.style.fontSize = '11px';
            empty.style.color = '#64748b';
            empty.textContent = 'No positions';
            grid.appendChild(empty);
          }
          wrap.appendChild(grid);
          return wrap;
        };

        const currentWrap = renderSection('Current Part', currentPositions || [], 'current');
        const nextWrap = renderSection('Next Part', nextPositions || [], 'next');
        legendGrid.appendChild(currentWrap);
        legendGrid.appendChild(nextWrap);

        if (legendWrap) {
          const hasAny = (currentPositions && currentPositions.length) || (nextPositions && nextPositions.length);
          legendWrap.style.display = hasAny ? '' : 'none';
        }
      }

      let flashSubpartId = null;
      let flashUntil = 0;
      function renderTimeline(part, currentTime) {
        if (!timelineTrack || !timelineRange || !timelineCard) return;
        if (!part) {
          timelineCard.style.display = 'none';
          return;
        }
        const subparts = DATA.subpartsByPart?.[part.id] || [];
        if (subparts.length === 0) {
          timelineCard.style.display = 'none';
          return;
        }
        const segments = (subparts || [])
          .map((sub) => {
            const start = typeof sub.timepoint_seconds === 'number' ? sub.timepoint_seconds : Number(sub.timepoint_seconds);
            const end = typeof sub.timepoint_end_seconds === 'number' ? sub.timepoint_end_seconds : Number(sub.timepoint_end_seconds);
            if (!Number.isFinite(start)) return null;
            return { id: sub.id, title: sub.title, start, end: Number.isFinite(end) ? end : start };
          })
          .filter(Boolean);
        if (segments.length === 0) {
          timelineCard.style.display = 'none';
          return;
        }
        const partStart = typeof part.timepoint_seconds === 'number'
          ? part.timepoint_seconds
          : Math.min.apply(null, segments.map((s) => s.start));
        const partEnd = typeof part.timepoint_end_seconds === 'number'
          ? part.timepoint_end_seconds
          : Math.max.apply(null, segments.map((s) => s.end));
        const total = Math.max(1, partEnd - partStart);
        timelineTrack.innerHTML = '';
        const hit = segments.find((seg) => currentTime >= seg.start && currentTime < seg.start + 0.35);
        if (hit && flashSubpartId !== hit.id) {
          flashSubpartId = hit.id;
          flashUntil = currentTime + 0.4;
        }

        segments.forEach((seg, idx) => {
          const left = ((seg.start - partStart) / total) * 100;
          const width = Math.max(2, ((seg.end - seg.start) / total) * 100);
          const block = document.createElement('div');
          const isCurrent = currentTime >= seg.start && currentTime <= seg.end;
          const isFlash = flashSubpartId === seg.id && currentTime <= flashUntil;
          block.className = 'timeline-segment' + (isCurrent ? ' timeline-current' : '') + (isFlash ? ' timeline-flash' : '');
          block.style.left = left + '%';
          block.style.width = width + '%';
          const titleLine = document.createElement('div');
          titleLine.textContent = seg.title;
          const labelLine = document.createElement('div');
          labelLine.textContent = 'Subpart';
          labelLine.style.fontSize = '10px';
          labelLine.style.opacity = '0.9';
          block.appendChild(titleLine);
          block.appendChild(labelLine);
          timelineTrack.appendChild(block);
          if (idx < segments.length - 1) {
            const divider = document.createElement('div');
            divider.className = 'timeline-divider';
            divider.style.left = (left + width) + '%';
            timelineTrack.appendChild(divider);
          }
        });
        const playhead = document.createElement('div');
        playhead.className = 'timeline-playhead';
        const ratio = Math.min(1, Math.max(0, (currentTime - partStart) / total));
        playhead.style.left = (ratio * 100) + '%';
        timelineTrack.appendChild(playhead);
        timelineRange.textContent = formatTime(partStart) + ' - ' + formatTime(partEnd);
        timelineCard.style.display = '';
      }

      const allPeople = (() => {
        const names = new Set();
        Object.values(DATA.positionsByPart || {}).forEach((list) => {
          (list || []).forEach((p) => names.add(p.student_name || 'Unknown'));
        });
        Object.values(DATA.subpartOrderBySubpart || {}).forEach((list) => {
          (list || []).forEach((p) => names.add(p.student_name || 'Unknown'));
        });
        return Array.from(names).sort((a, b) => String(a).localeCompare(String(b)));
      })();

      if (personFilter) {
        allPeople.forEach((name) => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          personFilter.appendChild(opt);
        });
        personFilter.addEventListener('change', updateView);
      }

      let jumpTimer = null;
      function jumpToTime(timeSeconds) {
        if (typeof timeSeconds !== 'number' || !Number.isFinite(timeSeconds)) return;
        if (jumpTimer) {
          clearInterval(jumpTimer);
          jumpTimer = null;
        }
        const countdownSeconds = 5;
        let remaining = countdownSeconds;
        if (jumpOverlay && jumpOverlayCount) {
          jumpOverlay.classList.add('active');
          jumpOverlayCount.textContent = String(remaining);
        }
        playBeep();
        jumpTimer = setInterval(() => {
          remaining -= 1;
          if (jumpOverlayCount) {
            jumpOverlayCount.textContent = String(Math.max(remaining, 0));
          }
          if (remaining > 0) {
            playBeep();
          }
          if (remaining <= 0) {
            clearInterval(jumpTimer);
            jumpTimer = null;
            if (jumpOverlay) jumpOverlay.classList.remove('active');
            audio.currentTime = timeSeconds;
            audio.play().catch(() => {});
          }
        }, 1000);
      }

      function renderPartsList(currentPartId, nextPartId, timeToNext) {
        partsList.innerHTML = '';
        const filterName = personFilter ? personFilter.value : '';
        const partsToShow = filterName
          ? orderedParts.filter((part) => {
              const posNames = (DATA.positionsByPart[part.id] || []).map((p) => p.student_name);
              if (posNames.includes(filterName)) return true;
              const subparts = DATA.subpartsByPart?.[part.id] || [];
              return subparts.some((sub) => (DATA.subpartOrderBySubpart?.[sub.id] || []).map((p) => p.student_name).includes(filterName));
            })
          : orderedParts;

        partsToShow.forEach((part) => {
          const card = document.createElement('div');
          card.className = 'part-card';
          if (part.id === currentPartId) card.classList.add('current');
          if (part.id === nextPartId) card.classList.add('next');

          const name = document.createElement('div');
          name.className = 'part-name';
          name.textContent = part.name;
          card.appendChild(name);

          const time = document.createElement('div');
          time.className = 'part-time';
          time.textContent = typeof part.timepoint_seconds === 'number' ? formatTime(part.timepoint_seconds) : 'No timepoint';
          card.appendChild(time);

          if (typeof part.timepoint_seconds === 'number') {
            const jump = document.createElement('div');
            jump.className = 'jump-link';
            jump.textContent = 'Jump to part';
            jump.addEventListener('click', () => jumpToTime(part.timepoint_seconds));
            card.appendChild(jump);
          }

          if (part.id === nextPartId && timeToNext !== null && timeToNext <= 10) {
            const count = document.createElement('div');
            count.className = 'countdown';
            count.textContent = Math.ceil(timeToNext);
            card.appendChild(count);
          }

          const namesList = (DATA.positionsByPart[part.id] || []).map((p) => p.student_name);
          const names = namesList
            .map((n) => (filterName && n === filterName ? '**' + n + '**' : n))
            .join(', ');
          const list = document.createElement('div');
          list.className = 'part-names';
          list.innerHTML = names
            ? names.replace(/\\*\\*(.*?)\\*\\*/g, '<strong class=\"filter-hit\">$1</strong>')
            : 'No positions';
          card.appendChild(list);

          const subparts = DATA.subpartsByPart?.[part.id] || [];
          if (subparts.length > 0) {
            const subWrap = document.createElement('div');
            subWrap.className = 'subparts';

            const subTitle = document.createElement('div');
            subTitle.className = 'subpart-title';
            subTitle.textContent = 'Subparts';
            subWrap.appendChild(subTitle);

            subparts.forEach((sub, idx) => {
              const row = document.createElement('div');
              row.className = 'subpart-row';
              row.textContent = (idx + 1) + '. ' + sub.title + (sub.mode ? ' (' + sub.mode + ')' : '');
              subWrap.appendChild(row);

              if (sub.description) {
                const meta = document.createElement('div');
                meta.className = 'subpart-meta';
                meta.textContent = 'Notes: ' + sub.description;
                subWrap.appendChild(meta);
              }

              const subNamesList = (DATA.subpartOrderBySubpart?.[sub.id] || []).map((p) => {
                const label = p.student_name + ' (' + formatSide(p) + ')';
                return label;
              });
              const subNames = subNamesList
                .map((n) => (filterName && n.startsWith(filterName) ? '**' + n + '**' : n))
                .join(', ');
              if (subNames) {
                const meta = document.createElement('div');
                meta.className = 'subpart-meta';
                meta.innerHTML = 'Assigned: ' + subNames.replace(/\\*\\*(.*?)\\*\\*/g, '<strong class=\"filter-hit\">$1</strong>');
                subWrap.appendChild(meta);
              }

              const timeStart = sub.timepoint_seconds !== undefined && sub.timepoint_seconds !== null ? formatTime(sub.timepoint_seconds) : '--:--';
              const timeEnd = sub.timepoint_end_seconds !== undefined && sub.timepoint_end_seconds !== null ? formatTime(sub.timepoint_end_seconds) : '--:--';
              const timeMeta = document.createElement('div');
              timeMeta.className = 'subpart-meta';
              timeMeta.textContent = 'Time: ' + timeStart + ' / ' + timeEnd;
              subWrap.appendChild(timeMeta);

              if (typeof sub.timepoint_seconds === 'number') {
                const jump = document.createElement('div');
                jump.className = 'jump-link';
                jump.textContent = 'Jump to ' + sub.title + ' subpart';
                jump.addEventListener('click', () => jumpToTime(sub.timepoint_seconds));
                subWrap.appendChild(jump);
              }
            });

            card.appendChild(subWrap);
          }
          partsList.appendChild(card);
        });
      }

      function renderSummary() {
        if (!summaryParts) return;
        summaryParts.innerHTML = '';
        orderedParts.forEach((part) => {
          const section = document.createElement('div');
          section.className = 'summary-section';

          const header = document.createElement('div');
          header.className = 'summary-header';

          const title = document.createElement('div');
          title.className = 'summary-part';
          title.textContent = part.name;
          header.appendChild(title);

          const time = document.createElement('div');
          time.className = 'summary-time';
          const start = typeof part.timepoint_seconds === 'number' ? formatTime(part.timepoint_seconds) : '--:--';
          const end = typeof part.timepoint_end_seconds === 'number' ? formatTime(part.timepoint_end_seconds) : '--:--';
          time.textContent = 'Time: ' + start + ' / ' + end;
          header.appendChild(time);

          if (part.description) {
            const notes = document.createElement('div');
            notes.className = 'summary-notes';
            notes.textContent = 'Notes: ' + part.description;
            header.appendChild(notes);
          }
          section.appendChild(header);

          const subparts = DATA.subpartsByPart?.[part.id] || [];
          if (subparts.length > 0) {
            const subWrap = document.createElement('div');
            subWrap.className = 'summary-subparts summary-indent-1';
            subparts.forEach((sub, idx) => {
              const row = document.createElement('div');
              row.className = 'summary-subpart';
              row.textContent = (idx + 1) + '. ' + sub.title;
              subWrap.appendChild(row);

              if (sub.description) {
                const subNotes = document.createElement('div');
                subNotes.className = 'summary-notes summary-indent-1';
                subNotes.textContent = 'Notes: ' + sub.description;
                subWrap.appendChild(subNotes);
              }

              const subPeopleSet = new Set();
              (DATA.subpartOrderBySubpart?.[sub.id] || []).forEach((p) => {
                subPeopleSet.add((p.student_name || 'Unknown') + ' (' + formatSide(p) + ')');
              });
              const subPeople = Array.from(subPeopleSet).sort((a, b) => String(a).localeCompare(String(b)));
              const subPeopleLine = document.createElement('div');
              subPeopleLine.className = 'summary-people summary-indent-1';
              subPeopleLine.textContent = subPeople.length > 0 ? 'Assigned: ' + subPeople.join(', ') : 'Assigned: --';
              subWrap.appendChild(subPeopleLine);
            });
            section.appendChild(subWrap);
          }

          const peopleSet = new Set();
          (DATA.positionsByPart[part.id] || []).forEach((p) => peopleSet.add(p.student_name || 'Unknown'));
          subparts.forEach((sub) => {
            (DATA.subpartOrderBySubpart?.[sub.id] || []).forEach((p) => peopleSet.add(p.student_name || 'Unknown'));
          });
          const people = Array.from(peopleSet).sort((a, b) => String(a).localeCompare(String(b)));
          const peopleLine = document.createElement('div');
          peopleLine.className = 'summary-people summary-indent-1';
          peopleLine.textContent = people.length > 0 ? 'People: ' + people.join(', ') : 'People: --';
          section.appendChild(peopleLine);

          summaryParts.appendChild(section);
        });
      }

      function updateView() {
        const currentTime = audio.currentTime || 0;
        const idx = getCurrentIndex(currentTime);
        const currentPart = idx >= 0 ? timepointParts[idx] : null;
        const nextPart = idx >= 0 ? timepointParts[idx + 1] : null;
        const timeToNext = nextPart ? Math.max(0, (nextPart.timepoint_seconds || 0) - currentTime) : null;

        currentName.textContent = currentPart ? currentPart.name : '-';
        nextName.textContent = nextPart ? nextPart.name : '-';

        if (timeToNext !== null && timeToNext <= 10) {
          nextCountdown.textContent = Math.ceil(timeToNext);
          nextReady.textContent = 'GET READY';
        } else {
          nextCountdown.textContent = '';
          nextReady.textContent = '';
        }

        if (ringToggle.checked) {
          if ((prevTimeToNext === null || prevTimeToNext > 10) && timeToNext !== null && timeToNext <= 10) {
            playRing();
          }
        }
        prevTimeToNext = timeToNext;

        renderGrid(currentGrid, currentPart ? DATA.positionsByPart[currentPart.id] || [] : [], 'current');
        renderGrid(nextGrid, nextPart ? DATA.positionsByPart[nextPart.id] || [] : [], 'next');
        renderTimeline(currentPart, currentTime);
        renderMiniGrids(currentPart);
        const currentPositions = currentPart ? DATA.positionsByPart[currentPart.id] || [] : [];
        const nextPositions = nextPart ? DATA.positionsByPart[nextPart.id] || [] : [];
        renderLegend(currentPositions, nextPositions);
        renderPartsList(currentPart ? currentPart.id : null, nextPart ? nextPart.id : null, timeToNext);
      }

      audio.addEventListener('timeupdate', updateView);
      audio.addEventListener('play', updateView);
      audio.addEventListener('seeked', updateView);
      setInterval(updateView, 500);
      renderSummary();
      updateView();
    </script>
  </body>
</html>`;

    const fileName = safeFileName(performance.title || "rehearse-export");
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${fileName}.html\"`,
      },
    });
  } catch (error) {
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message || String(error)
        : String(error);
    console.error("Export rehearse error:", error);
    return NextResponse.json(
      { error: "Failed to export rehearse HTML", details },
      { status: 500 }
    );
  }
}
