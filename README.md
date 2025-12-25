# ProspectFlow

Self-hosted contact list processing for prospecting purposes.

## Overview

**ProspectFlow** is a minimalist, AI-extensible application for processing business contact lists. Built with Django 5 + DRF backend and React 18 frontend, it provides a solid foundation for importing, normalizing, and managing prospect data.

**Status**: Step 1 Complete - Backend scaffolding and Docker setup ready

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
│   │   ├── lists/           # ContactList & Contact models (Step 2)
│   │   └── processing/      # File upload & parsing (Step 2)
│   ├── services/            # Business logic layer (Step 2+)
│   ├── tasks/               # Celery tasks (Step 2+)
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # React frontend (Step 4)
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

### Frontend (Coming in Step 4)
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **State**: TanStack Query
- **CSS**: Tailwind CSS

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Development**: Hot-reload enabled for both backend and frontend

## Services

When running `docker compose up`, the following services start:

- **postgres** (port 5432) - PostgreSQL database
- **redis** (port 6379) - Redis for Celery broker
- **django** (port 8000) - Django API server
- **celery** - Celery worker for async tasks

## Development Workflow

### Step 1: Backend Setup ✅ COMPLETE
- [x] Django project initialized
- [x] PostgreSQL + Redis configured
- [x] Docker Compose setup
- [x] Three Django apps created: users, lists, processing
- [x] Celery configured
- [x] Basic User model
- [x] OpenAPI/Swagger docs enabled

### Step 2: Core Models (Next)
- [ ] ContactList model (with JSONB metadata)
- [ ] Contact model (with JSONB data field)
- [ ] ColumnMapping model
- [ ] Migrations created and applied

### Step 3: API Endpoints
- [ ] Authentication (register, login, JWT)
- [ ] ContactList CRUD
- [ ] File upload endpoint
- [ ] Contact list/search/filter

### Step 4: React Frontend
- [ ] Initialize Vite + React + TypeScript
- [ ] Authentication pages
- [ ] Dashboard
- [ ] File upload & column mapping UI
- [ ] Contact list view

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

## Next Steps

1. **Implement Core Models (Step 2)**
   ```bash
   # Models will be added to:
   # - backend/apps/users/models.py (enhance User model)
   # - backend/apps/lists/models.py (ContactList, Contact, ColumnMapping)
   ```

2. **Create Database Migrations**
   ```bash
   make makemigrations
   make migrate
   ```

3. **Implement API Endpoints (Step 3)**

4. **Build React Frontend (Step 4)**

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
