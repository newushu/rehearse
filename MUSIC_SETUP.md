# Music Upload Setup Guide

## Required Supabase Configuration

### 1. Create Storage Bucket

To enable music file uploads, you need to create a storage bucket in Supabase:

#### Steps:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Create a new bucket**
5. Enter bucket name: `performance-music`
6. Select **Public** (so files can be downloaded/played)
7. Click **Create bucket**

### 2. Run Database Migration

The app needs new columns in the database to store music file information:

#### Steps:
1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New query**
3. Copy and paste the following SQL:

```sql
-- Add timepoint tracking to parts for rehearse mode
ALTER TABLE parts ADD COLUMN timepoint_seconds DECIMAL(8,2) DEFAULT 0;
ALTER TABLE parts ADD COLUMN timepoint_end_seconds DECIMAL(8,2);

-- Add music file support to performances
ALTER TABLE performances ADD COLUMN music_file_path TEXT;
ALTER TABLE performances ADD COLUMN music_file_name TEXT;
```

4. Click **Run** button
5. You should see "Query executed successfully"

#### Verification:
- Go to **Table Editor**
- Select `parts` table → Check for `timepoint_seconds` and `timepoint_end_seconds` columns
- Select `performances` table → Check for `music_file_path` and `music_file_name` columns

## Testing the Music Feature

### Upload Music:
1. Navigate to Admin Panel → Select a Performance
2. Click **Music & Rehearse** tab
3. Click the upload area and select an MP3 or WAV file
4. Wait for confirmation

### Set Part Timepoints:
1. Go to **Parts/Choreography** tab
2. Click **Edit** on a part
3. Enter a start time (e.g., `45.5` for 45.5 seconds)
4. Optionally set an end time
5. Click **Save**

### View Timeline:
1. Return to **Music & Rehearse** tab
2. See "Part Timepoints" section showing timeline

## Supported Audio Formats

- **MP3** (`.mp3`) - Most compatible
- **WAV** (`.wav`) - High quality
- **OGG** (`.ogg`) - Open format
- **WebM** (`.webm`) - Web audio

**Max file size**: 50 MB

## Troubleshooting

### Upload fails with "Invalid file type"
- Ensure you're uploading an audio file (not video)
- Check file extension is .mp3, .wav, .ogg, or .webm

### Upload fails with "File size exceeds"
- Music file must be under 50 MB
- Try compressing the audio or using a shorter clip for testing

### Music player shows "No music uploaded yet"
- Confirm the file uploaded successfully
- Check Supabase bucket exists and is public
- Verify music_file_name shows in the performances table

### Player loads but music won't play
- Check browser console for CORS errors
- Verify bucket is set to **Public** access
- Try a different browser or incognito mode

## Storage Security (Optional)

If you want authenticated upload only (recommended for production):

1. Go to **Storage** → **Policies** in Supabase
2. Create custom policy for authenticated users:
   ```sql
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'performance-music');
   ```

3. Create policy for public read:
   ```sql
   CREATE POLICY "Allow public read"
   ON storage.objects
   FOR SELECT
   TO public
   USING (bucket_id = 'performance-music');
   ```

---

**Note**: Current implementation doesn't enforce authentication, so bucket should be public for testing.
