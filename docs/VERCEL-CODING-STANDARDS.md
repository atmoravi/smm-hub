# Vercel Application Development Standards
## Universal Guidelines for Professional Next.js / Vercel Deployments

**Version:** 1.0.0
**Last Updated:** 2026-03-08
**Applicable to:** All Vercel-hosted Next.js applications, especially those handling scale (API routes, edge functions, multi-tenant SaaS)

---

## Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [AI Agent Workflow](#ai-agent-workflow)
3. [Architecture Principles](#architecture-principles)
4. [App Router Structure](#app-router-structure)
5. [Security First](#security-first)
6. [Performance at Scale](#performance-at-scale)
7. [Runtime-Aware Loading](#runtime-aware-loading)
8. [Code Organization](#code-organization)
9. [TypeScript Standards](#typescript-standards)
10. [Data & Database Guidelines](#data--database-guidelines)
11. [Error Handling](#error-handling)
12. [Documentation](#documentation)
13. [Testing & Validation](#testing--validation)

---

## Core Philosophy

### The 90/10 Rule
**Deliver 90% of the value with 10% of the complexity.**

- Simple solutions over complex abstractions
- Next.js-native approaches over custom implementations
- Minimal overhead, maximum benefit
- Avoid over-engineering for hypothetical future requirements

### Scale-First Thinking
**Every decision must consider scale from day one.**

- Will this API route handle 10,000 concurrent requests?
- Will this database query cause N+1 problems at scale?
- What's the cold start impact on this serverless function?
- Can this be cached at the edge instead of hitting the database?

### Production-Ready Code
**Write code as if it's going to production tomorrow.**

- Proper error handling (no silent failures)
- Security by default (validate inputs, sanitize outputs)
- Clean architecture (maintainable, testable)
- Environment-aware configuration

### No Laziness
**Find root causes. No temporary fixes. Senior developer standards.**

- Investigate before patching — symptoms point to causes
- Never paper over a bug with a workaround that obscures it
- If the fix feels wrong, it probably is — find the right fix

### Minimal Impact
**Touch only what is necessary to accomplish the task.**

- A bug fix should not refactor surrounding code
- A new feature should not restructure unrelated files
- Fewer changed lines = fewer introduced bugs

---

## AI Agent Workflow

These rules govern how the AI agent operates during development sessions. They are process standards, not code standards — they define how work is planned, executed, and verified.

---

### 1. Plan Before You Code

**Rule:** Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).

- Write the plan to `tasks/todo.md` with checkable items before touching code
- Verify the plan with the user before starting implementation
- If something goes sideways mid-task, STOP and re-plan — do not keep pushing
- Use plan mode for verification steps, not just building

```
tasks/todo.md format:
## Task: [Description]

### Plan
- [ ] Step 1: ...
- [ ] Step 2: ...
- [ ] Step 3: ...

### Review
- Outcome: ...
- Lessons: ...
```

---

### 2. Track Progress Explicitly

**Rule:** Mark tasks complete as you go. Explain changes at each step.

- Mark each `tasks/todo.md` item complete immediately after finishing it
- Do not batch completions — mark done when done
- Provide a high-level summary at each natural milestone
- Add a review section to `tasks/todo.md` after the task is fully done

---

### 3. Capture Lessons After Corrections

**Rule:** After ANY correction from the user, update `tasks/lessons.md` with the pattern.

- Write a rule for yourself that prevents the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review `tasks/lessons.md` at the start of sessions for relevant patterns

```
tasks/lessons.md format:
## Lesson: [Short title]
**Mistake:** What went wrong
**Correct pattern:** What to do instead
**Trigger:** When this applies
```

---

### 4. Verify Before Declaring Done

**Rule:** Never mark a task complete without proving it works.

- Run type checks, build, or linter before claiming complete
- Check Vercel build output and function logs when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Do not claim a bug is fixed without evidence it is fixed

---

### 5. Use Subagents to Stay Focused

**Rule:** Keep the main context window clean. Offload research and parallel analysis to subagents.

- One task per subagent for focused execution
- Use subagents for: exploration, research, reading large codebases, parallel analysis
- Do not duplicate in the main thread work already delegated to a subagent
- For complex problems, throw more compute at it via subagents rather than expanding main context

---

### 6. Check for Elegance Before Presenting Work

**Rule:** For non-trivial changes, pause and ask "is there a more elegant way?"

- If a fix feels hacky: step back and implement the clean solution
- If you know more now than when you started, apply that knowledge
- Skip this for simple, obvious fixes — do not over-engineer

**Skip this check for:** one-line fixes, obvious renames, direct user instructions

---

### 7. Fix Bugs Autonomously

**Rule:** When given a bug report, investigate and fix it. Do not ask for hand-holding.

- Use build errors, runtime logs, and failing tests to locate the root cause
- Resolve the issue without requiring the user to guide each step
- If the Vercel build is failing, go fix it — do not wait to be told how
- If blocked, surface the specific blocker — not a general request for direction

---

## Architecture Principles

### 1. Single Responsibility Principle (SRP)

**Rule:** Each module/component should have ONE clear purpose, max 300 lines.

```typescript
// ❌ BAD: Monolithic API route (500+ lines handling everything)
// app/api/campaigns/route.ts
export async function POST(req: Request) {
  // validate input
  // authenticate user
  // send emails
  // log analytics
  // update database
  // send webhooks
  // return response
}

// ✅ GOOD: Focused, single-purpose modules
// lib/campaigns/validate.ts       — input validation only
// lib/campaigns/send.ts           — sending logic only
// lib/analytics/track.ts          — analytics only
// app/api/campaigns/route.ts      — orchestration only (thin controller)
```

### 2. DRY (Don't Repeat Yourself)

**Rule:** If you write the same code twice, create an abstraction.

```typescript
// ❌ BAD: Repeated auth check in every route
export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return new Response('Unauthorized', { status: 401 })
  const user = await verifyToken(token)
  if (!user) return new Response('Unauthorized', { status: 401 })
  // ... actual logic
}

// ✅ GOOD: Shared auth middleware/helper
// lib/auth/withAuth.ts
export function withAuth(
  handler: (req: Request, user: User) => Promise<Response>
) {
  return async (req: Request) => {
    const user = await authenticate(req)
    if (!user) return new Response('Unauthorized', { status: 401 })
    return handler(req, user)
  }
}

// app/api/campaigns/route.ts
export const GET = withAuth(async (req, user) => {
  // actual logic only
})
```

### 3. Separation of Concerns

**Rule:** Keep business logic, data access, and presentation separate.

```typescript
// ✅ GOOD: Clear separation
// lib/db/campaigns.ts      — data access layer
export async function getCampaign(id: string) { }
export async function createCampaign(data: CampaignInput) { }

// lib/campaigns/service.ts — business logic layer
export async function prepareCampaign(id: string) { }
export async function validateCampaignForSend(id: string) { }

// app/api/campaigns/route.ts — controller (thin, orchestration only)
export async function POST(req: Request) {
  const data = await req.json()
  const validated = validateCampaignInput(data)
  const campaign = await createCampaign(validated)
  return Response.json({ id: campaign.id })
}
```

### 4. Dependency Management

**Rule:** Use Next.js and Vercel native capabilities first; add external dependencies only when necessary.

```typescript
// ✅ GOOD: Vercel-native capabilities
import { kv } from '@vercel/kv'           // Rate limiting, sessions
import { put } from '@vercel/blob'         // File storage
import { sql } from '@vercel/postgres'     // Database
import { Analytics } from '@vercel/analytics' // Usage analytics

// ✅ GOOD: Next.js built-ins
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ❌ BAD: Heavy external library for something Next.js provides
import Redis from 'ioredis'  // when @vercel/kv suffices
import AWS from 'aws-sdk'    // when @vercel/blob suffices
```

---

## App Router Structure

Any violation of these principles is an architectural defect.

### 1. Core Architecture Principles (Non-Negotiable)

1. The app is one cohesive runtime — shared layouts, shared state.
2. Pages and layouts are isolated rendering units, not independent applications.
3. Client components are opt-in (`'use client'`) — default to Server Components.
4. No client component may assume another component's render order or timing.
5. All cross-route state must flow through URL params, cookies, or persisted storage.

---

### 2. Server vs Client Component Rules

#### 2.1 What Stays on the Server

A Server Component:
- Fetches data directly (no useEffect, no API call from client)
- Has access to secrets and env vars
- Renders markup that does not need interactivity
- Is never hydrated in the browser

A Server Component is NOT:
- Allowed to use `useState`, `useEffect`, or browser APIs
- Allowed to attach event listeners directly

#### 2.2 What Goes to the Client

A Client Component (`'use client'`):
- Handles user interaction (onClick, onChange)
- Uses React hooks (useState, useEffect, useRef)
- Accesses browser APIs (window, localStorage)

**Rule:** Push the `'use client'` boundary as low in the tree as possible. Do not make a layout or page a client component just to use one interactive child — extract that child instead.

---

### 3. Route Handler Rules

#### 3.1 Route Handler Basics

- Each `route.ts` file is a single HTTP endpoint
- Export named functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Return `Response.json()` or `new Response()` — never raw data
- Choose runtime explicitly when the default is wrong

```typescript
// ✅ GOOD: Explicit runtime declaration
export const runtime = 'edge'   // For lightweight, globally-fast routes
export const runtime = 'nodejs' // Default; for DB connections, heavy libs

// ✅ GOOD: Route handler structure
export async function POST(req: Request) {
  // 1. Parse and validate input
  // 2. Authenticate / authorize
  // 3. Execute business logic
  // 4. Return structured response
}
```

#### 3.2 API Response Shape

Always return consistent shapes:

```typescript
// ✅ GOOD: Consistent success/error shape
// Success
return Response.json({ data: result }, { status: 200 })

// Error
return Response.json(
  { error: { message: 'Validation failed', code: 'INVALID_INPUT' } },
  { status: 400 }
)

// ❌ BAD: Inconsistent shapes across routes
return Response.json(result)               // some routes
return Response.json({ success: true })    // other routes
return new Response('error text', { status: 400 }) // others
```

---

### 4. State Model

#### 4.1 Two Types of State

Local (UI) State:
- Exists only in the browser session
- Used for immediate UI feedback
- Owned by a single component
- Lost on navigation/reload

Persisted State:
- Saved to database, KV, or cookies
- Shared across sessions and users
- Source of truth for all cross-page behavior

#### 4.2 State Boundary Rule

Components may freely mutate local UI state. Only persisted state may affect other routes or sessions.

No exceptions.

---

### 5. Caching Rules (Critical for Vercel)

```typescript
// ✅ GOOD: Explicit cache control on fetch
const data = await fetch(url, {
  next: { revalidate: 60 }  // ISR: revalidate every 60 seconds
})

const data = await fetch(url, {
  cache: 'no-store'          // Always fresh (SSR)
})

// ✅ GOOD: On-demand revalidation after mutations
export async function updateCampaign(id: string) {
  await db.update(...)
  revalidatePath(`/campaigns/${id}`)
  revalidateTag('campaigns')
}

// ✅ GOOD: Tag-based cache grouping
const data = await fetch(url, {
  next: { tags: ['campaigns'] }
})

// ❌ BAD: No cache strategy — defaults to full cache forever in production
const data = await fetch(url)
```

---

### 6. Middleware Rules

- Middleware runs on the Edge runtime — keep it fast and lightweight
- Use middleware ONLY for: auth checks, redirects, geolocation, A/B flags
- Never import Node.js-only modules in middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // ✅ GOOD: Lightweight token check
  const token = request.cookies.get('session')?.value
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  // ✅ GOOD: Scope matcher — don't run on every request
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
}
```

---

## Security First

### 1. Input Validation & Sanitization

**Rule:** NEVER trust user input. Validate and sanitize everything. Use `zod` for schema validation.

```typescript
// ✅ GOOD: Comprehensive validation with zod
import { z } from 'zod'

const CampaignSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  channel: z.enum(['email', 'sms', 'push']),
  message: z.string().min(1).max(10000),
  scheduledAt: z.string().datetime().optional(),
})

export async function POST(req: Request) {
  // 1. Authenticate
  const user = await authenticate(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Parse body safely
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 3. Validate schema
  const result = CampaignSchema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: { message: 'Validation failed', issues: result.error.issues } },
      { status: 422 }
    )
  }

  // 4. Use validated data only
  const { name, channel, message } = result.data
}
```

### 2. Environment Variables

**Rule:** Never hardcode secrets. Use Vercel environment variables.

```typescript
// ✅ GOOD: Validated env access at startup
// lib/env.ts
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
})

export const env = EnvSchema.parse(process.env)

// ✅ GOOD: Usage
import { env } from '@/lib/env'
const client = new Stripe(env.STRIPE_SECRET_KEY)

// ❌ BAD: Unvalidated env access
const key = process.env.STRIPE_SECRET_KEY // Could be undefined, no error at startup
```

**Rules for `NEXT_PUBLIC_` variables:**
- ONLY use `NEXT_PUBLIC_` prefix for values safe to expose to the browser
- Never prefix secrets, API keys, or database URLs with `NEXT_PUBLIC_`

### 3. SQL Injection Prevention

**Rule:** ALWAYS use parameterized queries. NEVER concatenate user input into SQL.

```typescript
// ❌ BAD: SQL injection vulnerability
const id = params.id
await db.query(`SELECT * FROM campaigns WHERE id = ${id}`)

// ✅ GOOD: Parameterized query with @vercel/postgres
import { sql } from '@vercel/postgres'
const { rows } = await sql`SELECT * FROM campaigns WHERE id = ${id}`

// ✅ GOOD: With an ORM (Prisma, Drizzle)
const campaign = await prisma.campaign.findUnique({ where: { id } })
```

### 4. CSRF Protection

**Rule:** Protect state-changing operations. Use the `SameSite` cookie attribute and verify origins.

```typescript
// ✅ GOOD: Origin check for API routes
export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')

  if (!origin || !origin.includes(host ?? '')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  // proceed...
}

// ✅ GOOD: SameSite cookie for sessions
cookies().set('session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
})
```

### 5. Rate Limiting

**Rule:** Protect API routes against abuse using Vercel KV.

```typescript
// ✅ GOOD: Rate limiting with @vercel/kv
import { kv } from '@vercel/kv'

export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate:${identifier}`
  const count = await kv.incr(key)

  if (count === 1) {
    await kv.expire(key, windowSeconds)
  }

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
  }
}

// Usage in route handler
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = await rateLimit(`campaign:${ip}`, 10, 3600)

  if (!success) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }
  // proceed...
}
```

### 6. Output Sanitization

**Rule:** Sanitize HTML output. Use `DOMPurify` (client) or `sanitize-html` (server) when rendering user content.

```typescript
// ✅ GOOD: Server-side sanitization
import sanitizeHtml from 'sanitize-html'

const safeContent = sanitizeHtml(userProvidedHtml, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p'],
  allowedAttributes: { a: ['href'] },
})

// ✅ GOOD: React escapes by default — use dangerouslySetInnerHTML only with sanitized input
<div dangerouslySetInnerHTML={{ __html: safeContent }} />

// ❌ BAD: Unsanitized HTML injection
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

---

## Performance at Scale

### 1. Minimize Cold Starts

**Rule:** Keep serverless functions lean. Avoid heavy imports at module level.

```typescript
// ❌ BAD: Heavy import at module level — affects cold start
import { createCanvas } from 'canvas'  // Native module, large
import sharp from 'sharp'               // Large binary

// ✅ GOOD: Dynamic import for infrequently used heavy modules
export async function POST(req: Request) {
  if (needsImageProcessing) {
    const { default: sharp } = await import('sharp')
    // use sharp
  }
}
```

### 2. Edge vs Node.js Runtime Selection

**Rule:** Use Edge runtime for globally-distributed, low-latency routes; use Node.js for DB-heavy or crypto operations.

| Route Type | Runtime | Reason |
|---|---|---|
| Auth token verification | `edge` | Fast, globally distributed |
| Redirects, rewrites | `edge` | No cold start |
| DB queries (Prisma) | `nodejs` | Prisma requires Node.js |
| File processing | `nodejs` | Node.js streams/buffers |
| Simple JSON transforms | `edge` | Fastest response |
| Webhook receivers | `nodejs` | Need full Node crypto |

```typescript
// ✅ GOOD: Explicit runtime annotation
export const runtime = 'edge'

export async function GET(req: Request) {
  // Light logic, no Node.js-specific APIs
}
```

### 3. Caching as a First-Class Strategy

**Rule:** Every data-fetching decision must include a caching strategy.

```typescript
// ✅ GOOD: Cache expensive computations in KV
const CACHE_TTL = 300 // 5 minutes

export async function getExpensiveData(id: string) {
  const cached = await kv.get<MyData>(`expensive:${id}`)
  if (cached) return cached

  const data = await expensiveComputation(id)
  await kv.set(`expensive:${id}`, data, { ex: CACHE_TTL })
  return data
}

// ✅ GOOD: ISR for semi-static pages
// app/campaigns/[id]/page.tsx
export const revalidate = 60  // Re-generate at most once per minute
```

### 4. Avoid N+1 Queries

**Rule:** Batch database queries. Never query in a loop.

```typescript
// ❌ BAD: N+1 query problem
const campaigns = await getCampaigns()
for (const campaign of campaigns) {
  campaign.stats = await getStatsForCampaign(campaign.id) // Query per campaign!
}

// ✅ GOOD: Single query with JOIN or batch fetch
const campaignsWithStats = await sql`
  SELECT c.*,
         COUNT(CASE WHEN m.status = 'sent' THEN 1 END) as sent_count,
         COUNT(CASE WHEN m.status = 'failed' THEN 1 END) as failed_count
  FROM campaigns c
  LEFT JOIN messages m ON c.id = m.campaign_id
  GROUP BY c.id
`

// ✅ GOOD: Prisma include (JOIN under the hood)
const campaigns = await prisma.campaign.findMany({
  include: { _count: { select: { messages: true } } }
})
```

### 5. Bundle Size

**Rule:** Monitor and minimize client-side JavaScript bundle size.

```typescript
// ✅ GOOD: Import only what you need
import { format } from 'date-fns/format'           // Tree-shakeable
import debounce from 'lodash/debounce'              // Named import

// ❌ BAD: Full library import
import * as dateFns from 'date-fns'                 // Entire library
import _ from 'lodash'                               // Entire library

// ✅ GOOD: next/dynamic for heavy client components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // Skip SSR for canvas-based charts
})
```

---

## Runtime-Aware Loading

> **Lesson:** Importing modules unconditionally causes unnecessary work in every execution context. This section codifies rules to prevent it.

### The Four Execution Contexts

Every Vercel function falls into one of these categories.

| Context | When it fires | What the app needs |
|---|---|---|
| `edge-middleware` | Every request, before routing | Auth check, redirect logic only |
| `server-component` | Page render request | Data fetching, layout |
| `api-route-node` | API call needing DB/Node.js | Full server capabilities |
| `api-route-edge` | API call needing speed | Lightweight logic only |
| `client` | Browser interaction | UI state, event handlers |

### Rule 1 — Never import server-only modules in client components

```typescript
// ❌ BAD: Database client imported in a client component tree
'use client'
import { db } from '@/lib/db'  // Will fail — db uses Node.js modules

