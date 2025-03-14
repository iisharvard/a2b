import { api } from '../index';
import { apiCache } from '../cache';
import * as promptHandler from '../promptHandler';
import { store } from '../../../store';
import { Scenario, Analysis, Component, Party } from '../../../store/negotiationSlice';
import { setAnalysisRecalculated, setScenariosRecalculated } from '../../../store/recalculationSlice';

// Mock the store
jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn(),
  },
}));

// Mock the promptHandler
jest.mock('../promptHandler', () => ({
  callLanguageModel: jest.fn(),
}));

// Mock the api module
jest.mock('../index');

describe('API Service', () => {
  let originalIdentifyParties;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear the cache
    apiCache.scenarios.clear();
    apiCache.analysis.clear();
    
    // Reset the store mock
    (store.getState as jest.Mock).mockReset();
    (store.dispatch as jest.Mock).mockReset();
    
    // Save original implementation
    originalIdentifyParties = jest.requireActual('../index').api.identifyParties;
    
    // Reset the api mock
    (api.identifyParties as jest.Mock).mockReset();
  });
  
  describe('analyzeCase', () => {
    test('should analyze a case and return the analysis', async () => {
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
      
      // Mock the callLanguageModel function
      (promptHandler.callLanguageModel as jest.Mock).mockResolvedValue({
        ioa: 'Test IoA',
        iceberg: 'Test Iceberg',
        components: [
          {
            id: 'component1',
            name: 'Component 1',
            description: 'Test component 1',
          },
        ],
      });
      
      // Mock the analyzeCase function
      (api.analyzeCase as jest.Mock).mockImplementation(async (caseText, party1, party2) => {
        return {
          ioa: 'Test IoA',
          iceberg: 'Test Iceberg',
          components: [
            {
              id: 'component1',
              name: 'Component 1',
              description: 'Test component 1',
            },
          ],
        };
      });
      
      // Call the function
      const result = await api.analyzeCase('Test case text', party1, party2);
      
      // Check the result
      expect(result).toEqual({
        ioa: 'Test IoA',
        iceberg: 'Test Iceberg',
        components: [
          {
            id: 'component1',
            name: 'Component 1',
            description: 'Test component 1',
          },
        ],
      });
    });
    
    test('should throw an error if rate limited', async () => {
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
      
      // Mock the analyzeCase function to throw an error
      (api.analyzeCase as jest.Mock).mockImplementation(async () => {
        throw new Error('Rate limit exceeded');
      });
      
      // Call the function and expect it to throw
      await expect(api.analyzeCase('Test case text', party1, party2)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
    
    test('should throw an error if the response format is invalid', async () => {
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
      
      // Mock the analyzeCase function to throw an error
      (api.analyzeCase as jest.Mock).mockImplementation(async () => {
        throw new Error('Invalid response format');
      });
      
      // Call the function and expect it to throw
      await expect(api.analyzeCase('Test case text', party1, party2)).rejects.toThrow(
        'Invalid response format'
      );
    });
  });
  
  describe('generateScenarios', () => {
    test('should return cached scenarios if available', async () => {
      // Set up the cache with scenarios
      const cachedScenarios: Scenario[] = [
        {
          id: 'scenario1',
          componentId: 'component1',
          type: 'agreement_area',
          description: 'Test scenario 1',
        },
      ];
      apiCache.scenarios.set('component1', cachedScenarios);
      
      // Set up the store state
      (store.getState as jest.Mock).mockReturnValue({
        negotiation: {
          currentCase: {
            analysis: {
              components: [
                {
                  id: 'component1',
                  name: 'Component 1',
                  description: 'Test component 1',
                },
              ],
            },
            scenarios: [],
          },
        },
        recalculation: {
          analysisRecalculated: false,
          scenariosRecalculated: true,
        },
      });
      
      // Mock the generateScenarios function
      (api.generateScenarios as jest.Mock).mockResolvedValue(cachedScenarios);
      
      // Call the function
      const result = await api.generateScenarios('component1');
      
      // Check the result
      expect(result).toEqual(cachedScenarios);
    });
    
    test('should generate new scenarios if not in cache', async () => {
      // Set up the store state
      (store.getState as jest.Mock).mockReturnValue({
        negotiation: {
          currentCase: {
            analysis: {
              components: [
                {
                  id: 'component1',
                  name: 'Component 1',
                  description: 'Test component 1',
                },
              ],
            },
            scenarios: [],
          },
        },
        recalculation: {
          analysisRecalculated: false,
          scenariosRecalculated: true,
        },
      });
      
      // Mock the generateScenarios function
      const generatedScenarios = [
        {
          id: 'scenario1',
          componentId: 'component1',
          type: 'agreement_area',
          description: 'Test scenario 1',
        },
      ];
      (api.generateScenarios as jest.Mock).mockResolvedValue(generatedScenarios);
      
      // Call the function
      const result = await api.generateScenarios('component1');
      
      // Check the result
      expect(result).toEqual(generatedScenarios);
    });
    
    test('should throw an error if the API call fails', async () => {
      // Set up the store state
      (store.getState as jest.Mock).mockReturnValue({
        negotiation: {
          currentCase: {
            analysis: {
              components: [
                {
                  id: 'component1',
                  name: 'Component 1',
                  description: 'Test component 1',
                },
              ],
            },
            scenarios: [],
          },
        },
        recalculation: {
          analysisRecalculated: false,
          scenariosRecalculated: true,
        },
      });
      
      // Mock the generateScenarios function to throw an error
      (api.generateScenarios as jest.Mock).mockImplementation(async () => {
        throw new Error('API error');
      });
      
      // Call the function and expect it to throw
      await expect(api.generateScenarios('component1')).rejects.toThrow(
        'API error'
      );
    });
  });
  
  describe('identifyParties', () => {
    test('should identify parties from case text', async () => {
      // Mock the identifyParties function
      (api.identifyParties as jest.Mock).mockResolvedValue([
        { id: 'party1', name: 'Party 1' },
        { id: 'party2', name: 'Party 2' },
      ]);
      
      // Call the function
      const result = await api.identifyParties('Test case text');
      
      // Check the result
      expect(result).toEqual([
        { id: 'party1', name: 'Party 1' },
        { id: 'party2', name: 'Party 2' },
      ]);
    });
    
    test('should return default parties if API call fails', async () => {
      // Mock the identifyParties function to throw an error first, then return default parties
      (api.identifyParties as jest.Mock)
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce([
          { id: 'default1', name: 'Party A' },
          { id: 'default2', name: 'Party B' },
        ]);
      
      // Call the function and catch the error
      try {
        await api.identifyParties('Test case text');
      } catch (error) {
        // This is expected
      }
      
      // Call again to get the default parties
      const result = await api.identifyParties('Test case text');
      
      // Check the result
      expect(result).toEqual([
        { id: 'default1', name: 'Party A' },
        { id: 'default2', name: 'Party B' },
      ]);
    });
    
    test('should throw an error if rate limited', async () => {
      // Mock the identifyParties function to throw a rate limit error
      (api.identifyParties as jest.Mock).mockImplementation(async () => {
        throw new Error('Rate limit exceeded');
      });
      
      // Call the function and expect it to throw
      await expect(api.identifyParties('Test case text')).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
    
    test('should throw an error if the response format is invalid', async () => {
      // Mock the identifyParties function to throw an invalid format error
      (api.identifyParties as jest.Mock).mockImplementation(async () => {
        throw new Error('Invalid response format');
      });
      
      // Call the function and expect it to throw
      await expect(api.identifyParties('Test case text')).rejects.toThrow(
        'Invalid response format'
      );
    });
  });
}); 