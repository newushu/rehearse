# Music & Rehearse Mode Implementation - Progress Report

## ✅ Completed Features

### 1. **Student Positioning View** (`StudentPositioningView.tsx`)
- **Purpose**: Students can now view their exact positioning on the stage grid for each part
- **Features**:
  - Full-screen grid display showing student's position with initials
  - Parts list sidebar to navigate through all parts
  - Previous/Next buttons for easy navigation
  - Shows grid coordinates (x, y)
  - Visual status: "✓ You are positioned" or "Not positioned in this part"
  - Displays positioned and unpositioned parts clearly
  - Responsive design (sidebar on left on desktop, responsive on mobile)

### 2. **Student Signup Integration** (`signup/page.tsx`)
- Added "View Positioning Grid →" button in signup cards
- Shows full positioning grid in a modal-like view
- Students can switch between summary and detailed grid view
- Back button to return to signups list

### 3. **Music Player Component** (`MusicPlayer.tsx`)
- **Features**:
  - Play/Pause controls
  - Volume slider (0-100%)
  - Timeline with current time/duration display
  - Seek functionality
  - Responsive audio player styling
  - State tracking: isPlaying, currentTime, duration
  - Callback for external components to track time (`onTimeUpdate`)
  - Visual progress bar

### 4. **Music Upload Component** (`MusicUpload.tsx`)
- **Features**:
  - Drag-and-drop upload UI
  - File type validation (MP3, WAV, OGG, WebM)
  - File size validation (max 50MB)
  - Success/error messaging
  - Shows uploaded filename
  - Loading state during upload
  - Integration with Supabase Storage bucket

### 5. **Music Upload API Endpoint** (`/api/performances/[id]/upload-music`)
- **Functionality**:
  - Handles multipart form data (file upload)
  - Validates file type and size server-side
  - Uploads to Supabase Storage bucket: `performance-music`
  - Stores metadata in performances table:
    - `music_file_path`: Storage path for file management
    - `music_file_name`: Original filename display
  - Returns public URL for playback
  - Proper error handling with descriptive messages

### 6. **Database Migrations** (`003_add_music_and_timepoints.sql`)
Added columns to support music and rehearse features:
- **parts table**:
  - `timepoint_seconds` (DECIMAL): When part appears in music (in seconds)
  - `timepoint_end_seconds` (DECIMAL): When part ends (optional)
- **performances table**:
  - `music_file_path` (TEXT): Path to music in Supabase Storage
  - `music_file_name` (TEXT): Original filename for display

### 7. **Parts Timepoint Editor** (`PartsList.tsx`)
- **Enhanced Edit Form**:
  - Input field for "Start Time (seconds)" - when part appears in music
  - Input field for "End Time (seconds)" - optional duration end
  - Displays timepoint info when not editing:
    - Shows "Music Timepoint: 45.5 seconds" format
    - Shows range if end time is set
  - API integration saves timepoints to database
  - Numeric inputs with step support (0.1s precision)

### 8. **Parts API Update** (`/api/parts/[id]`)
- **PUT endpoint enhanced** to support timepoint fields:
  - `timepoint_seconds`: Start time in music
  - `timepoint_end_seconds`: End time (optional)
  - Dynamically builds update object to only send provided fields
  - Maintains compatibility with existing fields (name, description, order)

### 9. **Performance Detail - Music Tab** (`admin/performances/[id]/page.tsx`)
- **New "Music & Rehearse" Tab** with sections:
  - **Music Upload Area**: Upload music file for performance
  - **Music Player Preview**: Play and test uploaded music
  - **Rehearse Mode Section**: 
    - "Start Rehearse Mode" button (disabled until music + parts ready)
    - Status indicators showing what's missing/ready
  - **Part Timepoints Section**:
    - Shows timeline of all parts with their timepoints
    - Quick reference for music synchronization
    - Visual status of timepoints (set/unset)

## 📋 Auto-Save Status (Previous Implementation)
- ✅ Auto-save positions every 6 seconds
- ✅ Visual feedback ("✓ Auto-saving..." / "⏱ Unsaved changes")
- ✅ Auto-saves stage orientation at performance level
- ✅ useRef-based tracking (no unnecessary re-renders)
- ✅ Proper cleanup on component unmount

## 🚀 Next Steps (Not Yet Implemented)

### Phase 1 - Rehearse Mode Layout
- [ ] Create full-screen rehearse interface
  - Main grid (current part) - center, full size
  - Next part preview - right side, smaller
  - Parts list with timeline - left side
