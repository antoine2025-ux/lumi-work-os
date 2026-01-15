/**
 * Normalization utilities for Loopbrain response snapshots
 * 
 * Normalizes dynamic fields (IDs, dates, timestamps) to stable placeholders
 * to ensure deterministic snapshots.
 */

export type NormalizedValue = string | number | boolean | null | NormalizedObject | NormalizedArray;
export type NormalizedObject = { [key: string]: NormalizedValue };
export type NormalizedArray = NormalizedValue[];

/**
 * Normalizes a Loopbrain response for snapshot testing
 */
export function normalizeLoopbrainResponse(data: any): NormalizedValue {
  if (data === null || data === undefined) {
    return null;
  }

  if (typeof data === 'boolean' || typeof data === 'number') {
    return data;
  }

  if (typeof data === 'string') {
    // Normalize ISO date strings
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
      return '<DATE>';
    }
    // Normalize IDs (cuid format: starts with 'c' followed by alphanumeric)
    if (/^c[a-z0-9]{24,}$/.test(data)) {
      // Try to infer type from context (this is a best-effort heuristic)
      if (data.includes('project') || data.includes('payments') || data.includes('incident') || data.includes('expansion') || data.includes('cleanup')) {
        return '<PROJECT_ID>';
      }
      if (data.includes('alex') || data.includes('sam') || data.includes('dana') || data.includes('chris')) {
        return '<PERSON_ID>';
      }
      return '<ID>';
    }
    return data;
  }

  if (Array.isArray(data)) {
    // Sort arrays deterministically if they contain objects with sortable keys
    const normalized = data.map(normalizeLoopbrainResponse);
    
    // If all items are objects, try to sort by a common key
    if (normalized.length > 0 && typeof normalized[0] === 'object' && normalized[0] !== null && !Array.isArray(normalized[0])) {
      const first = normalized[0] as NormalizedObject;
      // Try common sort keys
      const sortKey = first['id'] !== undefined ? 'id' :
                     first['personId'] !== undefined ? 'personId' :
                     first['projectId'] !== undefined ? 'projectId' :
                     first['name'] !== undefined ? 'name' :
                     first['type'] !== undefined ? 'type' :
                     first['action'] !== undefined ? 'action' :
                     null;
      
      if (sortKey) {
        normalized.sort((a, b) => {
          const aVal = typeof a === 'object' && a !== null && !Array.isArray(a) ? (a as NormalizedObject)[sortKey] : '';
          const bVal = typeof b === 'object' && b !== null && !Array.isArray(b) ? (b as NormalizedObject)[sortKey] : '';
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
          return 0;
        });
      }
    }
    
    return normalized;
  }

  if (typeof data === 'object') {
    const normalized: NormalizedObject = {};
    
    // Sort keys for deterministic output
    const keys = Object.keys(data).sort();
    
    for (const key of keys) {
      // Skip certain fields that are too dynamic
      if (key === 'timestamp' || key === 'requestId' || key === 'traceId') {
        continue;
      }
      
      normalized[key] = normalizeLoopbrainResponse(data[key]);
    }
    
    return normalized;
  }

  return data;
}

/**
 * Normalizes error messages while preserving error codes
 */
export function normalizeError(error: { code?: string; message?: string }): { code?: string; message: string } {
  return {
    code: error.code,
    message: error.message ? error.message.replace(/c[a-z0-9]{24,}/g, '<ID>') : 'Unknown error',
  };
}

