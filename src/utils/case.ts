import { hashString } from './hashing';

// Cache for case IDs to avoid unnecessary recomputation
const caseIdCache = new Map<string, string>();

/**
 * Generates a case ID by hashing the entire content of the case.
 * Uses a cache to avoid rehashing identical content.
 * 
 * @param caseContent The full content of the case file/document
 * @returns A hash based ID for the case
 */
export const generateCaseId = (caseContent: string): string => {
  // Check if we've already computed this hash
  if (caseIdCache.has(caseContent)) {
    return caseIdCache.get(caseContent)!;
  }

  // Generate a new hash
  const caseId = hashString(caseContent);
  
  // Store in cache
  caseIdCache.set(caseContent, caseId);
  console.log('Generated new case ID:', caseId);
  
  return caseId;
};

/**
 * Clears the case ID cache.
 * Useful when memory optimization is needed.
 */
export const clearCaseIdCache = (): void => {
  caseIdCache.clear();
}; 