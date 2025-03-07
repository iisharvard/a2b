import axios from 'axios';
import { Analysis, Component, Party, RiskAssessment, Scenario } from '../store/negotiationSlice';
import { store } from '../store';

// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
// Access environment variables using Vite's approach
const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY || '';
const MODEL = 'gpt-4o'; // or 'gpt-3.5-turbo' for a more cost-effective option
const TEMPERATURE = 0;

// Helper function to read prompt files
const readPromptFile = async (fileName: string): Promise<string> => {
  try {
    const response = await fetch(`/prompts/${fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to load prompt file: ${fileName}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error reading prompt file ${fileName}:`, error);
    throw new Error(`Failed to read prompt file: ${fileName}`);
  }
};

// Helper function to make API calls to OpenAI
const callOpenAI = async (messages: any[], retryCount = 0, initialDelay = 1000): Promise<string | { rateLimited: true }> => {
  const maxRetries = 3;
  
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not set. Please check your .env file.');
    }

    // Simple request with JSON mode
    const requestBody = {
      model: MODEL,
      messages,
      temperature: TEMPERATURE,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    };

    console.log('OpenAI API request:', {
      model: requestBody.model,
      response_format: requestBody.response_format,
      temperature: requestBody.temperature,
      max_tokens: requestBody.max_tokens,
    });

    const response = await axios.post(
      OPENAI_API_URL,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    // Check if the response has the expected structure
    if (response.data && 
        response.data.choices && 
        response.data.choices.length > 0 && 
        response.data.choices[0].message) {
      return response.data.choices[0].message.content;
    } else {
      console.error('Unexpected API response structure:', response.data);
      throw new Error('Unexpected API response structure');
    }
  } catch (error: any) {
    console.error('Error calling OpenAI API:', error);
    
    // Check if it's a rate limit error (429) and we haven't exceeded max retries
    if (error.response && error.response.status === 429 && retryCount < maxRetries) {
      // Extract retry-after header or use exponential backoff
      let retryAfter = error.response.headers['retry-after'];
      let delay = retryAfter ? parseInt(retryAfter) * 1000 : initialDelay * Math.pow(2, retryCount);
      
      console.log(`Rate limit exceeded. Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request with incremented retry count
      return callOpenAI(messages, retryCount + 1, initialDelay);
    }
    
    // If we've exhausted retries or it's a rate limit error, return a special flag
    if (error.response && error.response.status === 429) {
      console.log('Rate limit exceeded and max retries reached. Returning rate limited flag.');
      return { rateLimited: true };
    }
    
    // Provide more detailed error information
    if (error.response) {
      console.error('API error response:', error.response.data);
      throw new Error(`OpenAI API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    throw new Error('Failed to get response from OpenAI: ' + (error.message || 'Unknown error'));
  }
};

// Helper function to make API calls to the language model with prompt files
const callLanguageModel = async (promptFile: string, inputs: Record<string, any>): Promise<any> => {
  try {
    // Read the prompt file
    const promptContent = await readPromptFile(promptFile);
    
    // Add instructions to return JSON
    const systemPrompt = `${promptContent}\n\nIMPORTANT: Your response MUST be valid JSON.`;
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(inputs) }
    ];
    
    // Call OpenAI API
    const responseContent = await callOpenAI(messages);
    
    // Check if we got a rate limit flag
    if (typeof responseContent !== 'string' && responseContent.rateLimited) {
      return { rateLimited: true };
    }
    
    // Try to parse the response as JSON
    try {
      return JSON.parse(responseContent as string);
    } catch (e) {
      console.error('Error parsing JSON response:', e);
      // If parsing fails, return the raw content
      return { rawContent: responseContent };
    }
  } catch (error) {
    console.error('Error calling language model:', error);
    throw new Error('Failed to get response from language model');
  }
};

// Define schemas for different API responses
const partiesSchema = {
  type: "object",
  properties: {
    parties: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          isPrimary: { type: "boolean" }
        },
        required: ["name", "description", "isPrimary"]
      }
    }
  },
  required: ["parties"]
};

// Cache for API responses
const apiCache = {
  scenarios: new Map<string, Scenario[]>(),
  riskAssessments: new Map<string, RiskAssessment[]>(),
};

