type WrappedConstructor = new (message?: string) => Error;

export function wrapError<E extends WrappedConstructor>(original: unknown, errorType: E, fallback: string): Error {
  let message = fallback;
  let stack: string | undefined;

  if (original instanceof Error) {
    message = original.message;
    stack = original.stack;
  }

  const result = new errorType(message);

  if (stack) {
    result.stack = stack;
  }

  return result;
}
