export class HealthCheck {
  static getStatus({ config, context }) {
    return {
      status: 'healthy',
      service: config.serviceName,
      version: config.version,
      environment: config.appEnvironment,
      timestamp: context.timestamp,
      requestId: context.requestId,
    };
  }
}
