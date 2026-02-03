# Supabase Database Setup Guide

## Instructions

1. Go to your Supabase project dashboard
2. Click on the SQL Editor
3. Create a new query and copy-paste the entire contents of `001_initial_schema.sql`
4. Execute the query
5. Your tables are now ready to use

## Tables Created

- **performances** - Main performance events
- **rehearsals** - Scheduled rehearsals for each performance
- **parts** - Parts/choreographies within each performance
- **students** - Student information
- **student_signups** - Track which students signed up for which performances/parts
- **stage_positions** - Track student positioning on stage for each part

## Row Level Security (RLS)

For production, you should enable Row Level Security:

1. Go to Authentication > Policies in Supabase
2. Enable RLS for each table
3. Create appropriate policies for:
   - Public read access for students to browse performances
   - Admin-only write access for managing performances/rehearsals
   - Students can only modify their own signups

Example policy to allow public read:
```sql
CREATE POLICY "Allow public read" ON performances
  FOR SELECT USING (true);
```

Example policy for admin write:
```sql
CREATE POLICY "Allow admin write" ON performances
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```
