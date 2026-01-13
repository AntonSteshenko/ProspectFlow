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

**Phase**: MVP Complete with Pipeline Performance Optimization - Production-Ready (Dev Mode)
**Last Updated**: 2026-01-13

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
    - ✅ Type field: call, email, visit, research
    - ✅ Result field: no, followup, lead
    - ✅ Optional date field for scheduling
    - ✅ Content field for notes
  - ✅ Contact status computation
    - ✅ not_contacted: no activities
    - ✅ in_working: latest activity = followup
    - ✅ dropped: latest activity = no
    - ✅ converted: latest activity = lead
  - ✅ ActivityEditor component with vertical radio button selectors
  - ✅ ContactDetailPage with activity timeline
  - ✅ Status badges on ContactsPage (color-coded)
  - ✅ Activity edit history tracking in metadata
  - ✅ Soft delete for activities

- ✅ **Step 7: Advanced Filtering & Export Complete**
  - ✅ Status filtering with multi-select checkboxes
    - ✅ Filter by contact status (not_contacted, in_working, dropped, converted)
    - ✅ Django ORM subquery implementation for computed status filtering
    - ✅ Multiple status selection support
  - ✅ CSV Export functionality
    - ✅ Customizable field selection modal
    - ✅ Export respects current filters (search, status, pipeline, sort)
    - ✅ ExportService for CSV generation
    - ✅ Include optional fields: status, activities_count, in_pipeline
  - ✅ URL parameter persistence
    - ✅ All filters saved in URL query params
    - ✅ Shareable URLs with applied filters
    - ✅ Browser back/forward compatibility
    - ✅ Filter preservation across page navigation
    - ✅ Refresh-safe filter state
  - ✅ UI improvements
    - ✅ Compact 2-row layout for filters and controls
    - ✅ Better visual grouping and organization
    - ✅ Contact count display with filter awareness

- ✅ **Step 8: Final Integration & Testing Complete**
  - ✅ End-to-end workflow testing
  - ✅ Manual testing of all features
  - ✅ Bug fixes and refinements
  - ✅ MVP fully functional and tested

- ✅ **Step 9: Geocoding Feature Complete**
  - ✅ GeocodingService with Nominatim (OpenStreetMap) integration
    - ✅ Rate limiting (1 req/sec) for Nominatim compliance
    - ✅ Free geocoding with no API key required
    - ✅ 3-level fallback strategy (exact → street → city)
    - ✅ Italian address prefix cleaning (FRAZIONE, REGIONE, etc.)
    - ✅ Comprehensive error handling and logging
  - ✅ Celery async task for batch geocoding
    - ✅ Progress tracking in ContactList.metadata
    - ✅ Success/failure statistics
    - ✅ Skip failed contacts with error logging
    - ✅ Precision tracking (exact/street/city)
  - ✅ API endpoints (geocode_contacts, geocode_status)
    - ✅ Feature flag via GEOCODING_ENABLED env variable
    - ✅ Template validation
    - ✅ Progress polling endpoint
  - ✅ Frontend geocoding configuration
    - ✅ AddressTemplateBuilder component
    - ✅ Configurable address template in ListSettingsPage
    - ✅ Field selector with drag-and-drop ordering
    - ✅ Customizable field separator
  - ✅ Frontend geocoding execution
    - ✅ "Geocode Contacts" button in ContactsPage
    - ✅ GeocodingProgressModal with real-time progress
    - ✅ Success/failure statistics display
    - ✅ Auto-refresh on completion
  - ✅ GPS coordinates storage in Contact.data JSONB
    - ✅ latitude, longitude, geocoded_at fields
    - ✅ No database migrations required
    - ✅ Error messages in Contact.data
  - ✅ Google Maps integration
    - ✅ Dynamic URL generation from geocoding template
    - ✅ MapPin icon link on each contact card
    - ✅ Opens in new tab (target="_blank")
    - ✅ Apostrophe removal for clean URLs

