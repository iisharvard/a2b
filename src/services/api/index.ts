import { store } from '../../store';
import { Analysis, Component, Party, Scenario } from '../../store/negotiationSlice';
import { ApiResponse, AnalysisResponse } from '../../types/api';
import { callLanguageModel } from './promptHandler';
import { callOpenAI } from './openaiClient';
import { apiCache, clearScenariosForComponent } from './cache';
import { 
  IslandOfAgreementInput, 
  IcebergInput, 
  ComponentsInput,
  ScenarioInput,
  RecalculateBoundariesInput,
  IdentifyPartiesInput
} from './types';

/**
 * API functions for interacting with the language model
 */
export const api = {
  /**
   * Analyze a case to generate island of agreements, iceberg analysis, and components
   * @param content Case content
   * @param party1 First party
   * @param party2 Second party
   * @param onPartialResult Callback to receive partial results
   * @returns Promise that resolves with the analysis response
   */
  async analyzeCase(
    content: string,
    party1: Party,
    party2: Party,
    onPartialResult?: (type: 'ioa' | 'iceberg' | 'components', data: any) => void
  ): Promise<ApiResponse<AnalysisResponse>> {
    const requestId = Date.now().toString();
    
    try {
      const ioaInput: IslandOfAgreementInput = {
        caseContent: content,
        party1Name: party1.name,
        party2Name: party2.name
      };
      const ioaResponse = await callLanguageModel('islandOfAgreement.txt', ioaInput);
      
      // Call the callback with IoA result as soon as it's available
      if (onPartialResult) {
        onPartialResult('ioa', ioaResponse.ioa);
      }
      
      const icebergInput: IcebergInput = {
        caseContent: content,
        party1Name: party1.name,
        party2Name: party2.name
      };
      const icebergResponse = await callLanguageModel('iceberg.txt', icebergInput);
      
      // Call the callback with iceberg result as soon as it's available
      if (onPartialResult) {
        onPartialResult('iceberg', icebergResponse.iceberg);
      }
      
      const componentsInput: ComponentsInput = {
        caseContent: content,
        party1Name: party1.name,
        party2Name: party2.name,
        ioa: ioaResponse.ioa,
        iceberg: icebergResponse.iceberg
      };
      const componentsResponse = await callLanguageModel('redlinebottomlineRequirements.txt', componentsInput);
      
      // Call the callback with components result as soon as it's available
      if (onPartialResult) {
        onPartialResult('components', componentsResponse.components);
      }
      
      const analysis: AnalysisResponse = {
        id: requestId,
        ioa: ioaResponse.ioa,
        iceberg: icebergResponse.iceberg,
        components: componentsResponse.components,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return analysis;
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate limit')) {
        return { rateLimited: true };
      }
      throw error;
    }
  },
  
  /**
   * Generate scenarios for a component
   * @param componentId ID of the component
   * @param onScenarioGenerated Optional callback that will be called for each scenario as it's generated
   * @returns Promise that resolves with an array of scenarios
   */
  async generateScenarios(
    componentId: string, 
    onScenarioGenerated?: (scenario: Scenario) => void
  ): Promise<Scenario[]> {
    try {
      // Get the current state
      const state = store.getState();
      const currentCase = state.negotiation.currentCase;
      const recalculationStatus = state.recalculation;

      // Only use cache if scenarios haven't been marked for recalculation
      const cachedScenarios = apiCache.scenarios.get(componentId);
      if (cachedScenarios && recalculationStatus.scenariosRecalculated) {
        console.log('Using cached scenarios for component:', componentId);
        
        // If we have a callback, call it for each cached scenario
        if (onScenarioGenerated) {
          cachedScenarios.forEach((scenario: Scenario) => {
            onScenarioGenerated(scenario);
          });
        }
        
        return cachedScenarios;
      }
      
      // Get the component details from the store
      const component = currentCase?.analysis?.components.find(
        c => c.id === componentId
      );
      
      if (!component || !currentCase?.suggestedParties.length) {
        throw new Error(`Component with ID ${componentId} not found or party information missing`);
      }
      
      // Get party names
      const party1Name = currentCase.suggestedParties[0].name;
      const party2Name = currentCase.suggestedParties[1].name;
      
      // Call the language model with the scenarios prompt and component details
      const scenarioInput: ScenarioInput = {
        componentId,
        componentName: component.name,
        componentDescription: component.description,
        redlineParty1: component.redlineParty1,
        bottomlineParty1: component.bottomlineParty1,
        redlineParty2: component.redlineParty2,
        bottomlineParty2: component.bottomlineParty2,
        party1Name,
        party2Name
      };
      
      const result = await callLanguageModel('scenarios.txt', scenarioInput);
      
      if ('rateLimited' in result) {
        throw new Error('Rate limit exceeded');
      }
      
      const scenarios = result.scenarios || [];
      apiCache.scenarios.set(componentId, scenarios);
      
      // If we have a callback, call it for each generated scenario
      if (onScenarioGenerated) {
        scenarios.forEach((scenario: Scenario) => {
          onScenarioGenerated(scenario);
        });
      }
      
      return scenarios;
    } catch (error) {
      console.error('Error generating scenarios:', error);
      
      if (error instanceof Error && error.message.includes('rate limit')) {
        throw error;
      }
      
      // Fallback to basic scenarios if API call fails
      const fallbackScenarios: Scenario[] = [
        {
          id: `${componentId}-1`,
          componentId,
          type: 'redline_violated_p1',
          description: 'Party 1\'s redline is violated, creating a worst-case scenario for them. This would likely result in operational failure and potential withdrawal.',
        },
        {
          id: `${componentId}-2`,
          componentId,
          type: 'bottomline_violated_p1',
          description: 'Party 1\'s bottomline is violated, creating a challenging situation that may be workable but with significant compromises.',
        },
        {
          id: `${componentId}-3`,
          componentId,
          type: 'agreement_area',
          description: 'Both parties are operating within their acceptable ranges, creating a viable agreement area.',
        },
        {
          id: `${componentId}-4`,
          componentId,
          type: 'bottomline_violated_p2',
          description: 'Party 2\'s bottomline is violated, creating a challenging situation that may be workable but with significant compromises.',
        },
        {
          id: `${componentId}-5`,
          componentId,
          type: 'redline_violated_p2',
          description: 'Party 2\'s redline is violated, creating a worst-case scenario for them. This would likely result in operational failure and potential withdrawal.',
        }
      ];
      
      apiCache.scenarios.set(componentId, fallbackScenarios);
      return fallbackScenarios;
    }
  },
  
  /**
   * Force regenerate scenarios (bypassing cache)
   * @param componentId ID of the component
   * @param onScenarioGenerated Optional callback that will be called for each scenario as it's generated
   * @returns Promise that resolves with an array of scenarios
   */
  async forceGenerateScenarios(
    componentId: string,
    onScenarioGenerated?: (scenario: Scenario) => void
  ): Promise<Scenario[]> {
    console.log('Force regenerating scenarios for component:', componentId);
    
    // Clear cache for this component
    clearScenariosForComponent(componentId);
    
    // Generate new scenarios
    return this.generateScenarios(componentId, onScenarioGenerated);
  },
  
  /**
   * Recalculate boundaries for components
   * @param analysis Current analysis
   * @returns Promise that resolves with updated components
   */
  async recalculateBoundaries(analysis: Analysis): Promise<Component[]> {
    try {
      const currentCase = store.getState().negotiation.currentCase;
      if (!currentCase || currentCase.suggestedParties.length < 2) {
        throw new Error('Case or party information missing');
      }

      const boundariesInput: RecalculateBoundariesInput = {
        ioa: analysis.ioa,
        iceberg: analysis.iceberg,
        components: JSON.stringify(analysis.components),
        party1Name: currentCase.suggestedParties[0].name,
        party2Name: currentCase.suggestedParties[1].name
      };
      
      const result = await callLanguageModel('redlinebottomline.txt', boundariesInput);
      
      // Clear scenarios cache when boundaries are updated
      apiCache.scenarios.clear();
      
      return result.components || analysis.components;
    } catch (error) {
      console.error('Error recalculating boundaries:', error);
      return analysis.components;
    }
  },

  /**
   * Identify parties in a case
   * @param caseContent Case content
   * @returns Promise that resolves with an array of parties
   */
  async identifyParties(caseContent: string): Promise<Array<{name: string, description: string, isPrimary: boolean}>> {
    try {
      const partiesInput: IdentifyPartiesInput = {
        caseContent
      };
      const result = await callLanguageModel('identifyParties.txt', partiesInput);

      if ('rateLimited' in result) {
        throw new Error('Rate limit reached');
      }

      // Validate the response against the schema
      if (!result.parties || !Array.isArray(result.parties)) {
        throw new Error('Invalid response format');
      }

      return result.parties;
    } catch (error) {
      console.error('Error identifying parties:', error);
      // Return default parties if API call fails
      return [
        { name: 'Party 1', description: 'First party in the negotiation', isPrimary: true },
        { name: 'Party 2', description: 'Second party in the negotiation', isPrimary: true }
      ];
    }
  }
};

// Export individual modules for testing
export * from './config';
export * from './types';
export * from './requestQueue';
export * from './openaiClient';
export * from './promptHandler';
export * from './cache'; 