// ✅ GOOD: Mark server-only modules
// lib/db.ts
import 'server-only'  // Throws at build time if imported in client component

export const db = new PrismaClient()
```

### Rule 2 — Never use `process.env` secrets in client components

```typescript
// ❌ BAD: Secret leaks to browser bundle
'use client'
const apiKey = process.env.STRIPE_SECRET_KEY  // Exposed in JS bundle!

// ✅ GOOD: Secrets stay on the server
// app/api/payment/route.ts (server only)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
```

### Rule 3 — Never run database migrations on every cold start

```typescript
// ❌ BAD: Schema check runs on every function invocation
// lib/db.ts
await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS ...`

// ✅ GOOD: Run migrations in CI/CD, not at runtime
// In package.json scripts:
// "postinstall": "prisma generate"
// In Vercel build command:
// "prisma migrate deploy && next build"
```

### Rule 4 — Never import Node.js modules in Edge functions

```typescript
// ❌ BAD: Node.js crypto in Edge runtime
export const runtime = 'edge'
import crypto from 'crypto'  // Not available in Edge runtime!

// ✅ GOOD: Use Web Crypto API in Edge runtime
export const runtime = 'edge'
const hash = await crypto.subtle.digest('SHA-256', data)
```

### Rule 5 — Gate expensive initializations behind environment checks

