import { ApiError } from './ApiError.js';

export class AppError extends ApiError {
  constructor(statusCode, code, message, details = []) {
    super(statusCode, message, details);
    this.code = code;
    this.details = Array.isArray(details) ? details : details ? [details] : [];
    this.errors = this.details;
  }
}

export { ApiError };
