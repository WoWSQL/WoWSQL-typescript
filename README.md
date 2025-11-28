# WOWSQL TypeScript SDK

Official TypeScript/JavaScript SDK for WOWSQL - The powerful MySQL Backend-as-a-Service platform.

[![npm version](https://badge.fury.io/js/%40WOWSQL%2Fsdk.svg)](https://www.npmjs.com/package/@wowsql/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Zero Configuration** - Get started in seconds
- 🔒 **Type-Safe** - Full TypeScript support with generics
- 🎯 **Fluent API** - Intuitive query builder pattern
- ⚡ **Lightweight** - Minimal dependencies (only axios)
- 🛡️ **Error Handling** - Comprehensive error messages
- 📦 **Tree-Shakeable** - Import only what you need

## Installation

```bash
# npm
npm install @wowsql/sdk

# yarn
yarn add @wowsql/sdk

# pnpm
pnpm add @wowsql/sdk
```

## Quick Start

```typescript
import WOWSQLClient from '@wowsql/sdk';

// Initialize client
const client = new WOWSQLClient({
  projectUrl: 'myproject',  // Your project subdomain
  apiKey: 'your-api-key-here'
});

// Query data
const users = await client.table('users')
  .select(['id', 'name', 'email'])
  .filter({ column: 'age', operator: 'gt', value: 18 })
  .order('created_at', 'desc')
  .limit(10)
  .get();

console.log(users.data); // Array of user records
```

## Project Authentication

The SDK ships with a dedicated `ProjectAuthClient` to integrate with the project-level auth service (signup, login, sessions, OAuth helpers). Provide the project slug (or full URL) and the public auth key exposed in the dashboard.

```typescript
import { ProjectAuthClient } from '@wowsql/sdk';

const auth = new ProjectAuthClient({
  projectUrl: 'myproject',        // or https://myproject.wowsql.com
  publicApiKey: 'public-auth-key'
});
```

### Sign Up Users

```typescript
const { user, session } = await auth.signUp({
  email: 'user@example.com',
  password: 'SuperSecret123',
  full_name: 'Demo User',
  user_metadata: { referrer: 'landing-page' }
});

console.log('New auth user id:', user?.id);
console.log('Access token:', session.accessToken);
```

### Sign In & Persist Sessions

```typescript
const { session } = await auth.signIn({
  email: 'user@example.com',
  password: 'SuperSecret123'
});

// Save the session and reuse on page refresh
auth.setSession({
  accessToken: session.accessToken,
  refreshToken: session.refreshToken
});

const currentUser = await auth.getUser(); // reads the stored token
console.log('Welcome back,', currentUser.full_name);
```

### OAuth Authentication

Complete OAuth flow with callback handling:

```typescript
// Step 1: Get authorization URL
const { authorizationUrl } = await auth.getOAuthAuthorizationUrl(
  'github',
  'https://app.your-domain.com/auth/callback'
);

window.location.href = authorizationUrl;

// Step 2: After user authorizes, exchange code for tokens
// (In your callback handler)
const result = await auth.exchangeOAuthCallback(
  'github',
  code, // from URL query params
  'https://app.your-domain.com/auth/callback'
);

console.log('Logged in as:', result.user?.email);
console.log('Access token:', result.session.accessToken);
```

### Password Reset

```typescript
// Request password reset
const forgotResult = await auth.forgotPassword('user@example.com');
console.log(forgotResult.message); // "If that email exists, a password reset link has been sent"

// Reset password (after user clicks email link)
const resetResult = await auth.resetPassword(
  token, // from email link
  'newSecurePassword123'
);
console.log(resetResult.message); // "Password reset successfully! You can now login with your new password"
```

### Session Management

The client exposes `getSession`, `setSession`, and `clearSession` utilities so you can wire tokens into your own persistence layer (localStorage, cookies, etc.):

```typescript
// Get current session
const session = auth.getSession();
console.log('Access token:', session.accessToken);

// Set session (e.g., from localStorage on page load)
auth.setSession({
  accessToken: localStorage.getItem('access_token')!,
  refreshToken: localStorage.getItem('refresh_token')!
});

// Clear session (logout)
auth.clearSession();
```

## Configuration

### Basic Configuration

```typescript
const client = new WOWSQLClient({
  projectUrl: 'myproject',        // Your project subdomain
  apiKey: 'your-api-key'          // Your API key from dashboard
});
```

### Advanced Configuration

```typescript
const client = new WOWSQLClient({
  projectUrl: 'myproject',
  apiKey: 'your-api-key',
  baseDomain: 'wowsql.com',     // Custom domain (optional)
  secure: true,                    // Use HTTPS (default: true)
  timeout: 30000                   // Request timeout in ms (default: 30000)
});
```

### Using Full URL

```typescript
const client = new WOWSQLClient({
  projectUrl: 'https://myproject.wowsql.com',
  apiKey: 'your-api-key'
});
```

## Usage Examples

### TypeScript with Generics

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  created_at: string;
}

const client = new WOWSQLClient({
  projectUrl: 'myproject',
  apiKey: 'your-api-key'
});

// Type-safe queries
const users = await client.table<User>('users').get();
users.data.forEach(user => {
  console.log(user.name); // Type-safe!
});
```

### Create Records

```typescript
// Create a single user
const result = await client.table('users').create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 25
});

