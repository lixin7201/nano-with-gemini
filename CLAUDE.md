# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShipAny Template Two is a modern full-stack SaaS application for AI-powered content generation with integrated payment processing. It supports multiple deployment targets (Vercel, Cloudflare, Docker) and payment providers (Stripe, PayPal, Creem).

## Essential Commands

**Development:**
```bash
pnpm dev              # Start development server with Turbopack
pnpm build            # Production build
pnpm start            # Start production server
```

**Database Operations:**
```bash
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run database migrations
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio
```

**Code Quality:**
```bash
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting
```

**Cloudflare Deployment:**
```bash
pnpm cf:preview       # Preview on Cloudflare
pnpm cf:deploy        # Deploy to Cloudflare
pnpm cf:typegen       # Generate Cloudflare types
```

## Architecture Overview

**App Router Structure:**
```
src/app/[locale]/
├── (landing)/          # Public pages (home, pricing, etc.)
├── (admin)/            # Admin dashboard and settings
├── (app)/              # Main application UI
└── api/                # API routes
```

**Core Systems:**
- **Authentication**: `src/core/auth/` - Better-auth integration with dynamic configuration
- **Database**: `src/core/db/` - Drizzle ORM with PostgreSQL/SQLite support
- **RBAC**: `src/core/rbac/` - Role-based access control
- **Internationalization**: `src/core/i18n/` - next-intl with Chinese/English support

**Key Patterns:**

1. **Configuration Management**: OAuth, payment, and storage settings are managed via Admin UI (`/admin/settings`) in the database, not environment variables.

2. **Database Connection**: Supports both singleton and serverless patterns via `DB_SINGLETON_ENABLED` env var. Automatically detects Cloudflare Workers environment.

3. **Payment Integration**: Multi-provider support through `src/shared/services/payment.ts` with provider-specific implementations.

4. **Theme System**: Dynamic theming via `src/core/theme/` with CSS variables and Tailwind integration.

**Environment Requirements:**
- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: 32-character secret for better-auth (generate with `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL`: Application URL

**TypeScript Path Mapping:**
- `@/*` maps to `./src/*`

**AI Content Generation Features:**
- Image generation
- Audio generation  
- Music generation
- Video generation
- Chatbot interface

**Database Schema:** Located in `src/core/db/schema/` with Drizzle ORM definitions for users, subscriptions, credits, and AI generation records.