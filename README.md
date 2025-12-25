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
  apiKey: 'your-anon-key'  // Use anon key for client-side, service key for server-side
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

// IN operator (value must be an array)
.filter('category', 'in', ['electronics', 'books', 'clothing'])

// NOT IN operator
.filter('status', 'not_in', ['deleted', 'archived'])

// BETWEEN operator (value must be an array of 2 values)
.filter('price', 'between', [10, 100])

// NOT BETWEEN operator
.filter('age', 'not_between', [18, 65])

// OR logical operator
.filter('category', 'eq', 'electronics', 'AND')
.filter('price', 'gt', 1000, 'OR')  // OR condition
```

## Advanced Query Features

### GROUP BY and Aggregates

GROUP BY supports both simple column names and SQL expressions with functions. All expressions are validated for security.

#### Basic GROUP BY

```typescript
// Group by single column
const result = await client.table("products")
  .select("category", "COUNT(*) as count", "AVG(price) as avg_price")
  .groupBy("category")
  .get();

// Group by multiple columns
const result = await client.table("sales")
  .select("region", "category", "SUM(amount) as total")
  .groupBy(["region", "category"])
  .get();
```

#### GROUP BY with Date/Time Functions

```typescript
// Group by date
const result = await client.table("orders")
  .select("DATE(created_at) as date", "COUNT(*) as orders", "SUM(total) as revenue")
  .groupBy("DATE(created_at)")
  .orderBy("date", "desc")
  .get();

// Group by year and month
const result = await client.table("orders")
  .select("YEAR(created_at) as year", "MONTH(created_at) as month", "SUM(total) as revenue")
  .groupBy(["YEAR(created_at)", "MONTH(created_at)"])
  .get();

// Group by week
const result = await client.table("orders")
  .select("WEEK(created_at) as week", "COUNT(*) as orders")
  .groupBy("WEEK(created_at)")
  .get();
```

#### Supported Functions in GROUP BY

**Date/Time:** `DATE()`, `YEAR()`, `MONTH()`, `DAY()`, `WEEK()`, `QUARTER()`, `HOUR()`, `MINUTE()`, `SECOND()`, `DATE_FORMAT()`, `DATE_ADD()`, `DATE_SUB()`, `DATEDIFF()`, `NOW()`, `CURRENT_TIMESTAMP()`, etc.

**String:** `CONCAT()`, `SUBSTRING()`, `LEFT()`, `RIGHT()`, `UPPER()`, `LOWER()`, `LENGTH()`, `TRIM()`, etc.

**Mathematical:** `ROUND()`, `CEIL()`, `FLOOR()`, `ABS()`, `POW()`, `SQRT()`, `MOD()`, etc.

### HAVING Clause

HAVING filters aggregated results after GROUP BY. Supports aggregate functions and comparison operators.

```typescript
// Filter aggregated results
const result = await client.table("products")
  .select("category", "COUNT(*) as count")
  .groupBy("category")
  .having("COUNT(*)", "gt", 10)
  .get();

// Multiple HAVING conditions
const result = await client.table("orders")
  .select("DATE(created_at) as date", "SUM(total) as revenue")
  .groupBy("DATE(created_at)")
  .having("SUM(total)", "gt", 1000)
  .having("COUNT(*)", "gte", 5)
  .get();

// HAVING with different aggregate functions
const result = await client.table("products")
  .select("category", "AVG(price) as avg_price", "COUNT(*) as count")
  .groupBy("category")
  .having("AVG(price)", "gt", 100)
  .having("COUNT(*)", "gte", 5)
  .get();
```

**Supported HAVING Operators:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`

**Supported Aggregate Functions:** `COUNT(*)`, `SUM()`, `AVG()`, `MAX()`, `MIN()`, `GROUP_CONCAT()`, `STDDEV()`, `VARIANCE()`

### Multiple ORDER BY

```typescript
// Order by multiple columns
const result = await client.table("products")
  .select("*")
  .orderByMultiple([
    { column: "category", direction: "asc" },
    { column: "price", direction: "desc" },
    { column: "created_at", direction: "desc" }
  ])
  .get();
```

### Date/Time Functions