console.log(result.id); // New record ID
```

### Read Records

```typescript
// Get all records
const allUsers = await client.table('users').get();

// Get by ID
const user = await client.table('users').getById(1);

// Select specific columns
const users = await client.table('users')
  .select(['id', 'name', 'email'])
  .get();

// With filters
const adults = await client.table('users')
  .filter({ column: 'age', operator: 'gte', value: 18 })
  .get();

// Multiple filters
const result = await client.table('users')
  .filter({ column: 'age', operator: 'gte', value: 18 })
  .filter({ column: 'country', operator: 'eq', value: 'USA' })
  .get();

// With sorting
const sorted = await client.table('users')
  .order('created_at', 'desc')
  .get();

// With pagination
const page1 = await client.table('users')
  .limit(10)
  .offset(0)
  .get();

// Get first record
const firstUser = await client.table('users')
  .filter({ column: 'email', operator: 'eq', value: 'john@example.com' })
  .first();
```

### Update Records

```typescript
// Update by ID
const result = await client.table('users').update(1, {
  name: 'Jane Doe',
  age: 26
});

console.log(result.affected_rows); // Number of rows updated
```

### Delete Records

```typescript
// Delete by ID
const result = await client.table('users').delete(1);

console.log(result.affected_rows); // Number of rows deleted
```

### Filter Operators

```typescript
// Equal
.filter({ column: 'status', operator: 'eq', value: 'active' })

// Not equal
.filter({ column: 'status', operator: 'neq', value: 'deleted' })

// Greater than
.filter({ column: 'age', operator: 'gt', value: 18 })

// Greater than or equal
.filter({ column: 'age', operator: 'gte', value: 18 })

// Less than
.filter({ column: 'price', operator: 'lt', value: 100 })

// Less than or equal
.filter({ column: 'price', operator: 'lte', value: 100 })

// Like (pattern matching)
.filter({ column: 'name', operator: 'like', value: '%John%' })

// Is null
.filter({ column: 'deleted_at', operator: 'is', value: null })
```

### Complex Queries

```typescript
// Combine multiple operations
const result = await client.table<Product>('products')
  .select(['id', 'name', 'price', 'category'])
  .filter({ column: 'category', operator: 'eq', value: 'Electronics' })
  .filter({ column: 'price', operator: 'lt', value: 1000 })
  .filter({ column: 'in_stock', operator: 'eq', value: true })
  .order('price', 'asc')
  .limit(20)
  .offset(0)
  .get();

console.log(`Found ${result.total} products`);
console.log(`Showing ${result.count} products`);
result.data.forEach(product => {
  console.log(`${product.name}: $${product.price}`);
});
```

### Raw SQL Queries

```typescript
// Execute custom SQL (read-only)
const results = await client.query<User>(`
  SELECT id, name, email 
  FROM users 
  WHERE age > 18 
  ORDER BY created_at DESC 
  LIMIT 10
`);
```

### Database Metadata

```typescript
// List all tables
const tables = await client.listTables();
console.log(tables); // ['users', 'posts', 'comments']

// Get table schema
const schema = await client.getTableSchema('users');
console.log(schema.columns);
console.log(schema.primary_key);
```

### Health Check

```typescript
// Check API health
const health = await client.health();
console.log(health.status); // 'ok'
```

## Error Handling

```typescript
import { WOWSQLClient, WOWSQLError } from '@wowsql/sdk';

