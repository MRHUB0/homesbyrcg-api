import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

import { IntegrationError } from '../errors/index.js';
import { fromDynamoItem, toDynamoItem, toDynamoValue } from '../repositories/lead-repository.js';

export class LeadIntelligenceRepository {
  constructor({ tableName, client = new DynamoDBClient({}) }) {
    this.tableName = tableName;
    this.client = client;
  }

  async getByLeadId(leadId) {
    try {
      const result = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: toDynamoItem({ leadId }),
        }),
      );

      return result.Item ? fromDynamoItem(result.Item) : null;
    } catch (error) {
      throw toRepositoryError(error);
    }
  }

  async upsert(entry) {
    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: toDynamoItem(entry),
        }),
      );

      return entry;
    } catch (error) {
      throw toRepositoryError(error);
    }
  }

  async updateByLeadId(leadId, updates) {
    const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return this.getByLeadId(leadId);
    }

    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    const setExpressions = entries.map(([key, value], index) => {
      const nameKey = `#field${index}`;
      const valueKey = `:value${index}`;
      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = toDynamoValue(value);
      return `${nameKey} = ${valueKey}`;
    });

    try {
      const result = await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: toDynamoItem({ leadId }),
          UpdateExpression: `SET ${setExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        }),
      );

      return fromDynamoItem(result.Attributes);
    } catch (error) {
      throw toRepositoryError(error);
    }
  }
}

export class InMemoryLeadIntelligenceRepository {
  constructor() {
    this.items = new Map();
  }

  async getByLeadId(leadId) {
    const item = this.items.get(leadId);
    return item ? clone(item) : null;
  }

  async upsert(entry) {
    this.items.set(entry.leadId, clone(entry));
    return clone(entry);
  }

  async updateByLeadId(leadId, updates) {
    const current = this.items.get(leadId) || { leadId };
    const updated = { ...current, ...updates };
    this.items.set(leadId, clone(updated));
    return clone(updated);
  }
}

export function createLeadIntelligenceRepository(config) {
  if (!config.leadIntelligenceTableName) {
    return new InMemoryLeadIntelligenceRepository();
  }

  return new LeadIntelligenceRepository({ tableName: config.leadIntelligenceTableName });
}

function toRepositoryError(error) {
  return new IntegrationError('Lead intelligence repository operation failed.', [
    {
      message: error.message,
      name: error.name,
    },
  ]);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
