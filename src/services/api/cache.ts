import { Scenario } from '../../store/negotiationSlice';
import { ApiCache } from './types';

/**
 * Cache for API responses
 * Stores scenarios to avoid redundant API calls
 */
export const apiCache: ApiCache = {
  scenarios: new Map<string, Scenario[]>(),
};

/**
 * Clear the entire cache
 */
export const clearCache = (): void => {
  apiCache.scenarios.clear();
};

/**
 * Clear scenarios for a specific component
 * @param componentId ID of the component
 */
export const clearScenariosForComponent = (componentId: string): void => {
  apiCache.scenarios.delete(componentId);
}; 