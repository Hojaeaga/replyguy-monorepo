# ReplyGuy Monorepo

A modern TypeScript monorepo for ReplyGuy AI-powered social media reply system, built with TurboRepo and standard TypeScript tooling.

## 🏗️ Architecture

This monorepo uses a clean architecture with clear separation between apps and packages:

- **`apps/`** - Deployable runtime services
- **`packages/`** - Reusable, side-effect-free libraries

## 📁 Project Structure

```
.
├── apps/                              # → Deployable services
│   ├── ingestion/                     # Webhook intake → queue
│   ├── worker/                        # Queue worker → OpenAI etc.
│   ├── ai_agent/                      # Python AI agent service
│   └── web/                           # Next.js dashboard & mini-app
│
├── packages/                          # → Reusable libraries
│   ├── core/                          # Types, logger, errors
│   ├── db/                            # Supabase typed queries
│   ├── queue/                         # Redis abstraction
│   ├── ai_service/                    # OpenAI client with cost controls
│   ├── neynar/                        # Farcaster/Neynar API client
│   ├── user/                          # User management utilities
│   ├── ui/                            # React components (shadcn/ui)
│   └── config/                        # Shared tooling configurations
│
└── infra/                             # Infrastructure as Code
```

## 🛠️ Build System

This project **does NOT use tsup**. Instead, it uses standard TypeScript tooling:

### For Libraries (`packages/`)
- **Build**: `tsc -p tsconfig.build.json`
- **Dev**: `tsc -p tsconfig.build.json --watch`
- **Type Check**: `tsc --noEmit`

### For Applications (`apps/`)
- **Build**: `tsc -p tsconfig.build.json`
- **Dev**: `tsx watch src/index.ts`
- **Type Check**: `tsc --noEmit`

### TypeScript Configurations

We use shared TypeScript configurations from `packages/config/tsconfig/`:

- **`base.json`** - Common settings for all projects
- **`library.json`** - For packages/libraries
- **`node.json`** - For Node.js applications

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8.15.4+

### Installation
```bash
pnpm install
```

### Development
```bash
# Start all services in development mode
pnpm dev

# Build all packages and apps
pnpm build

# Run type checking across all projects
pnpm check-types

# Lint all code
pnpm lint

# Run tests
pnpm test

# Format code
pnpm format

# Clean all build outputs
pnpm clean
```

### Working with Individual Packages/Apps

```bash
# Work on a specific package
cd packages/core
pnpm dev

# Work on a specific app
cd apps/worker
pnpm dev
```

## 📋 Available Scripts

### Root Level
- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages and applications
- `pnpm test` - Run tests across all projects
- `pnpm lint` - Lint all TypeScript code
- `pnpm check-types` - Type check all projects
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Remove all build artifacts

### Package/App Level
Each package and app has these scripts:
- `build` - Build the package/app
- `dev` - Start in development mode
- `check-types` - Type check only
- `lint` - Lint the code
- `test` - Run tests (where applicable)
- `clean` - Remove build artifacts

## 🔧 Development Tools

- **TypeScript** - Type-safe JavaScript
- **tsx** - TypeScript execution and watch mode for apps
- **TurboRepo** - Monorepo build system with caching
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework

## 📦 Package Dependencies

### Core Dependencies
- `@replyguy/core` - Core utilities used by all packages
- `@replyguy/config` - Shared configurations

### Service Dependencies
- `@replyguy/db` - Database layer (Supabase)
- `@replyguy/queue` - Queue abstraction (Redis)
- `@replyguy/neynar` - Farcaster API client
- `@replyguy/ai_service` - OpenAI integration
- `@replyguy/user` - User management

## 🏃‍♂️ Running Services

### Development Mode
```bash
# All services
pnpm dev

# Individual services
cd apps/ingestion && pnpm dev
cd apps/worker && pnpm dev
cd apps/web && pnpm dev
```

### Production Mode
```bash
# Build everything first
pnpm build

# Start services
cd apps/ingestion && pnpm start
cd apps/worker && pnpm start
cd apps/web && pnpm start
```

## 🔍 Type Checking

The project uses TypeScript project references for efficient type checking:

```bash
# Check types for everything
pnpm check-types

# Check types for specific package
cd packages/core && pnpm check-types
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/db && pnpm test
```

## 📚 Package Overview

### `@replyguy/core`
Core utilities, types, and logging functionality used across all packages.

### `@replyguy/db`
Supabase client with typed queries and database abstractions.

### `@replyguy/queue`
Queue abstraction layer supporting Redis Streams.

### `@replyguy/ai_service`
OpenAI client with cost controls and token management.

### `@replyguy/neynar`
Neynar API client for Farcaster protocol integration.

### `@replyguy/user`
User management and authentication utilities.

### `@replyguy/ui`
Reusable React components built with shadcn/ui and Tailwind CSS.

### `@replyguy/config`
Shared ESLint, Prettier, and TypeScript configurations.

## 🚢 Deployment

Each app in `apps/` is designed to be independently deployable:

- **ingestion** - Webhook ingestion service
- **worker** - Background job processor
- **web** - Next.js web application
- **ai_agent** - Python-based AI service

## 🤝 Contributing

1. Make sure all types check: `pnpm check-types`
2. Ensure code is formatted: `pnpm format`
3. Run linting: `pnpm lint`
4. Run tests: `pnpm test`
5. Build successfully: `pnpm build`

## 📄 License

This project is private and proprietary to ReplyGuy. 