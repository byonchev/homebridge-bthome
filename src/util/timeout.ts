export const withTimeout = async <T>(
  promise: Promise<T> | (() => Promise<T>),
  timeout: number,
  error: Error,
): Promise<T> => {
  promise = typeof promise === 'function' ? promise() : promise;

  // No timeout specified, return the original promise
  if (timeout <= 0) {
    return promise;
  }

  return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(error), timeout))]);
};
