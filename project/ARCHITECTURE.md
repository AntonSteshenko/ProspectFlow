# ProspectFlow - Architecture Documentation

## System Overview

ProspectFlow is a self-hosted contact list processing application built with a modern, AI-extensible architecture.

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/REST
┌───────────────────────▼─────────────────────────────────┐
│              Frontend (React + Vite)                     │
│              - TypeScript                                │
│              - TanStack Query                            │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────────┐
│         Backend (Django 5 + DRF)                         │
│         ┌─────────────────────────────────┐             │
│         │  API Layer (ViewSets)           │             │
│         └──────────┬──────────────────────┘             │
│         ┌──────────▼──────────────────────┐             │
│         │  Service Layer                  │             │
│         │  (Business Logic)               │             │
│         └──────────┬──────────────────────┘             │
│         ┌──────────▼──────────────────────┐             │
│         │  Models (ORM)                   │             │
│         └──────────┬──────────────────────┘             │
└────────────────────┼─────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌───▼────┐ ┌───▼─────┐
    │PostgreSQL│ │ Redis  │ │ Celery  │
    │  (Data)  │ │(Queue) │ │(Workers)│
    └──────────┘ └────────┘ └─────────┘
```

## Core Components

### Backend: Django 5 + Django REST Framework
- **Language**: Python 3.12+
- **Framework**: Django 5.x for ORM, auth, admin
- **API**: Django REST Framework (DRF) for RESTful endpoints
- **API Docs**: drf-spectacular for OpenAPI/Swagger generation
- **Task Queue**: Celery for async file processing

### Frontend: React 18 + Vite
- **Language**: TypeScript 5+
- **Build Tool**: Vite 5+ for fast dev server and optimized builds
- **State Management**: TanStack Query (React Query) for server state
- **CSS**: Tailwind CSS for utility-first styling

### Database: PostgreSQL 15+
- **Primary Storage**: Contact lists and user data
- **JSONB Fields**: Flexible schema for contact data (no migrations needed)
- **Indexes**: GIN indexes on JSONB for fast queries

### Task Queue: Celery + Redis
- **Message Broker**: Redis 7.x
- **Workers**: Celery 5.x for async file processing
- **Use Cases**: CSV/XLSX parsing for files > 100 rows

### Infrastructure: Docker Compose
- **Services**: django, postgres, redis, frontend (dev mode)
- **Networking**: Internal docker network
- **Volumes**: Postgres data persistence, uploaded files
- **Command**: `docker-compose up` - single command startup

## Architectural Principles

Following the principles defined in CONCEPT.md:

| Principle | Implementation |
|-----------|----------------|
| **AI-First Documentation** | Comprehensive docstrings, OpenAPI auto-generation, updated ARCHITECTURE.md |
| **Flexible Schema** | JSONB for contact data - add fields without migrations |
| **Isolated Services** | Business logic in `/backend/services/` - testable, replaceable |
| **Convention over Config** | Predictable structure, consistent naming (Django + React best practices) |
| **Self-Contained** | `docker-compose up` starts everything - no external dependencies |

## Project Structure

```
prospectflow/
├── backend/
│   ├── config/              # Django settings (dev, prod)
│   ├── apps/
│   │   ├── users/           # User model, auth endpoints
│   │   ├── lists/           # ContactList, Contact models
│   │   └── processing/      # File upload, parsing logic
│   ├── services/            # Business logic layer (isolated)
│   │   ├── auth_service.py
│   │   ├── upload_service.py
│   │   ├── parser_service.py
│   │   └── contact_service.py
│   ├── tasks/               # Celery tasks
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── features/        # Feature-based organization
│       │   ├── auth/
│       │   ├── lists/
│       │   └── contacts/
│       ├── api/             # API client, TanStack Query hooks
│       ├── components/      # Shared UI components
│       ├── App.tsx
│       └── main.tsx
├── docker-compose.yml       # Development setup
├── CLAUDE.md                # AI development roadmap
└── project/
    ├── CONCEPT.md           # Vision and principles
    ├── ARCHITECTURE.md      # This file
    └── REQUIREMENTS.md      # Detailed requirements (if exists)
