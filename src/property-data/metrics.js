const metricNamespace = 'HomesByRCG/PropertyData';

function emitMetric({ name, provider, resultStatus, serviceName, environment, value = 1 }) {
  const timestamp = Date.now();

  const record = {
    _aws: {
      Timestamp: timestamp,
      CloudWatchMetrics: [
        {
          Namespace: metricNamespace,
          Dimensions: [['Service', 'Environment', 'Provider', 'ResultStatus']],
          Metrics: [{ Name: name, Unit: 'Count' }],
        },
      ],
    },
    Service: serviceName,
    Environment: environment,
    Provider: provider,
    ResultStatus: resultStatus,
    [name]: value,
  };

  console.log(JSON.stringify(record));
}

export class PropertyMetrics {
  constructor({ serviceName, environment }) {
    this.serviceName = serviceName;
    this.environment = environment;
  }

  lookupAttempt({ provider, resultStatus = 'UNKNOWN' }) {
    emitMetric({
      name: 'PropertyLookupAttempt',
      provider,
      resultStatus,
      serviceName: this.serviceName,
      environment: this.environment,
    });
  }

  lookupSuccess({ provider, resultStatus }) {
    emitMetric({
      name: 'PropertyLookupSuccess',
      provider,
      resultStatus,
      serviceName: this.serviceName,
      environment: this.environment,
    });
  }

  lookupNotFound({ provider, resultStatus }) {
    emitMetric({
      name: 'PropertyLookupNotFound',
      provider,
      resultStatus,
      serviceName: this.serviceName,
      environment: this.environment,
    });
  }

  lookupMultiple({ provider, resultStatus }) {
    emitMetric({
      name: 'PropertyLookupMultiple',
      provider,
      resultStatus,
      serviceName: this.serviceName,
      environment: this.environment,
    });
  }

  providerFailure({ provider, resultStatus }) {
    emitMetric({
      name: 'PropertyProviderFailure',
      provider,
      resultStatus,
      serviceName: this.serviceName,
      environment: this.environment,
    });
  }

  cacheHit({ provider, resultStatus }) {
    emitMetric({
      name: 'PropertyCacheHit',
      provider,
      resultStatus,
      serviceName: this.serviceName,
      environment: this.environment,
    });
  }

  cacheMiss({ provider, resultStatus = 'MISS' }) {
    emitMetric({
      name: 'PropertyCacheMiss',
      provider,
      resultStatus,
      serviceName: this.serviceName,
      environment: this.environment,
    });
  }
}
