# ContractFlow - Full Stack Contract Lifecycle Platform

ContractFlow is a full-stack contract lifecycle application for drafting, reviewing, approving, signing, tracking, and exporting agreements inside a shared organization workspace.

It combines:

- Workspace-aware authentication
- Contract creation and editing
- Reusable templates
- Multi-step approval workflows
- Approval and signature tracking
- Real-time notifications
- Team and organization management
- AI-assisted drafting and workflow generation
- Formal PDF export

The project is built as a single Next.js application with clear domain modules, Prisma-backed persistence, and a custom Node server for WebSocket-based notification delivery.

---

# Table of Contents

- [What the System Does](#what-the-system-does)
- [Core Product Flow](#core-product-flow)
- [Detailed Project Flow](#detailed-project-flow)
- [System Architecture](#system-architecture)
- [Request Lifecycle](#request-lifecycle)
- [Real-Time Notification Flow](#real-time-notification-flow)
- [Database Architecture](#database-architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Security and Access Control](#security-and-access-control)
- [Installation](#installation)
- [Scripts](#scripts)
- [Author](#author)

---

# What the System Does

ContractFlow supports the full lifecycle of a contract:

1. A user signs in to an organization workspace.
2. The user creates a contract from scratch, from a template, or with AI help.
3. A workflow can be attached to define the approval path.
4. The contract is sent for approval.
5. Approvers review the contract and approve or reject it step by step.
6. Once approvals complete, the contract can move to approved and signed states.
7. Notifications are generated for affected users in real time.
8. Contracts remain searchable, exportable, and auditable from the workspace.

This makes the app useful as both a working product and a reference architecture for workflow-heavy internal tools.

---

# Core Product Flow

## 1. Authentication and Workspace Resolution

- Users sign up or sign in with email and password.
- `NextAuth` manages authentication and session creation.
- The server resolves the user's active organization membership.
- A role is derived from membership data such as `ADMIN`, `MANAGER`, or `EMPLOYEE`.
- Permissions are computed from that role before protected actions are allowed.

Primary files:

- `app/api/auth/[...nextauth]/route.ts`
- `lib/auth.ts`
- `lib/contracts/access.ts`

## 2. Contract Creation

- Users create a contract from the contracts workspace.
- Contract content may come from manual input, template content, or AI-generated text.
- Metadata such as title, parties, workflow, template, and summary are packaged into a contract payload.
- The API validates access and delegates creation to the contracts service layer.
- Prisma persists the contract and related contract version data in PostgreSQL.

Primary files:

- `app/api/contracts/route.ts`
- `lib/contracts/service.ts`

## 3. Workflow Assignment

- A contract can optionally be linked to a workflow.
- Workflows define ordered approval steps by role.
- Workflow assignment can happen during contract creation, editing, or bulk updates.
- The workflow determines which approval step is currently active.

Primary files:

- `lib/workflows/service.ts`
- `app/api/contracts/bulk/route.ts`

## 4. Approval Execution

- An authorized user sends a contract for approval.
- The contract moves into a pending state.
- Approvers act on the current workflow step.
- Approval records are stored per contract, step, and user.
- If all required steps complete, the contract reaches `APPROVED`.
- If a step is rejected, the contract is returned to an earlier workable state.

Primary files:

- `app/api/contracts/[id]/actions/route.ts`
- `lib/contracts/service.ts`

## 5. Signatures and Completion

- Signature requests and signature status are tracked separately from approvals.
- Signed activity contributes to the contract's latest activity timeline.
- The contract can then be viewed, exported, or shared as a completed agreement.

Primary files:

- `prisma/schema.prisma`
- `app/api/contracts/[id]/pdf/route.ts`

## 6. Notifications and Workspace Visibility

- Contract actions generate notification records.
- Notifications can be viewed, filtered, marked read, or deleted.
- Live notification updates are delivered through WebSockets.
- PostgreSQL `pg_notify` is used to broadcast notification changes to connected clients.

Primary files:

- `lib/notifications/service.ts`
- `server.mjs`
- `app/api/notifications/route.ts`

---

# Detailed Project Flow

## User Journey Flow

```text
Sign in
  -> Resolve membership and active organization
  -> Load dashboard and workspace modules
  -> Create or open contract
  -> Edit content / attach template / attach workflow
  -> Send for approval
  -> Approvers review current step
  -> Contract becomes approved or rejected
  -> Notification events are emitted
  -> Contract can be signed, tracked, exported, and archived
```

## Contract Lifecycle States

The Prisma schema defines these contract states:

- `DRAFT`
- `PENDING`
- `APPROVED`
- `SIGNED`
- `ARCHIVED`

Typical movement through the lifecycle:

```text
DRAFT
  -> PENDING
  -> APPROVED
  -> SIGNED
  -> ARCHIVED
```

Possible alternate path:

```text
DRAFT
  -> PENDING
  -> REJECTED at approval step logic
  -> back to editable state / resubmission path
```

## Dashboard Flow

- The dashboard loads organization-scoped contract data.
- Service-layer functions aggregate counts and recent activity.
- Summary cards show contract totals, pending approvals, approved contracts this month, and risk signals.
- Activity panels surface recent approvals and workflow usage.

Primary file:

- `app/(dashboard)/dashboard/page.tsx`

## Contracts Page Flow

- The client requests paginated, filtered contract data.
- Filters include search, status, workflow, creator, date range, sorting, and paging.
- The backend normalizes and enriches records with workflow and approval summary data.
- The UI renders the contract list, stats, actions, and detail navigation.

Primary files:

- `app/(dashboard)/contracts/page.tsx`
- `components/contracts/contracts-page-client.tsx`
- `lib/contracts/service.ts`

## Workflow Builder Flow

- Admin or manager users create workflows with step definitions.
- Each step stores role-based approval responsibility and optional conditions.
- Workflows can be edited, deleted, attached to templates, or attached directly to contracts.
- Workflow analytics show total contracts, active approvals, and completion rate.

Primary files:

- `app/(dashboard)/workflows/page.tsx`
- `components/workflows/workflows-page-client.tsx`
- `lib/workflows/service.ts`

## Template Flow

- Templates store reusable contract content and optional workflow defaults.
- Users can generate templates with AI, refine them, and reuse them during contract creation.
- Templates help normalize document structure across the organization.

Primary files:

- `app/(dashboard)/templates/page.tsx`
- `app/api/templates/route.ts`
- `app/api/ai/templates/route.ts`

## AI Assistance Flow

- Users provide drafting or workflow prompts.
- Route handlers build a structured prompt for the AI provider.
- Gemini returns generated content or workflow suggestions.
- The backend normalizes the response before returning it to the UI.
- The client can then merge the AI output into the editable form state.

Primary files:

- `app/api/ai/generate-contract/route.ts`
- `app/api/ai/templates/route.ts`
- `app/api/ai/workflows/route.ts`

---

# System Architecture

## High-Level Architecture

```text
Client UI
  -> Next.js App Router pages and React components
  -> Client-side data fetching and mutations
  -> Next.js route handlers
  -> Domain services in lib/*
  -> Prisma ORM
  -> PostgreSQL

Parallel real-time path:

PostgreSQL pg_notify
  -> custom Node server
  -> WebSocket server
  -> connected browser clients
```

## Architectural Layers

### 1. Presentation Layer

Responsible for:

- Page layouts
- Navigation
- Forms
- Tables
- Dashboard cards
- Workflow builders
- Notification views

Main directories:

- `app`
- `components`

### 2. API Layer

Responsible for:

- HTTP request handling
- Session checks
- Input parsing
- Permission gating
- JSON responses

Main directory:

- `app/api`

### 3. Domain Service Layer

Responsible for:

- Business rules
- Contract lifecycle logic
- Workflow analytics
- Notification creation and fanout
- Membership and settings management
- Data normalization

Main directories:

- `lib/contracts`
- `lib/workflows`
- `lib/notifications`
- `lib/memberships`
- `lib/settings`

### 4. Persistence Layer

Responsible for:

- Database schema
- ORM access
- Record creation and updates
- Query composition

Main files:

- `prisma/schema.prisma`
- `lib/prisma.ts`

### 5. Real-Time Delivery Layer

Responsible for:

- WebSocket connection management
- Broadcasting organization-scoped notification events
- Listening to PostgreSQL notification channels

Main file:

- `server.mjs`

## Module Interaction Diagram

```text
Browser
  -> app/(dashboard) pages
  -> components/*
  -> fetch / React Query
  -> app/api/*
  -> lib/* service modules
  -> Prisma client
  -> PostgreSQL

Notifications:

contract action / workflow event
  -> lib/notifications/service.ts
  -> write Notification row
  -> pg_notify('notifications_live', payload)
  -> server.mjs listener
  -> WebSocket broadcast
  -> browser notification badge / notifications page refresh
```

---

# Request Lifecycle

## Example: List Contracts

```text
Browser requests /api/contracts
  -> route handler parses query filters
  -> access context resolves session, org, role, permissions
  -> contracts service queries and transforms records
  -> Prisma reads contracts, approvals, workflows, signatures
  -> response returns normalized contract records and stats
  -> UI renders cards, filters, and table rows
```

Concrete files:

- `app/api/contracts/route.ts`
- `lib/contracts/access.ts`
- `lib/contracts/service.ts`

## Example: Approve a Contract

```text
Browser posts /api/contracts/[id]/actions
  -> route validates action and permissions
  -> contracts service runs approval mutation
  -> approval record is updated
  -> contract status may advance
  -> notification records may be created
  -> response returns updated contract view model
  -> UI refreshes contract details and related stats
```

Concrete files:

- `app/api/contracts/[id]/actions/route.ts`
- `lib/contracts/service.ts`

## Example: Load Notifications

```text
Browser requests /api/notifications
  -> route validates session and filters
  -> notifications service queries rows by user
  -> relative time labels are computed
  -> unread count and list are returned
  -> UI renders inbox and unread badges
```

Concrete files:

- `app/api/notifications/route.ts`
- `lib/notifications/service.ts`

---

# Real-Time Notification Flow

The app uses a custom server instead of plain `next dev` so it can host a WebSocket server beside Next.js.

## End-to-End Real-Time Path

```text
User action occurs
  -> business logic creates notification
  -> lib/notifications/service.ts emits change event
  -> PostgreSQL sends pg_notify('notifications_live', ...)
  -> server.mjs is listening on that channel
  -> connected sockets are filtered by organization or user
  -> matching clients receive JSON event payload
  -> client invalidates or refreshes notification queries
```

This architecture keeps notification generation inside domain services while centralizing fanout logic inside the server process.

---

# Database Architecture

## Main Entities

- `Organization`
- `User`
- `Membership`
- `Contract`
- `ContractVersion`
- `ContractAI`
- `Workflow`
- `WorkflowStep`
- `Template`
- `Approval`
- `Signature`
- `Notification`
- `AuditLog`

## Relationship Summary

```text
Organization
  -> has many Memberships
  -> has many Contracts
  -> has many Workflows
  -> has many Templates

User
  -> has many Memberships
  -> creates many Contracts

Contract
  -> belongs to Organization
  -> belongs to creator User
  -> may belong to Workflow
  -> may belong to Template
  -> has many ContractVersions
  -> has many Approvals
  -> has many Signatures
  -> may have ContractAI

Workflow
  -> belongs to Organization
  -> has many WorkflowSteps
  -> has many Contracts

Template
  -> belongs to Organization
  -> may reference Workflow
  -> can be reused by Contracts
```

## Why the Model Works

- Multi-tenant organization boundaries are explicit.
- Membership drives role-aware access control.
- Contracts are versionable and workflow-aware.
- Approval and signature concerns are separated cleanly.
- Notifications are first-class records, not transient UI state.
- Audit logging is available for traceability and future compliance features.

---

# Project Structure

```text
contract/
  app/
    (auth)/
    (dashboard)/
    api/
  components/
    contracts/
    workflows/
    notifications/
    memberships/
    layout/
  lib/
    auth.ts
    prisma.ts
    contracts/
    workflows/
    notifications/
    memberships/
    settings/
  prisma/
    schema.prisma
    migrations/
  public/
  server.mjs
  README.md
```

## Important Folders

- `app`: Next.js pages, layouts, and route handlers
- `components`: reusable UI modules
- `lib`: business logic, API helpers, and shared utilities
- `prisma`: schema and migrations
- `server.mjs`: custom server with WebSocket integration

---

# Tech Stack

## Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- TanStack React Query
- TanStack React Table

## Backend

- Next.js Route Handlers
- Node.js custom server
- WebSockets with `ws`

## Database

- PostgreSQL
- Prisma ORM
- `pg_notify` for live events

## Authentication

- NextAuth

## AI and Document Tooling

- Google Generative AI
- jsPDF
- pdf-lib

---

# Security and Access Control

ContractFlow applies access control in layers:

- Session authentication through `NextAuth`
- Organization membership validation on the server
- Disabled-user blocking
- Role-derived permissions for create, edit, approve, archive, and workflow assignment actions
- Organization-scoped queries to prevent cross-tenant access
- Server-side route checks before mutation execution

Primary file:

- `lib/contracts/access.ts`

---

# Installation

## 1. Clone the repository

```bash
git clone <your-repository-url>
cd contract
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create a `.env` file in the project root.

Example:

```env
DATABASE_URL=

NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

HOSTNAME=0.0.0.0
PORT=3000

GOOGLE_GENERATIVE_AI_API_KEY=
```

## 4. Run database migrations

```bash
npx prisma migrate dev
```

## 5. Start the development server

```bash
npm run dev
```

The app starts through the custom Node server so WebSocket notifications work locally.

---

# Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

---

# Author

**Aryan Gupta**

GitHub  
https://github.com/AryanGupta0505



