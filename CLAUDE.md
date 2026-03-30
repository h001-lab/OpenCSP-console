# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

OpenCSP Console is a self-hosted cloud platform console built on Proxmox + cloud-native tools. It has two sub-projects:
- `fe/` — Next.js 15 frontend with TypeScript, NextAuth 5, next-intl, Zustand, Tailwind CSS
- `be/` — Spring Boot 3.5 backend with Java 21, Spring Security (JWT), Spring Data JPA

## Commands

### Frontend (`fe/`)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
```

### Backend (`be/`)
```bash
./gradlew bootRun              # Run locally
./gradlew build                # Build + test
./gradlew build -x test        # Build without tests
./gradlew test                 # Run tests only
./gradlew bootJar              # Build runnable JAR

# Docker
docker build -t opencsp-be .
docker run --rm --env-file .env -p 8080:8080 opencsp-be
```

## Architecture

### Backend Layered Architecture (Domain-Driven)

```
api/          → REST Controllers + request/response DTOs
application/  → Business logic Services (@Transactional)
domain/       → JPA Entity interfaces + Repository interfaces
infrastructure/
  ├── security/     → SecurityConfig, JwtUtils, JITUserProvisioningHandler
  ├── iam/          → IamClient interface + zitadel/ and noop/ implementations
  ├── persistence/  → Spring Data JPA repository implementations
  ├── k8s/          → Kubernetes (flux/noop)
  ├── teleport/     → SSH PAM proxy (http/noop)
  ├── websocket/    → Terminal console WebSocket
  └── config/       → ConfigStore, DB-backed env config with encryption
```

Key pattern: Repository interfaces live in `domain/`, implementations in `infrastructure/persistence/`. Services use `@RequiredArgsConstructor` + `@Transactional`. Controllers use `@PreAuthorize("hasRole('ADMIN')")`.

### Frontend Architecture

All pages live under `fe/src/app/[locale]/` (locales: en, ko, jp). The routing is locale-prefixed.

**Core providers** (in root `[locale]/layout.tsx`):
- `MessagesProvider` — loads `/messages/{locale}.json` and provides `useMsg(domain)` hook
- `AuthProvider` — syncs NextAuth session → Zustand `authStore`

**Layout system**: Every page wraps content in `<Layout navDomain="Nav" sidebarDomain="SomeDomain">`. The `sidebarDomain` resolves to a message key that must contain a `sidebar: [{label, path}]` array.

**API routes** (`fe/src/app/api/`): Next.js server-side routes that proxy to the Spring backend using `callBackend()` from `fe/src/lib/backend-client.ts`. This helper attaches `Authorization: Bearer <accessToken>` and `X-User-Id` headers from the NextAuth JWT cookie.

### Authentication Flow

1. User logs in via Zitadel OIDC (NextAuth) → JWT access token stored in cookie
2. `AuthProvider` syncs session → Zustand store (user, roles, isAdmin)
3. FE API routes use `callBackend()` to proxy requests to Spring with the Zitadel JWT
4. Spring Security validates JWT, extracts roles from `urn:zitadel:iam:org:project:roles` claim
5. On first login, `JITUserProvisioningHandler` creates a local `User` record

**IAM modes** (set via `iam.provider` config in DB or env):
- `zitadel` — validates JWT, enforces authentication
- `none` — `NoIamAuthFilter` injects anonymous ADMIN+USER_A roles (dev/test)

### i18n (Internationalization)

Messages are JSON files at `fe/public/messages/{locale}.json`. Structure is nested by domain:

```json
{
  "Nav": { "title": "..." },
  "Admin": {
    "title": "...",
    "sidebar": [{ "label": "...", "path": "/admin" }],
    "users": { "title": "...", ... }
  }
}
```

- `useMsg("Admin")` returns the entire `Admin` object — cast it to a typed interface
- `useAutoMsg()` detects the section from the current URL path
- Always add messages to **all locale files** (en.json, ko.json) when adding new UI text

### Adding a New Page

1. Create `fe/src/app/[locale]/my-page/page.tsx` with `"use client"`, use `useMsg("MyDomain")` and `<Layout navDomain="Nav" sidebarDomain="MyDomain">`
2. Add `"MyDomain"` key (with `sidebar` array) to all `fe/public/messages/*.json` files
3. For admin pages, add the new path to `"Admin".sidebar` in messages and use `<Layout sidebarDomain="Admin">`

### Adding a New Backend Feature

1. `api/myfeature/MyFeatureController.java` — controller with `@RestController`, `@RequestMapping`, `@PreAuthorize`
2. `application/myfeature/MyFeatureService.java` — service with business logic
3. `domain/myfeature/MyFeature.java` — JPA entity; `MyFeatureRepository.java` — repository interface
4. `infrastructure/persistence/myfeature/MyFeatureJpaRepository.java` — Spring Data JPA implementation

### Provision/History System

`ProvisioningService` manages VM lifecycle via Kubernetes CRs (FluxCD + OpenTofu):
- `provision()` → creates k8s CR + saves `ProvisionHistory.created()`
- `syncStatus()` — scheduled every 30s by `ProvisionStatusSyncer`, reconciles k8s CR status with DB, saves `ProvisionHistory.statusChanged()` for each detected change
- Status flow: `PENDING → APPLYING → APPLIED → READY` / `FAILED` / `DESTROYING → DESTROYED`
- Active statuses monitored: PENDING, APPLYING, APPLIED, FAILED, DESTROYING

### Dynamic Configuration

`ConfigStore` (backed by `AppConfig` JPA entity) stores runtime config in DB, taking priority over env vars. Keys are organized into groups (IAM, K8S, AI, SEMAPHORE, PROVISION, GENERAL). Sensitive values are encrypted via `EncryptedStringConverter`.

## Environment Setup

**Backend** (`be/.env.sample`): requires `ENCRYPT_KEY`, optionally `IAM_PROVIDER` (default: `none`), Zitadel credentials, K8S kubeconfig, DB config.

**Frontend** (`fe/.env.example`): requires `NEXTAUTH_SECRET`, `ZITADEL_ISSUER`, `ZITADEL_CLIENT_ID`, `BACKEND_URL`.

Default DB is H2 in-memory for development. PostgreSQL/MySQL for production (set `SPRING_DATASOURCE_*` env vars).
