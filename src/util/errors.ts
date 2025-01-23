type WrappedConstructor = new (message?: string) => Error;

export function wrapError<E extends WrappedConstructor>(original: unknown, errorType : E, unknownMessage: string) : Error {
  let message = unknownMessage;
  let stack : string | undefined;
      
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