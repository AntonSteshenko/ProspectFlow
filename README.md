# ProspectFlow

Self-hosted contact list processing for prospecting purposes.

## Overview

**ProspectFlow** is a minimalist, AI-extensible application for processing business contact lists. Built with Django 5 + DRF backend and React 19 frontend, it provides a solid foundation for importing, normalizing, and managing prospect data.

**Status**: MVP Complete - Full-stack application ready for testing

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Make (optional, but recommended)

### Setup

1. **Clone and navigate to project**
   ```bash
   cd prospecting
   ```

2. **Copy environment file**
   ```bash
   cp .env.example .env
   # Edit .env if needed (defaults work for development)
   ```

3. **Start services**
   ```bash
   make setup
   # OR manually:
   # docker compose build
   # docker compose up -d
   # docker compose exec django python manage.py migrate
   # docker compose exec django python manage.py createsuperuser
   ```

4. **Access the application**
   - Frontend App: http://localhost:5173/
   - Django Admin: http://localhost:8000/admin/
   - API Docs (Swagger): http://localhost:8000/api/docs/
   - API Schema: http://localhost:8000/api/schema/

## Development Commands

The `Makefile` provides convenient commands:

```bash
make help          # Show all available commands
make dev           # Start development environment
make up            # Start all services
make down          # Stop all services
make migrate       # Run migrations
make makemigrations # Create new migrations
make shell         # Open Django shell
make superuser     # Create superuser
make logs          # Show logs for all services
make test          # Run tests (when implemented)
```

## Project Structure

```
prospectflow/
├── backend/
│   ├── config/              # Django settings and configuration
│   │   ├── settings.py      # Main settings
│   │   ├── urls.py          # URL routing
│   │   ├── celery.py        # Celery configuration
│   │   ├── wsgi.py          # WSGI application
│   │   └── asgi.py          # ASGI application
│   ├── apps/
│   │   ├── users/           # User authentication (basic setup)
│   │   └── lists/           # ContactList & Contact models + file upload & parsing
│   ├── services/            # Business logic layer (Step 2+)
│   ├── tasks/               # Celery tasks (Step 2+)
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # React 19 frontend
│   ├── src/
│   │   ├── api/             # API client and endpoints
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/          # Base components (Button, Input, Card, Spinner)
│   │   │   └── layout/      # Layout components (AppLayout)
│   │   ├── features/        # Feature-based modules
│   │   │   ├── auth/        # Authentication (login, register)
│   │   │   └── lists/       # Contact lists (Dashboard, Upload, Contacts, Settings)
│   │   ├── types/           # TypeScript type definitions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── compose.yml              # Development setup
├── Makefile                 # Development commands
├── .env.example             # Environment variables template
└── project/                 # Documentation
    ├── CONCEPT.md           # Vision and principles
    ├── ARCHITECTURE.md      # Architecture documentation
    └── REQUIREMENTS.md      # Detailed requirements (if exists)
```

## Tech Stack

### Backend
- **Framework**: Django 5.1 + Django REST Framework
- **Database**: PostgreSQL 15 with JSONB fields
- **Task Queue**: Celery + Redis
- **API Docs**: drf-spectacular (OpenAPI/Swagger)
- **Authentication**: JWT (djangorestframework-simplejwt)

### Frontend
- **Framework**: React 19 + TypeScript
- **Build**: Vite 7
- **Routing**: React Router v7
- **State**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **CSS**: Tailwind CSS v4.1 (@tailwindcss/vite)
- **File Upload**: react-dropzone

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Development**: Hot-reload enabled for both backend and frontend

## Services

When running `docker compose up`, the following services start:

- **postgres** (port 5432) - PostgreSQL database
- **redis** (port 6379) - Redis for Celery broker
- **django** (port 8000) - Django API server
- **celery** - Celery worker for async tasks
- **frontend** (port 5173) - React + Vite development server

## Development Workflow

### Step 1: Backend Setup ✅ COMPLETE
- [x] Django 5.1 project initialized
- [x] PostgreSQL 15 + Redis configured
- [x] Docker Compose setup
- [x] Two Django apps created: users, lists
- [x] Celery configured
- [x] Basic User model with UUID and email auth
- [x] OpenAPI/Swagger docs enabled (drf-spectacular)

### Step 2: Core Models ✅ COMPLETE
- [x] ContactList model (with JSONB metadata, status, uploaded_file)
- [x] Contact model (with JSONB data field and soft delete)
- [x] Activity model (interaction tracking with type, result, date)
- [x] Contact.status computed property based on latest activity
- [x] GIN indexes on JSONB fields for performance
- [x] Migrations created and applied

### Step 3: API Endpoints ✅ COMPLETE
- [x] Authentication (register, login/JWT, profile)
- [x] ContactList CRUD + file upload/import endpoints
- [x] Contact CRUD + search functionality with pagination
- [x] Activity CRUD with interaction tracking
- [x] Service layer (auth, upload, parser, contact, activity services)
- [x] Object-level permissions (IsOwner, IsContactListOwner, IsActivityOwnerOrReadOnly)
- [x] CSV/XLSX file parsing and preview

