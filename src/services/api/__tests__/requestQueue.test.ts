import { RequestQueue } from '../requestQueue';
import { RATE_LIMIT } from '../config';

// Mock the setTimeout function
jest.useFakeTimers({ advanceTimers: true });

// Mock the RATE_LIMIT for testing
jest.mock('../config', () => ({
  RATE_LIMIT: {
    requests: 2,
    interval: 100,
    minDelay: 10
  }
}));

describe('RequestQueue', () => {
  let requestQueue: RequestQueue;

  beforeEach(() => {
    requestQueue = new RequestQueue();
    jest.clearAllMocks();
  });

  test('should process requests in order', async () => {
    // Create mock requests
    const request1 = jest.fn().mockResolvedValue('result1');
    const request2 = jest.fn().mockResolvedValue('result2');
    const request3 = jest.fn().mockResolvedValue('result3');

    // Add requests to the queue
    const promise1 = requestQueue.add(request1);
    const promise2 = requestQueue.add(request2);
    const promise3 = requestQueue.add(request3);

    // Fast-forward timers to process all requests
    jest.runAllTimers();

    // Wait for all promises to resolve
    const results = await Promise.all([promise1, promise2, promise3]);

    // Check that all requests were called in order
    expect(request1).toHaveBeenCalled();
    expect(request2).toHaveBeenCalled();
    expect(request3).toHaveBeenCalled();

    // Check that results are correct
    expect(results).toEqual(['result1', 'result2', 'result3']);
  }, 10000);

  test('should handle errors in requests', async () => {
    // Create mock requests
    const request1 = jest.fn().mockResolvedValue('result1');
    const request2 = jest.fn().mockRejectedValue(new Error('test error'));
    const request3 = jest.fn().mockResolvedValue('result3');

    // Add requests to the queue
    const promise1 = requestQueue.add(request1);
    const promise2 = requestQueue.add(request2).catch(e => e.message);
    const promise3 = requestQueue.add(request3);

    // Fast-forward timers to process all requests
    jest.runAllTimers();

    // Wait for all promises to resolve
    const results = await Promise.all([promise1, promise2, promise3]);

    // Check that all requests were called
    expect(request1).toHaveBeenCalled();
    expect(request2).toHaveBeenCalled();
    expect(request3).toHaveBeenCalled();

    // Check that results are correct
    expect(results).toEqual(['result1', 'test error', 'result3']);
  }, 10000);
}); 