/**
 * Utility functions for comparing objects and generating diffs
 */

/**
 * Compare two objects and return the differences
 * @param original The original object
 * @param updated The updated object
 * @returns An object containing added, removed, and changed properties
 */
export const generateDiff = (original: any, updated: any) => {
  if (!original || !updated) {
    return {
      added: updated ? { ...updated } : {},
      removed: original ? { ...original } : {},
      changed: {}
    };
  }

  const diff: {
    added: Record<string, any>;
    removed: Record<string, any>;
    changed: Record<string, { old: any; new: any; diff?: any }>;
  } = {
    added: {},
    removed: {},
    changed: {}
  };

  // Find added and changed properties
  Object.keys(updated).forEach(key => {
    if (!(key in original)) {
      diff.added[key] = updated[key];
    } else if (
      typeof updated[key] === 'object' && 
      updated[key] !== null && 
      typeof original[key] === 'object' && 
      original[key] !== null &&
      !Array.isArray(updated[key]) &&
      !Array.isArray(original[key])
    ) {
      // Recursively compare nested objects
      const nestedDiff = generateDiff(original[key], updated[key]);
      if (
        Object.keys(nestedDiff.added).length > 0 ||
        Object.keys(nestedDiff.removed).length > 0 ||
        Object.keys(nestedDiff.changed).length > 0
      ) {
        diff.changed[key] = {
          old: original[key],
          new: updated[key],
          diff: nestedDiff
        };
      }
    } else if (JSON.stringify(updated[key]) !== JSON.stringify(original[key])) {
      diff.changed[key] = {
        old: original[key],
        new: updated[key]
      };
    }
  });

  // Find removed properties
  Object.keys(original).forEach(key => {
    if (!(key in updated)) {
      diff.removed[key] = original[key];
    }
  });

  return diff;
};

/**
 * Format a diff for display
 * @param diff The diff object
 * @returns A formatted string representation of the diff
 */
export const formatDiff = (diff: any): string => {
  let result = '';

  if (Object.keys(diff.added).length > 0) {
    result += '+ Added:\n';
    Object.entries(diff.added).forEach(([key, value]) => {
      result += `+ ${key}: ${JSON.stringify(value, null, 2)}\n`;
    });
    result += '\n';
  }

  if (Object.keys(diff.removed).length > 0) {
    result += '- Removed:\n';
    Object.entries(diff.removed).forEach(([key, value]) => {
      result += `- ${key}: ${JSON.stringify(value, null, 2)}\n`;
    });
    result += '\n';
  }

  if (Object.keys(diff.changed).length > 0) {
    result += '~ Changed:\n';
    Object.entries(diff.changed).forEach(([key, value]: [string, any]) => {
      result += `~ ${key}:\n`;
      result += `  - Old: ${JSON.stringify(value.old, null, 2)}\n`;
      result += `  + New: ${JSON.stringify(value.new, null, 2)}\n`;
    });
  }

  return result;
};

/**
 * Compare two arrays of objects by a specific key and return the differences
 * @param original The original array
 * @param updated The updated array
 * @param idKey The key to use for identifying objects
 * @returns An object containing added, removed, and changed items
 */
export const compareArrays = <T extends Record<string, any>>(
  original: T[],
  updated: T[],
  idKey: string
) => {
  const result: {
    added: T[];
    removed: T[];
    changed: Array<{ old: T; new: T }>;
  } = {
    added: [],
    removed: [],
    changed: []
  };

  // Find added and changed items
  updated.forEach(updatedItem => {
    const originalItem = original.find(item => item[idKey] === updatedItem[idKey]);
    if (!originalItem) {
      result.added.push(updatedItem);
    } else if (JSON.stringify(updatedItem) !== JSON.stringify(originalItem)) {
      result.changed.push({
        old: originalItem,
        new: updatedItem
      });
    }
  });

  // Find removed items
  original.forEach(originalItem => {
    const updatedItem = updated.find(item => item[idKey] === originalItem[idKey]);
    if (!updatedItem) {
      result.removed.push(originalItem);
    }
  });

  return result;
};

/**
 * Format array differences for display
 * @param diff The array diff object
 * @returns A formatted string representation of the array diff
 */
export const formatArrayDiff = <T extends Record<string, any>>(
  diff: {
    added: T[];
    removed: T[];
    changed: Array<{ old: T; new: T }>;
  },
  labelField: string = 'name'
): string => {
  let result = '';

  if (diff.added.length > 0) {
    result += '+ Added:\n';
    diff.added.forEach(item => {
      const label = item[labelField] || item.id || 'Item';
      result += `+ ${label}: ${JSON.stringify(item, null, 2)}\n`;
    });
    result += '\n';
  }

  if (diff.removed.length > 0) {
    result += '- Removed:\n';
    diff.removed.forEach(item => {
      const label = item[labelField] || item.id || 'Item';
      result += `- ${label}: ${JSON.stringify(item, null, 2)}\n`;
    });
    result += '\n';
  }

  if (diff.changed.length > 0) {
    result += '~ Changed:\n';
    diff.changed.forEach(({ old, new: newItem }) => {
      const label = old[labelField] || old.id || 'Item';
      result += `~ ${label}:\n`;
      
      // Find the specific fields that changed
      const changedFields: Record<string, { old: any; new: any }> = {};
      Object.keys(old).forEach(key => {
        if (JSON.stringify(old[key]) !== JSON.stringify(newItem[key])) {
          changedFields[key] = {
            old: old[key],
            new: newItem[key]
          };
        }
      });
      
      Object.entries(changedFields).forEach(([key, value]) => {
        result += `  - ${key} (Old): ${JSON.stringify(value.old, null, 2)}\n`;
        result += `  + ${key} (New): ${JSON.stringify(value.new, null, 2)}\n`;
      });
    });
  }

  return result;
}; 