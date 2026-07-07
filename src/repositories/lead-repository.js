import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

import { ConflictError, IntegrationError } from '../errors/index.js';

export const LeadEmailIndexName = 'LeadEmailIndex';

export class LeadRepository {
  constructor({ tableName, client = new DynamoDBClient({}), emailIndexName = LeadEmailIndexName }) {
    this.tableName = tableName;
    this.client = client;
    this.emailIndexName = emailIndexName;
  }

  async createLead(lead) {
    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: toDynamoItem(lead),
          ConditionExpression: 'attribute_not_exists(leadId)',
        }),
      );

      return lead;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new ConflictError('Lead already exists.', [{ field: 'leadId' }]);
      }

      throw toRepositoryError(error);
    }
  }

  async getLead(leadId) {
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

  async updateLead(leadId, updates) {
    const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

    if (entries.length === 0) {
      return this.getLead(leadId);
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
          ConditionExpression: 'attribute_exists(leadId)',
          ReturnValues: 'ALL_NEW',
        }),
      );

      return fromDynamoItem(result.Attributes);
    } catch (error) {
      throw toRepositoryError(error);
    }
  }

  async findLeadByEmail(email) {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: this.emailIndexName,
          KeyConditionExpression: '#email = :email',
          ExpressionAttributeNames: {
            '#email': 'email',
          },
          ExpressionAttributeValues: {
            ':email': toDynamoValue(email),
          },
          Limit: 1,
          ScanIndexForward: false,
        }),
      );

      return result.Items?.[0] ? fromDynamoItem(result.Items[0]) : null;
    } catch (error) {
      throw toRepositoryError(error);
    }
  }
}

export class InMemoryLeadRepository {
  constructor() {
    this.leads = new Map();
  }

  async createLead(lead) {
    if (this.leads.has(lead.leadId)) {
      throw new ConflictError('Lead already exists.', [{ field: 'leadId' }]);
    }

    this.leads.set(lead.leadId, cloneLead(lead));
    return cloneLead(lead);
  }

  async getLead(leadId) {
    const lead = this.leads.get(leadId);
    return lead ? cloneLead(lead) : null;
  }

  async updateLead(leadId, updates) {
    const lead = this.leads.get(leadId);

    if (!lead) {
      throw new IntegrationError('Lead repository operation failed.', [{ field: 'leadId' }]);
    }

    const updatedLead = { ...lead, ...updates };
    this.leads.set(leadId, cloneLead(updatedLead));
    return cloneLead(updatedLead);
  }

  async findLeadByEmail(email) {
    const lead = Array.from(this.leads.values()).find((item) => item.email === email);
    return lead ? cloneLead(lead) : null;
  }
}

export function createLeadRepository(config) {
  if (!config.leadTableName) {
    return new InMemoryLeadRepository();
  }

  return new LeadRepository({ tableName: config.leadTableName });
}

export function toDynamoItem(item) {
  return Object.fromEntries(
    Object.entries(item)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toDynamoValue(value)]),
  );
}

export function fromDynamoItem(item) {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, fromDynamoValue(value)]),
  );
}

function toDynamoValue(value) {
  if (value === null) {
    return { NULL: true };
  }

  if (typeof value === 'string') {
    return { S: value };
  }

  if (typeof value === 'number') {
    return { N: String(value) };
  }

  if (typeof value === 'boolean') {
    return { BOOL: value };
  }

  if (Array.isArray(value)) {
    return { L: value.filter((item) => item !== undefined).map((item) => toDynamoValue(item)) };
  }

  if (typeof value === 'object') {
    return { M: toDynamoItem(value) };
  }

  return { S: String(value) };
}

function fromDynamoValue(value) {
  if ('NULL' in value) {
    return null;
  }

  if ('S' in value) {
    return value.S;
  }

  if ('N' in value) {
    return Number(value.N);
  }

  if ('BOOL' in value) {
    return value.BOOL;
  }

  if ('L' in value) {
    return value.L.map((item) => fromDynamoValue(item));
  }

  if ('M' in value) {
    return fromDynamoItem(value.M);
  }

  return undefined;
}

function toRepositoryError(error) {
  return new IntegrationError('Lead repository operation failed.', [
    {
      message: error.message,
      name: error.name,
    },
  ]);
}

function cloneLead(lead) {
  return JSON.parse(JSON.stringify(lead));
}
