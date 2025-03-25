import axios from 'axios';
import { OPENAI_API_URL, OPENAI_API_KEY, MODEL, TEMPERATURE } from './config';
import { requestQueue } from './requestQueue';
import { OpenAIMessage, OpenAICompletionRequest } from './types';

// Define OpenAIError interface locally since it was removed from types.ts
interface OpenAIError {
  response?: {
    status: number;
    data: any;
    headers: {
      'retry-after'?: string;
    };
  };
  message: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Call OpenAI API with rate limiting and error handling
 */
export const callOpenAI = async (
  messages: Array<{ role: string; content: string }>,
  responseFormat?: { type: string }
): Promise<string> => {
  const makeRequest = async () => {
    try {
      const response = await axios.post<OpenAIResponse>(
        OPENAI_API_URL,
        {
          model: MODEL,
          messages,
          temperature: TEMPERATURE,
          max_tokens: 4000,
          ...(responseFormat && { response_format: responseFormat })
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      // Log error details
      console.error('Error calling OpenAI API:', error);

      // Handle specific error cases
      if (error.response?.status === 429) {
        console.log('Rate limit exceeded. Retrying...');
        throw error; // Let the request queue handle retries
      }

      if (error.response?.status === 401) {
        console.error('Authentication error. Please check your API key.');
        throw new Error('OpenAI API authentication failed');
      }

      if (error.response?.status === 400) {
        console.error('Invalid request:', error.response.data);
        throw new Error('Invalid request to OpenAI API');
      }

      // For network errors, throw a more specific error
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
        throw new Error('Network error when calling OpenAI API');
      }

      // For unknown errors, throw a generic error
      throw new Error('Error calling OpenAI API');
    }
  };

  // Use request queue to handle rate limiting
  return await requestQueue.add(makeRequest);
}; 