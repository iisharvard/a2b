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

// Gemini API types
export interface GeminiMessage {
  role: 'user' | 'model'; // Gemini uses 'model' for assistant
  parts: Array<{ text: string }>;
}

// Type for the content generation request to Gemini
export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  // Add other configuration parameters as needed
}

export interface GeminiSafetySetting {
  category: string; // e.g., HARM_CATEGORY_HARASSMENT
  threshold: string; // e.g., BLOCK_MEDIUM_AND_ABOVE
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: GeminiGenerationConfig;
  safetySettings?: GeminiSafetySetting[];
  // tools, tool_config, etc. can be added if needed for function calling
}

// Simplified Gemini API Response (adjust as needed based on actual API and usage)
export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
    // tokenCount, etc.
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
    // blockReasonMessage might also be available
  };
  // usageMetadata for token counts could be here or within candidates
}

export interface GeminiStreamChunk {
 candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    // Other fields like finishReason might appear in the last chunk
  }>;
  // promptFeedback might also be streamed
} 