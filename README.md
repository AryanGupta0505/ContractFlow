# ContractFlow - Full Stack Contract Lifecycle Platform

ContractFlow is a **modern full-stack contract lifecycle platform** built to streamline how teams draft, review, approve, sign, and manage agreements inside a shared workspace.

The application brings together **contract creation, reusable templates, workflow-driven approvals, signature tracking, real-time notifications, team management, AI-assisted drafting, and formal PDF export** in one organized system.

ContractFlow is designed to reflect how real internal legal and operations teams work across **contracts, approvals, signatures, and audit-friendly document processes**.

---

# Core Features

## Secure Authentication & Workspace Access

- Email and password based authentication
- Session management using **NextAuth**
- Secure server-side session validation
- Workspace-aware user access
- Organization and membership based access control
- Protected API routes and role-aware actions

---

## Contract Management

- Create and manage contracts from a dedicated workspace
- Draft agreements manually or with AI-assisted generation
- Edit saved contracts with a structured contract editor
- Track contract lifecycle states such as **draft, pending, approved, signed, and archived**
- View contract details with workflow, approval, and signature context
- Export contracts as polished legal-style **PDFs**

---

## AI-Assisted Drafting & Review

ContractFlow includes built-in AI tools to speed up drafting and iteration.

Users can:

- Generate full contract drafts from business inputs
- Improve existing contract language
- Request AI suggestions for saved drafts
- Merge AI suggestions back into the editor
- Generate and refine reusable contract templates
- Create and refine approval workflows with AI support

This gives teams a practical **AI contract studio** without removing manual control over the final document.

---

## Reusable Templates

- Create reusable contract templates
- Organize templates by contract type
- Link templates with workflow defaults
- Reuse structured legal drafts across the organization
- Prevent unsafe deletion when templates are already in use

Templates help teams standardize legal documents while keeping contract creation faster and more consistent.

---

## Workflow-Driven Approvals

ContractFlow supports configurable approval pipelines for contract execution.

Features include:

- Create reusable approval workflows
- Define step-by-step approval sequences
- Assign steps by role such as **admin, manager, or employee**
- Optional conditional approval logic
- Link workflows to contracts and templates
- Track active approval progress across contracts
- View workflow analytics and usage history

This models how real contract processes move through structured internal review.

---

## Approvals & Signature Tracking

- Send contracts for approval
- Approve or reject contracts inside the workflow
- Track current approval step and approval ownership
- Capture comments during approval actions
- Manage signature requests and pending signers
- Track signed versus pending signature status

These flows connect contract drafting to actual execution readiness.

---

## Real-Time Notification Center

ContractFlow includes an in-app notification center for important workspace events.

Examples include:

- Contract created
- Approval required
- Contract approved
- Contract rejected
- Signature required
- System messages

Notification capabilities include:

- Inbox-style notifications page
- Read and unread tracking
- Mark single or multiple notifications as read
- Bulk delete actions
- Unread badge in the top navigation
- Real-time updates using **WebSockets**
- Organization-wide event visibility for shared workflow events

---

## Team & Organization Management

- Invite and manage workspace members
- View user profiles and membership roles
- Update membership roles without changing RBAC rules
- Change organization through settings
- Leave a workspace when allowed
- Delete account with protected confirmation flow

The platform supports multi-user collaboration through **organizations and memberships**.

---

## User Settings & Preferences

Users can manage a complete settings area with:

- Profile updates
- Email and name changes
- Avatar upload / avatar URL support
- Password change flow
- Theme preference management
- Account deletion safeguards
- Workspace leave / organization change actions

Theme preferences are persisted in the database, with **light mode as the default**.

---

## Theme Support

- Light and dark theme support
- System-aware theme handling where applicable
- Persistent theme preferences
- Theme-aware dashboard and application surfaces

The UI is designed as a clean SaaS-style workspace with attention to readability across themes.

---

## Workspace Dashboard

The dashboard provides a high-level view of contract activity and approval momentum.

It includes:

- Workspace contract metrics
- Pending approval visibility
- Priority pipeline tracking
- Activity summaries
- Workflow health signals

This gives teams a quick operational snapshot of what needs attention next.

---

## PDF Export & Sharing

- Download formal contract PDFs
- Open contracts in PDF format directly from the application
- Share contracts using the browser share sheet where supported
- Share both contract link and PDF file when supported by the device

PDF generation uses **jsPDF** and is formatted to feel closer to a formal legal agreement rather than raw plain text output.

---

# System Design

ContractFlow is built as a single full-stack application with clear service boundaries across domain modules such as:

- Authentication
- Contracts
- Templates
- Workflows
- Notifications
- Memberships
- Settings

The codebase follows a modular service-oriented structure using:

- API route handlers
- Domain service layers
- Prisma-backed persistence
- React Query powered client state
- Real-time notification delivery through WebSockets

---

# Tech Stack

## Frontend

- **Next.js (App Router)**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **TanStack React Query**

---

## Backend

- **Next.js Route Handlers**
- **Node.js**
- **TypeScript**
- **WebSockets**

---

## Database

- **PostgreSQL**
- **Prisma ORM**

---

## Authentication

- **NextAuth**

---

## AI & Document Tooling

- **Google Generative AI**
- **jsPDF**
- **pdf-lib**

---

# Database Model Highlights

ContractFlow persists core entities such as:

- Organizations
- Users
- Memberships
- Contracts
- Contract versions
- AI contract metadata
- Workflows
- Workflow steps
- Templates
- Approvals
- Signatures
- Notifications
- Audit logs

This structure supports shared contract workspaces with traceable approval and signature workflows.

---

# Security & Reliability Concepts

ContractFlow demonstrates multiple production-style application patterns:

- Password-based authentication with secure session handling
- Server-side workspace access validation
- Role-aware API protections
- Organization-scoped data access
- Input validation and guarded mutations
- Real-time notification delivery
- Audit logging for workflow actions
- Safe destructive actions with confirmation gates

---

# Installation

## 1. Clone the repository

```bash
git clone <your-repository-url>
cd contract
```

---

## 2. Install dependencies

```bash
npm install
```

---

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

Add any additional environment variables required for your deployment environment.

---

## 4. Run database migrations

```bash
npx prisma migrate dev
```

---

## 5. Start the development server

```bash
npm run dev
```

The app uses a custom server entry to support real-time notification delivery.

---

# Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

---

# Project Goal

ContractFlow was built to explore how a modern contract operations platform can be implemented using full-stack web technologies, real-time updates, structured approvals, AI-assisted drafting, and workspace-based collaboration.

It is intended to demonstrate practical patterns behind **contract lifecycle management systems**, including drafting, review, approvals, signatures, notifications, settings, and document export workflows.

---

# Author

**Aryan Gupta**

GitHub  
https://github.com/AryanGupta0505
