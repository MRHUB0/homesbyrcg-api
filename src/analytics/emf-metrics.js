import { nowIso } from '../shared/time.js';

export function emitAnalyticsMetric({
  metricName,
  value = 1,
  environment,
  serviceName,
  family = 'UNKNOWN',
}) {
  const timestamp = Date.now();
  const record = {
    _aws: {
      Timestamp: timestamp,
      CloudWatchMetrics: [
        {
          Namespace: 'HomesByRCG/Analytics',
          Dimensions: [
            ['Service', 'Environment'],
            ['Service', 'Environment', 'Family'],
          ],
          Metrics: [{ Name: metricName, Unit: 'Count' }],
        },
      ],
    },
    timestamp: nowIso(),
    Service: serviceName,
    Environment: environment,
    Family: family,
    [metricName]: value,
  };

  console.log(JSON.stringify(record));
}