- ✅ **Step 10: Custom Link Templates Complete**
  - ✅ Frontend-only implementation (no backend changes)
  - ✅ Configuration UI in ListSettingsPage
    - ✅ LinkTemplateBuilder component
    - ✅ Up to 5 templates per list
    - ✅ URL templates with {field_name} placeholders
    - ✅ Enable/disable toggle per template
    - ✅ Insert field buttons for easy placeholder creation
    - ✅ Live preview of URL with sample data
  - ✅ Template storage in ContactList.metadata JSONB
  - ✅ URL building utility with validation
    - ✅ buildCustomLinkUrl function
    - ✅ Placeholder replacement with contact.data values
    - ✅ URL encoding for special characters
    - ✅ Returns null if required fields missing
  - ✅ Link buttons on ContactsPage cards
    - ✅ Text-only buttons next to contact title
    - ✅ Respects enable/disable status
    - ✅ Opens in new tab with stopPropagation
  - ✅ Link buttons on ContactDetailPage header
    - ✅ Button components in page header
    - ✅ Dynamic title from title_field
    - ✅ Query to fetch list metadata

- ✅ **Step 11: Column Order Preservation & Quality Improvements Complete**
  - ✅ Backend column order extraction
    - ✅ _extract_columns_from_file() helper function
    - ✅ Extract column names from CSV (DictReader.fieldnames)
    - ✅ Extract column names from XLSX (first row cells)
    - ✅ Store column_order in ContactList.metadata during upload
    - ✅ UTF-8 BOM handling for CSV files
  - ✅ Frontend field ordering utility
    - ✅ sortFieldsByColumnOrder() utility function
    - ✅ Sort fields by original file column order
    - ✅ Fields not in column_order appended at end
    - ✅ Backward compatible (works without column_order)
  - ✅ Frontend integration
    - ✅ ContactsPage: field ordering in cards and dropdown
    - ✅ ContactDetailPage: field ordering in detail view
    - ✅ ListSettingsPage: column ordering in settings
    - ✅ Consistent field order across all pages
  - ✅ Data quality improvements
    - ✅ Corrupted contact data handling in __str__ method
    - ✅ Django management command: clean_corrupted_contacts
    - ✅ Type checking for contact.data (must be dict)
  - ✅ CI/CD enhancements
    - ✅ Telegram notifications on build success/failure
    - ✅ Separate notify job in GitHub Actions workflow
    - ✅ Build status messages with commit info

- ✅ **Step 12: Pipeline Toggle Performance Optimization Complete**
  - ✅ Backend API optimization
    - ✅ Lightweight response in toggle_pipeline endpoint (reduced payload from ~2-10KB to ~100 bytes)
    - ✅ Returns only {id, in_pipeline} instead of full ContactSerializer
    - ✅ Optimized save with update_fields=['in_pipeline', 'updated_at']
  - ✅ Frontend optimistic updates
    - ✅ Instant UI response (<50ms perceived vs 2-5 seconds before)
    - ✅ Automatic rollback on error with alert notification
    - ✅ Cache invalidation for data consistency
  - ✅ Reusable PipelineToggle component
    - ✅ Created @/components/ui/PipelineToggle.tsx
    - ✅ Supports two contexts: ContactsPage (with filters) and ContactDetailPage (single contact)
    - ✅ Centralized mutation logic with optimistic updates
    - ✅ Consistent UI across all pages (6x6 checkbox with blue active state)
  - ✅ ContactDetailPage integration
    - ✅ Pipeline toggle added to header section
    - ✅ Positioned next to custom link buttons
    - ✅ Uses simplified query invalidation (no filters)
  - ✅ ContactsPage refactoring
    - ✅ Removed inline mutation code (~56 lines)
    - ✅ Uses PipelineToggle component with full listContext
    - ✅ Maintains all filter parameters for cache management
  - ✅ Performance improvements
    - ✅ Network payload reduced by 95%+
    - ✅ UI blocking eliminated
    - ✅ Better error handling and user feedback

