# Design Editor Multi-Phase Roadmap

> **For agentic workers:** Use this roadmap to choose one phase per work session. Before implementing a phase, write a focused execution plan with exact files, interfaces, checks, and completion criteria. Use `superpowers:executing-plans` for inline execution or `superpowers:subagent-driven-development` when explicitly chosen.

**Goal:** Deliver a browser-based social graphics editor that lets a user create a design from a template, edit text/shapes/images, save it, export PNG, and share a read-only link.

**Architecture:** Start as one React application with a versioned, library-neutral design document. Keep editor rules in domain/editor modules; connect rendering, persistence, asset storage, and export through adapters. Ship useful vertical slices with a working app at each phase boundary.

**Tech Stack:** React + TypeScript + Vite; React Konva; Zustand; shadcn/ui + Tailwind CSS with an original visual identity; agent-browser for browser verification; Lightpanda only for compatible fast headless checks. Use IndexedDB for the local-first editor. Add Supabase for authenticated cloud persistence and sharing in a later phase.

**Spec:** [Agent-ready editor architecture](../../architecture/agent-ready-editor-architecture.md)

## Planning standards used

This roadmap uses outcome-based phases rather than calendar estimates. Each phase has one user-visible result, explicit dependencies, and a checkable exit gate. Split implementation details into per-session plans when a phase begins, after inspecting the actual code and tool versions.

