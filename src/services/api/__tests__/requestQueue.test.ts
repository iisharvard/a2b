import { RequestQueue } from '../requestQueue';
import { RATE_LIMIT } from '../config';

// Mock the setTimeout function
jest.useFakeTimers({ advanceTimers: true });

// Mock the RATE_LIMIT for testing
jest.mock('../config', () => ({
  RATE_LIMIT: {
    requests: 2,
    interval: 100,
    minDelay: 10,
    maxRetries: 3,
    backoffFactor: 2,
    initialRetryDelay: 20
  }
}));

describe('RequestQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should process requests in order', async () => {
    // Create mock requests with call order tracking
    const callOrder: number[] = [];
    const request1 = jest.fn().mockImplementation(() => {
      callOrder.push(1);
      return Promise.resolve('result1');
    });
    const request2 = jest.fn().mockImplementation(() => {
      callOrder.push(2);
      return Promise.resolve('result2');
    });
    const request3 = jest.fn().mockImplementation(() => {
      callOrder.push(3);
      return Promise.resolve('result3');
    });

    // Add requests to queue
    const queue = new RequestQueue();
    const promise1 = queue.add(request1);
    const promise2 = queue.add(request2);
    const promise3 = queue.add(request3);

    // Fast forward timers and wait for promises to resolve
    await Promise.all([
      promise1,
      promise2,
      promise3,
      jest.runAllTimersAsync()
    ]);

    // Check results
    expect(await promise1).toBe('result1');
    expect(await promise2).toBe('result2');
    expect(await promise3).toBe('result3');
    expect(callOrder).toEqual([1, 2, 3]);
  }, 10000);

  test('should handle errors in requests', async () => {
    // Create mock requests with call order tracking
    const callOrder: number[] = [];
    const request1 = jest.fn().mockImplementation(() => {
      callOrder.push(1);
      return Promise.resolve('result1');
    });
    const request2 = jest.fn().mockImplementation(() => {
      callOrder.push(2);
      return Promise.reject(new Error('test error'));
    });
    const request3 = jest.fn().mockImplementation(() => {
      callOrder.push(3);
      return Promise.resolve('result3');
    });

    // Add requests to queue
    const queue = new RequestQueue();
    const promise1 = queue.add(request1);
    const promise2 = queue.add(request2);
    const promise3 = queue.add(request3);

    // Fast forward timers and wait for promises to settle
    await Promise.all([
      Promise.allSettled([promise1, promise2, promise3]),
      jest.runAllTimersAsync()
    ]);

    // Check results
    const results = await Promise.allSettled([promise1, promise2, promise3]);
    expect(results[0].status).toBe('fulfilled');
    expect((results[0] as PromiseFulfilledResult<string>).value).toBe('result1');
    expect(results[1].status).toBe('rejected');
    expect((results[1] as PromiseRejectedResult).reason.message).toBe('test error');
    expect(results[2].status).toBe('fulfilled');
    expect((results[2] as PromiseFulfilledResult<string>).value).toBe('result3');
    expect(callOrder).toEqual([1, 2, 3]);
  }, 10000);

  test('should handle rate limiting', async () => {
    // Create mock requests with call order tracking
    const callOrder: number[] = [];
    const requests = Array(RATE_LIMIT.requests + 1).fill(null).map((_, i) => 
      jest.fn().mockImplementation(() => {
        callOrder.push(i + 1);
        return Promise.resolve(`result${i + 1}`);
      })
    );

    // Add requests to queue
    const queue = new RequestQueue();
    const promises = requests.map(request => queue.add(request));

    // Fast forward timers and wait for promises to resolve
    await Promise.all([
      Promise.all(promises),
      jest.runAllTimersAsync()
    ]);

    // Check results
    const results = await Promise.all(promises);
    expect(results).toEqual(requests.map((_, i) => `result${i + 1}`));
    
    // Check that requests were called in order
    expect(callOrder).toEqual(Array.from({ length: requests.length }, (_, i) => i + 1));
  }, 10000);

  test('should retry on rate limit errors', async () => {
    // Create mock request that fails with rate limit error then succeeds
    const request = jest.fn()
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValueOnce('success');

    // Add request to queue
    const queue = new RequestQueue();
    const promise = queue.add(request);

    // Fast forward timers and wait for promise to resolve
    await Promise.all([
      promise,
      jest.runAllTimersAsync()
    ]);

    // Check result
    const result = await promise;
    expect(result).toBe('success');
    expect(request).toHaveBeenCalledTimes(2);
  }, 10000);
}); 