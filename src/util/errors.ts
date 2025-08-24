type WrappedConstructor = new (message?: string) => Error;

export const wrapError = <E extends WrappedConstructor>(original: unknown, errorType: E, fallback: string): Error => {
  let message = '';
  let stack: string | undefined;

  if (original instanceof Error) {
    message = original.message;
    stack = original.stack;
  }

  const result = new errorType(`${errorType.name}: ${message || fallback}`);

  if (stack) {
    result.stack = stack;
  }

  return result;
};
