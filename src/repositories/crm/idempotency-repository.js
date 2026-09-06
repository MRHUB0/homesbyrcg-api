import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

import { IntegrationError } from '../../errors/index.js';
import { fromDynamoItem, toDynamoItem, toDynamoValue } from '../lead-repository.js';

let inMemoryCrmIdempotencyRepository;

export class CrmIdempotencyRepository {
  constructor({ tableName, client = new DynamoDBClient({}) }) {
    this.tableName = tableName;
    this.client = client;
  }

  async acquire(key, payload = null) {
    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: toDynamoItem({
            key,
            status: 'PROCESSING',
            payload,
            createdAt: new Date().toISOString(),
          }),
          ConditionExpression: 'attribute_not_exists(#key)',
          ExpressionAttributeNames: { '#key': 'key' },
        }),
      );

      return true;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        return false;
      }

      throw new IntegrationError('CRM idempotency repository operation failed.', [
        { message: error.message, name: error.name },
      ]);
    }
  }

  async complete(key, metadata = null) {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: toDynamoItem({ key }),
          UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #metadata = :metadata',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#updatedAt': 'updatedAt',
            '#metadata': 'metadata',
          },
          ExpressionAttributeValues: {
            ':status': toDynamoValue('SUCCESS'),
            ':updatedAt': toDynamoValue(new Date().toISOString()),
            ':metadata': toDynamoValue(metadata),
          },
        }),
      );
    } catch (error) {
      throw new IntegrationError('CRM idempotency repository operation failed.', [
        { message: error.message, name: error.name },
      ]);
    }
  }

  async release(key) {
    try {
      await this.client.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: toDynamoItem({ key }),
        }),
      );
    } catch (error) {
      throw new IntegrationError('CRM idempotency repository operation failed.', [
        { message: error.message, name: error.name },
      ]);
    }
  }
}

export class InMemoryCrmIdempotencyRepository {
  constructor() {
    this.store = new Map();
  }

  async acquire(key, payload = null) {
    if (this.store.has(key)) {
      return false;
    }

    this.store.set(key, {
      key,
      status: 'PROCESSING',
      payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
      createdAt: new Date().toISOString(),
    });

    return true;
  }

  async complete(key, metadata = null) {
    const existing = this.store.get(key);
    if (!existing) {
      return;
    }

    existing.status = 'SUCCESS';
    existing.updatedAt = new Date().toISOString();
    existing.metadata = metadata ? JSON.parse(JSON.stringify(metadata)) : null;
    this.store.set(key, existing);
  }

  async release(key) {
    this.store.delete(key);
  }

  get(key) {
    const value = this.store.get(key);
    return value ? fromDynamoItem(toDynamoItem(value)) : null;
  }
}

export function createCrmIdempotencyRepository(config) {
  if (!config.crmIdempotencyTableName) {
    if (!inMemoryCrmIdempotencyRepository) {
      inMemoryCrmIdempotencyRepository = new InMemoryCrmIdempotencyRepository();
    }

    return inMemoryCrmIdempotencyRepository;
  }

  return new CrmIdempotencyRepository({ tableName: config.crmIdempotencyTableName });
}
