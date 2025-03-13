import { Analysis, Component, Party, Scenario } from '../../store/negotiationSlice';
import { ApiResponse, AnalysisResponse } from '../../types/api';

// OpenAI API types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequestBody {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: string };
}

export interface OpenAIChoice {
  message: {
    content: string;
    role: string;
  };
  finish_reason: string;
  index: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIError {
  response?: {
    status: number;
    data: any;
    headers: {
      'retry-after'?: string;
    };
  };
  message: string;
}

// Cache types
export interface ApiCache {
  scenarios: Map<string, Scenario[]>;
}

// Language model input types
export interface IslandOfAgreementInput {
  caseContent: string;
  party1Name: string;
  party2Name: string;
}

export interface IcebergInput {
  caseContent: string;
  party1Name: string;
  party2Name: string;
}

export interface ComponentsInput {
  caseContent: string;
  party1Name: string;
  party2Name: string;
  ioa: string;
  iceberg: string;
}

export interface ScenarioInput {
  componentId: string;
  componentName: string;
  componentDescription: string;
  redlineParty1: string;
  bottomlineParty1: string;
  redlineParty2: string;
  bottomlineParty2: string;
  party1Name: string;
  party2Name: string;
}

export interface RecalculateBoundariesInput {
  ioa: string;
  iceberg: string;
  components: string;
  party1Name: string;
  party2Name: string;
}

export interface IdentifyPartiesInput {
  caseContent: string;
}

// Response schemas
export const partiesSchema = {
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