```typescript
// ✅ GOOD: Lazy initialization for expensive clients
let _prisma: PrismaClient | null = null

export function getDb() {
  if (!_prisma) {
    _prisma = new PrismaClient()
  }
  return _prisma
}

// ✅ GOOD: Singleton pattern for development hot-reload
declare global {
  var prisma: PrismaClient | undefined
}

export const db = global.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = db
```

### Runtime-Aware Loading Checklist

Add these to every code review:

- [ ] **Which context does this code serve?** (edge-middleware / server-component / api-node / api-edge / client)
- [ ] **Does this import `server-only` modules in a client component?** (Rule 1)
- [ ] **Does this expose secrets to the client bundle?** (Rule 2)
- [ ] **Does this run migrations or schema checks at runtime?** (Rule 3)
- [ ] **Does this use Node.js APIs in an Edge function?** (Rule 4)
- [ ] **Is this expensive client initialized lazily?** (Rule 5)

---

## Code Organization

### 1. File Structure

**Standard Next.js App Router project structure:**

```
project-root/
├── app/                         # App Router (routes, layouts, pages)
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── (auth)/                  # Route group — no URL segment
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── campaigns/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   └── api/                     # API Routes
│       ├── auth/[...nextauth]/route.ts
│       └── campaigns/
│           ├── route.ts          # GET /api/campaigns, POST /api/campaigns
│           └── [id]/route.ts     # GET/PUT/DELETE /api/campaigns/:id
├── components/                  # Shared UI components
│   ├── ui/                      # Primitive components (Button, Input, etc.)
│   └── {feature}/               # Feature-specific components
├── lib/                         # Non-UI application code
│   ├── db/                      # Database queries (data access layer)
│   ├── auth/                    # Auth utilities
│   ├── {feature}/               # Feature business logic
│   ├── env.ts                   # Validated env vars
│   └── utils.ts                 # Pure utility functions
├── hooks/                       # Custom React hooks (client)
├── types/                       # Shared TypeScript types/interfaces
├── middleware.ts                 # Edge middleware
├── docs/                        # Developer documentation
│   ├── VERCEL-CODING-STANDARDS.md
│   └── CODING-STANDARDS.md
└── tasks/                       # AI agent task tracking
    ├── todo.md
    └── lessons.md
```

