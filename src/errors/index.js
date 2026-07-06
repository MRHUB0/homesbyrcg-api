export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? 'APP_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details ?? [];
    this.isOperational = options.isOperational ?? true;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed.', details = []) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, details });
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Request could not be processed.', details = []) {
    super(message, { code: 'UNPROCESSABLE_ENTITY', statusCode: 422, details });
  }
}

export class ConfigurationError extends AppError {
  constructor(message = 'Configuration error.', details = []) {
    super(message, { code: 'CONFIGURATION_ERROR', statusCode: 500, details });
  }
}

export class ProviderError extends AppError {
  constructor(message = 'Provider error.', details = []) {
    super(message, { code: 'PROVIDER_ERROR', statusCode: 502, details });
  }
}

export class IntegrationError extends AppError {
  constructor(message = 'Integration error.', details = []) {
    super(message, { code: 'INTEGRATION_ERROR', statusCode: 502, details });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required.', details = []) {
    super(message, { code: 'AUTHENTICATION_ERROR', statusCode: 401, details });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Not authorized.', details = []) {
    super(message, { code: 'AUTHORIZATION_ERROR', statusCode: 403, details });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.', details = []) {
    super(message, { code: 'NOT_FOUND', statusCode: 404, details });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict.', details = []) {
    super(message, { code: 'CONFLICT', statusCode: 409, details });
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error.', details = []) {
    super(message, { code: 'INTERNAL_SERVER_ERROR', statusCode: 500, details });
  }
}

export class ErrorBuilder {
  static from(error) {
    if (error instanceof AppError) {
      return error;
    }

    return new InternalServerError();
  }

  static toResponseErrors(error) {
    const appError = ErrorBuilder.from(error);

    if (appError.details.length > 0) {
      return appError.details.map((detail) =>
        typeof detail === 'string'
          ? { code: appError.code, message: detail }
          : { code: appError.code, ...detail },
      );
    }

    return [{ code: appError.code, message: appError.message }];
  }
}