- The Agile principles favor early and continuous delivery of valuable software and use working software as the primary progress measure. That supports ending each phase with a usable increment rather than a long setup-only stretch. [Agile principles](https://agilemanifesto.org/principles.html)
- The Scrum Guide frames each increment as a concrete step toward a Product Goal and defines “Done” as a shared quality bar. This plan gives each phase an outcome and exit criteria. [Scrum Guide](https://scrumguides.org/scrum-guide.html)
- GitHub Milestones group issues and pull requests so progress toward a milestone is visible. If this work is later tracked in GitHub, use one milestone per release-level outcome and issues for session deliverables. [GitHub milestones](https://docs.github.com/issues/using-labels-and-milestones-to-track-work/about-milestones)
- OpenAI Codex planning guidance recommends meaningful, logically ordered, verifiable steps and cautions against filler planning for simple work. Phase plans should therefore stay focused on decisions, dependencies, and proof of completion. [Codex planning guidance](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/prompts/base_instructions/default.md)
- The local implementation-plan guidance calls for independently testable tasks, exact interfaces, and explicit verification. Use that level of detail inside a phase, not as a giant speculative task list before the application exists.

## Global constraints

- Persisted designs use a versioned `DesignDocument`; validate unknown data at import and storage boundaries.
- Design-domain modules stay independent of React, Konva, browser storage, and Supabase.
- Canvas state stores plain data, not Konva nodes, DOM nodes, or object URLs.
- Keep viewport state, selection, open panels, and undo history out of persisted design files.
- Use agent-browser with a local app for user flows and visual screenshots; Lightpanda does not establish visual canvas fidelity.
- Give the product its own brand, palette, typography, assets, and component styling.
- Keep the app a single deployable project until independent deployment or ownership needs justify a package split.
- Verify current library documentation and versions during each implementation session; do not pin versions from this roadmap.

## Review focus

1. **Malformed or older design data:** show a recoverable error or migrate it; do not crash or silently discard elements.
2. **Fast drag/resize interactions:** keep pointer movement responsive and commit stable document values at interaction completion.
3. **Missing or unsupported image assets:** make the failure visible in-editor and prevent a misleading successful export.
4. **Save/export race:** export the latest committed document and show save status or failure clearly.
5. **Read-only shared links:** recipients can view the intended design but cannot mutate it or access other designs.

## Phase map

| Phase | Session outcome | Depends on |
|---|---|---|
| 0. Project foundation | A runnable, agent-navigable app skeleton with real verification commands | — |
| 1. Design model and templates | Validated versioned document model and a small template catalog | 0 |
| 2. Canvas foundation | Open a template on a responsive canvas and select/move/resize elements | 1 |
| 3. Editing interactions | Edit text and shape properties; reorder, undo, and redo | 2 |
| 4. Image assets | Upload, place, crop, and replace user images | 2 |
| 5. Local save and dashboard | Create, autosave, list, reopen, duplicate, and delete designs locally | 1–4 |
| 6. Export and MVP verification | Download faithful PNGs and verify the complete local creation flow | 5 |
| 7. Cloud sharing | Sign in, sync designs/assets, and create/revoke read-only share links | 6 |

Phases 3 and 4 can be implemented in either order after Phase 2. Phase 5 depends on both so the saved design loop covers every MVP element type.

## Session deliverables and exit criteria

### Phase 0 — Project foundation

**Outcome:** A clean checkout starts the app and exposes one documented fast verification path.

**Deliverables:** Scaffold React + TypeScript + Vite; configure strict type checking, linting, unit test runner, formatting, and app-browser script; install the initial UI primitives and establish original design tokens; add concise `AGENTS.md` that points to the architecture and lists only real commands; wire agent-browser to the local development server. Do not add Supabase yet.

**Exit criteria:** A clean install can start and build the blank app; typecheck/lint/unit-test commands all run and fail honestly; agent-browser opens the app and captures its initial screen; Lightpanda compatibility is recorded only for checks actually exercised.

### Phase 1 — Design model and templates

**Outcome:** A template can become a valid, independently editable design document without involving the canvas renderer.

**Deliverables:** Implement the versioned document and `text | image | shape` element union; runtime validation, schema version migration entry point, pure design commands, ID creation, template instantiation with fresh design/element IDs, and a small curated starter catalog.

**Exit criteria:** Focused tests prove valid documents load, invalid documents return typed errors, template instantiation produces new IDs, and stacking order is stable. No Konva types appear in domain files.

### Phase 2 — Canvas foundation

**Outcome:** A user can open a starter design and manipulate its elements on the canvas.

**Deliverables:** Build the editor shell, canvas viewport, Konva renderer adapter, zoom-to-fit, element selection, drag, resize/rotate handles, and mapping from completed gestures to domain commands. Keep canvas-coordinate geometry independent from viewport zoom/pan.

**Exit criteria:** Agent-browser confirms a template renders, an element can be selected and moved/resized, and the resulting document values survive closing and reopening the editor session in memory. A screenshot review checks canvas fit, selection handles, and panel layout at desktop and narrow widths.

### Phase 3 — Editing interactions

**Outcome:** Users can personalize text and shapes with predictable editing controls and recover from mistakes.

**Deliverables:** Add text insertion/editing and font, size, alignment, color, and line-height controls; add rectangle/ellipse insertion and fill/stroke controls; implement delete, duplicate, layer ordering, keyboard shortcuts, undo/redo, and clear empty/locked/selected states.

**Exit criteria:** Focused tests cover command invariants and undo/redo; agent-browser verifies a text and a shape edit, reorder, undo, redo, and keyboard deletion. The selected element and property panel remain in sync.

### Phase 4 — Image assets

**Outcome:** A user can use their own image in a design without embedding media data in the design JSON.

**Deliverables:** Define supported formats and size limits; validate uploads; store local blobs in IndexedDB; add an asset resolver, upload panel, image placement, crop controls, replace-image flow, and missing-asset UI.

**Exit criteria:** Tests cover unsupported and oversized files; agent-browser uploads a supported image, places and crops it, and reloads it successfully. A missing asset is represented as a visible recoverable state.

### Phase 5 — Local save and dashboard

**Outcome:** Users can return to their designs after reload and manage a small library of work.

**Deliverables:** Implement IndexedDB-backed `DesignRepository` and asset repository, debounced autosave with explicit save status, recent designs dashboard, rename, duplicate, delete confirmation, and empty/loading/error states.

**Exit criteria:** Browser flow creates from a template, edits text, shapes, and an image, reloads, and confirms the full design is restored. Simulated persistence failure shows an actionable error and does not report a false saved state.

### Phase 6 — Export and MVP verification

**Outcome:** The local-first editor completes the create-edit-save-export workflow reliably.

**Deliverables:** Add PNG export from a document snapshot at the document's pixel dimensions; ensure fonts and images are ready; handle export failures; add a concise feature map and reusable agent-browser smoke journey. Use Lightpanda only for DOM/functional cases it can accurately exercise.

**Exit criteria:** Exported PNG has expected dimensions and visible text, shapes, crop, stacking order, and background; the end-to-end creation journey passes in Chrome through agent-browser; key viewport screenshots are reviewed. This is the first useful local MVP checkpoint.

### Phase 7 — Cloud sharing

**Outcome:** Users can access designs across sessions/devices and share a safe view-only link.

**Deliverables:** Add Supabase Auth, Postgres design metadata/document storage, object storage for assets, RLS policies, cloud repository adapters, migration of local designs, share-token records, read-only share route, revoke link, and permission/error states.

**Exit criteria:** An owner can sync, reopen, and share a design; a recipient without an account can view only the shared design; attempts to change it or access another record are denied by policy and verified with integration checks. Revoking a link removes access. Review policies before any production deployment.

## Deferred beyond this roadmap

Real-time collaboration, comments, video, presentation timelines, AI generation, background removal, social scheduling, a large third-party asset library, print ordering, team roles, and brand kits. Revisit only after observing use of the core create-edit-export loop.

## Per-session planning rule

At the start of each phase, inspect repository status and current code, resolve only the decisions that phase requires, then create a focused execution plan. The execution plan should name exact files, signatures shared across tasks, tests/commands, and expected outcomes. Keep each task independently reviewable, run the relevant checks, and leave the app in a working state before ending the session. If a phase reveals a major product choice that changes scope, update this roadmap before continuing.
