# PRIMORA — Backend Platform OS (System Design Spec)

A self-hosted developer platform inspired by Appwrite-style UX, built for:
- speed
- clarity
- composability
- low resource usage
- full backend ownership

---

# 🧠 Core Philosophy

Primora is not a BaaS.

It is a:

> **Backend Operating System for building products**

Everything is explicit. Nothing is hidden.

---

# ⚙️ System Principles

- No vendor lock-in
- No managed backend services
- Full control over auth, DB, storage, API
- Minimal runtime overhead
- Local-first / self-host-first architecture
- Predictable performance under load

---

# 🧱 High-Level Architecture


Frontend (SolidJS / React)
↓
Go Backend (Gin API Layer)
↓
PostgreSQL + DragonflyDB
↓
Local File System Buckets


---

# 🧩 Core System Modules

## 1. Auth System
- Custom JWT OR Better Auth integration layer
- Session validation handled in Go
- Token-based API access

Rules:
- Backend owns auth enforcement
- No external auth dependency
- All roles & permissions stored in Postgres

---

## 2. API Layer (Go)

Stack:
- Gin (HTTP server)
- OpenAPI spec generation
- REST-first design

Responsibilities:
- routing
- validation
- auth enforcement
- business logic execution

---

## 3. Database Layer

PostgreSQL is the single source of truth.

Tools:
- sqlc (type-safe queries)
- goose (migrations)

Rules:
- No ORM abstraction layers
- No dynamic schema generation
- Explicit schema evolution only

---

## 4. Cache Layer

DragonflyDB used for:
- session caching
- rate limiting
- hot API responses
- temporary state

NOT used for:
- persistent storage
- critical business data

---

## 5. File Storage System

Local filesystem-based bucket system:


/data
/bucket_users
/bucket_projects
/bucket_assets


Features:
- streaming uploads (no full memory load)
- chunked writes
- metadata stored in Postgres
- fast local reads
- no external S3 dependency

---

## 6. OpenAPI System

- Go generates OpenAPI spec
- Frontend auto-consumes API contracts
- Optional SDK generation for:
  - TypeScript
  - Python
  - Rust
  - Java

---

# 🖥️ Frontend System

## Default Stack

- SolidJS (primary)
- React (fallback only when required)

---

## Required Tooling

- Vite
- TypeScript (strict mode)
- Tailwind CSS

---

## UI Libraries

- Ark UI (Solid)
- shadcn / shadcn-solid

---

## UI Requirements

- Fully responsive
- Dark / light mode support
- Accessibility-first design (ARIA compliant)
- Keyboard navigation support

---

# 🎨 UI Design Principles

- Dark-first interface
- Dense but breathable layout
- Card-based system
- Clear hierarchy via contrast
- Minimal animation usage
- Blue accent system (`#19a3d9`)

---

# ⚡ Performance Targets

- API latency: < 50ms local
- UI render: < 100ms interaction response
- Go backend memory: low footprint (<150MB typical)
- Idle CPU: near zero
- File streaming: zero-copy when possible

---

# 🧱 Backend Ownership Rules

Backend owns:

- authentication
- authorization
- API logic
- database access
- business rules

Frontend NEVER:
- validates security logic
- enforces permissions
- directly accesses DB

---

# 🚀 Deployment Model

Primary target:
- Railway
- single container deploy
- optional volume for file storage

Constraints:
- minimal service count
- no microservice sprawl
- no external dependencies required

---

# 🧠 Scalability Model

Primora scales by:

- stateless Go API layer
- Postgres indexing + optimization
- Dragonfly caching layer
- optional horizontal API scaling

File system scales via:
- disk expansion
- optional migration layer later

---

# 🧩 Summary

Primora is:

> A fully self-owned backend operating system combining Go, Postgres, and a modern frontend layer, designed for clarity, speed, and full control.

It avoids:
- BaaS lock-in
- hidden abstractions
- unnecessary distributed complexity

It prioritizes:
- explicit systems
- predictable behavior
- developer control