### Step 4: React Frontend ✅ COMPLETE
- [x] Vite 7 + React 19 + TypeScript
- [x] TanStack Query + React Router v7
- [x] Tailwind CSS v4.1 with @tailwindcss/vite
- [x] Authentication pages (login, register)
- [x] Dashboard with ContactList cards
- [x] File upload page with preview (react-dropzone)
- [x] ContactsPage with search and pagination
- [x] ListSettingsPage for configurable display
- [x] Simplified import: all CSV columns → JSONB
- [x] User-selectable title field + column visibility options

### Step 5: Enhanced Features ✅ COMPLETE
- [x] Flexible contact sorting with numeric field support
- [x] Field-specific search with dropdown selector
- [x] Smart type detection for sorting (numeric vs string)
- [x] UI improvements and TypeScript fixes

### Step 6: Activity Tracking System ✅ COMPLETE
- [x] Activity model with type (call/email/visit), result (no/followup/lead), date
- [x] Contact status computation (not_contacted/in_working/dropped/converted)
- [x] ActivityEditor component with visual selectors
- [x] Activity timeline on ContactDetailPage
- [x] Status badges on ContactsPage with color coding
- [x] Activity edit history tracking

### Step 7: Final Integration & Testing (Current)
- [ ] End-to-end workflow testing
- [ ] Bug fixes and refinements
- [ ] Production deployment preparation

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

## Environment Variables

Key environment variables (see `.env.example`):

```bash
# Django
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=prospectflow
DB_USER=prospectflow
DB_PASSWORD=prospectflow
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# CORS (for frontend)
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## Architectural Principles

Following the principles defined in `project/CONCEPT.md`:

| Principle | Implementation |
|-----------|----------------|
| **AI-First Documentation** | Comprehensive docstrings, OpenAPI auto-generation |
| **Flexible Schema** | JSONB for contact data - no migrations for new fields |
| **Isolated Services** | Business logic in `/backend/services/` |
| **Convention over Config** | Django + React best practices |
| **Self-Contained** | `docker compose up` and it works |

## Features

### Current Features (MVP Complete)

**Authentication & User Management**
- User registration and login with JWT tokens
- Protected routes and persistent sessions

**Contact List Management**
- Create and manage multiple contact lists
- Upload CSV/XLSX files with automatic parsing
- Preview file contents before import
- All columns stored in flexible JSONB format

**Contact Display & Management**
- Field-specific search with dropdown selector
  - Select field from "Always show" columns
  - Case-insensitive search supporting text, numbers, and symbols
- Flexible sorting with smart type detection
  - Sort by any "Always show" field (ascending/descending)
  - Automatic numeric vs string detection for correct ordering
- Pagination (50 contacts per page)
- Configurable display settings per list
- Choose title field for contact cards
- Per-column visibility: show/hide/show_if_not_null
- Two-column responsive layout

**Activity Tracking & Status Management**
- Track interactions with contacts (calls, emails, visits)
- Record results (no response, follow-up needed, lead converted)
- Optional date field for scheduling follow-ups
- Automatic contact status computation:
  - Not Contacted (gray) - no activities recorded
  - In Working (blue) - latest activity needs follow-up
  - Dropped (red) - no response from contact
  - Converted (green) - contact became a lead
- Activity timeline with edit history
- Status badges on contact cards (color-coded)

**Technical Features**
- PostgreSQL JSONB field-specific queries with ILIKE
- Smart numeric vs string sorting (2 < 10 instead of "10" < "2")
- GIN indexes for fast JSONB queries
- Soft delete for contacts
- Object-level permissions (owner-only access)
- OpenAPI/Swagger documentation

### Workflow

1. **Register/Login** → Create account or sign in
2. **Create List** → New contact list from dashboard
3. **Upload File** → Drop CSV/XLSX, see preview
4. **Auto-Import** → All columns saved to JSONB automatically
5. **Configure Display** → Choose title field and column visibility
6. **Search & Sort** → Select field to search, sort by any column with smart type detection
7. **Browse** → View and paginate through contacts (50 per page)
8. **Track Interactions** → Add activities (call/email/visit) with results
9. **Manage Status** → Contact status updates automatically based on latest activity

## Troubleshooting

### Services won't start
```bash
make down
make clean  # WARNING: removes volumes/data
make build
make setup
```

### Database connection issues
```bash
docker compose logs postgres
# Check if postgres is healthy
docker compose ps
```

### Celery not processing tasks
```bash
docker compose logs celery
# Restart celery
make restart-celery
```

### Port already in use
Edit `.env` and change ports:
```bash
DJANGO_PORT=8001
DB_PORT=5433
```

## Documentation

- **CLAUDE.md** - AI development roadmap (root)
- **project/CONCEPT.md** - Vision, principles, success metrics
- **project/ARCHITECTURE.md** - Complete architecture documentation
- **project/REQUIREMENTS.md** - Detailed MVP requirements (if exists)

## Contributing

This is an AI-first project. When making changes:
1. Update docstrings for all services
2. Keep OpenAPI docs up-to-date
3. Use JSONB for flexible contact fields
4. Isolate business logic in services/
5. Update ARCHITECTURE.md for structural changes

## License

[To be determined]

---

**ProspectFlow** - Built for developers, extensible by AI