```typescript
// Filter by date range using functions
const result = await client.table("orders")
  .select("*")
  .filter("created_at", "gte", "DATE_SUB(NOW(), INTERVAL 7 DAY)")
  .get();

// Group by date
const result = await client.table("orders")
  .select("DATE(created_at) as date", "COUNT(*) as count")
  .groupBy("DATE(created_at)")
  .get();
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

## 🔑 Unified Authentication

**✨ One Project = One Set of Keys for ALL Operations**

WOWSQL uses **unified authentication** - the same API keys work for both database operations AND authentication operations.

| Operation Type | Recommended Key | Alternative Key | Used By |
|---------------|----------------|-----------------|---------|
| **Database Operations** (CRUD) | Service Role Key (`wowsql_service_...`) | Anonymous Key (`wowsql_anon_...`) | `WOWSQLClient` |
| **Authentication Operations** (OAuth, sign-in) | Anonymous Key (`wowsql_anon_...`) | Service Role Key (`wowsql_service_...`) | `ProjectAuthClient` |

### Where to Find Your Keys

All keys are found in: **WOWSQL Dashboard → Settings → API Keys** or **Authentication → PROJECT KEYS**

1. **Anonymous Key** (`wowsql_anon_...`) ✨ **Unified Key**
   - Location: "Anonymous Key (Public)"
   - Used for: 
     - ✅ Client-side auth operations (signup, login, OAuth)
     - ✅ Public/client-side database operations with limited permissions
   - **Safe to expose** in frontend code (browser, mobile apps)

2. **Service Role Key** (`wowsql_service_...`) ✨ **Unified Key**
   - Location: "Service Role Key (keep secret)"
   - Used for:
     - ✅ Server-side auth operations (admin, full access)
     - ✅ Server-side database operations (full access, bypass RLS)
   - **NEVER expose** in frontend code - server-side only!

### Database Operations

Use **Service Role Key** or **Anonymous Key** for database operations:

```typescript
import WOWSQLClient from '@wowsql/sdk';

// Using Service Role Key (recommended for server-side, full access)
const client = new WOWSQLClient({
  projectUrl: 'myproject',
  apiKey: 'wowsql_service_your-service-key-here'  // Service Role Key
});

// Using Anonymous Key (for public/client-side access with limited permissions)
const client = new WOWSQLClient({
  projectUrl: 'myproject',
  apiKey: 'wowsql_anon_your-anon-key-here'  // Anonymous Key
});

// Query data
const users = await client.table('users').get();
```

### Authentication Operations

**✨ UNIFIED AUTHENTICATION:** Use the **same keys** as database operations!

```typescript
import { ProjectAuthClient } from '@wowsql/sdk';

// Using Anonymous Key (recommended for client-side auth operations)
const auth = new ProjectAuthClient({
  projectUrl: 'myproject',
  apiKey: 'wowsql_anon_your-anon-key-here'  // Same key as database operations!
});

// Using Service Role Key (for server-side auth operations)
const auth = new ProjectAuthClient({
  projectUrl: 'myproject',
  apiKey: 'wowsql_service_your-service-key-here'  // Same key as database operations!
});

// OAuth authentication
const { authorizationUrl } = await auth.getOAuthAuthorizationUrl(
  'github',
  'https://app.example.com/auth/callback'
);
```

**Note:** The `publicApiKey` parameter is deprecated but still works for backward compatibility. Use `apiKey` instead.

### Environment Variables

Best practice: Use environment variables for API keys:

```typescript
// UNIFIED AUTHENTICATION: Same keys for both operations!

// Database operations - Service Role Key
const dbClient = new WOWSQLClient({
  projectUrl: process.env.WOWSQL_PROJECT_URL!,
  apiKey: process.env.WOWSQL_SERVICE_ROLE_KEY!  // or WOWSQL_ANON_KEY
});

// Authentication operations - Use the SAME key!
const authClient = new ProjectAuthClient({
  projectUrl: process.env.WOWSQL_PROJECT_URL!,
  apiKey: process.env.WOWSQL_ANON_KEY!  // Same key for client-side auth
  // Or use WOWSQL_SERVICE_ROLE_KEY for server-side auth
});
```

### Key Usage Summary

**✨ UNIFIED AUTHENTICATION:**
- **`WOWSQLClient`** → Uses **Service Role Key** or **Anonymous Key** for database operations
- **`ProjectAuthClient`** → Uses **Anonymous Key** (client-side) or **Service Role Key** (server-side) for authentication operations
- **Same keys work for both** database AND authentication operations! 🎉
- **Anonymous Key** (`wowsql_anon_...`) → Client-side operations (auth + database)
- **Service Role Key** (`wowsql_service_...`) → Server-side operations (auth + database)

### Security Best Practices

1. **Never expose Service Role Key** in client-side code or public repositories
2. **Use Anonymous Key** for client-side authentication flows (same key as database operations)
3. **Use Anonymous Key** for public database access with limited permissions
4. **Store keys in environment variables**, never hardcode them
5. **Rotate keys regularly** if compromised

### Troubleshooting

**Error: "Invalid API key for project"**
- Ensure you're using the correct key type for the operation
- Database operations require Service Role Key or Anonymous Key
- Authentication operations require Anonymous Key (client-side) or Service Role Key (server-side)
- Verify the key is copied correctly (no extra spaces)

**Error: "Authentication failed"**
- Check that you're using the correct key: Anonymous Key for client-side, Service Role Key for server-side
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

Yes! The SDK works in both Node.js and browser environments. However, **never expose your Service Role Key in client-side code** for production applications. Use **Anonymous Key** for both authentication and limited database access. For full database operations, use a backend proxy with Service Role Key.

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