### 2. Naming Conventions

```typescript
// Files: kebab-case
// campaign-service.ts, use-campaigns.ts, campaign-card.tsx

// React components: PascalCase
export function CampaignCard({ campaign }: Props) { }
export default function DashboardPage() { }

// Non-component functions: camelCase
export async function createCampaign(data: CampaignInput) { }
export function formatDate(date: Date): string { }

// Constants: SCREAMING_SNAKE_CASE
export const MAX_RECIPIENTS = 10_000
export const CACHE_TTL_SECONDS = 300

// Types/Interfaces: PascalCase
interface CampaignInput { }
type CampaignStatus = 'draft' | 'sending' | 'sent'

// Zod schemas: PascalCase + Schema suffix
const CampaignInputSchema = z.object({ })

// Environment variables: SCREAMING_SNAKE_CASE
DATABASE_URL=...
NEXTAUTH_SECRET=...

// KV/cache keys: colon-separated namespaces
`rate:campaign:${ip}`
`cache:campaigns:${userId}`
`session:${token}`
```

### 3. Component Organization

**Standard component file order:**

```typescript
// 1. 'use client' directive (if needed — omit for Server Components)
'use client'

// 2. Imports: external → internal → types
import { useState } from 'react'
import { format } from 'date-fns/format'
import { Button } from '@/components/ui/button'
import { createCampaign } from '@/lib/campaigns/actions'
import type { Campaign } from '@/types/campaign'

// 3. Types/interfaces local to this file
interface Props {
  campaign: Campaign
  onSave?: (id: string) => void
}

// 4. Constants local to this file
const STATUS_LABELS: Record<Campaign['status'], string> = {
  draft: 'Draft',
  sending: 'Sending',
  sent: 'Sent',
}

// 5. The component (default export for pages, named for everything else)
export function CampaignCard({ campaign, onSave }: Props) {
  // hooks first
  const [isLoading, setIsLoading] = useState(false)

  // derived state
  const label = STATUS_LABELS[campaign.status]

  // handlers
  async function handleSave() { }

  // render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}

// 6. Sub-components (if small enough to live here)
function CampaignStatusBadge({ status }: { status: Campaign['status'] }) {
  return <span>{STATUS_LABELS[status]}</span>
}
```

