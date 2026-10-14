import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';

import { IntegrationError } from '../errors/index.js';
import { fromDynamoItem, toDynamoItem, toDynamoValue } from './lead-repository.js';

export class AnalyticsEventRepository {
  constructor({ tableName, client = new DynamoDBClient({}) }) {
    this.tableName = tableName;
    this.client = client;
  }

  async createEvent(event) {
    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: toDynamoItem(event),
          ConditionExpression: 'attribute_not_exists(eventId)',
        }),
      );

      return {
        event,
        duplicate: false,
      };
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        const existing = await this.getEvent(event.eventId);
        return {
          event: existing,
          duplicate: true,
        };
      }

      throw toRepositoryError(error);
    }
  }

  async getEvent(eventId) {
    try {
      const result = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: toDynamoItem({ eventId }),
        }),
      );

      return result.Item ? fromDynamoItem(result.Item) : null;
    } catch (error) {
      throw toRepositoryError(error);
    }
  }

  async findJourneyEvents(journeyId, { scanIndexForward = true, limit = 1 } = {}) {
    if (!journeyId) {
      return [];
    }

    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'JourneyOccurredAtIndex',
          KeyConditionExpression: '#journeyId = :journeyId',
          ExpressionAttributeNames: {
            '#journeyId': 'journeyId',
          },
          ExpressionAttributeValues: {
            ':journeyId': toDynamoValue(journeyId),
          },
          ScanIndexForward: scanIndexForward,
          Limit: limit,
        }),
      );

      return (result.Items ?? []).map((item) => fromDynamoItem(item));
    } catch (error) {
      throw toRepositoryError(error);
    }
  }
}

export class InMemoryAnalyticsEventRepository {
  constructor() {
    this.events = new Map();
  }

  async createEvent(event) {
    if (this.events.has(event.eventId)) {
      return {
        event: cloneEvent(this.events.get(event.eventId)),
        duplicate: true,
      };
    }

    this.events.set(event.eventId, cloneEvent(event));

    return {
      event: cloneEvent(event),
      duplicate: false,
    };
  }

  async getEvent(eventId) {
    const event = this.events.get(eventId);
    return event ? cloneEvent(event) : null;
  }

  async findJourneyEvents(journeyId, { scanIndexForward = true, limit = 1 } = {}) {
    const events = Array.from(this.events.values())
      .filter((event) => event.journeyId === journeyId)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

    const ordered = scanIndexForward ? events : events.reverse();
    return ordered.slice(0, limit).map((event) => cloneEvent(event));
  }
}

export function createAnalyticsEventRepository(config) {
  if (!config.analyticsEventTableName) {
    if (!globalThis.__homesByRcgInMemoryAnalyticsRepository) {
      globalThis.__homesByRcgInMemoryAnalyticsRepository = new InMemoryAnalyticsEventRepository();
    }

    return globalThis.__homesByRcgInMemoryAnalyticsRepository;
  }

  return new AnalyticsEventRepository({ tableName: config.analyticsEventTableName });
}

function toRepositoryError(error) {
  return new IntegrationError('Analytics repository operation failed.', [
    {
      message: error.message,
      name: error.name,
    },
  ]);
}

function cloneEvent(event) {
  return JSON.parse(JSON.stringify(event));
}
