export class HealthCheck {
  static getStatus({ config, context }) {
    return {
      status: 'healthy',
      service: config.serviceName,
      version: config.version,
      environment: config.appEnvironment,
      timestamp: context.timestamp,
      requestId: context.requestId,
      integrations: {
        crm: {
          providerMode: config.crmProviderMode,
          configured:
            config.crmProviderMode === 'boldtrail' ? Boolean(config.boldTrailApiToken) : true,
          endpoint: config.crmProviderMode === 'boldtrail' ? config.boldTrailApiBaseUrl : null,
        },
      },
    };
  }
}
