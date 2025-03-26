import { LLMError } from '../../../types/llm';

export async function handleStreamError(response: any): Promise<LLMError> {
  try {
    const errorData = await response.json();
    const retryAfter = parseInt(response.headers.get('retry-after') || '0');
    return {
      code: 'API_ERROR',
      message: errorData?.error?.message || `API request failed with status ${response.status}`,
      status: response.status,
      retryAfter,
    };
  } catch (error) {
    return {
      code: 'API_ERROR',
      message: `API request failed with status ${response.status}`,
      status: response.status,
      retryAfter: parseInt(response.headers.get('retry-after') || '0'),
    };
  }
} 