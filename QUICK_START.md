# Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Get Supabase Credentials
1. Go to https://supabase.com
2. Sign in or create a free account
3. Create a new project
4. Copy your Project URL and Anon Key from Settings → API

### Step 2: Set Up Database
1. In your Supabase project, go to SQL Editor
2. Create a new query
3. Copy and paste the entire contents of `database/migrations/001_initial_schema.sql`
4. Click "Run" to create all tables

### Step 3: Configure Environment
1. Create a file named `.env.local` in the project root directory (same level as `package.json`)
2. Add these two lines:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_from_step1
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_step1
```
3. Save the file

### Step 4: Run the Application
```bash
npm install  # if not already done
npm run dev
```

The application will start at http://localhost:3000

## 📱 Using the Application

### For Admins:
1. Go to http://localhost:3000/admin
2. Click "+ Create New Performance"
3. Fill in the form and submit
4. Click "Manage" on a performance to:
   - Add rehearsals
   - Create parts/choreographies
   - Position students on stage

### For Students:
1. Go to http://localhost:3000/signup
2. Select a performance
3. Enter your name and email
4. Choose a part (or any part)
5. Click "Sign Up"

## 🆘 Common Issues

**Q: I see a blank page**
- Check your browser console for errors (Press F12)
- Verify `.env.local` file exists with correct Supabase credentials
- Make sure the development server is running

**Q: "Failed to fetch performances"**
- Check that your Supabase database tables are created (run the SQL migration)
- Verify your Supabase credentials are correct in `.env.local`

**Q: Can't connect to Supabase**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Check Supabase project is active (not paused)
- Make sure you're using the correct keys (not service role key)

## 📚 Next Steps

1. Read the full [README.md](./README.md) for complete documentation
2. Check [DATABASE_SETUP.md](./database/DATABASE_SETUP.md) for database configuration
3. Explore the admin dashboard and student signup features
4. Customize colors and styling in `tailwind.config.ts`

## 💡 Tips

- The stage grid uses a 10x10 cell layout
- Each performance can have multiple rehearsals and parts
- Students can sign up for specific parts or any available position
- All data is saved in real-time to Supabase

Happy performing! 🎭🎪
