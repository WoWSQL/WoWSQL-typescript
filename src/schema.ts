/**
 * Schema management client for WowSQL.
 * Requires SERVICE ROLE key.
 */

export interface ColumnDefinition {
    name: string;
    type: string;
    auto_increment?: boolean;
    unique?: boolean;
    nullable?: boolean;
    default?: string;
}

export interface CreateTableOptions {
    tableName: string;
    columns: ColumnDefinition[];
    primaryKey?: string;
    indexes?: string[];
}

export interface AlterTableOptions {
    tableName: string;
    operation: 'add_column' | 'drop_column' | 'modify_column' | 'rename_column';
    columnName?: string;
    columnType?: string;
    newColumnName?: string;
    nullable?: boolean;
    default?: string;
}

export class WowSQLSchema {
    private baseUrl: string;
    private serviceKey: string;

    /**
     * Initialize schema client.
     * 
     * ⚠️ IMPORTANT: Requires SERVICE ROLE key, not anonymous key!
     * 
     * @param projectUrl - Project URL (e.g., "https://myproject.wowsql.com")
     * @param serviceKey - SERVICE ROLE key (not anonymous key!)
     */
    constructor(projectUrl: string, serviceKey: string) {
        this.baseUrl = projectUrl.replace(/\/$/, '');
        this.serviceKey = serviceKey;
    }

    /**
     * Create a new table.
     */
    async createTable(options: CreateTableOptions): Promise<any> {
        const url = `${this.baseUrl}/api/v2/schema/tables`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.serviceKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table_name: options.tableName,
                columns: options.columns,
                primary_key: options.primaryKey,
                indexes: options.indexes
            })
        });

        if (response.status === 403) {
            throw new Error(
                'Schema operations require a SERVICE ROLE key. ' +
                'You are using an anonymous key which cannot modify database schema.'
            );
        }

        if (!response.ok) {
            const error: any = await response.json();
            throw new Error(`Failed to create table: ${error.detail || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Alter an existing table.
     */
    async alterTable(options: AlterTableOptions): Promise<any> {
        const url = `${this.baseUrl}/api/v2/schema/tables/${options.tableName}`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.serviceKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(options)
        });

        if (response.status === 403) {
            throw new Error('Schema operations require a SERVICE ROLE key.');
        }

        if (!response.ok) {
            const error: any = await response.json();
            throw new Error(`Failed to alter table: ${error.detail || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Drop a table.
     * 
     * ⚠️ WARNING: This operation cannot be undone!
     */
    async dropTable(tableName: string, cascade: boolean = false): Promise<any> {
        const url = `${this.baseUrl}/api/v2/schema/tables/${tableName}?cascade=${cascade}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.serviceKey}`
            }
        });

        if (response.status === 403) {
            throw new Error('Schema operations require a SERVICE ROLE key.');
        }

        if (!response.ok) {
            const error: any = await response.json();
            throw new Error(`Failed to drop table: ${error.detail || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Execute raw SQL for schema operations.
     */
    async executeSQL(sql: string): Promise<any> {
        const url = `${this.baseUrl}/api/v2/schema/execute`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.serviceKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql })
        });

        if (response.status === 403) {
            throw new Error('Schema operations require a SERVICE ROLE key.');
        }

        if (!response.ok) {
            const error: any = await response.json();
            throw new Error(`Failed to execute SQL: ${error.detail || response.statusText}`);
        }

        return response.json();
    }
}