### Current Phase
**MVP Complete with Pipeline Performance Optimization - Production-Ready (Dev Mode)**
- All core features including geocoding, column ordering, and optimized pipeline management
- Pipeline toggle with optimistic updates (<50ms response vs 2-5 seconds)
- Network payload reduced by 95%+ for pipeline operations
- Reusable PipelineToggle component for consistency across pages
- Original file column order preserved and displayed consistently
- Data quality improvements with corrupted data handling
- CI/CD enhanced with Telegram notifications
- Ready for real-world usage in development environment
- Future: Production deployment setup (Gunicorn, Nginx, etc.)

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
   - ~~Interaction tracking (call/email/visit/research)~~ ✅
   - ~~Result tracking (no/followup/lead)~~ ✅
   - ~~Contact status computation~~ ✅
   - ~~Activity timeline UI~~ ✅
7. ~~**Advanced Filtering & Export**~~ ✅ COMPLETE
   - ~~Status filtering~~ ✅
   - ~~CSV export with field selection~~ ✅
   - ~~URL parameter persistence~~ ✅
   - ~~Filter-aware export~~ ✅
8. ~~**Final Integration & Testing**~~ ✅ COMPLETE
   - ~~End-to-end workflow testing~~ ✅
   - ~~Manual testing of all features~~ ✅
   - ~~Bug fixes and refinements~~ ✅
9. ~~**Geocoding Feature**~~ ✅ COMPLETE
   - ~~Nominatim (OpenStreetMap) integration~~ ✅
   - ~~Async batch geocoding with Celery~~ ✅
   - ~~Configurable address templates~~ ✅
   - ~~Real-time progress tracking~~ ✅
   - ~~GPS coordinates in JSONB (no migrations)~~ ✅
10. ~~**Custom Link Templates**~~ ✅ COMPLETE
   - ~~Frontend-only implementation (no backend changes)~~ ✅
   - ~~LinkTemplateBuilder component~~ ✅
   - ~~URL templates with {field_name} placeholders~~ ✅
   - ~~Up to 5 templates per list~~ ✅
   - ~~Link buttons on contacts and detail pages~~ ✅
11. ~~**Column Order Preservation & Quality Improvements**~~ ✅ COMPLETE
   - ~~Original file column order extracted and stored~~ ✅
   - ~~Frontend displays fields in original order~~ ✅
   - ~~Backward compatible with old lists~~ ✅
   - ~~Corrupted data handling~~ ✅
   - ~~Telegram CI/CD notifications~~ ✅
12. ~~**Pipeline Toggle Performance Optimization**~~ ✅ COMPLETE
   - ~~Backend API optimization (payload reduced by 95%+)~~ ✅
   - ~~Frontend optimistic updates (instant UI response)~~ ✅
   - ~~Reusable PipelineToggle component~~ ✅
   - ~~ContactDetailPage integration~~ ✅
   - ~~ContactsPage refactoring~~ ✅

### Next Phase Options
- **Production Deployment**: Setup Gunicorn, Nginx, production docker-compose
- **Additional Features**: Add new functionality (map visualization, geocoding caching, etc.)
- **Automated Testing**: Add Pytest, Playwright for regression testing

## QUICK REFERENCE

**Tech Stack**: Django 5 + DRF | React 19 + Vite 7 | PostgreSQL 15 | Celery + Redis | Docker Compose

**Key Principle**: JSONB-first schema - no migrations for new contact fields

**Architecture Pattern**: Service layer for business logic (`backend/services/`)

**MVP Scope**: Upload CSV/XLSX → Auto-import all fields to JSONB → Preserve original column order → Configure display → Field-specific search → Flexible sorting → Activity tracking → Contact status management → Status filtering → CSV export → URL filter persistence → Geocoding with Nominatim → Custom link templates with {field_name} placeholders → Optimized pipeline management with instant UI feedback

**Out of Scope (Phase 2+)**: Traefik, CI/CD, Ansible, data enrichment, third-party integrations, map visualization

## DEVELOPMENT WORKFLOW

1. Read CONCEPT.md for vision/principles
2. Read ARCHITECTURE.md for implementation details
3. Follow service layer pattern
4. Update OpenAPI docs automatically (drf-spectacular)
5. Use JSONB for flexible data
6. Maintain object-level permissions (owner-only)

---

**ProspectFlow** - Self-hosted contact list processing for prospecting
