# Vocabulary Learning Platform

> Learn from the internet. Save. Practice. Track. Grow.

A modular, multi-client vocabulary learning system powered by modern TypeScript tooling.

---

## 🏛 Architecture Overview

- **Browser Extension (`apps/extension`)**: WXT + React + TypeScript. Highlights words, extracts context, and provides one-click lookup and saving.
- **Web Dashboard (`apps/web`)**: Next.js + React + Tailwind CSS. Full vocabulary manager, spaced repetition practice, and analytics.
- **Backend API (`apps/api`)**: NestJS modular monolith providing domain-driven APIs (Auth, Vocabulary, Dictionary, Reviews, Statistics).
- **Shared Packages (`packages/*`)**:
  - `@vocabulary/types`: Shared domain TypeScript types and DTO interfaces.
  - `@vocabulary/validation`: Shared Zod schemas for boundary validation across frontend and backend.

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10+)
- [Docker](https://www.docker.com/) (for PostgreSQL)

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Local Database

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

### 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 4. Development Commands

```bash
# Run all workspaces in development mode
pnpm dev

# Build all packages and applications
pnpm build

# Typecheck the entire monorepo
pnpm typecheck

# Run tests across workspaces
pnpm test
```

### 2. Deepen Web Dashboard Features

If you'd rather refine the web experience before starting the extension:

• Dictionary Auto-Fill: When typing a word in the Add Word Dialog, automatically fetch definitions, translations,
and part-of-speech so you don't have to type them manually.
• Audio on Library Cards: Add the same native TTS audio play button directly to the word cards in the vocabulary
list so you can listen to any word in your library.
• Full Word Edit & Delete Modals: Allow editing notes, context sentences, and tags, or deleting words from the UI.
• CSV / Anki Import & Export: Bulk import words from CSV or export to Anki.
