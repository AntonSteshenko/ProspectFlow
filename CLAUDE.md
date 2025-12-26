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

**Phase**: MVP Implementation - Step 4 Complete
**Last Updated**: 2025-12-25

### Completed
- ✅ CONCEPT.md created - Vision and architectural principles defined
- ✅ ARCHITECTURE.md created - Comprehensive architecture documentation
- ✅ Project structure defined

- ✅ **Step 1: Django Backend Setup Complete**
  - ✅ Django 5 project initialized
  - ✅ PostgreSQL + Redis configured in docker-compose.yml
  - ✅ Apps created: users, lists, processing
  - ✅ Celery configured for async tasks
  - ✅ Basic User model with UUID and email auth
  - ✅ Dockerfile and docker-compose.yml ready
  - ✅ Makefile with dev commands
  - ✅ OpenAPI/Swagger docs enabled

- ✅ **Step 2: Core Models Implemented**
  - ✅ ContactList model with JSONB metadata and status field
  - ✅ Contact model with JSONB data field and soft delete
  - ✅ ColumnMapping model for CSV column mappings
  - ✅ GIN indexes on JSONB fields for performance
  - ✅ Admin interfaces for all models
  - ✅ Migrations created and applied
  - ✅ django.contrib.postgres enabled

- ✅ **Step 3: API Endpoints Complete**
  - ✅ Authentication (register, login/JWT, profile)
  - ✅ ContactList CRUD + file upload/process endpoints
  - ✅ Contact CRUD + search functionality
  - ✅ ColumnMapping CRUD
  - ✅ Service layer (auth, upload, parser, contact services)
  - ✅ Object-level permissions (IsOwner, IsContactListOwner)
  - ✅ File handling (CSV/XLSX preview and parsing)
  - ✅ Full OpenAPI/Swagger documentation
  - ✅ Nested routes for list-specific resources

- ✅ **Step 4: React Frontend Complete**
  - ✅ Vite + React 19 + TypeScript initialized
  - ✅ Tailwind CSS v4.1 configured with @tailwindcss/vite
  - ✅ TanStack Query + React Router v7 setup
  - ✅ API client with JWT interceptors
  - ✅ Auth pages (login, register) with React Hook Form + Zod
  - ✅ Dashboard with ContactList cards
  - ✅ Upload page with react-dropzone (CSV/XLSX)
  - ✅ Column mapping page with field selection
  - ✅ Contacts view with search and JSONB field display
  - ✅ UI components (Button, Input, Card, Spinner)
  - ✅ Protected routes and layout
  - ✅ Frontend added to docker-compose.yml
  - ✅ Path aliases (@/) configured

### Current Step
**Step 5: Final Integration & Testing** (Next)
- Test full workflow end-to-end
- Fix any integration issues
- Update documentation

### Next Steps (MVP Implementation)
1. ~~**Setup Django Backend**~~ ✅ COMPLETE
2. ~~**Implement Core Models**~~ ✅ COMPLETE
3. ~~**Build API Endpoints**~~ ✅ COMPLETE
4. ~~**Create React Frontend**~~ ✅ COMPLETE

5. **Final Integration & Testing**
   - Test registration and login flow
   - Test ContactList creation
   - Test file upload and column mapping
   - Test contact import and search
   - Fix any bugs discovered during testing
   - Update documentation with setup instructions

## QUICK REFERENCE

**Tech Stack**: Django 5 + DRF | React 19 + Vite 7 | PostgreSQL 15 | Celery + Redis | Docker Compose

**Key Principle**: JSONB-first schema - no migrations for new contact fields

**Architecture Pattern**: Service layer for business logic (`backend/services/`)

**MVP Scope**: Upload CSV/XLSX → Map columns → Store contacts → Search/filter

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
