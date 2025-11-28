/**
 * WowSQL TypeScript SDK
 * Official client library for WowSQL REST API v2
 * 
 * @version 2.0.0
 * @license MIT
 * @see https://github.com/wowsql/wowsql
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { WOWSQLError } from './errors';

// ==================== Types ====================

export interface WowSQLConfig {
  /** Project subdomain or full URL (e.g., 'myproject' or 'https://myproject.wowsql.com') */
  projectUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Base domain (default: wowsql.com) */
  baseDomain?: string;
  /** Use HTTPS (default: true) */
  secure?: boolean;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export interface QueryOptions {
  /** Columns to select (comma-separated or array) */
  select?: string | string[];
  /** Filter expressions */
  filter?: FilterExpression | FilterExpression[];
  /** Column to sort by */
  order?: string;
  /** Sort direction */
  orderDirection?: 'asc' | 'desc';
  /** Maximum records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
}

export interface FilterExpression {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'is';
  value: string | number | boolean | null;
}

export interface QueryResponse<T = any> {
  data: T[];
  count: number;
  total: number;
  limit: number;
  offset: number;
}

export interface CreateResponse {
  id: number | string;
  message: string;
}

export interface UpdateResponse {
  message: string;
  affected_rows: number;
}

export interface DeleteResponse {
  message: string;
  affected_rows: number;
}

export interface TableSchema {
  table: string;
  columns: ColumnInfo[];
  primary_key: string | null;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: any;
  extra: string;
}

// ==================== Main Client ====================

export class WowSQLClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: WowSQLConfig) {
    // Build base URL
    const protocol = config.secure !== false ? 'https' : 'http';

    if (config.projectUrl.startsWith('http://') || config.projectUrl.startsWith('https://')) {
      this.baseUrl = config.projectUrl;
    } else {
      const domain = config.baseDomain || 'wowsql.com';
      // If it already contains the base domain, don't append it again
      if (config.projectUrl.includes(`.${domain}`) || config.projectUrl.endsWith(domain)) {
        this.baseUrl = `${protocol}://${config.projectUrl}`;
      } else {
        // Just a project slug, append domain
        this.baseUrl = `${protocol}://${config.projectUrl}.${domain}`;
      }
    }

    // Create axios instance
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v2`,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: config.timeout || 30000,
    });

    // Add error interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<any>) => {
        if (error.response) {
          const errorData = error.response.data;
          const errorMessage = errorData?.detail || errorData?.message || error.message;
          throw new WOWSQLError(
            errorMessage,
            error.response.status,
            errorData
          );
        }
        throw new WOWSQLError(error.message);
      }
    );
  }

  /**
   * Get a table interface for fluent API
   */
  table<T = any>(tableName: string): Table<T> {
    return new Table<T>(this.client, tableName);
  }

  /**
   * List all tables in the database
   */
  async listTables(): Promise<string[]> {
    const response = await this.client.get('/tables');
    return response.data.tables;
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<TableSchema> {
    const response = await this.client.get(`/tables/${tableName}/schema`);
    return response.data;
  }

  /**
   * Execute raw SQL query (read-only for safety)
   */
  async query<T = any>(sql: string): Promise<T[]> {
    const response = await this.client.post('/query', { sql });
    return response.data.results || response.data;
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// ==================== Table Class ====================

export class Table<T = any> {
  constructor(
    private client: AxiosInstance,
    private tableName: string
  ) { }

  /**
   * Query records with filters and pagination
   * 
   * @example
   * const users = await client.table('users')
   *   .select(['id', 'name', 'email'])
   *   .filter({ column: 'age', operator: 'gt', value: 18 })
   *   .order('created_at', 'desc')
   *   .limit(10)
   *   .get();
   */
  select(columns: string | string[]): QueryBuilder<T> {
    return new QueryBuilder<T>(this.client, this.tableName).select(columns);
  }

  /**
   * Query with filter
   */
  filter(filter: FilterExpression): QueryBuilder<T> {
    return new QueryBuilder<T>(this.client, this.tableName).filter(filter);
  }

  /**
   * Get all records (with optional limit)
   */
  async get(options?: QueryOptions): Promise<QueryResponse<T>> {
    return new QueryBuilder<T>(this.client, this.tableName).get(options);
  }

  /**
   * Get a single record by ID
   */
  async getById(id: string | number): Promise<T> {
    const response = await this.client.get(`/${this.tableName}/${id}`);
    return response.data;
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<CreateResponse> {
    const response = await this.client.post(`/${this.tableName}`, data);
    return response.data;
  }

  /**
   * Update a record by ID
   */
  async update(id: string | number, data: Partial<T>): Promise<UpdateResponse> {
    const response = await this.client.patch(`/${this.tableName}/${id}`, data);
    return response.data;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string | number): Promise<DeleteResponse> {
    const response = await this.client.delete(`/${this.tableName}/${id}`);
    return response.data;
  }
}

// ==================== Query Builder ====================

export class QueryBuilder<T = any> {
  private options: QueryOptions = {};

  constructor(
    private client: AxiosInstance,
    private tableName: string
  ) { }

  /**
   * Select specific columns
   */
  select(columns: string | string[]): this {
    this.options.select = Array.isArray(columns) ? columns.join(',') : columns;
    return this;
  }

  /**
   * Add filter condition
   */
  filter(filter: FilterExpression): this {
    if (!this.options.filter) {
      this.options.filter = [];
    }
    if (Array.isArray(this.options.filter)) {
      this.options.filter.push(filter);
    } else {
      this.options.filter = [this.options.filter, filter];
    }
    return this;
  }

  /**
   * Order by column
   */
  order(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.options.order = column;
    this.options.orderDirection = direction;
    return this;
  }

  /**
   * Limit number of results
   */
  limit(limit: number): this {
    this.options.limit = limit;
    return this;
  }

  /**
   * Skip records (pagination)
   */
  offset(offset: number): this {
    this.options.offset = offset;
    return this;
  }

  /**
   * Execute query
   */
  async get(additionalOptions?: QueryOptions): Promise<QueryResponse<T>> {
    const finalOptions = { ...this.options, ...additionalOptions };

    // Build query parameters
    const params: any = {};

    if (finalOptions.select) {
      params.select = finalOptions.select;
    }

    if (finalOptions.filter) {
      const filters = Array.isArray(finalOptions.filter)
        ? finalOptions.filter
        : [finalOptions.filter];

      params.filter = filters
        .map((f) => `${f.column}.${f.operator}.${f.value}`)
        .join(',');
    }

    if (finalOptions.order) {
      params.order = finalOptions.order;
      params.order_direction = finalOptions.orderDirection || 'asc';
    }

    if (finalOptions.limit !== undefined) {
      params.limit = finalOptions.limit;
    }

    if (finalOptions.offset !== undefined) {
      params.offset = finalOptions.offset;
    }

    const response = await this.client.get(`/${this.tableName}`, { params });
    return response.data;
  }

  /**
   * Get first record
   */
  async first(): Promise<T | null> {
    const result = await this.limit(1).get();
    return result.data[0] || null;
  }
}

// ==================== Exports ====================

// Re-export storage SDK
export * from './storage';
export * from './auth';
export * from './schema';
export * from './errors';

export default WowSQLClient;
