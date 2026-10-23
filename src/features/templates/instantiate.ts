import type { Template, DesignDocument, DesignId } from '@/domain/design';
import { createDesignId, createElementId } from '@/domain/design';

export function createFromTemplate(
  template: Template,
  id: DesignId = createDesignId(),
  now: string = new Date().toISOString()
): DesignDocument {
  // Map old template element IDs to fresh, unique element IDs
  const elements = template.document.elements.map((el) => {
    const newId = createElementId();
    return {
      ...el,
      id: newId,
    };
  });

  return {
    schemaVersion: 1,
    id,
    title: template.title,
    canvas: {
      ...template.document.canvas,
    },
    elements,
    createdAt: now,
    updatedAt: now,
  };
}
