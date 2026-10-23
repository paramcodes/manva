# Contributing to Manva Studio

Thank you for your interest in contributing to Manva! We welcome contributions to make our browser-based social graphics studio even more powerful and reliable.

## Development Setup

### Prerequisites

- Node.js >= 20.x
- pnpm >= 9.x
- Modern Chromium-based browser for agent-browser end-to-end tests

### Getting Started

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/paramcodes/manva.git
   cd manva
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Run tests and type checking:
   ```bash
   pnpm typecheck
   pnpm test:unit
   pnpm test:browser
   ```

## Architecture Principles

Please review [`docs/architecture/agent-ready-editor-architecture.md`](docs/architecture/agent-ready-editor-architecture.md) before submitting architectural changes:

1. **Pure Domain Logic:** Code under `src/domain/` must have zero dependencies on React, Konva, IndexedDB, DOM nodes, or remote services.
2. **Schema Versioning:** Any modifications to the `DesignDocument` structure must increment `schemaVersion` and include runtime migrations in `src/domain/design/migrations.ts`.
3. **Transient Viewport State:** Zoom, pan, tool selection, and history must remain in the editor store (`src/domain/editor/`) and never leak into persisted design documents.
4. **Ports and Adapters:** Keep canvas rendering, asset storage, and database persistence behind interfaces (`src/domain/ports.ts`).

## Pull Request Guidelines

- Create a feature branch: `git checkout -b feat/your-feature-name`.
- Direct commits to `master` are forbidden.
- Ensure all tests pass: `pnpm test`.
- Provide clear descriptions in pull request summaries.