---

## TypeScript Standards

### 1. Strict Mode Always

**Rule:** `"strict": true` in `tsconfig.json`. No exceptions.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 2. No `any`

**Rule:** Never use `any`. Use `unknown` and narrow it, or define a proper type.

```typescript
// ❌ BAD
function process(data: any) {
  return data.value  // No safety
}

// ✅ GOOD: Use unknown and narrow
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value
  }
  throw new Error('Invalid data shape')
}

// ✅ GOOD: Or validate with zod
function process(data: unknown) {
  const parsed = MySchema.parse(data)  // Throws on invalid
  return parsed.value
}
```

### 3. Prefer Type Inference

**Rule:** Let TypeScript infer types where obvious. Annotate at boundaries.

```typescript
// ✅ GOOD: Inferred — obvious from context
const count = 0
const campaigns = await getCampaigns()
const label = campaign.name.toUpperCase()

// ✅ GOOD: Annotated — at API/function boundaries
export async function getCampaign(id: string): Promise<Campaign | null> { }
export async function POST(req: Request): Promise<Response> { }

// ❌ BAD: Redundant annotation
const count: number = 0
const name: string = campaign.name
```

---

## Data & Database Guidelines

### 1. Schema Migrations

**Rule:** Use a migration tool (Prisma Migrate or Drizzle Kit). Never write raw DDL by hand in application code.

