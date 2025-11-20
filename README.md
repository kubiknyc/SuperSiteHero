# Construction Management Platform

A comprehensive, offline-first construction field management platform designed specifically for construction superintendents and their teams.

## Overview

This platform consolidates fragmented construction workflows (daily reports, RFIs, change orders, punch lists, safety tracking, etc.) into one unified system optimized for field use with robust offline capabilities.

## Features

### Phase 1 (Current)

- ✅ **User Authentication** - Secure login with role-based access
- ✅ **Multi-tenant Architecture** - Support for multiple construction companies
- ✅ **Project Management** - Organize work by projects
- 🚧 **Daily Reports** - Comprehensive field documentation
- 🚧 **Document Management** - Drawings, specs, submittals with version control
- 🚧 **Workflows** - RFIs, Change Orders, Submittals with custom statuses
- 🚧 **Subcontractor Bidding** - Request and compare bids for CO work
- 🚧 **Task Management** - Day-to-day activity tracking
- 🚧 **Checklists** - Phase-specific quality control
- 🚧 **Punch Lists** - Deficiency tracking by area and trade
- 🚧 **Safety Management** - OSHA-compliant incident tracking, toolbox talks
- 🚧 **Inspections & Permits** - Scheduling and compliance tracking
- 🚧 **Material Tracking** - Receiving and storage management
- 🚧 **Photos** - Progress documentation with GPS metadata
- 🚧 **Takeoff** - Quantity measurements (9 types) with assemblies
- 🚧 **Offline Support** - Work without connectivity, auto-sync when online

*Legend: ✅ Complete | 🚧 Stubbed/In Progress*

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - File storage
  - Real-time subscriptions
  - Row-level security

### Offline & PWA
- **Vite PWA Plugin** - Progressive Web App capabilities
- **Service Workers** - Offline caching
- **IndexedDB** - Local data storage

## Prerequisites

- **Node.js** 18+ and npm
- **Supabase Account** - Create at https://supabase.com
- **Git** - Version control

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd daily-reports
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at https://supabase.com
2. Run the database migrations from `./migrations/` folder
   - Follow instructions in `./migrations/README.md`
3. Set up Storage buckets:
   - documents
   - photos
   - drawings
   - reports

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Start Development Server

```bash
npm run dev
```

The app will open at http://localhost:5173

## Project Structure

```
daily-reports/
├── migrations/              # Database migration SQL files
│   ├── 001_initial_setup.sql
│   ├── 002_core_tables.sql
│   └── ...
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── layout/         # Layout components (AppLayout, etc.)
│   │   └── ...
│   ├── features/           # Feature-specific modules
│   │   ├── daily-reports/  # Daily reports feature
│   │   ├── workflows/      # RFIs, COs, Submittals
│   │   ├── tasks/          # Task management
│   │   ├── punch-lists/    # Punch list feature
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and libraries
│   │   ├── auth/          # Authentication context
│   │   └── supabase.ts    # Supabase client
│   ├── pages/              # Page components
│   │   ├── auth/          # Login, signup pages
│   │   ├── projects/      # Project pages
│   │   ├── daily-reports/ # Daily reports pages
│   │   └── ...
│   ├── types/              # TypeScript type definitions
│   │   └── database.ts    # Database types
│   ├── App.tsx             # Main app component with routing
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
├── tailwind.config.js      # Tailwind CSS config
└── README.md               # This file
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Type Checking & Linting
npm run type-check       # Check TypeScript types
npm run lint            # Run ESLint
```

## Development Workflow

### Adding a New Feature

1. **Create feature directory** in `src/features/`
2. **Add hooks** for data fetching in `features/<feature>/hooks/`
3. **Create components** in `features/<feature>/components/`
4. **Add pages** in `src/pages/<feature>/`
5. **Update routing** in `src/App.tsx`
6. **Add navigation** links in `src/components/layout/AppLayout.tsx`

### Database Changes

1. Create new migration file in `migrations/`
2. Run migration in Supabase SQL Editor
3. Update TypeScript types in `src/types/database.ts`
4. Create corresponding React Query hooks

## Database

The database schema includes 42 tables covering:

- **Core**: companies, users, projects, contacts, subcontractors
- **Documents**: folders, documents, document_markups
- **Daily Reports**: daily_reports, workforce, equipment, deliveries, visitors
- **Workflows**: workflow_types, workflow_items, comments, history, change_order_bids
- **Tasks & Schedule**: tasks, schedule_items
- **Checklists**: checklist_templates, checklists
- **Punch Lists**: punch_items
- **Safety**: safety_incidents, toolbox_talks
- **Compliance**: inspections, permits, tests
- **And more...**

See `database-schema.md` for complete documentation.

## Authentication & Permissions

### User Roles

- **Superintendent** - Full access, assigned projects only
- **Project Manager** - Full access, assigned projects only
- **Office Admin** - Documentation and data entry
- **Field Employee** - Photo upload, notes, task updates
- **Subcontractor** - View only their scope and items
- **Architect** - Review and respond to submittals, RFIs

### Row-Level Security

All data is protected by Supabase Row-Level Security (RLS) policies that ensure:
- Users only see data from their company
- Users only access projects they're assigned to
- External users (subs, architects) see only relevant data

## Offline Functionality

### How It Works

1. **Service Workers** cache app shell and assets
2. **IndexedDB** stores project data for offline access
3. **User controls** what to download (selective sync)
4. **Auto-sync** when connection is restored
5. **Conflict resolution** for simultaneous edits

### Offline Indicator

The app displays online/offline status in the header.

## Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## Deployment

### Production Build

```bash
npm run build
```

Output will be in `dist/` folder.

### Deployment Options

- **Vercel** (Recommended) - Zero-config deployment for Vite apps
- **Netlify** - Alternative with similar ease
- **Self-hosted** - Deploy `dist/` folder to any static host

### Environment Variables

Set these in your deployment platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_ENV=production`

## Roadmap

### Phase 2 (Future)
- Time & resource management
- Budget & cost tracking
- Advanced analytics
- Enhanced scheduling
- Owner/stakeholder portal
- AI-powered features

See `masterplan.md` for complete feature roadmap.

## Documentation

- **Master Plan**: `masterplan.md` - Complete feature specifications
- **Database Schema**: `database-schema.md` - Detailed schema documentation
- **Migrations**: `migrations/README.md` - Database setup guide
- **Tech Planning**: Technical architecture and decisions

## Support

For issues, questions, or contributions:
- Review documentation files
- Check Supabase docs: https://supabase.com/docs
- Review React Query docs: https://tanstack.com/query

## License

[Your License Here]

---

**Version**: 0.1.0 (Phase 1 - In Development)
**Last Updated**: 2025-01-19
