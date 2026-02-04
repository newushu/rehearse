(()=>{var a={};a.id=248,a.ids=[248],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},86748:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>C,patchFetch:()=>B,routeModule:()=>x,serverHooks:()=>A,workAsyncStorage:()=>y,workUnitAsyncStorage:()=>z});var d={};c.r(d),c.d(d,{GET:()=>w});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(88908),v=c(10641);async function w(a){try{let b=a.nextUrl.searchParams.get("performanceId");if(!b)return v.NextResponse.json({error:"performanceId query parameter is required"},{status:400});let{data:c,error:d}=await u.N.from("performances").select("id,title,description,date,location,call_time,phone_numbers,stage_orientation,timezone,music_file_path,music_file_name").eq("id",b).single();if(d)return v.NextResponse.json({error:"Failed to fetch performance",details:d.message},{status:500});if(!c)return v.NextResponse.json({error:"Performance not found"},{status:404});let{data:e,error:f}=await u.N.from("performance_contacts").select("id,name,phone,include_in_export").eq("performance_id",b).order("created_at",{ascending:!0});if(f)throw f;let{data:g,error:h}=await u.N.from("parts").select("id,name,description,order,timepoint_seconds,timepoint_end_seconds").eq("performance_id",b);if(h)throw h;let i=(g||[]).map(a=>a.id),j={},k={},l={},m={};if(i.length>0){let{data:a,error:b}=await u.N.from("stage_positions").select(`
          id,
          part_id,
          student_id,
          x,
          y,
          students:student_id (
            id,
            name
          )
        `).in("part_id",i);if(b)throw b;j=(a||[]).reduce((a,b)=>(a[b.part_id]||(a[b.part_id]=[]),a[b.part_id].push({student_id:b.student_id,student_name:b.students?.name||"Unknown",x:b.x,y:b.y}),a),{});let{data:c,error:d}=await u.N.from("subparts").select("id,part_id,title,description,mode,order,timepoint_seconds,timepoint_end_seconds").in("part_id",i).order("order",{ascending:!0});if(d)throw d;k=(c||[]).reduce((a,b)=>(a[b.part_id]||(a[b.part_id]=[]),a[b.part_id].push({id:b.id,title:b.title,description:b.description??null,mode:b.mode??null,timepoint_seconds:b.timepoint_seconds??null,timepoint_end_seconds:b.timepoint_end_seconds??null}),a),{});let e=(c||[]).map(a=>a.id);if(e.length>0){let{data:a,error:b}=await u.N.from("subpart_positions").select(`
            id,
            subpart_id,
            student_id,
            x,
            y,
            students:student_id (
              id,
              name
            )
          `).in("subpart_id",e);if(b)throw b;l=(a||[]).reduce((a,b)=>(a[b.subpart_id]||(a[b.subpart_id]=[]),a[b.subpart_id].push({student_id:b.student_id,student_name:b.students?.name||"Unknown",x:b.x,y:b.y}),a),{});let{data:c,error:d}=await u.N.from("subpart_order").select(`
            id,
            subpart_id,
            student_id,
            "order",
            students:student_id (
              id,
              name
            )
          `).in("subpart_id",e).order("order",{ascending:!0});if(d)throw d;m=(c||[]).reduce((a,b)=>(a[b.subpart_id]||(a[b.subpart_id]=[]),a[b.subpart_id].push({student_id:b.student_id,student_name:b.students?.name||"Unknown"}),a),{})}}let n="https://quqvudqzztlmgrwqudho.supabase.co",o=c.music_file_path||(c.music_file_name?`music/${c.music_file_name}`:""),p=o&&n?`${n}/storage/v1/object/public/performance-music/${o}`:"",q="",r="1"===a.nextUrl.searchParams.get("embedAudio");if(p&&r)try{let a=await fetch(p);if(a.ok){let b=a.headers.get("content-type")||"audio/mpeg",c=await a.arrayBuffer();if(c.byteLength<=0x1900000){let a=Buffer.from(c).toString("base64");q=`data:${b};base64,${a}`}}}catch{}let s={performance:{id:c.id,title:c.title,stage_orientation:c.stage_orientation||"bottom",description:c.description||"",date:c.date||"",location:c.location||"",call_time:c.call_time||"",timezone:c.timezone||"America/New_York",phone_numbers:c.phone_numbers||"",contacts:(e||[]).filter(a=>a.include_in_export)},parts:g||[],positionsByPart:j,subpartsByPart:k,subpartPositionsBySubpart:l,subpartOrderBySubpart:m,musicUrl:p,embeddedAudioDataUrl:q,logoUrl:""};try{let{data:a}=await u.N.from("app_settings").select("logo_file_path").eq("key","global").maybeSingle();if(a?.logo_file_path){let{data:b}=u.N.storage.from("app-assets").getPublicUrl(a.logo_file_path);s.logoUrl=b?.publicUrl||""}}catch{}let t=JSON.stringify(s).replace(/</g,"\\u003c"),w=`<!doctype html>
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
      const DATA = ${t};
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
        audioLink.innerHTML = 'Audio URL: <a href="' + DATA.musicUrl + '" target="_blank">Open audio</a>';
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
            ? names.replace(/\\*\\*(.*?)\\*\\*/g, '<strong class="filter-hit">$1</strong>')
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

              const subNamesList = (DATA.subpartOrderBySubpart?.[sub.id] || []).map((p) => p.student_name);
              const subNames = subNamesList
                .map((n) => (filterName && n === filterName ? '**' + n + '**' : n))
                .join(', ');
              if (subNames) {
                const meta = document.createElement('div');
                meta.className = 'subpart-meta';
                meta.innerHTML = 'Assigned: ' + subNames.replace(/\\*\\*(.*?)\\*\\*/g, '<strong class="filter-hit">$1</strong>');
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
              (DATA.subpartOrderBySubpart?.[sub.id] || []).forEach((p) => subPeopleSet.add(p.student_name || 'Unknown'));
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
</html>`,x=(c.title||"rehearse-export").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"rehearse-export";return new v.NextResponse(w,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":`attachment; filename="${x}.html"`}})}catch(b){let a=b&&"object"==typeof b&&"message"in b&&b.message||String(b);return console.error("Export rehearse error:",b),v.NextResponse.json({error:"Failed to export rehearse HTML",details:a},{status:500})}}let x=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/rehearse-export/route",pathname:"/api/rehearse-export",filename:"route",bundlePath:"app/api/rehearse-export/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\calvi\\Desktop\\PerfTool\\src\\app\\api\\rehearse-export\\route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:y,workUnitAsyncStorage:z,serverHooks:A}=x;function B(){return(0,g.patchFetch)({workAsyncStorage:y,workUnitAsyncStorage:z})}async function C(a,b,c){var d;let e="/api/rehearse-export/route";"/index"===e&&(e="/");let g=await x.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:y,prerenderManifest:z,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(z.dynamicRoutes[E]||z.routes[D]);if(F&&!y){let a=!!z.routes[D],b=z.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||x.isDev||y||(G="/index"===(G=D)?"/":G);let H=!0===x.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:z,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>x.onRequestError(a,b,d,A)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>x.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await x.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})},A),b}},l=await x.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),y&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await x.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},88908:(a,b,c)=>{"use strict";c.d(b,{N:()=>d});let d=(0,c(81742).UU)("https://quqvudqzztlmgrwqudho.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cXZ1ZHF6enRsbWdyd3F1ZGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzQ1NjQsImV4cCI6MjA4NDAxMDU2NH0.NwxDWyz7vQiM1r3SqMn62iLjBJQGEO1-K6qgsP74hYg")},96487:()=>{}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[586,533],()=>b(b.s=86748));module.exports=c})();