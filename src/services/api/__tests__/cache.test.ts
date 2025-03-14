import { apiCache, clearCache, clearScenariosForComponent } from '../cache';
import { Scenario } from '../../../store/negotiationSlice';

describe('Cache', () => {
  beforeEach(() => {
    // Clear the cache before each test
    clearCache();
  });

  test('should store and retrieve scenarios', () => {
    const scenario: Scenario = {
      id: 'scenario1',
      componentId: 'component1',
      type: 'agreement_area',
      description: 'Test scenario'
    };

    // Store a scenario
    apiCache.scenarios.set('component1', [scenario]);

    // Retrieve the scenario
    const cachedScenarios = apiCache.scenarios.get('component1');
    
    expect(cachedScenarios).toBeDefined();
    expect(cachedScenarios?.length).toBe(1);
    expect(cachedScenarios?.[0].id).toBe('scenario1');
  });

  test('should clear all caches', () => {
    // Set up some data in the caches
    const scenario: Scenario = {
      id: 'scenario1',
      componentId: 'component1',
      type: 'agreement_area',
      description: 'Test scenario'
    };

    apiCache.scenarios.set('component1', [scenario]);
    apiCache.analysis.set('case1', { content: 'Test analysis' });

    // Clear all caches
    clearCache();

    // Check that all caches are empty
    expect(apiCache.scenarios.size).toBe(0);
    expect(apiCache.analysis.size).toBe(0);
  });

  test('should clear scenarios for a specific component', () => {
    // Set up scenarios for two different components
    const scenario1: Scenario = {
      id: 'scenario1',
      componentId: 'component1',
      type: 'agreement_area',
      description: 'Test scenario 1'
    };

    const scenario2: Scenario = {
      id: 'scenario2',
      componentId: 'component2',
      type: 'agreement_area',
      description: 'Test scenario 2'
    };

    apiCache.scenarios.set('component1', [scenario1]);
    apiCache.scenarios.set('component2', [scenario2]);

    // Clear scenarios for component1
    clearScenariosForComponent('component1');

    // Check that component1 scenarios are cleared but component2 scenarios remain
    expect(apiCache.scenarios.has('component1')).toBe(false);
    expect(apiCache.scenarios.has('component2')).toBe(true);
  });
}); 