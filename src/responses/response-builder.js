import { ErrorBuilder } from '../errors/index.js';
import { nowIso } from '../shared/time.js';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export class ResponseBuilder {
  static success({ message = '', data = {}, statusCode = 200, context, headers = {} }) {
    return ResponseBuilder.build({
      statusCode,
      headers,
      body: {
        success: true,
        message,
        data,
        errors: [],
        requestId: context.requestId,
        correlationId: context.correlationId,
        timestamp: nowIso(),
      },
    });
  }

  static leadAccepted({ message, lead, context, headers = {} }) {
    return ResponseBuilder.build({
      statusCode: 202,
      headers,
      body: {
        success: true,
        message,
        leadId: lead.leadId,
        status: lead.status,
        requestId: context.requestId,
        correlationId: context.correlationId,
        timestamp: nowIso(),
      },
    });
  }

  static error({ error, context, headers = {} }) {
    const appError = ErrorBuilder.from(error);

    return ResponseBuilder.build({
      statusCode: appError.statusCode,
      headers,
      body: {
        success: false,
        message: appError.message,
        data: {},
        errors: ErrorBuilder.toResponseErrors(appError),
        requestId: context.requestId,
        correlationId: context.correlationId,
        timestamp: nowIso(),
      },
    });
  }

  static noContent({ headers = {} } = {}) {
    return {
      statusCode: 204,
      headers: { ...defaultHeaders, ...headers },
      body: '',
    };
  }

  static build({ statusCode, body, headers = {} }) {
    return {
      statusCode,
      headers: { ...defaultHeaders, ...headers },
      body: JSON.stringify(body),
    };
  }
}
