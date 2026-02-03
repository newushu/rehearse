# Performance Tool

A comprehensive performance signup and management system built with Next.js, React, and Supabase. Allows admins to create performances, schedule rehearsals, organize parts/choreographies, and position students on stage using an interactive grid. Students can browse performances and sign up for specific parts.

## Features

### Admin Dashboard
- **Performance Management**: Create, view, and delete performances with date, time, location, and description
- **Rehearsal Scheduling**: Schedule multiple rehearsals for each performance with time and location details
- **Parts/Choreography Management**: Create and organize different parts/choreographies for each performance
- **Stage Positioning**: Interactive drag-and-drop grid to position students on stage (10x10 grid with visual feedback)
- **Real-time Updates**: All changes are immediately reflected using Supabase

### Student Signup
- **Browse Performances**: View all available performances with dates, times, and locations
- **Select Parts**: Choose specific parts or sign up for any available position
- **Manage Signups**: View and track all your performance sign-ups
- **Quick Registration**: Fast sign-up process with email and name

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **API**: Next.js API Routes (REST)
- **State Management**: React Hooks (useState, useEffect)

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx                 # Main admin dashboard
│   │   └── performances/
│   │       └── [id]/
│   │           └── page.tsx         # Performance detail & management
│   ├── signup/
│   │   └── page.tsx                 # Student signup page
│   ├── api/
│   │   ├── performances/            # Performance CRUD endpoints
│   │   ├── rehearsals/              # Rehearsal CRUD endpoints
│   │   ├── parts/                   # Parts CRUD endpoints
│   │   ├── stage-positions/         # Stage positioning endpoints
│   │   ├── signups/                 # Student signup endpoints
│   │   └── students/                # Student management endpoints
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Home page
│   └── globals.css                  # Global styles
├── components/
│   ├── PerformanceForm.tsx          # Form to create performances
│   ├── PerformancesList.tsx         # List of performances
│   ├── RehearsalForm.tsx            # Form to schedule rehearsals
│   ├── RehearsalsList.tsx           # List of rehearsals
│   ├── PartForm.tsx                 # Form to add parts
│   ├── PartsList.tsx                # List of parts
│   └── StageGrid.tsx                # Interactive stage positioning grid
├── hooks/
│   ├── usePerformances.ts           # Hook for performance operations
│   ├── useRehearsals.ts             # Hook for rehearsal operations
│   └── useParts.ts                  # Hook for parts operations
├── lib/
│   └── supabase.ts                  # Supabase client configuration
└── types/
    └── index.ts                     # TypeScript type definitions

database/
├── migrations/
│   └── 001_initial_schema.sql       # Database schema
└── DATABASE_SETUP.md                # Setup instructions
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project (free tier available at https://supabase.com)

### Installation

1. **Clone/Extract the project:**
   ```bash
   cd perftool
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Supabase:**
   - Go to https://supabase.com and create a free project
   - Copy your project URL and anonymous key
   - In Supabase dashboard, go to SQL Editor
   - Create a new query and paste the contents of `database/migrations/001_initial_schema.sql`
   - Execute the query to create all tables

4. **Configure environment variables:**
   ```bash
   # Create .env.local file in the root directory
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   You can find these in Supabase:
   - Settings → API → Project URL (copy to NEXT_PUBLIC_SUPABASE_URL)
   - Settings → API → Project API keys → anon public (copy to NEXT_PUBLIC_SUPABASE_ANON_KEY)

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Usage

### Admin Dashboard
1. Go to http://localhost:3000/admin
2. Click "Create New Performance" to add a performance
3. Fill in title, date, time, location, and optional description
4. Once created, click "Manage" to:
   - Schedule rehearsals (Rehearsals tab)
   - Add parts/choreographies (Parts tab)
   - Position students on stage (Part → Position button)

### Stage Positioning
- Each part can have student positions defined
- Click the "Position" button on a part to open the stage grid
- The grid is 10x10 cells representing the stage
- Drag student markers to reposition them
- Positions are automatically saved

### Student Signup
1. Go to http://localhost:3000/signup
2. Click on a performance to view details
3. Enter your name and email
4. Select a specific part or choose "Any Part"
5. Click "Sign Up" to register

## Database Schema

### Tables

- **performances** - Performance events with date, location, description
- **rehearsals** - Scheduled rehearsals linked to performances
- **parts** - Parts/choreographies within performances
- **students** - Student information (name, email)
- **student_signups** - Registration records linking students to performances/parts
- **stage_positions** - Student positioning on stage for each part

## API Endpoints

### Performances
- `GET /api/performances` - List all performances
- `POST /api/performances` - Create performance
- `GET /api/performances/:id` - Get performance details
- `PUT /api/performances/:id` - Update performance
- `DELETE /api/performances/:id` - Delete performance

### Rehearsals
- `GET /api/rehearsals?performanceId=:id` - List rehearsals for performance
- `POST /api/rehearsals` - Create rehearsal
- `PUT /api/rehearsals/:id` - Update rehearsal
- `DELETE /api/rehearsals/:id` - Delete rehearsal

### Parts
- `GET /api/parts?performanceId=:id` - List parts for performance
- `POST /api/parts` - Create part
- `PUT /api/parts/:id` - Update part
- `DELETE /api/parts/:id` - Delete part

### Stage Positions
- `GET /api/stage-positions?partId=:id` - List positions for part
- `POST /api/stage-positions` - Create position
- `PUT /api/stage-positions/:id` - Update position
- `DELETE /api/stage-positions/:id` - Delete position

### Students
- `GET /api/students` - List all students
- `POST /api/students` - Create student
- `GET /api/students/:id` - Get student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Signups
- `GET /api/signups?performanceId=:id&studentId=:id` - Get signups
- `POST /api/signups` - Create signup
- `PUT /api/signups/:id` - Update signup
- `DELETE /api/signups/:id` - Delete signup

## Development

### Build for production
```bash
npm run build
npm start
```

### Run linter
```bash
npm run lint
```

## Security Notes

For production deployment:

1. **Enable Row Level Security (RLS)** in Supabase to restrict data access
2. **Set up authentication** to verify admin access to sensitive operations
3. **Configure CORS** policies appropriately
4. **Use environment variables** for sensitive data (never commit .env.local)
5. **Validate all inputs** on both client and server sides

## Future Enhancements

- User authentication (login/signup for admins and students)
- Email notifications for rehearsal reminders
- Student attendance tracking
- Performance history and analytics
- Multi-language support
- Mobile app version
- Video tutorials for parts
- Costume management
- Props management

## Troubleshooting

### Issue: "Supabase client error"
**Solution**: Check that your `.env.local` file has correct Supabase credentials

### Issue: "Cannot fetch performances"
**Solution**: Ensure database tables are created (run the SQL migration in Supabase)

### Issue: "Stage grid not showing"
**Solution**: Make sure a part is created and the page has loaded the part details

### Issue: Development server won't start
**Solution**: Run `npm install` to ensure all dependencies are installed

## License

MIT

## Support

For issues or questions, please check the database setup guide at `database/DATABASE_SETUP.md`