```

## Data Model

### Core Entities

#### User
```python
- id: UUID (PK)
- email: String (unique, indexed)
- password: String (hashed with bcrypt)
- first_name: String
- last_name: String
- created_at: DateTime
- is_active: Boolean
```

#### ContactList
```python
- id: UUID (PK)
- name: String
- owner: FK(User) - object-level ownership
- status: Enum [processing, completed, failed]
- metadata: JSONB - flexible data for future extensions
- created_at: DateTime
- updated_at: DateTime
```

#### Contact
```python
- id: UUID (PK)
- list: FK(ContactList)
- data: JSONB - ALL contact fields stored here
  {
    "first_name": "...",
    "last_name": "...",
    "email": "...",
    "company": "...",
    "phone": "...",
    "custom_field_1": "...",
    ...
  }
- created_at: DateTime
- updated_at: DateTime
- is_deleted: Boolean (soft delete)
```

#### ColumnMapping
```python
- id: UUID (PK)
- list: FK(ContactList)
- original_column: String (e.g., "Nome Azienda")
- mapped_field: String (e.g., "company")
- created_at: DateTime
```

### Why JSONB?

Contact data is highly variable - every business has different column structures. JSONB allows:
- **No migrations** when adding new fields
- **Flexible schema** that adapts to any CSV structure
- **Fast queries** with GIN indexes
- **Easy AI extension** - agents can add fields programmatically

## API Design

### RESTful Endpoints

```
Authentication:
POST   /api/auth/register       - Create new user
POST   /api/auth/login          - Get JWT token
POST   /api/auth/logout         - Invalidate token

Contact Lists:
GET    /api/lists/              - List user's contact lists
POST   /api/lists/              - Create new contact list
GET    /api/lists/{id}/         - Get list details
PATCH  /api/lists/{id}/         - Update list (rename)
DELETE /api/lists/{id}/         - Delete list
POST   /api/lists/{id}/upload/  - Upload CSV/XLSX file

Contacts:
GET    /api/lists/{id}/contacts/     - Paginated contacts (50/page)
GET    /api/lists/{id}/contacts/?search=...  - Search contacts
GET    /api/contacts/{id}/           - Contact details
PATCH  /api/contacts/{id}/           - Update contact data
DELETE /api/contacts/{id}/           - Soft delete contact

Column Mapping:
GET    /api/lists/{id}/mappings/     - Get column mappings
POST   /api/lists/{id}/mappings/     - Save column mapping config

Documentation:
GET    /api/docs/               - Swagger UI (drf-spectacular)
GET    /api/schema/             - OpenAPI schema JSON
```

### API Principles

- **Authentication**: JWT tokens (24h expiration)
- **Permissions**: Object-level - users can only access their own ContactLists
- **Pagination**: Cursor-based for large datasets
- **Filtering**: Query params for search, status, date ranges
- **Documentation**: Auto-generated OpenAPI via drf-spectacular

## File Processing Flow

```
1. Upload
   ├─> User uploads CSV/XLSX via POST /api/lists/{id}/upload/
   ├─> File validated (format, size < 10MB)
   └─> File saved to temporary storage

2. Preview & Mapping
   ├─> Parse first 5 rows for preview
   ├─> Return column headers to frontend
   ├─> User maps columns via UI
   └─> POST /api/lists/{id}/mappings/ saves configuration

3. Processing
   ├─> If rows < 100: Sync processing
   ├─> If rows >= 100: Celery task (async)
   ├─> Apply column mappings
   ├─> Validate data (email format, required fields)
   ├─> Store in Contact.data (JSONB)
   └─> Update ContactList.status = 'completed'

4. Storage
   ├─> Each row → Contact record
   ├─> Mapped fields + unmapped fields in JSONB
   └─> ColumnMapping stored for reuse
