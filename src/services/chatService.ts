/**
 * Service for handling chat-related API calls
 */

// Define types for API responses
export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Streams a chat completion from OpenAI API
 * @param messages - Array of messages to send to the API
 * @param apiKey - OpenAI API key
 * @param callbacks - Callbacks for stream events
 * @param model - Model to use (defaults to gpt-3.5-turbo)
 */
export const streamChatCompletion = async (
  messages: ChatMessage[],
  apiKey: string,
  callbacks: StreamCallbacks,
  model: string = 'gpt-3.5-turbo'
): Promise<void> => {
  const { onStart, onToken, onComplete, onError } = callbacks;
  
  try {
    // Notify start of stream
    onStart?.();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `API request failed with status ${response.status}: ${
          errorData ? JSON.stringify(errorData) : 'Unknown error'
        }`
      );
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Process the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';

    try {
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete SSE messages from buffer
        let lineEnd;
        while ((lineEnd = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            // Check for stream completion
            if (data === '[DONE]') {
              onComplete?.(fullResponse);
              return;
            }

            try {
              const parsed: ChatCompletionChunk = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                fullResponse += content;
                onToken?.(content);
              }
            } catch (err) {
              // Silent error handling
            }
          }
        }
      }

      // Ensure completion callback is triggered
      onComplete?.(fullResponse);
    } catch (err) {
      reader.cancel();
      throw err;
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Gets a chat completion from OpenAI API (non-streaming)
 * @param messages - Array of messages to send to the API
 * @param apiKey - OpenAI API key
 * @param model - Model to use (defaults to gpt-3.5-turbo)
 * @returns The AI response text
 */
export const getChatCompletion = async (
  messages: ChatMessage[],
  apiKey: string,
  model: string = 'gpt-3.5-turbo'
): Promise<string> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `API request failed with status ${response.status}: ${
          errorData ? JSON.stringify(errorData) : 'Unknown error'
        }`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    throw error;
  }
}; 