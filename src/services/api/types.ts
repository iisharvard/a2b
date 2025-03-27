import { Analysis, Component, Party, Scenario } from '../../store/negotiationSlice';
import { ApiResponse, AnalysisResponse } from '../../types/api';

// OpenAI API types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponseRequest {
  model: string;
  input: OpenAIMessage[] | string;
  temperature?: number;
  max_output_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  response_format?: { type: string };
  tools?: any[];
  tool_choice?: string | object;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  output: {
    type: string;
    id: string;
    status: string;
    role: string;
    content: {
      type: string;
      text: string;
      annotations: any[];
    }[];
  }[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIStreamChunk {
  type: string;
  output_index: number;
  content_index: number;
  item_id: string;
  delta?: string;
  text?: string;
  annotations?: any[];
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