```

## Authentication & Authorization

### Authentication
- **Method**: JWT (JSON Web Tokens)
- **Library**: djangorestframework-simplejwt
- **Token Lifetime**: Access 24h, Refresh 7 days
- **Password Hashing**: bcrypt (cost factor 12)

### Authorization (Object-Level Permissions)
- **Model**: Each ContactList has `owner` FK to User
- **Enforcement**: Custom DRF permission class `IsOwner`
- **Rule**: Users can only CRUD their own ContactLists and Contacts

```python
# Example permission check
class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user
```

## Service Layer Pattern

Business logic is isolated in `/backend/services/` for:
- **Testability**: Services are pure functions, easy to unit test
- **Reusability**: Same service used by API, Celery tasks, admin
- **AI-Extensibility**: Clear, documented service classes for AI to modify

### Example Service

```python
# services/upload_service.py
class UploadService:
    """
    Handles file upload and parsing logic.

    Methods:
        validate_file(file) -> bool
        parse_preview(file) -> List[Dict]
        process_file(file, mappings) -> ContactList
    """

    def parse_preview(self, file: UploadedFile) -> List[Dict]:
        """Parse first 5 rows of CSV/XLSX for column preview."""
        # Implementation...
```

## Docker Setup

### Services

```yaml
services:
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: prospectflow
      POSTGRES_USER: ...
      POSTGRES_PASSWORD: ...

  redis:
    image: redis:7-alpine

  django:
    build: ./backend
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379
    volumes:
      - ./backend:/app
      - media_files:/app/media

  celery:
    build: ./backend
    command: celery -A config worker
    depends_on:
      - redis
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
```

### Startup

```bash
docker-compose up
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/api/docs/
```

## Technology Decisions

### Why Django?
- Mature ORM with excellent PostgreSQL support (JSONB)
- Built-in admin interface for debugging
- Strong ecosystem (DRF, Celery, drf-spectacular)
- Convention-driven, predictable structure

### Why React + Vite?
- Fast dev experience (Vite HMR)
- TypeScript for type safety
- Mature ecosystem (TanStack Query for server state)
- Easy to extend with UI component libraries

### Why PostgreSQL?
- JSONB support for flexible schema
- GIN indexes for fast JSONB queries
- ACID compliance for data integrity
- Excellent Django ORM support

### Why Celery?
- De-facto standard for async tasks in Django
- Reliable for long-running file processing
- Supports retries, error handling, monitoring

### Why Docker Compose?
- Single-command setup (`docker-compose up`)
- Consistent dev environment across machines
- Easy to extend for production (add Traefik, backups)
- Self-contained, no external dependencies

## Extension Points for AI

The architecture is designed for easy AI-driven extensions:

1. **Add New Contact Field**
   - Store in JSONB `data` field - no migration needed
   - Update frontend form - add input field
   - Optional: Add to Pydantic schema for validation

2. **Add New Endpoint**
   - Create service method in `/services/`
   - Add ViewSet method in `/apps/*/views.py`
   - OpenAPI docs auto-update

3. **Add Data Enrichment**
   - Create enrichment service (e.g., `LinkedInEnrichmentService`)
   - Add Celery task for async enrichment
   - Store enriched data in JSONB field

4. **Add Export Format**
   - Create export service method (e.g., `export_to_json()`)
   - Add endpoint `GET /api/lists/{id}/export/?format=json`
   - Return file response

## Performance Considerations

- **Pagination**: 50 contacts per page (cursor-based for large lists)
- **Indexing**: GIN indexes on JSONB fields for search
- **Caching**: Redis caching for frequently accessed lists
- **Async Processing**: Celery for files > 100 rows
- **Query Optimization**: `select_related()` / `prefetch_related()` for FK queries

## Security Considerations

- **SQL Injection**: Django ORM parameterized queries
- **XSS**: React auto-escapes output
- **CSRF**: Django CSRF tokens (disabled for API, JWT instead)
- **Password Storage**: bcrypt hashing (cost 12)
- **Object-Level Permissions**: Enforce owner checks on all endpoints
- **Input Validation**: Pydantic schemas + DRF serializers
- **File Upload**: Size limits (10MB), format validation, virus scanning (future)

## Future Architecture Considerations

**Phase 2+** (Post-MVP):
- Traefik reverse proxy for HTTPS (Let's Encrypt)
- Horizontal scaling (multiple Django workers)
- Separate Celery workers for different task types
- S3-compatible storage for uploaded files
- Read replicas for PostgreSQL (heavy read workloads)
- API rate limiting (django-ratelimit)

---

**Version**: 1.0
**Last Updated**: 2025-12-22
**Status**: Initial Design (Pre-Implementation)
