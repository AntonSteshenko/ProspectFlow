# CLAUDE.md - AI Development Roadmap

## BASE RULES
- **Always start in plan mode** - Present plan, get approval, then execute
- **Renew CLAUDE.md** - Update this file after significant progress
- **Keep it concise** - This is a roadmap, not detailed specs
- **Details in project/** - All comprehensive docs go in `project/` folder
- **Befor commit CLAUDE.md** - renew it

## PROJECT DOCUMENTATION

| Document | Purpose |
|----------|---------|
| `project/CONCEPT.md` | Vision, principles, target users, success metrics |
| `project/ARCHITECTURE.md` | System architecture, tech stack, data models, API design |
| `project/REQUIREMENTS.md` | MVP requirements, user stories (if exists) |

## PROJECT STATUS

**Phase**: MVP Complete - Activity Tracking System Implemented
**Last Updated**: 2025-12-27

### Completed
- ✅ CONCEPT.md created - Vision and architectural principles defined
- ✅ ARCHITECTURE.md created - Comprehensive architecture documentation
- ✅ Project structure defined

- ✅ **Step 1: Django Backend Setup Complete**
  - ✅ Django 5 project initialized
  - ✅ PostgreSQL + Redis configured in docker-compose.yml
  - ✅ Apps created: users, lists
  - ✅ Celery configured for async tasks
  - ✅ Basic User model with UUID and email auth
  - ✅ Dockerfile and docker-compose.yml ready
  - ✅ Makefile with dev commands
  - ✅ OpenAPI/Swagger docs enabled

- ✅ **Step 2: Core Models Implemented**
  - ✅ ContactList model with JSONB metadata and status field
  - ✅ Contact model with JSONB data field and soft delete
  - ✅ Activity model for interaction tracking (type, result, date)
  - ✅ Contact.status computed property based on latest activity
  - ✅ GIN indexes on JSONB fields for performance
  - ✅ Admin interfaces for all models
  - ✅ Migrations created and applied
  - ✅ django.contrib.postgres enabled

- ✅ **Step 3: API Endpoints Complete**
  - ✅ Authentication (register, login/JWT, profile)
  - ✅ ContactList CRUD + file upload/process endpoints
  - ✅ Contact CRUD + search functionality
  - ✅ Activity CRUD with interaction tracking
  - ✅ Service layer (auth, upload, parser, contact, activity services)
  - ✅ Object-level permissions (IsOwner, IsContactListOwner, IsActivityOwnerOrReadOnly)
  - ✅ File handling (CSV/XLSX preview and parsing)
  - ✅ Full OpenAPI/Swagger documentation
  - ✅ Nested routes for list-specific resources

- ✅ **Step 4: React Frontend Complete**
  - ✅ Vite 7 + React 19 + TypeScript initialized
  - ✅ Tailwind CSS v4.1 configured with @tailwindcss/vite
  - ✅ TanStack Query + React Router v7 setup
  - ✅ API client with JWT interceptors
  - ✅ Auth pages (login, register) with React Hook Form + Zod
  - ✅ Dashboard with ContactList cards and actions (Upload, View)
  - ✅ Upload page with react-dropzone (CSV/XLSX) and preview
  - ✅ Simplified import: all CSV columns saved directly to JSONB
  - ✅ ContactsPage with search, pagination (50/page), and dynamic display
  - ✅ ListSettingsPage: user-selectable title field + column visibility
  - ✅ Display options per column: show/hide/show_if_not_null
  - ✅ Two-column responsive layout for contact cards
  - ✅ UI components (Button, Input, Card, Spinner)
  - ✅ Protected routes and AppLayout
  - ✅ Frontend added to docker-compose.yml
  - ✅ Path aliases (@/) configured

- ✅ **Step 5: Enhanced Features Complete**
  - ✅ Flexible contact sorting with smart type detection
    - ✅ Sort by any "Always show" field (A-Z / Z-A)
    - ✅ Automatic numeric vs string detection (2 < 10 vs "10" < "2")
    - ✅ PostgreSQL JSONB field access with RawSQL and OrderBy
    - ✅ NULL values sorted last
  - ✅ Field-specific search with dropdown selector
    - ✅ Select field from "Always show" columns
    - ✅ Case-insensitive search with PostgreSQL ILIKE
    - ✅ Supports text, numbers, and symbols
    - ✅ Input disabled until field selected
    - ✅ Shows all contacts when no field selected
  - ✅ UI improvements and TypeScript fixes

- ✅ **Step 6: Activity Tracking System Complete**
  - ✅ Activity model redesigned for interaction tracking
    - ✅ Type field: call, email, visit
    - ✅ Result field: no, followup, lead
    - ✅ Optional date field for scheduling
    - ✅ Content field for notes
  - ✅ Contact status computation
    - ✅ not_contacted: no activities
    - ✅ in_working: latest activity = followup
    - ✅ dropped: latest activity = no
    - ✅ converted: latest activity = lead
  - ✅ ActivityEditor component with type/result selectors
  - ✅ ContactDetailPage with activity timeline
  - ✅ Status badges on ContactsPage (color-coded)
  - ✅ Activity edit history tracking in metadata
  - ✅ Soft delete for activities

### Current Phase
**MVP Complete with Activity Tracking**
- All core features + interaction tracking implemented
- Status-based contact management ready
- Next: Add additional features or prepare for deployment

### Completed Steps
1. ~~**Setup Django Backend**~~ ✅ COMPLETE
2. ~~**Implement Core Models**~~ ✅ COMPLETE
3. ~~**Build API Endpoints**~~ ✅ COMPLETE
4. ~~**Create React Frontend**~~ ✅ COMPLETE
5. ~~**Enhanced Features**~~ ✅ COMPLETE
   - ~~Flexible sorting with numeric support~~ ✅
   - ~~Field-specific search~~ ✅
   - ~~Smart type detection~~ ✅
6. ~~**Activity Tracking System**~~ ✅ COMPLETE
   - ~~Interaction tracking (call/email/visit)~~ ✅
   - ~~Result tracking (no/followup/lead)~~ ✅
   - ~~Contact status computation~~ ✅
   - ~~Activity timeline UI~~ ✅

### Next Phase Options
- **Production Deployment**: Prepare for production environment
- **Additional Features**: Add new functionality (data enrichment, integrations, etc.)
- **Testing & Refinement**: End-to-end testing and bug fixes

## QUICK REFERENCE

**Tech Stack**: Django 5 + DRF | React 19 + Vite 7 | PostgreSQL 15 | Celery + Redis | Docker Compose

**Key Principle**: JSONB-first schema - no migrations for new contact fields

**Architecture Pattern**: Service layer for business logic (`backend/services/`)

**MVP Scope**: Upload CSV/XLSX → Auto-import all fields to JSONB → Configure display → Field-specific search → Flexible sorting → Activity tracking → Contact status management

**Out of Scope (Phase 2+)**: Traefik, CI/CD, Ansible, data enrichment, integrations

## DEVELOPMENT WORKFLOW

1. Read CONCEPT.md for vision/principles
2. Read ARCHITECTURE.md for implementation details
3. Follow service layer pattern
4. Update OpenAPI docs automatically (drf-spectacular)
5. Use JSONB for flexible data
6. Maintain object-level permissions (owner-only)

---

**ProspectFlow** - Self-hosted contact list processing for prospecting
