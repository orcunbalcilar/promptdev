# PRD-06: Remove Hardcoded Development Credentials

**Severity:** S3 — Serious problem, must plan to fix  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

`auth.ts` includes a hardcoded credential path where the password `"password"` grants access in development mode. While gated behind `NODE_ENV === "development"`, hardcoded secrets in source code are a security anti-pattern: misconfigured deployments, CI environments, or staging systems that accidentally run with `NODE_ENV=development` would expose this backdoor.

## Evidence

**File:** `auth.ts`, lines 8–27

```typescript
if (process.env.NODE_ENV === "development") {
  providers.push(
    Credentials({
      id: "password",
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => {
        if (credentials.password === "password") {  // ← Hardcoded!
          return {
            email: "bob@alice.com",       // ← Hardcoded test user
            name: "Bob Alice",
            image: "https://avatars.githubusercontent.com/u/67470890?s=200&v=4",
          };
        }
        return null;
      },
    }),
  );
}
```

## Goals

1. No hardcoded secrets in source code
2. Dev credentials require explicit opt-in via environment variable
3. Dev credentials password comes from environment, not source
4. Startup fails fast with clear error message if misconfigured
5. Local dev convenience is preserved

## Non-Goals

- Replacing the Credentials provider pattern
- Changing OAuth provider configuration
- Adding MFA or password complexity requirements (it's a dev-only feature)

## Proposed Design

```typescript
if (process.env.ENABLE_DEV_CREDENTIALS === "true") {
  const devPassword = process.env.DEV_LOGIN_PASSWORD;
  if (!devPassword) {
    throw new Error(
      "ENABLE_DEV_CREDENTIALS=true but DEV_LOGIN_PASSWORD is not set. " +
      "Set DEV_LOGIN_PASSWORD in your .env.local file."
    );
  }

  providers.push(
    Credentials({
      id: "password",
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => {
        if (credentials.password === devPassword) {
          return {
            email: process.env.DEV_USER_EMAIL ?? "dev@localhost",
            name: process.env.DEV_USER_NAME ?? "Dev User",
          };
        }
        return null;
      },
    }),
  );
}
```

### `.env.local.example` update

```env
# Development credentials (optional, for local dev only)
# ENABLE_DEV_CREDENTIALS=true
# DEV_LOGIN_PASSWORD=your-secure-local-password
# DEV_USER_EMAIL=dev@localhost
# DEV_USER_NAME=Dev User
```

## Acceptance Criteria

- [ ] No hardcoded password string in `auth.ts`
- [ ] Credential provider only loads when `ENABLE_DEV_CREDENTIALS=true`
- [ ] Startup throws if `ENABLE_DEV_CREDENTIALS=true` without `DEV_LOGIN_PASSWORD`
- [ ] `.env.local.example` documents the required variables
- [ ] Existing tests updated to use env-driven credentials
- [ ] README updated with local development setup instructions

## Risks

| Risk | Mitigation |
| --- | --- |
| Developers forget to set env vars | Clear error message on startup; documented in `.env.local.example` |
| CI/CD needs dev credentials | CI config sets `ENABLE_DEV_CREDENTIALS=true` + secure `DEV_LOGIN_PASSWORD` |

## Dependencies

- None
