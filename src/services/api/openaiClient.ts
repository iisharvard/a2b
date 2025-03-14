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

/**
 * Call the OpenAI API with retry logic for rate limiting
 * @param messages Array of messages to send to the API
 * @param retryCount Current retry count
 * @param initialDelay Initial delay for exponential backoff
 * @returns Promise that resolves with the API response content or a rate limited flag
 */
export const callOpenAI = async (
  messages: OpenAIMessage[], 
  retryCount = 0, 
  initialDelay = 1000
): Promise<string | { rateLimited: true }> => {
  return requestQueue.add(async () => {
    const maxRetries = 3;
    
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not set. Please check your .env file.');
      }

      const requestBody: OpenAICompletionRequest = {
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
      
      if (response.data && 
          response.data.choices && 
          response.data.choices.length > 0 && 
          response.data.choices[0].message) {
        return response.data.choices[0].message.content;
      } else {
        console.error('Unexpected API response structure:', response.data);
        throw new Error('Unexpected API response structure');
      }
    } catch (error: unknown) {
      const err = error as OpenAIError;
      console.error('Error calling OpenAI API:', err);
      
      if (err.response && err.response.status === 429 && retryCount < maxRetries) {
        const retryAfter = err.response.headers['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : initialDelay * Math.pow(2, retryCount);
        
        console.log(`Rate limit exceeded. Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return callOpenAI(messages, retryCount + 1, initialDelay);
      }
      
      if (err.response && err.response.status === 429) {
        console.log('Rate limit exceeded and max retries reached. Returning rate limited flag.');
        return { rateLimited: true };
      }
      
      if (err.response) {
        console.error('API error response:', err.response.data);
        throw new Error(`OpenAI API error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
      }
      
      throw new Error('Failed to get response from OpenAI: ' + (err.message || 'Unknown error'));
    }
  });
}; 