try {
  const user = await client.table('users').getById(999);
} catch (error) {
  if (error instanceof WOWSQLError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
    console.error(error.response); // Full error response
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## API Reference

### WOWSQLClient

Main client class for interacting with WOWSQL API.

#### Methods

- `table<T>(tableName: string): Table<T>` - Get table interface
- `listTables(): Promise<string[]>` - List all tables
- `getTableSchema(tableName: string): Promise<TableSchema>` - Get table schema
- `query<T>(sql: string): Promise<T[]>` - Execute raw SQL
- `health(): Promise<{status: string, timestamp: string}>` - Health check

### Table<T>

Fluent interface for table operations.

#### Methods

- `select(columns: string | string[]): QueryBuilder<T>` - Select columns
- `filter(filter: FilterExpression): QueryBuilder<T>` - Add filter
- `get(options?: QueryOptions): Promise<QueryResponse<T>>` - Get records
- `getById(id: string | number): Promise<T>` - Get by ID
- `create(data: Partial<T>): Promise<CreateResponse>` - Create record
- `update(id: string | number, data: Partial<T>): Promise<UpdateResponse>` - Update record
- `delete(id: string | number): Promise<DeleteResponse>` - Delete record

### QueryBuilder<T>

Chainable query builder.

#### Methods

- `select(columns: string | string[]): this` - Select columns
- `filter(filter: FilterExpression): this` - Add filter
- `order(column: string, direction?: 'asc' | 'desc'): this` - Order by
- `limit(limit: number): this` - Limit results
- `offset(offset: number): this` - Skip records
- `get(options?: QueryOptions): Promise<QueryResponse<T>>` - Execute query
- `first(): Promise<T | null>` - Get first record

## Real-World Examples

### Next.js App Router

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';
import WOWSQLClient from '@wowsql/sdk';

const client = new WOWSQLClient({
  projectUrl: process.env.WOWSQL_PROJECT!,
  apiKey: process.env.WOWSQL_API_KEY!
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    
    const users = await client.table('users')
      .select(['id', 'name', 'email', 'created_at'])
      .order('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();
    
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await client.table('users').create(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

### React Hook

```typescript
// hooks/useWOWSQL.ts
import { useState, useEffect } from 'react';
import WOWSQLClient from '@wowsql/sdk';

const client = new WOWSQLClient({
  projectUrl: process.env.NEXT_PUBLIC_WOWSQL_PROJECT!,
  apiKey: process.env.NEXT_PUBLIC_WOWSQL_API_KEY!
});

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const result = await client.table('users').get();
        setUsers(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  return { users, loading, error };
}
```

### Express.js API

```typescript
// server.ts
import express from 'express';
import WOWSQLClient from '@wowsql/sdk';

const app = express();
const client = new WOWSQLClient({
  projectUrl: process.env.WOWSQL_PROJECT!,
  apiKey: process.env.WOWSQL_API_KEY!
});

app.use(express.json());

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const posts = await client.table('posts')
      .order('created_at', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create post
app.post('/api/posts', async (req, res) => {
  try {
    const result = await client.table('posts').create(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

## Best Practices

### 1. Environment Variables

Never hardcode API keys. Use environment variables:

```typescript
// .env
WOWSQL_PROJECT=myproject
WOWSQL_API_KEY=your-api-key

// app.ts
import WOWSQLClient from '@wowsql/sdk';

const client = new WOWSQLClient({
  projectUrl: process.env.WOWSQL_PROJECT!,
  apiKey: process.env.WOWSQL_API_KEY!
});
```

### 2. Singleton Pattern

Create a single client instance:

```typescript
// lib/WOWSQL.ts
import WOWSQLClient from '@wowsql/sdk';

export const db = new WOWSQLClient({
  projectUrl: process.env.WOWSQL_PROJECT!,
  apiKey: process.env.WOWSQL_API_KEY!
});

// Use in other files
import { db } from './lib/WOWSQL';
const users = await db.table('users').get();
```

### 3. Type Definitions

Define interfaces for your data:

```typescript
// types/database.ts
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  published_at: string | null;
}

// Use in queries
const users = await db.table<User>('users').get();
```

### 4. Error Handling

Always wrap API calls in try-catch:

```typescript
import { WOWSQLError } from '@wowsql/sdk';

async function createUser(data: any) {
  try {
    const result = await db.table('users').create(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof WOWSQLError) {
      console.error(`Database error: ${error.message}`);
      return { success: false, error: error.message };
    }
    throw error;
  }
}
```

## API Keys

WOWSQL uses **different API keys for different operations**. Understanding which key to use is crucial for proper authentication.

### Key Types Overview

| Operation Type | Recommended Key | Alternative Key | Used By |
|---------------|----------------|-----------------|---------|
| **Database Operations** (CRUD) | Service Role Key (`wowbase_service_...`) | Anonymous Key (`wowbase_anon_...`) | `WOWSQLClient` |
| **Authentication Operations** (OAuth, sign-in) | Public API Key (`wowbase_auth_...`) | Service Role Key (`wowbase_service_...`) | `ProjectAuthClient` |

### Where to Find Your Keys

All keys are found in: **WOWSQL Dashboard → Authentication → PROJECT KEYS**

1. **Service Role Key** (`wowbase_service_...`)
   - Location: "Service Role Key (keep secret)"
   - Used for: Database CRUD operations (recommended for server-side)
   - Can also be used for authentication operations (fallback)
   - **Important**: Click the eye icon to reveal this key

2. **Public API Key** (`wowbase_auth_...`)
   - Location: "Public API Key"
   - Used for: OAuth, sign-in, sign-up, user management
   - Recommended for client-side/public authentication flows

3. **Anonymous Key** (`wowbase_anon_...`)
   - Location: "Anonymous Key"
   - Used for: Public/client-side database operations with limited permissions
   - Optional: Use when exposing database access to frontend/client

### Database Operations

Use **Service Role Key** or **Anonymous Key** for database operations:

```typescript
import WOWSQLClient from '@wowsql/sdk';

// Using Service Role Key (recommended for server-side, full access)
const client = new WOWSQLClient({
  projectUrl: 'myproject',
  apiKey: 'wowbase_service_your-service-key-here'  // Service Role Key
});

// Using Anonymous Key (for public/client-side access with limited permissions)
const client = new WOWSQLClient({
  projectUrl: 'myproject',
  apiKey: 'wowbase_anon_your-anon-key-here'  // Anonymous Key
});

// Query data
const users = await client.table('users').get();
```

### Authentication Operations

Use **Public API Key** or **Service Role Key** for authentication:

```typescript
import { ProjectAuthClient } from '@wowsql/sdk';

// Using Public API Key (recommended for OAuth, sign-in, sign-up)
const auth = new ProjectAuthClient({
  projectUrl: 'myproject',
  publicApiKey: 'wowbase_auth_your-public-key-here'  // Public API Key
});

// Using Service Role Key (can be used for auth operations too)
const auth = new ProjectAuthClient({
  projectUrl: 'myproject',
  publicApiKey: 'wowbase_service_your-service-key-here'  // Service Role Key
});

// OAuth authentication
const { authorizationUrl } = await auth.getOAuthAuthorizationUrl(
  'github',
  'https://app.example.com/auth/callback'
);
```

### Environment Variables

Best practice: Use environment variables for API keys:

```typescript
// Database operations - Service Role Key
const dbClient = new WOWSQLClient({
  projectUrl: process.env.WOWSQL_PROJECT_URL!,
  apiKey: process.env.WOWSQL_SERVICE_ROLE_KEY!  // or WOWSQL_ANON_KEY
});

// Authentication operations - Public API Key
const authClient = new ProjectAuthClient({
  projectUrl: process.env.WOWSQL_PROJECT_URL!,
  publicApiKey: process.env.WOWSQL_PUBLIC_API_KEY!
});
```

### Key Usage Summary

- **`WOWSQLClient`** → Uses **Service Role Key** or **Anonymous Key** for database operations
- **`ProjectAuthClient`** → Uses **Public API Key** or **Service Role Key** for authentication operations
- **Service Role Key** can be used for both database AND authentication operations
- **Public API Key** is specifically for authentication operations only
- **Anonymous Key** is optional and provides limited permissions for public database access

### Security Best Practices

1. **Never expose Service Role Key** in client-side code or public repositories
2. **Use Public API Key** for client-side authentication flows
3. **Use Anonymous Key** for public database access with limited permissions
4. **Store keys in environment variables**, never hardcode them
5. **Rotate keys regularly** if compromised

### Troubleshooting

**Error: "Invalid API key for project"**
- Ensure you're using the correct key type for the operation
- Database operations require Service Role Key or Anonymous Key
- Authentication operations require Public API Key or Service Role Key
- Verify the key is copied correctly (no extra spaces)

**Error: "Authentication failed"**
- Check that you're using Public API Key (not Anonymous Key) for auth operations
- Verify the project URL matches your dashboard
- Ensure the key hasn't been revoked or expired

## 🔧 Schema Management

Programmatically manage your database schema with the `WOWSQLSchema` client.

> **⚠️ IMPORTANT**: Schema operations require a **Service Role Key** (`service_*`). Anonymous keys will return a 403 Forbidden error.

### Quick Start

```typescript
import { WOWSQLSchema } from '@wowsql/sdk';

// Initialize schema client with SERVICE ROLE KEY
const schema = new WOWSQLSchema(
  'https://your-project.wowsql.com',
  'service_xyz789...'  // ⚠️ Backend only! Never expose!
);
```

### Create Table

```typescript
// Create a new table
await schema.createTable({
  tableName: 'products',
  columns: [
    { name: 'id', type: 'INT', auto_increment: true },
    { name: 'name', type: 'VARCHAR(255)', not_null: true },
    { name: 'price', type: 'DECIMAL(10,2)', not_null: true },
    { name: 'category', type: 'VARCHAR(100)' },
    { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  ],
  primaryKey: 'id',
  indexes: [
    { name: 'idx_category', columns: ['category'] },
    { name: 'idx_price', columns: ['price'] }
  ]
});

console.log('Table created successfully!');
```

### Alter Table

```typescript
// Add a new column
await schema.alterTable({
  tableName: 'products',
  addColumns: [
    { name: 'stock_quantity', type: 'INT', default: '0' }
  ]
});

// Modify an existing column
await schema.alterTable({
  tableName: 'products',
  modifyColumns: [
    { name: 'price', type: 'DECIMAL(12,2)' }  // Increase precision
  ]
});

// Drop a column
await schema.alterTable({
  tableName: 'products',
  dropColumns: ['category']
});

// Rename a column
await schema.alterTable({
  tableName: 'products',
  renameColumns: [
    { oldName: 'name', newName: 'product_name' }
  ]
});
```

### Drop Table

```typescript
// Drop a table
await schema.dropTable('old_table');

// Drop with CASCADE (removes dependent objects)
await schema.dropTable('products', { cascade: true });
```

### Execute Raw SQL

```typescript
// Execute custom schema SQL
await schema.executeSQL(`
  CREATE INDEX idx_product_name 
  ON products(product_name);
`);

// Add a foreign key constraint
await schema.executeSQL(`
  ALTER TABLE orders 
  ADD CONSTRAINT fk_product 
  FOREIGN KEY (product_id) 
  REFERENCES products(id);
`);
```

### Security & Best Practices

#### ✅ DO:
- Use service role keys **only in backend/server code** (Node.js, Next.js API routes)
- Store service keys in environment variables
- Use anonymous keys for client-side data operations
- Test schema changes in development first

#### ❌ DON'T:
- Never expose service role keys in frontend/browser code
- Never commit service keys to version control
- Don't use anonymous keys for schema operations (will fail)

### Example: Next.js API Route Migration

```typescript
// app/api/migrate/route.ts
import { WOWSQLSchema } from '@wowsql/sdk';
import { NextResponse } from 'next/server';

export async function POST() {
  const schema = new WOWSQLSchema(
    process.env.WOWSQL_PROJECT_URL!,
    process.env.WOWSQL_SERVICE_KEY!  // From env var
  );
  
  try {
    // Create users table
    await schema.createTable({
      tableName: 'users',
      columns: [
        { name: 'id', type: 'INT', auto_increment: true },
        { name: 'email', type: 'VARCHAR(255)', unique: true, not_null: true },
        { name: 'name', type: 'VARCHAR(255)', not_null: true },
        { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
      ],
      primaryKey: 'id',
      indexes: [{ name: 'idx_email', columns: ['email'] }]
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Error Handling

```typescript
import { WOWSQLSchema, PermissionError } from '@wowsql/sdk';

try {
  const schema = new WOWSQLSchema(
    'https://your-project.wowsql.com',
    'service_xyz...'
  );
  
  await schema.createTable({
    tableName: 'test',
    columns: [{ name: 'id', type: 'INT' }]
  });
} catch (error) {
  if (error instanceof PermissionError) {
    console.error('Permission denied:', error.message);
    console.error('Make sure you\'re using a SERVICE ROLE KEY!');
  } else {
    console.error('Error:', error);
  }
}
```

---

## FAQ

### Can I use this in the browser?

Yes! The SDK works in both Node.js and browser environments. However, **never expose your Service Role Key in client-side code** for production applications. Use Public API Key for authentication or Anonymous Key for limited database access. For full database operations, use a backend proxy.

### What about rate limits?

Rate limits depend on your WOWSQL plan. The SDK will throw a `WOWSQLError` with status code 429 when rate limits are exceeded.

### Does it support transactions?

Currently, the SDK doesn't support transactions directly. Use raw SQL queries for complex transactional operations.

### How do I upgrade?

```bash
npm update @wowsql/sdk
```

## Support

- 📧 Email: support@wowsql.com
- 💬 Discord: [Join our community](https://discord.gg/WOWSQL)
- 📚 Documentation: [docs.wowsql.com](https://docs.wowsql.com)
- 🐛 Issues: [GitHub Issues](https://github.com/wowsql/wowsql/issues)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

Made with ❤️ by the WOWSQL Team