- [ ] Grid auto-transition logic based on music timepoint
- [ ] "Next part in X seconds" notification system
- [ ] Customizable pre-notification timing (seconds before part starts)

### Phase 2 - Rehearse Controls
- [ ] Part selection checkboxes (choose which parts to rehearse)
- [ ] Start/end timepoint controls for music playback
- [ ] Speed adjustment for music
- [ ] Sync music playback with grid transitions

### Phase 3 - Student View Enhancements
- [ ] Full-screen rehearse view for students
- [ ] Solo rehearsal mode (practice their positions)
- [ ] Timing feedback (how far in advance next part appears)

## 🗂️ File Structure
```
src/
  ├── components/
  │   ├── StudentPositioningView.tsx      [NEW] Student grid view
  │   ├── MusicPlayer.tsx                  [NEW] Audio player
  │   ├── MusicUpload.tsx                  [NEW] File upload form
  │   ├── PartsList.tsx                    [UPDATED] Timepoint editor
  │   └── PositioningPanel.tsx             [Existing] Auto-save integrated
  ├── app/
  │   ├── signup/page.tsx                  [UPDATED] Grid view integration
  │   ├── admin/performances/[id]/page.tsx [UPDATED] Music tab + components
  │   └── api/
  │       ├── performances/[id]/upload-music/route.ts [NEW] Upload endpoint
  │       └── parts/[id]/route.ts          [UPDATED] Timepoint support
  └── database/
      └── migrations/
          └── 003_add_music_and_timepoints.sql [NEW] Schema updates

```

## 🔧 Configuration Notes

### Supabase Bucket Setup Required
The app expects a Supabase Storage bucket named `performance-music`:
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `performance-music`
3. Set access level to "Public" for file downloads
4. (Optional) Set up policies for authenticated uploads if needed

### Environment Variables
Ensure `.env.local` contains:
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Database Migrations
Must run migration `003_add_music_and_timepoints.sql` in Supabase:
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Paste contents of migration file
4. Run query
5. Verify columns added to `parts` and `performances` tables

## 💡 Usage Guide

### For Admin/Choreographer:
1. **Upload Music**:
   - Go to Performance → "Music & Rehearse" tab
   - Click upload area to select music file
   - Wait for upload confirmation

2. **Set Part Timepoints**:
   - Go to "Parts/Choreography" tab
   - Click "Edit" on each part
   - Enter "Start Time (seconds)" when part appears in music
   - Optionally set "End Time (seconds)"
   - Click "Save"

3. **Preview**:
   - Music tab shows timeline of all parts with timepoints
   - Player allows testing music timing

### For Students:
1. **View Positioning**:
   - Go to "My Sign-ups" tab
   - Click "View Positioning Grid →" button
   - Use Previous/Next to navigate parts
   - See exact grid coordinates

2. **Rehearse Mode** (when ready):
   - Will be able to start full-screen rehearsal
   - Watch grid transition with music
   - See positions for each part in sequence

## 🐛 Known Issues
- Rehearse mode "Start" button exists but functionality not yet implemented
- Students cannot yet see stage positions while playing music
- No validation that timepoints are sequential or non-overlapping

## 📊 Component Communication Flow
```
Admin Performance Page
├── Music Upload Component
│   └── → POST /api/performances/[id]/upload-music
│       └── → Supabase Storage bucket
│           └── Returns public URL
├── Music Player
│   ├── Receives music URL
│   └── Emits onTimeUpdate callback with current time
├── Music Tab Content
│   ├── Shows upload status
│   ├── Displays player
│   └── Lists part timepoints

Student Signup Page
├── MySignups Component
│   └── SignupCard
│       ├── Shows position summary
│       └── Link to StudentPositioningView
└── StudentPositioningView [NEW]
    ├── Fetches all parts for performance
    ├── Displays selected part grid
    └── Shows student's position/initials
```

## 🎯 Testing Recommendations
1. Upload a test music file (MP3 format recommended)
2. Set timepoints on parts (e.g., Part 1: 0s, Part 2: 30s, Part 3: 60s)
3. Test music player playback and timeline seeking
4. Verify students can view their positioning grid
5. Check database: confirm music_file_path and timepoint columns populated

---

**Status**: Features complete and integrated. Rehearse mode interface still needs implementation.
**Next Session**: Build rehearse mode layout and grid transition logic.
