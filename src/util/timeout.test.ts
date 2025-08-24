import { describe, it, expect } from 'vitest';
import { withTimeout } from './timeout.js';

describe('withTimeout', () => {
  it('should resolve when promise resolves before timeout', async () => {
    const promise = Promise.resolve('success');
    const timeoutError = new Error('Timeout');

    const result = await withTimeout(promise, 1000, timeoutError);

    expect(result).toBe('success');
  });

  it('should reject with timeout error when promise takes too long', async () => {
    const slowPromise = new Promise(resolve => setTimeout(() => resolve('too late'), 1000));
    const timeoutError = new Error('Operation timed out');

    await expect(withTimeout(slowPromise, 50, timeoutError)).rejects.toThrow('Operation timed out');
  });

  it('should reject with original error when promise rejects before timeout', async () => {
    const rejectedPromise = Promise.reject(new Error('Original error'));
    const timeoutError = new Error('Timeout');

    await expect(withTimeout(rejectedPromise, 1000, timeoutError)).rejects.toThrow('Original error');
  });

  it('should handle immediate resolution', async () => {
    const immediatePromise = Promise.resolve(42);
    const timeoutError = new Error('Timeout');

    const result = await withTimeout(immediatePromise, 0, timeoutError);

    expect(result).toBe(42);
  });

  it('should handle immediate rejection', async () => {
    const immediateRejection = Promise.reject(new Error('Immediate error'));
    const timeoutError = new Error('Timeout');

    await expect(withTimeout(immediateRejection, 1000, timeoutError)).rejects.toThrow('Immediate error');
  });

  it('should use custom timeout error message', async () => {
    const slowPromise = new Promise(resolve => setTimeout(() => resolve('done'), 1000));
    const customError = new Error('Custom timeout message');

    await expect(withTimeout(slowPromise, 50, customError)).rejects.toThrow('Custom timeout message');
  });

  it('should work with async function that resolves', async () => {
    const asyncFunction = async () => {
      return 'async result';
    };
    const timeoutError = new Error('Timeout');

    const result = await withTimeout(asyncFunction, 1000, timeoutError);

    expect(result).toBe('async result');
  });

  it('should work with async function that throws', async () => {
    const asyncFunction = async () => {
      throw new Error('Async function error');
    };
    const timeoutError = new Error('Timeout');

    await expect(withTimeout(asyncFunction, 1000, timeoutError)).rejects.toThrow('Async function error');
  });

  it('should timeout async function that takes too long', async () => {
    const slowAsyncFunction = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'slow result';
    };
    const timeoutError = new Error('Async timeout');

    await expect(withTimeout(slowAsyncFunction, 50, timeoutError)).rejects.toThrow('Async timeout');
  });
});