```bash
# ✅ GOOD: Prisma workflow
npx prisma migrate dev --name add_campaigns_table
npx prisma migrate deploy  # In CI/CD, never in app code

# ✅ GOOD: Drizzle workflow
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 2. Data Types

**Rule:** Use appropriate types. Never store structured data as serialized strings.

```sql
-- ✅ GOOD: Appropriate types
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID NOT NULL REFERENCES users(id)
count       INTEGER NOT NULL DEFAULT 0
status      TEXT NOT NULL CHECK (status IN ('draft', 'sending', 'sent'))
metadata    JSONB                      -- Structured, queryable JSON
created_at  TIMESTAMPTZ DEFAULT now()
is_active   BOOLEAN NOT NULL DEFAULT true

-- ❌ BAD: Serialized data hiding structure
metadata    TEXT  -- JSON stored as string, not queryable
tags        TEXT  -- Comma-separated list, not an array
```

### 3. Indexes

**Rule:** Add indexes to columns used in WHERE, JOIN, ORDER BY clauses.

```sql
-- ✅ GOOD: Indexes for common query patterns
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);
CREATE INDEX idx_campaigns_user_status ON campaigns(user_id, status);
```

### 4. Transactions

**Rule:** Wrap multi-step mutations in transactions to ensure consistency.

```typescript
// ✅ GOOD: Atomic transaction
await prisma.$transaction(async (tx) => {
  const campaign = await tx.campaign.update({
    where: { id },
    data: { status: 'sending' }
  })
  await tx.message.createMany({ data: messages })
  await tx.auditLog.create({ data: { action: 'campaign_sent', campaignId: id } })
})
// All or nothing — if any step fails, all roll back
```

---

## Error Handling

### 1. Logging Strategy

**Rule:** Use structured logging. Use Vercel's built-in log drains or an observability tool.

```typescript
// ✅ GOOD: Structured error logging
export function logError(
  message: string,
  context: Record<string, unknown> = {}
) {
  console.error(JSON.stringify({
    level: 'error',
    message,
    ...context,
    timestamp: new Date().toISOString(),
  }))
}

