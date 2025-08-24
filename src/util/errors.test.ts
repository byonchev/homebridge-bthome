import { describe, it, expect } from 'vitest';
import { wrapError } from './errors.js';

class CustomError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'CustomError';
  }
}

class TestError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'TestError';
  }
}

describe('wrapError', () => {
  it('should wrap an Error instance with custom error type', () => {
    const originalError = new Error('Original error message');
    const wrappedError = wrapError(originalError, CustomError, 'Fallback message');

    expect(wrappedError).toBeInstanceOf(CustomError);
    expect(wrappedError.message).toBe('CustomError: Original error message');
    expect(wrappedError.stack).toBe(originalError.stack);
  });

  it('should preserve stack trace from original error', () => {
    const originalError = new Error('Test error');
    const originalStack = originalError.stack;

    const wrappedError = wrapError(originalError, TestError, 'Fallback');

    expect(wrappedError.stack).toBe(originalStack);
  });

  it('should use fallback message for non-Error values', () => {
    const wrappedError = wrapError('string error', CustomError, 'Fallback message');

    expect(wrappedError).toBeInstanceOf(CustomError);
    expect(wrappedError.message).toBe('CustomError: Fallback message');
    expect(wrappedError.stack).toBeDefined();
  });

  it('should handle Error instances with empty messages', () => {
    const originalError = new Error('');
    const wrappedError = wrapError(originalError, CustomError, 'Fallback message');

    expect(wrappedError.message).toBe('CustomError: Fallback message');
  });

  it('should handle Error instances with no message', () => {
    const originalError = new Error();
    const wrappedError = wrapError(originalError, CustomError, 'Fallback message');

    expect(wrappedError.message).toBe('CustomError: Fallback message');
  });
});
