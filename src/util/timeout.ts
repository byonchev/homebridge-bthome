export async function withTimeout<T>(
  promise: Promise<T> | (() => Promise<T>),
  timeout: number,
  error: Error,
): Promise<T> {
  promise = typeof promise === 'function' ? promise() : promise;

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(error), timeout)),
  ]);
}
