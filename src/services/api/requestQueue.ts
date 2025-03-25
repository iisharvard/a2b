import { RATE_LIMIT } from './config';

/**
 * Request queue for handling API rate limiting
 * Ensures requests are processed in order and within rate limits
 */
export class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestTimes: number[] = [];

  /**
   * Add a request to the queue
   * @param request Function that returns a promise
   * @returns Promise that resolves with the result of the request
   */
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithRateLimit(request);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  /**
   * Execute a request with rate limiting and exponential backoff
   * @param request Function that returns a promise
   * @returns Promise that resolves with the result of the request
   */
  private async executeWithRateLimit<T>(request: () => Promise<T>): Promise<T> {
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount <= RATE_LIMIT.maxRetries) {
      try {
        // Remove old request times
        const now = Date.now();
        this.requestTimes = this.requestTimes.filter(time => now - time < RATE_LIMIT.interval);

        // If we've hit the rate limit, wait until we can make another request
        if (this.requestTimes.length >= RATE_LIMIT.requests) {
          const oldestRequest = this.requestTimes[0];
          const waitTime = Math.max(
            RATE_LIMIT.interval - (now - oldestRequest),
            RATE_LIMIT.minDelay
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Add current request time
        this.requestTimes.push(Date.now());

        // Execute request
        return await request();
      } catch (error: any) {
        lastError = error;
        
        // Only retry on rate limit errors
        if (error?.response?.status !== 429) {
          throw error;
        }

        if (retryCount === RATE_LIMIT.maxRetries) {
          console.error(`Max retries (${RATE_LIMIT.maxRetries}) exceeded for request`);
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = RATE_LIMIT.initialRetryDelay * Math.pow(RATE_LIMIT.backoffFactor, retryCount);
        console.log(`Rate limit exceeded. Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${RATE_LIMIT.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }

    throw lastError;
  }

  /**
   * Process the queue
   */
  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Error processing queued request:', error);
        }
        // Add minimum delay between requests
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.minDelay));
      }
    }
    this.processing = false;
  }
}

// Create a single instance of the request queue
export const requestQueue = new RequestQueue(); 