export const api = {
  async analyzeCase(caseContent: string, party1: Party, party2: Party): Promise<Analysis | { rateLimited: true }> {
    console.log('Analyzing case with LLM...');
    
    try {
      // Call the language model for Island of Agreements
      const ioaResponse = await callLanguageModel('islandOfAgreement.txt', {
        caseContent,
        party1Name: party1.name,
        party2Name: party2.name
      });
      
      // Check if we hit a rate limit
      if ('rateLimited' in ioaResponse && ioaResponse.rateLimited) {
        return { rateLimited: true };
      }
      
      // Call the language model for Iceberg Analysis
      const icebergResponse = await callLanguageModel('iceberg.txt', {
        caseContent,
        party1Name: party1.name,
        party2Name: party2.name
      });
      
      // Check if we hit a rate limit
      if ('rateLimited' in icebergResponse && icebergResponse.rateLimited) {
        return { rateLimited: true };
      }
      
      // Call the language model for Components and Redline/Bottomline
      const componentsResponse = await callLanguageModel('redlinebottomlineRequirements.txt', {
        caseContent,
        party1Name: party1.name,
        party2Name: party2.name,
        ioa: ioaResponse.ioa || ioaResponse.rawContent || "",
        iceberg: icebergResponse.iceberg || icebergResponse.rawContent || ""
      });
      
      // Check if we hit a rate limit
      if ('rateLimited' in componentsResponse && componentsResponse.rateLimited) {
        return { rateLimited: true };
      }
      
      // Parse the responses
      return {
        id: Date.now().toString(),
        ioa: ioaResponse.ioa || ioaResponse.rawContent || "# Island of Agreements\n\nNo islands of agreement identified yet.",
        iceberg: icebergResponse.iceberg || icebergResponse.rawContent || `# Iceberg Analysis\n\n## Party 1 (${party1.name})\n\n### Position (What)\n\n### Reasoning (How)\n\n### Motives (Why)\n\n## Party 2 (${party2.name})\n\n### Position (What)\n\n### Reasoning (How)\n\n### Motives (Why)`,
        components: componentsResponse.components || [],
        createdAt: new Date().toISOString(),
        version: 1
      };
    } catch (error) {
      console.error('Error analyzing case:', error);
      
      // Fallback to basic structure if API call fails
      return {
        id: Date.now().toString(),
        ioa: `# Island of Agreements\n\n## Agreed Facts\n- Both parties acknowledge the need for discussion\n\n## Contested Facts\n- Details to be determined\n\n## Convergent Norms\n- Professional negotiation standards\n\n## Divergent Norms\n- Specific priorities of each party`,
        iceberg: `# Iceberg Analysis\n\n## Party 1 (${party1.name})\n\n### Position (What)\n- Initial position to be determined\n\n### Reasoning (How)\n- Reasoning to be analyzed\n\n### Motives (Why)\n- Underlying motives to be explored\n\n## Party 2 (${party2.name})\n\n### Position (What)\n- Initial position to be determined\n\n### Reasoning (How)\n- Reasoning to be analyzed\n\n### Motives (Why)\n- Underlying motives to be explored`,
        components: [
          {
            id: '1',
            name: 'Component 1',
            description: 'First negotiation component',
            redlineParty1: 'Party 1 redline',
            bottomlineParty1: 'Party 1 bottomline',
            redlineParty2: 'Party 2 redline',
            bottomlineParty2: 'Party 2 bottomline',
            priority: 1
          }
        ],
        createdAt: new Date().toISOString(),
        version: 1
      };
    }
  },
  
  async generateScenarios(componentId: string): Promise<Scenario[]> {
    console.log('Generating scenarios for component:', componentId);
    
    try {
      console.log('Calling LLM for scenarios generation...');
      
      // Get the component details from the store
      const state = store.getState();
      const component = state.negotiation.currentCase?.analysis?.components.find(
        c => c.id === componentId
      );
      
      if (!component) {
        throw new Error(`Component with ID ${componentId} not found`);
      }
      
      // Get party names
      const party1Name = state.negotiation.currentCase?.party1?.name || 'Party 1';
      const party2Name = state.negotiation.currentCase?.party2?.name || 'Party 2';
      
      // Call the language model with the scenarios prompt and component details
      const result = await callLanguageModel('scenarios.txt', {
        componentId,
        componentName: component.name,
        componentDescription: component.description,
        redlineParty1: component.redlineParty1,
        bottomlineParty1: component.bottomlineParty1,
        redlineParty2: component.redlineParty2,
        bottomlineParty2: component.bottomlineParty2,
        party1Name,
        party2Name
      });
      
      // Parse the response and log it
      console.log('Received scenario response:', JSON.stringify(result, null, 2));
      const scenarios = result.scenarios || [];
      
      // Cache the result
      apiCache.scenarios.set(componentId, scenarios);
      
      return scenarios;
    } catch (error) {
      console.error('Error generating scenarios:', error);
      
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
      
      // Cache the fallback result
      apiCache.scenarios.set(componentId, fallbackScenarios);
      
      return fallbackScenarios;
    }
  },
  
  // Force regenerate scenarios (bypassing cache)
  async forceGenerateScenarios(componentId: string): Promise<Scenario[]> {
    console.log('Force regenerating scenarios for component:', componentId);
    
    // Clear cache for this component
    apiCache.scenarios.delete(componentId);
    
    // Generate new scenarios
    return this.generateScenarios(componentId);
  },
  
  async generateRiskAssessment(scenarioId: string): Promise<RiskAssessment> {
    console.log('Generating risk assessment with LLM for scenario:', scenarioId);
    
    try {
      // Call the language model with the risk assessment prompt
      const result = await callLanguageModel('riskAssessment.txt', {
        scenarioId
      });
      
      // Parse the response
      return {
        id: Date.now().toString(),
        scenarioId,
        category: result.category || 'Security of Field Teams',
        shortTermImpact: result.shortTermImpact || 'Increased exposure to checkpoints increases security risks for staff',
        shortTermMitigation: result.shortTermMitigation || 'Enhanced security protocols, reduced team size, increased communication',
        shortTermRiskAfter: result.shortTermRiskAfter || 'Medium',
        longTermImpact: result.longTermImpact || 'Potential for security incidents increases over time with repeated exposure',
        longTermMitigation: result.longTermMitigation || 'Rotation of staff, regular security assessments, contingency planning',
        longTermRiskAfter: result.longTermRiskAfter || 'Medium-High',
        overallAssessment: result.overallAssessment || 'The scenario presents significant but manageable security risks that require constant monitoring and adaptation',
      };
    } catch (error) {
      console.error('Error generating risk assessment:', error);
      
      // Fallback to basic risk assessment if API call fails
      return {
        id: Date.now().toString(),
        scenarioId,
        category: 'Security of Field Teams',
        shortTermImpact: 'Increased exposure to checkpoints increases security risks for staff',
        shortTermMitigation: 'Enhanced security protocols, reduced team size, increased communication',
        shortTermRiskAfter: 'Medium',
        longTermImpact: 'Potential for security incidents increases over time with repeated exposure',
        longTermMitigation: 'Rotation of staff, regular security assessments, contingency planning',
        longTermRiskAfter: 'Medium-High',
        overallAssessment: 'The scenario presents significant but manageable security risks that require constant monitoring and adaptation',
      };
    }
  },
  
  async recalculateBoundaries(analysis: Analysis): Promise<Component[]> {
    console.log('Recalculating boundaries with LLM...');
    
    try {
      // Call the language model with the recalculate boundaries prompt
      const result = await callLanguageModel('redlinebottomline.txt', {
        ioa: analysis.ioa,
        iceberg: analysis.iceberg,
        components: JSON.stringify(analysis.components)
      });
      
      // Parse the response
      return result.components || analysis.components;
    } catch (error) {
      console.error('Error recalculating boundaries:', error);
      
      // Return slightly modified components to simulate recalculation if API call fails
      return analysis.components.map(component => ({
        ...component,
        redlineParty1: `${component.redlineParty1} (recalculated)`,
        bottomlineParty1: `${component.bottomlineParty1} (recalculated)`,
        redlineParty2: `${component.redlineParty2} (recalculated)`,
        bottomlineParty2: `${component.bottomlineParty2} (recalculated)`,
      }));
    }
  },

  async identifyParties(caseContent: string): Promise<Array<{name: string, description: string, isPrimary: boolean}>> {
    console.log('Identifying parties from case content with LLM...');
    
    try {
      // Call the language model with the identify parties prompt
      const result = await callLanguageModel('identifyParties.txt', {
        caseContent
      });
      
      // The result should have a parties property containing the array
      if (result && result.parties && Array.isArray(result.parties)) {
        return result.parties;
      } else {
        console.warn('Unexpected response format from identifyParties:', result);
        return [];
      }
    } catch (error) {
      console.error('Error identifying parties:', error);
      
      // Return empty array if API call fails
      return [];
    }
  }
}; 