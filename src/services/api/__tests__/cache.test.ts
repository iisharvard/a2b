import { apiCache, clearCache, clearScenariosForComponent, clearRiskAssessmentsForScenario } from '../cache';
import { Scenario, RiskAssessment } from '../../../store/negotiationSlice';

describe('Cache', () => {
  beforeEach(() => {
    // Clear the cache before each test
    clearCache();
  });

  test('should store and retrieve scenarios', () => {
    // Create test scenarios
    const scenarios: Scenario[] = [
      {
        id: 'scenario1',
        componentId: 'component1',
        type: 'agreement_area',
        description: 'Test scenario 1'
      },
      {
        id: 'scenario2',
        componentId: 'component1',
        type: 'redline_violated_p1',
        description: 'Test scenario 2'
      }
    ];

    // Store scenarios in cache
    apiCache.scenarios.set('component1', scenarios);

    // Retrieve scenarios from cache
    const cachedScenarios = apiCache.scenarios.get('component1');

    // Check that the cached scenarios match the original scenarios
    expect(cachedScenarios).toEqual(scenarios);
  });

  test('should store and retrieve risk assessments', () => {
    // Create test risk assessment
    const riskAssessment: RiskAssessment = {
      id: 'risk1',
      scenarioId: 'scenario1',
      type: 'short_term',
      description: 'Test risk assessment',
      likelihood: 3,
      impact: 3,
      mitigation: 'Test mitigation'
    };

    // Store risk assessment in cache
    apiCache.riskAssessments.set('scenario1', [riskAssessment]);

    // Retrieve risk assessment from cache
    const cachedRiskAssessments = apiCache.riskAssessments.get('scenario1');

    // Check that the cached risk assessment matches the original risk assessment
    expect(cachedRiskAssessments).toEqual([riskAssessment]);
  });

  test('should clear the entire cache', () => {
    // Store test data in cache
    apiCache.scenarios.set('component1', [
      {
        id: 'scenario1',
        componentId: 'component1',
        type: 'agreement_area',
        description: 'Test scenario 1'
      }
    ]);
    apiCache.riskAssessments.set('scenario1', [
      {
        id: 'risk1',
        scenarioId: 'scenario1',
        type: 'short_term',
        description: 'Test risk assessment',
        likelihood: 3,
        impact: 3,
        mitigation: 'Test mitigation'
      }
    ]);

    // Clear the cache
    clearCache();

    // Check that the cache is empty
    expect(apiCache.scenarios.size).toBe(0);
    expect(apiCache.riskAssessments.size).toBe(0);
  });

  test('should clear scenarios for a specific component', () => {
    // Store test scenarios for multiple components
    apiCache.scenarios.set('component1', [
      {
        id: 'scenario1',
        componentId: 'component1',
        type: 'agreement_area',
        description: 'Test scenario 1'
      }
    ]);
    apiCache.scenarios.set('component2', [
      {
        id: 'scenario2',
        componentId: 'component2',
        type: 'agreement_area',
        description: 'Test scenario 2'
      }
    ]);

    // Clear scenarios for component1
    clearScenariosForComponent('component1');

    // Check that component1 scenarios are cleared but component2 scenarios remain
    expect(apiCache.scenarios.has('component1')).toBe(false);
    expect(apiCache.scenarios.has('component2')).toBe(true);
  });

  test('should clear risk assessments for a specific scenario', () => {
    // Store test risk assessments for multiple scenarios
    apiCache.riskAssessments.set('scenario1', [
      {
        id: 'risk1',
        scenarioId: 'scenario1',
        type: 'short_term',
        description: 'Test risk assessment 1',
        likelihood: 3,
        impact: 3,
        mitigation: 'Test mitigation 1'
      }
    ]);
    apiCache.riskAssessments.set('scenario2', [
      {
        id: 'risk2',
        scenarioId: 'scenario2',
        type: 'short_term',
        description: 'Test risk assessment 2',
        likelihood: 3,
        impact: 3,
        mitigation: 'Test mitigation 2'
      }
    ]);

    // Clear risk assessments for scenario1
    clearRiskAssessmentsForScenario('scenario1');

    // Check that scenario1 risk assessments are cleared but scenario2 risk assessments remain
    expect(apiCache.riskAssessments.has('scenario1')).toBe(false);
    expect(apiCache.riskAssessments.has('scenario2')).toBe(true);
  });
}); 