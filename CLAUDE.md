# CLAUDE.md - AI Development Roadmap

## BASE RULES
- **Always start in plan mode** - Present plan, get approval, then execute
- **Renew CLAUDE.md** - Update this file after significant progress
- **Keep it concise** - This is a roadmap, not detailed specs
- **Details in project/** - All comprehensive docs go in `project/` folder

## PROJECT DOCUMENTATION

| Document | Purpose |
|----------|---------|
| `project/CONCEPT.md` | Vision, principles, target users, success metrics |
| `project/ARCHITECTURE.md` | System architecture, tech stack, data models, API design |
| `project/REQUIREMENTS.md` | MVP requirements, user stories (if exists) |

## PROJECT STATUS

**Phase**: Planning / Initial Design
**Last Updated**: 2025-12-22

### Completed
- ✅ CONCEPT.md created - Vision and architectural principles defined
- ✅ ARCHITECTURE.md created - Comprehensive architecture documentation
- ✅ Project structure defined

### Next Steps (MVP Implementation)
1. **Setup Django Backend**
   - Initialize Django 5 project
   - Configure PostgreSQL + Redis in docker-compose.yml
   - Create apps: users, lists, processing
   - Setup Celery for async tasks

2. **Implement Core Models**
   - User model (auth)
   - ContactList model (with JSONB metadata)
   - Contact model (JSONB data field)
   - ColumnMapping model

3. **Build API Endpoints**
   - Auth: register, login (JWT)
   - Lists: CRUD operations
   - Upload: file upload endpoint
   - Contacts: list, search, detail

4. **Create React Frontend**
   - Initialize Vite + React + TypeScript
   - Setup TanStack Query
   - Auth pages (login, register)
   - Dashboard (list of ContactLists)
   - Upload & column mapping UI
   - Contact list view

5. **Docker Compose Setup**
   - Dockerfile for backend
   - Dockerfile for frontend
   - docker-compose.yml with all services
   - One-command startup

## QUICK REFERENCE

**Tech Stack**: Django 5 + DRF | React 18 + Vite | PostgreSQL 15 | Celery + Redis | Docker Compose

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
