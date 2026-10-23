# Manva Editor — Agent Guide

## Architecture and Seams

The editor follows the architecture defined in [`docs/architecture/agent-ready-editor-architecture.md`](docs/architecture/agent-ready-editor-architecture.md) and the phased milestones in [`docs/superpowers/plans/2026-10-23-design-editor-roadmap.md`](docs/superpowers/plans/2026-10-23-design-editor-roadmap.md).

```text
src/
  app/                 App shell, router, providers, composition root
  features/            Feature modules: dashboard, editor, templates, assets
  domain/              Core domain rules (zero framework/storage/konva dependencies)
    design/            Document types, validation, migrations, commands
    editor/            Editor state, selection rules, undo/redo
  adapters/            Port implementations
    canvas-konva/      React Konva canvas renderer & gesture translation
    persistence/       IndexedDB design repository (later Supabase)
    asset-storage/     IndexedDB asset blob storage
    export/            Pixel-faithful PNG export
  ui/                  Reusable accessible UI components and design tokens
```

## Rules for Agents

1. **Pure Domain:** Code under `src/domain/` MUST NOT import React, Konva, IndexedDB, DOM nodes, or Supabase.
2. **Document Versioning:** Any schema change must update `schemaVersion` and provide validation & migration in `src/domain/design/migrations.ts`.
3. **Canvas State:** Transient viewport state (pan, zoom, selection, tool) belongs in editor state, never in persisted `DesignDocument`.
4. **Asset References:** Design documents store `assetId`, never blob URLs or base64 data.
5. **Real Commands:** Only run the commands listed below.

## Canonical Commands

- **Typecheck:** `pnpm typecheck`
- **Unit Tests:** `pnpm test:unit`
- **Production Build:** `pnpm build`
- **Dev Server:** `pnpm dev`
- **Browser Tests:** `pnpm test:browser` (starts server if needed and runs agent-browser verification)
