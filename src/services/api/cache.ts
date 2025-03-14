import { Scenario } from '../../store/negotiationSlice';

// Define the cache structure
export interface ApiCache {
  scenarios: Map<string, Scenario[]>; // componentId -> scenarios
  analysis: Map<string, any>; // caseId -> analysis
}

// Create the cache
export const apiCache: ApiCache = {
  scenarios: new Map(),
  analysis: new Map(),
};

/**
 * Clear all caches
 */
export const clearCache = (): void => {
  apiCache.scenarios.clear();
  apiCache.analysis.clear();
};

/**
 * Clear scenarios for a specific component
 * @param componentId The component ID
 */
export const clearScenariosForComponent = (componentId: string): void => {
  apiCache.scenarios.delete(componentId);
}; 