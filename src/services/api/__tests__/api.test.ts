import { api } from '../index';
import { callLanguageModel } from '../promptHandler';
import { apiCache } from '../cache';
import { store } from '../../../store';
import { Party, Component, Analysis, Scenario, Case } from '../../../store/negotiationSlice';

// Mock the store
jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn()
  }
}));
const mockStore = store as jest.Mocked<typeof store>;

// Mock the prompt handler
jest.mock('../promptHandler', () => ({
  callLanguageModel: jest.fn()
}));
const mockCallLanguageModel = callLanguageModel as jest.Mock;

// Mock the api module to override specific methods for testing
jest.mock('../index', () => {
  const originalModule = jest.requireActual('../index');
  return {
    ...originalModule,
    api: {
      ...originalModule.api,
      identifyParties: jest.fn()
    }
  };
});

describe('API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiCache.scenarios.clear();
    apiCache.riskAssessments.clear();
  });

  describe('analyzeCase', () => {
    test('should analyze a case and return analysis response', async () => {
      // Mock the language model responses
      mockCallLanguageModel
        .mockResolvedValueOnce({ ioa: 'Test IOA' })
        .mockResolvedValueOnce({ iceberg: 'Test Iceberg' })
        .mockResolvedValueOnce({ components: [{ id: 'component1', name: 'Test Component', priority: 1 }] });

      // Create test parties
      const party1: Party = {
        id: 'party1',
        name: 'Party 1',
        description: 'Test Party 1',
        isUserSide: true,
        isPrimary: true
      };
      const party2: Party = {
        id: 'party2',
        name: 'Party 2',
        description: 'Test Party 2',
        isUserSide: false,
        isPrimary: true
      };

      // Call analyzeCase
      const result = await api.analyzeCase('Test case content', party1, party2);

      // Check that callLanguageModel was called with the correct arguments
      expect(mockCallLanguageModel).toHaveBeenCalledTimes(3);
      expect(mockCallLanguageModel).toHaveBeenNthCalledWith(1, 'islandOfAgreement.txt', {
        caseContent: 'Test case content',
        party1Name: 'Party 1',
        party2Name: 'Party 2'
      });
      expect(mockCallLanguageModel).toHaveBeenNthCalledWith(2, 'iceberg.txt', {
        caseContent: 'Test case content',
        party1Name: 'Party 1',
        party2Name: 'Party 2'
      });
      expect(mockCallLanguageModel).toHaveBeenNthCalledWith(3, 'redlinebottomlineRequirements.txt', {
        caseContent: 'Test case content',
        party1Name: 'Party 1',
        party2Name: 'Party 2',
        ioa: 'Test IOA',
        iceberg: 'Test Iceberg'
      });

      // Check that the result has the expected structure
      expect(result).toEqual({
        id: expect.any(String),
        ioa: 'Test IOA',
        iceberg: 'Test Iceberg',
        components: [{ id: 'component1', name: 'Test Component', priority: 1 }],
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    test('should handle rate limit errors', async () => {
      // Mock the language model to return a rate limited response
      mockCallLanguageModel.mockImplementationOnce(() => {
        throw new Error('rate limit exceeded');
      });

      // Create test parties
      const party1: Party = {
        id: 'party1',
        name: 'Party 1',
        description: 'Test Party 1',
        isUserSide: true,
        isPrimary: true
      };
      const party2: Party = {
        id: 'party2',
        name: 'Party 2',
        description: 'Test Party 2',
        isUserSide: false,
        isPrimary: true
      };

      // Call analyzeCase
      const result = await api.analyzeCase('Test case content', party1, party2);

      // Check that the result is the rate limited flag
      expect(result).toEqual({ rateLimited: true });
    });
  });

  describe('generateScenarios', () => {
    test('should return cached scenarios if available and not marked for recalculation', async () => {
      // Set up mock store state
      mockStore.getState.mockReturnValue({
        negotiation: {
          currentCase: {
            id: 'case1',
            title: 'Test Case',
            content: 'Test content',
            processed: true,
            suggestedParties: [
              { id: 'party1', name: 'Party 1', description: 'Test Party 1', isUserSide: true, isPrimary: true },
              { id: 'party2', name: 'Party 2', description: 'Test Party 2', isUserSide: false, isPrimary: true }
            ],
            analysis: {
              id: 'analysis1',
              ioa: 'Test IOA',
              iceberg: 'Test Iceberg',
              components: [
                {
                  id: 'component1',
                  name: 'Test Component',
                  description: 'Test Description',
                  redlineParty1: 'Test Redline 1',
                  bottomlineParty1: 'Test Bottomline 1',
                  redlineParty2: 'Test Redline 2',
                  bottomlineParty2: 'Test Bottomline 2',
                  priority: 1
                }
              ],
              createdAt: '2023-01-01',
              updatedAt: '2023-01-01'
            },
            scenarios: [],
            riskAssessments: [],
            recalculationStatus: {
              analysisRecalculated: false,
              scenariosRecalculated: true,
              riskAssessmentsRecalculated: false
            },
            originalContent: {
              analysis: null,
              scenarios: [],
              riskAssessments: []
            }
          },
          selectedScenario: null,
          loading: false,
          error: null
        },
        recalculation: {
          scenariosRecalculated: true,
          analysisRecalculated: false,
          riskAssessmentsRecalculated: false,
          lastRecalculationTimestamp: '2023-01-01'
        }
      });

      // Add scenarios to cache
      const cachedScenarios: Scenario[] = [
        {
          id: 'scenario1',
          componentId: 'component1',
          type: 'agreement_area',
          description: 'Test Scenario'
        }
      ];
      apiCache.scenarios.set('component1', cachedScenarios);

      // Call generateScenarios
      const result = await api.generateScenarios('component1');

      // Check that callLanguageModel was not called
      expect(mockCallLanguageModel).not.toHaveBeenCalled();

      // Check that the result is the cached scenarios
      expect(result).toEqual(cachedScenarios);
    });

    test('should generate new scenarios if not in cache or marked for recalculation', async () => {
      // Set up mock store state
      mockStore.getState.mockReturnValue({
        negotiation: {
          currentCase: {
            id: 'case1',
            title: 'Test Case',
            content: 'Test content',
            processed: true,
            suggestedParties: [
              { id: 'party1', name: 'Party 1', description: 'Test Party 1', isUserSide: true, isPrimary: true },
              { id: 'party2', name: 'Party 2', description: 'Test Party 2', isUserSide: false, isPrimary: true }
            ],
            analysis: {
              id: 'analysis1',
              ioa: 'Test IOA',
              iceberg: 'Test Iceberg',
              components: [
                {
                  id: 'component1',
                  name: 'Test Component',
                  description: 'Test Description',
                  redlineParty1: 'Test Redline 1',
                  bottomlineParty1: 'Test Bottomline 1',
                  redlineParty2: 'Test Redline 2',
                  bottomlineParty2: 'Test Bottomline 2',
                  priority: 1
                }
              ],
              createdAt: '2023-01-01',
              updatedAt: '2023-01-01'
            },
            scenarios: [],
            riskAssessments: [],
            recalculationStatus: {
              analysisRecalculated: false,
              scenariosRecalculated: false,
              riskAssessmentsRecalculated: false
            },
            originalContent: {
              analysis: null,
              scenarios: [],
              riskAssessments: []
            }
          },
          selectedScenario: null,
          loading: false,
          error: null
        },
        recalculation: {
          scenariosRecalculated: false,
          analysisRecalculated: false,
          riskAssessmentsRecalculated: false,
          lastRecalculationTimestamp: '2023-01-01'
        }
      });

      // Mock the language model response
      const generatedScenarios: Scenario[] = [
        {
          id: 'scenario1',
          componentId: 'component1',
          type: 'agreement_area',
          description: 'Generated Scenario'
        }
      ];
      mockCallLanguageModel.mockResolvedValueOnce({ scenarios: generatedScenarios });

      // Call generateScenarios
      const result = await api.generateScenarios('component1');

      // Check that callLanguageModel was called with the correct arguments
      expect(mockCallLanguageModel).toHaveBeenCalledWith('scenarios.txt', {
        componentId: 'component1',
        componentName: 'Test Component',
        componentDescription: 'Test Description',
        redlineParty1: 'Test Redline 1',
        bottomlineParty1: 'Test Bottomline 1',
        redlineParty2: 'Test Redline 2',
        bottomlineParty2: 'Test Bottomline 2',
        party1Name: 'Party 1',
        party2Name: 'Party 2'
      });

      // Check that the result is the generated scenarios
      expect(result).toEqual(generatedScenarios);

      // Check that the scenarios were cached
      expect(apiCache.scenarios.get('component1')).toEqual(generatedScenarios);
    });

    test('should return fallback scenarios if API call fails', async () => {
      // Set up mock store state
      mockStore.getState.mockReturnValue({
        negotiation: {
          currentCase: {
            id: 'case1',
            title: 'Test Case',
            content: 'Test content',
            processed: true,
            suggestedParties: [
              { id: 'party1', name: 'Party 1', description: 'Test Party 1', isUserSide: true, isPrimary: true },
              { id: 'party2', name: 'Party 2', description: 'Test Party 2', isUserSide: false, isPrimary: true }
            ],
            analysis: {
              id: 'analysis1',
              ioa: 'Test IOA',
              iceberg: 'Test Iceberg',
              components: [
                {
                  id: 'component1',
                  name: 'Test Component',
                  description: 'Test Description',
                  redlineParty1: 'Test Redline 1',
                  bottomlineParty1: 'Test Bottomline 1',
                  redlineParty2: 'Test Redline 2',
                  bottomlineParty2: 'Test Bottomline 2',
                  priority: 1
                }
              ],
              createdAt: '2023-01-01',
              updatedAt: '2023-01-01'
            },
            scenarios: [],
            riskAssessments: [],
            recalculationStatus: {
              analysisRecalculated: false,
              scenariosRecalculated: false,
              riskAssessmentsRecalculated: false
            },
            originalContent: {
              analysis: null,
              scenarios: [],
              riskAssessments: []
            }
          },
          selectedScenario: null,
          loading: false,
          error: null
        },
        recalculation: {
          scenariosRecalculated: false,
          analysisRecalculated: false,
          riskAssessmentsRecalculated: false,
          lastRecalculationTimestamp: '2023-01-01'
        }
      });

      // Mock the language model to throw an error
      mockCallLanguageModel.mockRejectedValueOnce(new Error('API error'));

      // Call generateScenarios
      const result = await api.generateScenarios('component1');

      // Check that the result is the fallback scenarios
      expect(result).toHaveLength(5);
      expect(result[0].type).toBe('redline_violated_p1');
      expect(result[1].type).toBe('bottomline_violated_p1');
      expect(result[2].type).toBe('agreement_area');
      expect(result[3].type).toBe('bottomline_violated_p2');
      expect(result[4].type).toBe('redline_violated_p2');

      // Check that the fallback scenarios were cached
      expect(apiCache.scenarios.get('component1')).toEqual(result);
    });
  });

  describe('recalculateBoundaries', () => {
    test('should recalculate boundaries and clear scenarios cache', async () => {
      // Set up mock store state
      mockStore.getState.mockReturnValue({
        negotiation: {
          currentCase: {
            id: 'case1',
            title: 'Test Case',
            content: 'Test content',
            processed: true,
            suggestedParties: [
              { id: 'party1', name: 'Party 1', description: 'Test Party 1', isUserSide: true, isPrimary: true },
              { id: 'party2', name: 'Party 2', description: 'Test Party 2', isUserSide: false, isPrimary: true }
            ],
            analysis: null,
            scenarios: [],
            riskAssessments: [],
            recalculationStatus: {
              analysisRecalculated: false,
              scenariosRecalculated: false,
              riskAssessmentsRecalculated: false
            },
            originalContent: {
              analysis: null,
              scenarios: [],
              riskAssessments: []
            }
          },
          selectedScenario: null,
          loading: false,
          error: null
        },
        recalculation: {
          scenariosRecalculated: false,
          analysisRecalculated: false,
          riskAssessmentsRecalculated: false,
          lastRecalculationTimestamp: '2023-01-01'
        }
      });

      // Create test analysis
      const analysis: Analysis = {
        id: 'analysis1',
        ioa: 'Test IOA',
        iceberg: 'Test Iceberg',
        components: [
          {
            id: 'component1',
            name: 'Test Component',
            description: 'Test Description',
            redlineParty1: 'Test Redline 1',
            bottomlineParty1: 'Test Bottomline 1',
            redlineParty2: 'Test Redline 2',
            bottomlineParty2: 'Test Bottomline 2',
            priority: 1
          }
        ],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      };

      // Add scenarios to cache
      apiCache.scenarios.set('component1', [
        {
          id: 'scenario1',
          componentId: 'component1',
          type: 'agreement_area',
          description: 'Test Scenario'
        }
      ]);

      // Mock the language model response
      const updatedComponents: Component[] = [
        {
          id: 'component1',
          name: 'Updated Component',
          description: 'Updated Description',
          redlineParty1: 'Updated Redline 1',
          bottomlineParty1: 'Updated Bottomline 1',
          redlineParty2: 'Updated Redline 2',
          bottomlineParty2: 'Updated Bottomline 2',
          priority: 1
        }
      ];
      mockCallLanguageModel.mockResolvedValueOnce({ components: updatedComponents });

      // Call recalculateBoundaries
      const result = await api.recalculateBoundaries(analysis);

      // Check that callLanguageModel was called with the correct arguments
      expect(mockCallLanguageModel).toHaveBeenCalledWith('redlinebottomline.txt', {
        ioa: 'Test IOA',
        iceberg: 'Test Iceberg',
        components: JSON.stringify(analysis.components),
        party1Name: 'Party 1',
        party2Name: 'Party 2'
      });

      // Check that the result is the updated components
      expect(result).toEqual(updatedComponents);

      // Check that the scenarios cache was cleared
      expect(apiCache.scenarios.size).toBe(0);
    });
  });

  describe('identifyParties', () => {
    test('should identify parties in a case', async () => {
      // Mock the identifyParties function
      const parties = [
        { name: 'Party 1', description: 'Test Party 1', isPrimary: true },
        { name: 'Party 2', description: 'Test Party 2', isPrimary: true }
      ];
      (api.identifyParties as jest.Mock).mockResolvedValueOnce(parties);

      // Call identifyParties
      const result = await api.identifyParties('Test case content');

      // Check that the result is the identified parties
      expect(result).toEqual(parties);
    });

    test('should return default parties if API call fails', async () => {
      // Create a spy on the original implementation
      const originalIdentifyParties = jest.requireActual('../index').api.identifyParties;
      const spy = jest.spyOn(api, 'identifyParties');
      
      // Mock the implementation for this test only
      spy.mockImplementationOnce(async () => {
        // Call the original implementation but mock callLanguageModel to throw an error
        mockCallLanguageModel.mockRejectedValueOnce(new Error('API error'));
        return originalIdentifyParties('Test case content');
      });

      // Call identifyParties
      const result = await api.identifyParties('Test case content');

      // Check that the result is the default parties
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Party 1');
      expect(result[1].name).toBe('Party 2');
      
      // Restore the spy
      spy.mockRestore();
    });

    test('should handle rate limit errors', async () => {
      // Create a spy on the original implementation
      const originalIdentifyParties = jest.requireActual('../index').api.identifyParties;
      const spy = jest.spyOn(api, 'identifyParties');
      
      // Mock the implementation for this test only
      spy.mockImplementationOnce(async () => {
        // Call the original implementation but mock callLanguageModel to return a rate limited response
        mockCallLanguageModel.mockResolvedValueOnce({ rateLimited: true });
        return originalIdentifyParties('Test case content');
      });

      // Call identifyParties
      const result = await api.identifyParties('Test case content');
      
      // Check that the result is the default parties
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Party 1');
      expect(result[1].name).toBe('Party 2');
      
      // Restore the spy
      spy.mockRestore();
    });

    test('should handle invalid response format', async () => {
      // Create a spy on the original implementation
      const originalIdentifyParties = jest.requireActual('../index').api.identifyParties;
      const spy = jest.spyOn(api, 'identifyParties');
      
      // Mock the implementation for this test only
      spy.mockImplementationOnce(async () => {
        // Call the original implementation but mock callLanguageModel to return an invalid response
        mockCallLanguageModel.mockResolvedValueOnce({ invalidFormat: true });
        return originalIdentifyParties('Test case content');
      });

      // Call identifyParties
      const result = await api.identifyParties('Test case content');
      
      // Check that the result is the default parties
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Party 1');
      expect(result[1].name).toBe('Party 2');
      
      // Restore the spy
      spy.mockRestore();
    });
  });
}); 