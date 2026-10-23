import type { DesignDocument, DesignCommand, Result, DesignError } from './types';

export function applyCommand(
  document: DesignDocument,
  command: DesignCommand,
  now: string = new Date().toISOString()
): Result<DesignDocument, DesignError> {
  switch (command.type) {
    case 'add-element': {
      // Element added to the top (end of array)
      const elements = [...document.elements, command.element];
      return {
        ok: true,
        value: {
          ...document,
          elements,
          updatedAt: now,
        },
      };
    }

    case 'replace-element': {
      const index = document.elements.findIndex((el) => el.id === command.element.id);
      if (index === -1) {
        return {
          ok: false,
          error: { kind: 'element-not-found', id: command.element.id },
        };
      }
      const elements = [...document.elements];
      elements[index] = command.element;
      return {
        ok: true,
        value: {
          ...document,
          elements,
          updatedAt: now,
        },
      };
    }

    case 'delete-elements': {
      const idsToDelete = new Set(command.ids);
      const elements = document.elements.filter((el) => !idsToDelete.has(el.id));
      return {
        ok: true,
        value: {
          ...document,
          elements,
          updatedAt: now,
        },
      };
    }

    case 'reorder-element': {
      const index = document.elements.findIndex((el) => el.id === command.id);
      if (index === -1) {
        return {
          ok: false,
          error: { kind: 'element-not-found', id: command.id },
        };
      }

      const elements = [...document.elements];
      const [item] = elements.splice(index, 1);

      if (command.position === 'to-back') {
        elements.unshift(item);
      } else if (command.position === 'front') {
        elements.push(item);
      } else if (command.position === 'back') {
        const newIndex = Math.max(0, index - 1);
        elements.splice(newIndex, 0, item);
      } else if (command.position === 'forward') {
        const newIndex = Math.min(elements.length, index + 1);
        elements.splice(newIndex, 0, item);
      }

      return {
        ok: true,
        value: {
          ...document,
          elements,
          updatedAt: now,
        },
      };
    }

    case 'set-background': {
      return {
        ok: true,
        value: {
          ...document,
          canvas: {
            ...document.canvas,
            background: command.color,
          },
          updatedAt: now,
        },
      };
    }

    case 'update-canvas-size': {
      return {
        ok: true,
        value: {
          ...document,
          canvas: {
            ...document.canvas,
            width: command.width,
            height: command.height,
          },
          updatedAt: now,
        },
      };
    }

    case 'update-title': {
      return {
        ok: true,
        value: {
          ...document,
          title: command.title,
          updatedAt: now,
        },
      };
    }
  }
}