// ✅ GOOD: Debug logging gated by environment
export function logDebug(
  message: string,
  context: Record<string, unknown> = {}
) {
  if (process.env.NODE_ENV !== 'development') return
  console.debug(JSON.stringify({ level: 'debug', message, ...context }))
}
```

### 2. User-Facing Errors

**Rule:** Return helpful error messages. Never expose stack traces or internal details to the client.

```typescript
// ✅ GOOD: User-friendly error
return Response.json(
  { error: { message: 'Campaign not found', code: 'NOT_FOUND' } },
  { status: 404 }
)

// ❌ BAD: Exposing internal error details
catch (err) {
  return Response.json(
    { error: err.message, stack: err.stack },  // Leaks internals!
    { status: 500 }
  )
}

// ✅ GOOD: Log full error server-side, return safe message to client
catch (err) {
  logError('Campaign fetch failed', { id, error: String(err) })
  return Response.json(
    { error: { message: 'An unexpected error occurred' } },
    { status: 500 }
  )
}
```

### 3. Graceful Degradation

**Rule:** Handle missing integrations and external service failures gracefully.

```typescript
// ✅ GOOD: External service failure doesn't crash the route
try {
  await sendWebhook(payload)
} catch (err) {
  logError('Webhook delivery failed — continuing without it', { err: String(err) })
  // Don't rethrow — webhook is non-critical
}

// ✅ GOOD: Optional integration check
if (!process.env.ANALYTICS_KEY) {
  logDebug('Analytics not configured — skipping')
  return
}
```

### 4. Server Action Error Handling

**Rule:** Server Actions must return typed results, not throw unhandled errors to the client.

```typescript
// ✅ GOOD: Typed result from Server Action
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createCampaignAction(
  input: CampaignInput
): Promise<ActionResult<Campaign>> {
  try {
    const campaign = await createCampaign(input)
    return { success: true, data: campaign }
  } catch (err) {
    logError('createCampaign failed', { err: String(err) })
    return { success: false, error: 'Failed to create campaign' }
  }
}
```

---

## Documentation

### 1. JSDoc for Public Functions

**Rule:** Document ALL exported functions with JSDoc.

```typescript
/**
 * Creates a new campaign and queues it for sending.
 *
 * @param input - Validated campaign input data
 * @param userId - ID of the user creating the campaign
 * @returns The created campaign, or null if creation failed
 * @throws {ValidationError} If input data fails schema validation
 */
export async function createCampaign(
  input: CampaignInput,
  userId: string
): Promise<Campaign | null> {
  // Implementation
}
```

### 2. Inline Comments

**Rule:** Explain WHY, not WHAT. Code should be self-explanatory.

```typescript
// ❌ BAD: Obvious comment
// Set status to sending
campaign.status = 'sending'

// ✅ GOOD: Explains reasoning
// Mark as 'sending' BEFORE creating queue entries — prevents duplicate sends
// if the user double-submits the form before the first request completes.
campaign.status = 'sending'

