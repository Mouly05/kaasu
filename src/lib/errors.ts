/** Typed errors that the action/route wrappers in auth-helpers turn into responses. */

export class UnauthorizedError extends Error {
  constructor(message = "You need to sign in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class RateLimitError extends Error {
  constructor(
    readonly retryAfterSeconds: number,
    message = "Too many requests. Please wait a moment and try again.",
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}
