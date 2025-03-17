import { Analysis, Component, Party, Scenario } from '../../store/negotiationSlice';
import { ApiResponse, AnalysisResponse } from '../../types/api';

// OpenAI API types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  response_format?: { type: string };
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: Partial<OpenAIMessage>;
    finish_reason: string | null;
  }[];
}

// Request queue types
export interface QueuedRequest {
  id: string;
  priority: number;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

// Progress callback types
export interface ProgressCallback {
  (progress: ProgressUpdate): void;
}

export interface ProgressUpdate {
  step: number;
  substep: number;
  message: string;
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
  scenarioType?: string;
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