// ✅ GOOD: Explains non-obvious decision
// Chunk to 500 to stay within Vercel KV pipeline limits per operation.
const chunks = chunk(recipientIds, 500)
```

---

## Testing & Validation

### 1. Pre-Commit Checklist

**Before every commit, verify:**

- [ ] TypeScript compiles with no errors (`tsc --noEmit`)
- [ ] ESLint passes with no errors (`next lint`)
- [ ] All user inputs validated with zod schemas
- [ ] All API routes return consistent `{ data }` / `{ error }` shapes
- [ ] No secrets or `NEXT_PUBLIC_` leaks in client components
- [ ] No `any` types introduced
- [ ] No Node.js APIs used in Edge runtime functions
- [ ] No `server-only` modules imported in client components
- [ ] Database queries use parameterized inputs (no string concatenation)
- [ ] Rate limiting applied to state-changing API routes
- [ ] Error responses do not expose internal details
- [ ] Cache/revalidation strategy defined for all data-fetching
- [ ] `'use client'` boundary is as low in the tree as possible
- [ ] No N+1 query patterns introduced
- [ ] Bundle impact considered for new client-side imports
- [ ] Commit message explains WHY, not just WHAT

### 2. Manual Testing Scenarios

**Test these scenarios:**

- [ ] Happy path (normal operation)
- [ ] Empty inputs / missing required fields
- [ ] Very large payloads / many records
- [ ] Concurrent requests (race conditions)
- [ ] Unauthenticated requests to protected routes
- [ ] Expired or invalid session tokens
- [ ] External service unavailability (DB down, KV down)
- [ ] Cold start behavior (first request after inactivity)
- [ ] Mobile / low-bandwidth conditions (for UI)

### 3. Performance Testing

**For scale-sensitive features:**

- [ ] Test API route with 1,000+ concurrent simulated requests
- [ ] Check Vercel function duration in dashboard (stay under 3s)
- [ ] Verify database query count (no N+1)
- [ ] Check bundle size with `next build` output
- [ ] Verify cache hit rates in Vercel analytics
- [ ] Confirm edge functions stay under 1MB compressed size

---

## Version Control

### 1. Commit Messages

**Format:**
```
Short summary (50 chars max)

Detailed explanation of:
- WHAT changed
- WHY it changed (most important)
- HOW it was implemented (if non-obvious)

Fixes: #123 (if applicable)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 2. Branching Strategy

**Simple workflow:**
- `main` — Production-ready code (deploys to Vercel production)
- `feature/short-description` — Feature branches (auto-deploy to preview URLs)
- Tag releases: `v1.0.0`, `v1.1.0`

**Vercel preview deployments are your staging environment.** Use them for review before merging to main.

---

## Quick Reference Checklist

### Starting a New Vercel Project

- [ ] Initialize with `create-next-app --typescript`
- [ ] Enable strict TypeScript (`"strict": true`)
- [ ] Set up validated env schema (`lib/env.ts` with zod)
- [ ] Configure ESLint and Prettier
- [ ] Set up database + ORM with migration tooling
- [ ] Add `server-only` to all server-side modules
- [ ] Configure Vercel KV for rate limiting and caching
- [ ] Copy this file to `docs/VERCEL-CODING-STANDARDS.md`
- [ ] Plan for scale from day one

### Refactoring Existing Project

- [ ] Read entire codebase first
- [ ] Identify monolithic route handlers (>300 lines)
- [ ] Extract data access into `lib/db/`
- [ ] Extract business logic into `lib/{feature}/`
- [ ] Add zod validation to all API routes
- [ ] Push `'use client'` boundaries down the component tree
- [ ] Add `server-only` imports to server modules
- [ ] Implement rate limiting on mutation endpoints
- [ ] Define caching strategy for all data fetching
- [ ] Test at scale

### Before Every Commit

- [ ] Run `tsc --noEmit` — no type errors
- [ ] Run `next lint` — no lint errors
- [ ] Run `next build` — builds cleanly
- [ ] Verify no secrets leak to client bundle
- [ ] Write meaningful commit message (WHY, not WHAT)

---

## Enforcement

**This is not optional.** These standards exist because:

1. **Security:** Prevents vulnerabilities that could compromise user data
2. **Performance:** Ensures applications work at scale without unexpected costs
3. **Maintainability:** Makes code understandable 6 months from now
4. **Cost:** Poorly optimized Vercel functions generate unnecessary compute costs

When in doubt, ask: "Would I be comfortable deploying this to production tomorrow?"

If the answer is no, it doesn't meet these standards.

---

## Updates & Feedback

This document evolves. Update it when you discover better patterns or Next.js / Vercel releases new capabilities.

**Last reviewed:** 2026-03-08 — Initial version adapted from CODING-STANDARDS.md (v1.0.0)
**Next review:** 2026-09-08 (or when Next.js releases a major version)
