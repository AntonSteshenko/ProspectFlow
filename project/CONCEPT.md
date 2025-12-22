# ProspectFlow - Concept Document

## Vision
Minimalist application template for processing prospect lists, designed to be extended and automated via AI (Claude, GPT, autonomous agents).
Not a finished product, but a solid and well-documented foundation that developers and AI can rapidly modify.

## Problem
Small and medium businesses manage prospect lists in Excel, without:

- Consistent data structure
- Change history
- Automatic enrichment capabilities
- Collaborative workflows

Existing solutions (HubSpot, Pipedrive) are oversized and expensive for those who only need to "clean and work lists".

## Solution
Self-hosted app that does one thing well: imports, normalizes, and enables working with business contact lists.

### Core Features (v1.0)

- Upload CSV/XLS → automatic normalization
- Configurable column mapping
- List view with filters and search
- Clean export
- Multi-user with ownership

### AI Expansion (v2.0+)
The architecture allows an AI agent to:

- Add new fields to the model (JSONB)
- Create new API endpoints
- Implement enrichment logic
- Generate UI components

### Architectural Principles

| Principle | Implementation |
|-----------|----------------|
| **AI-First Documentation** | Docstrings, OpenAPI, ARCHITECTURE.md always up-to-date |
| **Flexible Schema** | JSONB for contact data, no migrations for new fields |
| **Isolated Services** | Business logic in single, testable, replaceable classes |
| **Convention over Config** | Predictable structure, consistent naming |
| **Self-Contained** | `docker-compose up` and it works |

### Target Users

- **Freelance Developer** - wants a foundation for client projects
- **SMB with internal IT** - looking for a simple solution to self-host
- **AI Agent** - can autonomously modify/extend the codebase

### Non-Goals (v1.0)

- Full-featured CRM
- Integrated email marketing
- Third-party integrations
- Mobile app

### Success Metrics

- Working setup in < 5 minutes
- An AI agent can add a field in < 3 prompts
- Zero dependencies on external services (fully self-hosted)

### Naming

**ProspectFlow** - simple, memorable, describes the workflow for prospects.

**Alternatives considered**: ListForge, ProspectBase, LeadKit