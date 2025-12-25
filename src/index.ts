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
  /** Columns to select (comma-separated or array) - can include expressions like "COUNT(*)", "DATE(created_at) as date" */
  select?: string | string[];
  /** Filter expressions */
  filter?: FilterExpression | FilterExpression[];
  /** Columns to group by */
  group_by?: string | string[];
  /** HAVING clause filters for aggregated results */
  having?: HavingFilter | HavingFilter[];
  /** Column(s) to sort by - can be string or array of OrderByItem */
  order?: string | OrderByItem[];
  /** Sort direction (used only if order is a string) */
  orderDirection?: 'asc' | 'desc';
  /** Maximum records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
}

export interface FilterExpression {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'is' | 'in' | 'not_in' | 'between' | 'not_between' | 'is_not';
  value: string | number | boolean | null | any[] | [any, any];  // Array for 'in', tuple for 'between'
  logical_op?: 'AND' | 'OR';  // For combining filters
}

export interface HavingFilter {
  column: string;  // Can be aggregate function like "COUNT(*)" or column name
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  value: string | number | boolean | null;
}

export interface OrderByItem {
  column: string;
  direction: 'asc' | 'desc';
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
  filter(column: string, operator: FilterExpression['operator'], value: any, logical_op: 'AND' | 'OR' = 'AND'): QueryBuilder<T> {
    return new QueryBuilder<T>(this.client, this.tableName).filter(column, operator, value, logical_op);
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
   * Insert a new record (alias for create)
   */
  async insert(data: Partial<T>): Promise<CreateResponse> {
    return this.create(data);
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
   * Select specific columns or expressions
   * @example query.select('id', 'name')
   * @example query.select('category', 'COUNT(*) as count', 'AVG(price) as avg_price')
   */
  select(...columns: (string | string[])[]): this {
    if (columns.length === 1 && Array.isArray(columns[0])) {
      this.options.select = columns[0];
    } else if (columns.length === 1 && typeof columns[0] === 'string') {
      this.options.select = columns[0];
    } else {
      this.options.select = columns as string[];
    }
    return this;
  }

  /**
   * Add filter condition
   * @example query.filter('age', 'gt', 18)
   * @example query.filter('category', 'in', ['electronics', 'books'])
   * @example query.filter('price', 'between', [10, 100])
   */
  filter(column: string, operator: FilterExpression['operator'], value: any, logical_op: 'AND' | 'OR' = 'AND'): this {
    if (!this.options.filter) {
      this.options.filter = [];
    }
    const filter: FilterExpression = { column, operator, value, logical_op };
    if (Array.isArray(this.options.filter)) {
      this.options.filter.push(filter);
    } else {
      this.options.filter = [this.options.filter, filter];
    }
    return this;
  }

  /**
   * Group results by column(s)
   * @example query.groupBy('category')
   * @example query.groupBy(['category', 'status'])
   * @example query.groupBy('DATE(created_at)')
   */
  groupBy(columns: string | string[]): this {
    this.options.group_by = columns;
    return this;
  }

  /**
   * Add HAVING clause filter (for filtering aggregated results)
   * @example query.having('COUNT(*)', 'gt', 10)
   * @example query.having('AVG(price)', 'gte', 50)
   */
  having(column: string, operator: HavingFilter['operator'], value: any): this {
    if (!this.options.having) {
      this.options.having = [];
    }
    const havingFilter: HavingFilter = { column, operator, value };
    if (Array.isArray(this.options.having)) {
      this.options.having.push(havingFilter);
    } else {
      this.options.having = [this.options.having, havingFilter];
    }
    return this;
  }

  /**
   * Order by column(s)
   * @example query.orderBy('created_at', 'desc')
   * @example query.orderBy([{column: 'category', direction: 'asc'}, {column: 'price', direction: 'desc'}])
   */
  orderBy(column: string | OrderByItem[], direction?: 'asc' | 'desc'): this {
    if (typeof column === 'string') {
      this.options.order = column;
      if (direction) {
        this.options.orderDirection = direction;
      }
    } else {
      this.options.order = column;
    }
    return this;
  }

  /**
   * Order by a single column (alias for orderBy for backward compatibility)
   */
  order(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    return this.orderBy(column, direction);
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

  // ==================== Convenience Methods ====================

  /**
   * Filter where column equals value
   */
  eq(column: string, value: any): this {
    return this.filter(column, 'eq', value);
  }

  /**
   * Filter where column does not equal value
   */
  neq(column: string, value: any): this {
    return this.filter(column, 'neq', value);
  }

  /**
   * Filter where column is greater than value
   */
  gt(column: string, value: any): this {
    return this.filter(column, 'gt', value);
  }

  /**
   * Filter where column is greater than or equal to value
   */
  gte(column: string, value: any): this {
    return this.filter(column, 'gte', value);
  }

  /**
   * Filter where column is less than value
   */
  lt(column: string, value: any): this {
    return this.filter(column, 'lt', value);
  }

  /**
   * Filter where column is less than or equal to value
   */
  lte(column: string, value: any): this {
    return this.filter(column, 'lte', value);
  }

  /**
   * Filter where column matches pattern (SQL LIKE)
   */
  like(column: string, value: string): this {
    return this.filter(column, 'like', value);
  }

  /**
   * Filter where column IS NULL
   */
  isNull(column: string): this {
    return this.filter(column, 'is', null);
  }

  /**
   * Filter where column IS NOT NULL
   */
  isNotNull(column: string): this {
    return this.filter(column, 'is_not', null);
  }

  /**
   * Filter where column is in list of values
   */
  in(column: string, values: any[]): this {
    return this.filter(column, 'in', values);
  }

  /**
   * Filter where column is not in list of values
   */
  notIn(column: string, values: any[]): this {
    return this.filter(column, 'not_in', values);
  }

  /**
   * Filter where column is between min and max values
   */
  between(column: string, minValue: any, maxValue: any): this {
    return this.filter(column, 'between', [minValue, maxValue]);
  }

  /**
   * Filter where column is not between min and max values
   */
  notBetween(column: string, minValue: any, maxValue: any): this {
    return this.filter(column, 'not_between', [minValue, maxValue]);
  }

  /**
   * Add an OR filter condition
   */
  or(column: string, operator: FilterExpression['operator'], value: any): this {
    return this.filter(column, operator, value, 'OR');
  }

  /**
   * Execute query - uses POST /{table}/query for advanced features, GET for simple queries
   */
  async get(additionalOptions?: QueryOptions): Promise<QueryResponse<T>> {
    const finalOptions = { ...this.options, ...additionalOptions };

    // Build query request body for POST endpoint
    const body: any = {};

    // Select
    if (finalOptions.select) {
      body.select = Array.isArray(finalOptions.select) 
        ? finalOptions.select 
        : typeof finalOptions.select === 'string' 
          ? finalOptions.select.split(',').map(s => s.trim())
          : [finalOptions.select];
    }

    // Filters
    if (finalOptions.filter) {
      body.filters = Array.isArray(finalOptions.filter)
        ? finalOptions.filter
        : [finalOptions.filter];
    }

    // Group by
    if (finalOptions.group_by) {
      body.group_by = Array.isArray(finalOptions.group_by)
        ? finalOptions.group_by
        : typeof finalOptions.group_by === 'string'
          ? finalOptions.group_by.split(',').map(s => s.trim())
          : [finalOptions.group_by];
    }

    // Having
    if (finalOptions.having) {
      body.having = Array.isArray(finalOptions.having)
        ? finalOptions.having
        : [finalOptions.having];
    }

    // Order by
    if (finalOptions.order) {
      if (typeof finalOptions.order === 'string') {
        body.order_by = finalOptions.order;
        body.order_direction = finalOptions.orderDirection || 'asc';
      } else {
        body.order_by = finalOptions.order;
      }
    }

    // Limit and offset
    if (finalOptions.limit !== undefined) {
      body.limit = finalOptions.limit;
    }
    if (finalOptions.offset !== undefined) {
      body.offset = finalOptions.offset;
    }

    // Check if we need POST endpoint (advanced features)
    const hasAdvancedFeatures = 
      body.group_by || 
      body.having || 
      Array.isArray(body.order_by) ||
      (body.filters && body.filters.some((f: FilterExpression) => 
        ['in', 'not_in', 'between', 'not_between'].includes(f.operator)
      ));

    if (hasAdvancedFeatures) {
      // Use POST endpoint for advanced queries
      const response = await this.client.post(`/${this.tableName}/query`, body);
      return response.data;
    } else {
      // Use GET endpoint for simple queries (backward compatibility)
      const params: any = {};
      if (body.select) {
        params.select = Array.isArray(body.select) ? body.select.join(',') : body.select;
      }
      if (body.filters && body.filters.length > 0) {
        // Check if any filter uses array values (can't use GET)
        const hasArrayValues = body.filters.some((f: FilterExpression) => 
          Array.isArray(f.value)
        );
        if (hasArrayValues) {
          // Must use POST
          const response = await this.client.post(`/${this.tableName}/query`, body);
          return response.data;
        }
        params.filter = body.filters
          .map((f: FilterExpression) => `${f.column}.${f.operator}.${f.value}`)
          .join(',');
      }
      if (body.order_by && typeof body.order_by === 'string') {
        params.order = body.order_by;
        params.order_direction = body.order_direction || 'asc';
      }
      if (body.limit !== undefined) {
        params.limit = body.limit;
      }
      if (body.offset !== undefined) {
        params.offset = body.offset;
      }
      const response = await this.client.get(`/${this.tableName}`, { params });
      return response.data;
    }
  }

  /**
   * Execute the query (alias for get)
   */
  async execute(additionalOptions?: QueryOptions): Promise<QueryResponse<T>> {
    return this.get(additionalOptions);
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
