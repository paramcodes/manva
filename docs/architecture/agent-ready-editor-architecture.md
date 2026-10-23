# Agent-ready architecture for the design editor

## Purpose and scope

This document proposes a small, agent-navigable architecture for the first release: a browser app for creating one-page social graphics from templates, editing text/images/shapes, saving designs, and exporting PNG. The current repository has no application code or established conventions, so these are proposed seams rather than a description of existing modules.

## Research notes

- **Next.js repository:** its `AGENTS.md` maps the repository, names important package entry points, and asks contributors to read local README files along the path they change. This makes navigation instructions specific to code that exists, rather than a generic style manifesto. [Source](https://github.com/vercel/next.js/blob/canary/AGENTS.md)
- **Supabase Agent Skills repository:** its `AGENTS.md` states the package manager, prerequisite setup, and actual test command, while the skill collection separates reusable multi-step procedures into individual skill files. This shows the value of a short repository contract plus task-specific reference material. [Source](https://github.com/supabase/agent-skills/blob/main/AGENTS.md)
- **Next.js agent guide:** the framework provides version-matched local docs and points agents to the relevant docs before code changes. The general lesson is to prefer installed, version-accurate docs for library behavior over an agent's memory. [Source](https://nextjs.org/docs/app/guides/ai-agents)
- **Konva editor example:** the example keeps plain document data separate from Konva node instances, and demonstrates selection, transforms, history, and PNG export. This supports a renderer adapter behind a library-neutral document model. [Source](https://konvajs.org/docs/sandbox/Canvas_Editor.html)
- **tldraw editor and schema packages:** its repository maps editor and schema responsibilities separately, and its schema docs group persisted records, validation, types, and migrations. This is a useful precedent for explicit design-file compatibility. [AGENTS.md](https://github.com/tldraw/tldraw/blob/main/AGENTS.md), [schema README](https://github.com/tldraw/tldraw/blob/main/packages/tlschema/README.md), [schema docs](https://github.com/tldraw/tldraw/blob/main/packages/tlschema/DOCS.md)
- **Excalidraw file format:** its JSON schema separates elements and file assets from app state, and refers to image files by IDs. This supports keeping saved design content distinct from editor session state. [Source](https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/codebase/json-schema.mdx)
- **TypeScript project references:** they can enforce project separation and speed large builds, with additional configuration cost. Start with one strict project and add references only when the codebase grows enough to justify them. [Source](https://www.typescriptlang.org/docs/handbook/project-references.html)

These examples are evidence for practices, not templates to copy wholesale. The proposed boundaries below are an inference from the MVP requirements and the existing React + TypeScript + Vite + React Konva direction.

## Proposed module map

Start as one Vite application with feature-oriented modules. Keep the document model and editor rules independent of React, Konva, browser storage, and Supabase.

```text
src/
  app/                 routes, app shell, dependency wiring
  features/
    dashboard/         recent designs and create-design flow
    editor/            editor screen, panels, keyboard bindings
    templates/         template catalog and template instantiation
    assets/            upload UI and asset catalog
  domain/
    design/            document types, validation, migrations, operations
    editor/            commands, selection, undo/redo rules
  adapters/
    canvas-konva/      Konva rendering and pointer/transform translation
    persistence/       IndexedDB repository, later Supabase repository
    asset-storage/     IndexedDB/object storage implementation
    export/            PNG rendering and download
  ui/                  shared accessible controls and design tokens
```

Dependency direction:

```text
app -> features + adapters (composition only)
features -> domain and declared ports
adapters -> domain and declared ports
ui -> framework-neutral shared controls/tokens
domain -> no React, Konva, browser storage, or Supabase imports
```

Keep adapters out of feature code by passing them through app-level composition. Do not split into a monorepo or packages until separate deployment, ownership, or reuse makes that cost worthwhile.

## Core domain language

**Design**: a saved, editable composition with a fixed canvas size and an ordered set of elements.

**Element**: a text box, image, or shape placed on a design.

**Asset**: an uploaded or built-in media file referenced by an image element.

**Template**: a starter design that can be copied into a new, independently editable design.

**Selection**: the set of element IDs currently targeted by editor actions. Selection is transient editor state and is not saved in a design.

## Core data types

Suggested TypeScript contract (names and field choices are proposals):

```ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };
type DesignId = Brand<string, "DesignId">;
type ElementId = Brand<string, "ElementId">;
type AssetId = Brand<string, "AssetId">;

type DesignDocument = {
  schemaVersion: 1;
  id: DesignId;
  title: string;
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  // Array order is stacking order: first is at the back, last is at the front.
  elements: DesignElement[];
  createdAt: string;
  updatedAt: string;
};

type ElementBase = {
  id: ElementId;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
};

type TextElement = ElementBase & {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
};

type ImageElement = ElementBase & {
  kind: "image";
  assetId: AssetId;
  // Normalized coordinates within the original image, each in the 0..1 range.
  crop: { x: number; y: number; width: number; height: number };
};

type ShapeElement = ElementBase & {
  kind: "shape";
  shape: "rectangle" | "ellipse";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
};

type DesignElement = TextElement | ImageElement | ShapeElement;

type AssetRecord = {
  id: AssetId;
  name: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  byteSize: number;
  createdAt: string;
};

type DesignSummary = Pick<DesignDocument, "id" | "title" | "updatedAt"> & {
  thumbnailAssetId?: AssetId;
};

type Template = {
  id: string;
  title: string;
  category: "social-post" | "story";
  previewUrl: string;
  document: Omit<DesignDocument, "id" | "createdAt" | "updatedAt">;
};

type EditorState = {
  document: DesignDocument;
  selectedIds: ElementId[];
  past: DesignDocument[];
  future: DesignDocument[];
  saveStatus: "saved" | "saving" | "error";
};
```

Keep pixel geometry in the document's own canvas coordinate space. The viewport zoom and pan belong in transient editor state. Persist colors and image crop as document values; do not persist canvas-library node instances, DOM nodes, object URLs, selection, or undo stacks.

## Module interfaces and seams

The model should be runtime-validated at import, storage, and template boundaries. TypeScript types alone do not validate parsed JSON.

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

type DesignError =
  | { kind: "not-found"; id: DesignId }
  | { kind: "invalid-document"; message: string }
  | { kind: "storage-failure"; message: string };

type AssetError =
  | { kind: "unsupported-file"; mimeType: string }
  | { kind: "file-too-large"; maxBytes: number }
  | { kind: "not-found"; id: AssetId }
  | { kind: "storage-failure"; message: string };

type ExportError =
  | { kind: "asset-unavailable"; id: AssetId }
  | { kind: "render-failure"; message: string };

interface DesignRepository {
  list(): Promise<Result<DesignSummary[], DesignError>>;
  load(id: DesignId): Promise<Result<DesignDocument, DesignError>>;
  save(document: DesignDocument): Promise<Result<void, DesignError>>;
  remove(id: DesignId): Promise<Result<void, DesignError>>;
}

interface AssetRepository {
  upload(file: File): Promise<Result<AssetRecord, AssetError>>;
  getUrl(id: AssetId): Promise<Result<string, AssetError>>;
  remove(id: AssetId): Promise<Result<void, AssetError>>;
}

interface DesignRenderer {
  renderPng(document: DesignDocument, scale: number): Promise<Result<Blob, ExportError>>;
}

interface EditorSession {
  getState(): EditorState;
  dispatch(command: DesignCommand): Result<void, DesignError>;
  undo(): void;
  redo(): void;
  setSelection(ids: ElementId[]): void;
}
```

Keep operation rules in a domain module with a narrow public surface:

```ts
type DesignCommand =
  | { type: "add-element"; element: DesignElement }
  | { type: "replace-element"; element: DesignElement }
  | { type: "delete-elements"; ids: ElementId[] }
  | { type: "reorder-element"; id: ElementId; position: "back" | "forward" }
  | { type: "set-background"; color: string };

function applyCommand(
  document: DesignDocument,
  command: DesignCommand,
): Result<DesignDocument, DesignError>;
function validateDocument(input: unknown): Result<DesignDocument, DesignError>;
function migrateDocument(input: unknown): Result<DesignDocument, DesignError>;
function createFromTemplate(template: Template, id: DesignId, now: string): DesignDocument;
```

An editor controller/store owns selection, command dispatch, undo/redo, and autosave scheduling. The Konva adapter translates pointer/transform events into domain commands; the domain does not know that Konva exists. Export waits for fonts and images to be ready, then renders the design independently of the editor viewport. For a local-first MVP, use IndexedDB for documents and uploaded image blobs; reserve object URLs for transient previews and never store them in the design file.

## File ownership guide for agents

- A change to saved fields, compatibility, or document invariants belongs in `domain/design`; update validation and migration coverage there.
- A change to canvas gestures or Konva-specific behavior belongs in `adapters/canvas-konva`; translate the result into domain commands.
- A new editor interaction belongs in `features/editor` and should use the public editor/domain interfaces.
- A persistence change belongs in one repository adapter; the dashboard/editor should continue using `DesignRepository`.
- A new starter composition belongs in `features/templates`; instantiate a fresh design ID and element IDs when the user chooses it.
- A visual-only change belongs in the relevant feature or `ui`; do not put product-specific behavior in shared UI controls.

## Agent-ready repository contract

When the app is scaffolded, add a short root `AGENTS.md` that records only stable facts agents cannot cheaply discover:

1. Where the domain model, editor, and adapters live; point to this document for the full dependency map.
2. The package manager and runtime versions, once selected in project configuration.
3. The actual canonical commands for type checking, linting, unit tests, browser verification, and production build. Keep these in package scripts and mirror their real names in the instructions.
4. The rule that saved-document changes require schema validation and migration compatibility; renderer changes must preserve the document contract.
5. The browser workflow: use agent-browser with the local dev server for user flows and screenshots; use Lightpanda only for browser behaviors it supports, not visual canvas fidelity.

Do not create a long generic agent manifesto. Add a nested `AGENTS.md` only when a subdirectory has meaningful local rules. Add feature-specific verification notes only for flows with important branches that are not obvious from tests.

## Proposed initial checks

Once code exists, make each command real before documenting it. A useful initial set is `typecheck`, `lint`, `test:unit`, `test:browser`, and `build`; keep the agent-browser smoke flow fast and local. Important user-visible verification paths:

1. Open a template and confirm a new editable design has unique IDs.
2. Edit text and shape properties, undo, redo, and reload.
3. Upload an allowed image, place it, crop it, save, and reload.
4. Export PNG and verify the exported image has the expected pixel dimensions and visible content.
5. Reject a corrupt or unsupported saved document with a useful error instead of crashing the editor.

These are recommendations, not claims that checks or application code currently exist.
