import type { DesignDocument, Result, DesignError } from './types';
import { validateDocument } from './validation';

export function migrateDocument(input: unknown): Result<DesignDocument, DesignError> {
  if (typeof input !== 'object' || input === null) {
    return {
      ok: false,
      error: { kind: 'invalid-document', message: 'Input must be an object' },
    };
  }

  const raw = { ...(input as Record<string, unknown>) };

  // If no schemaVersion, default to 1 if structure fits
  if (raw.schemaVersion === undefined) {
    raw.schemaVersion = 1;
  }

  // Future migrations: if (raw.schemaVersion === 2) ...

  return validateDocument(raw);
}
