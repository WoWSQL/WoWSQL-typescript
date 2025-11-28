# Changelog

All notable changes to the WOWSQL TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.4.0] - 2025-11-22

### Added - Schema Management 🔧

- **New `WOWSQLSchema` class** for programmatic database schema management
- Full schema CRUD operations with service role key authentication
- Schema modification capabilities for production databases

#### Schema Features
- **Create Tables**: Define tables with columns, primary keys, and indexes
- **Alter Tables**: Add, modify, drop, or rename columns
- **Drop Tables**: Remove tables with optional CASCADE support
- **Execute SQL**: Run raw SQL for custom schema operations

#### Schema API Methods
- `createTable(options)` - Create new tables with full column definitions
- `alterTable(options)` - Modify existing table structure
- `dropTable(tableName, cascade?)` - Drop tables safely
- `executeSQL(sql)` - Execute custom schema SQL statements

#### Security & Validation
- **Service Role Key Required**: Schema operations strictly require service role keys
- **403 Error Handling**: Clear error messages when using anonymous keys
- **Permission Validation**: Automatic validation of API key permissions
- **Safe Operations**: Built-in safeguards for destructive operations

#### TypeScript Interfaces
- `ColumnDefinition` - Column specification with constraints
- `CreateTableOptions` - Table creation configuration
- `AlterTableOptions` - Table alteration specification
- Complete type definitions for all schema operations

#### Examples & Documentation
- Backend migration script examples (Next.js API routes)
- Schema management best practices
- Security guidelines for service key usage
- Comprehensive README section with code examples

### Updated
- README with comprehensive schema management documentation
- Export statements to include schema classes and interfaces
- Version bumped to 3.4.0

### Documentation
- Schema management quick start guide
- Service role key vs anonymous key usage
- Migration script templates
- Error handling patterns

## [3.3.0] - 2025-11-11

### Added - API Keys Documentation

- Comprehensive API keys documentation section in README
- Clear separation between Database Operations keys and Authentication Operations keys
- Documentation for Service Role Key, Public API Key, and Anonymous Key
- Usage examples for each key type
- Security best practices guide
- Troubleshooting section for common key-related errors

### Updated

- Enhanced `WOWSQLClient` class documentation to clarify it's for DATABASE OPERATIONS
- Enhanced `ProjectAuthClient` class documentation to clarify it's for AUTHENTICATION OPERATIONS
- Updated FAQ section with improved browser usage guidance
- Version bumped to 3.3.0

### Documentation

- README now includes comprehensive API keys section with:
  - Key types overview table
  - Where to find keys in dashboard
  - Database operations examples
  - Authentication operations examples
  - Environment variables best practices
  - Security best practices
  - Troubleshooting guide

## [2.2.0] - 2025-11-10

### Added - Project Authentication

- New `ProjectAuthClient` for signup/login/OAuth flows against the project auth service
- Session helpers (`getSession`, `setSession`, `clearSession`) to persist tokens client-side
- Utility to generate provider authorization URLs per project

### Updated
- Exports now include the auth client alongside the database/storage clients
- Package metadata and docs mention project auth support

### Documentation
- README and publishing guides now include auth quick-start snippets and notes

## [2.1.0] - 2025-10-16

### Added - S3 Storage Support 🚀

#### Storage Client
- **New `WOWSQLStorage` class** for S3-compatible object storage
- Full CRUD operations for file management
- Storage quota tracking and enforcement
- Client-side storage limit validation
- Multi-region support

#### Storage Features
- **File Upload**: Upload files with automatic quota checking
- **File Download**: Get presigned URLs or download files directly
- **File Listing**: List all files with metadata (size, type, modified date)
- **File Deletion**: Delete files and free up storage space
- **Quota Management**: Check available storage and usage limits

#### Storage API Methods
- `upload(file, key, options?)` - Upload file to S3
- `download(key)` - Get presigned download URL
- `list(prefix?, limit?)` - List files with optional filtering
- `delete(key)` - Delete file from storage
- `getQuota()` - Get storage quota information
- `getFileInfo(key)` - Get detailed file metadata

#### Storage Error Handling
- `StorageLimitExceededError` - Thrown when storage quota is exceeded
- `StorageError` - Base error class for storage operations
- Comprehensive error messages with suggestions

#### Storage Types
- `StorageQuota` - Storage limit and usage information
- `StorageFile` - File metadata interface
- `UploadOptions` - Configuration for file uploads
- Complete TypeScript type definitions

#### Examples
- Complete storage usage examples
- File upload/download workflows
- Quota management patterns
- Error handling best practices

### Updated
- Package description to mention S3 Storage support
- README with storage documentation
- Version bumped to 2.1.0
- Export statements to include storage classes

### Documentation
- Storage SDK architecture diagram
- Quick start guide for storage
- API reference for storage methods
- Implementation examples

## [2.0.0] - 2025-10-10

### Added
- Complete TypeScript SDK with full type safety
- Fluent query builder API
- Support for all CRUD operations (Create, Read, Update, Delete)
- Advanced filtering with multiple operators (eq, neq, gt, gte, lt, lte, like, is)
- Pagination support (limit, offset)
- Sorting capabilities (order, orderDirection)
- Raw SQL query execution
- Table schema introspection
- Health check endpoint
- Comprehensive error handling with `WOWSQLError` class
- TypeScript generics support for type-safe queries
- Configurable timeout option
- Full JSDoc documentation
- Tree-shakeable exports

### Features
- **Zero Configuration**: Simple initialization with projectUrl and apiKey
- **Type-Safe**: Full TypeScript support with generics for all operations
- **Fluent API**: Chainable query builder pattern for intuitive querying
- **Lightweight**: Minimal dependencies (only axios)
- **Error Handling**: Comprehensive error messages with status codes

### Examples
- Next.js App Router integration
- React hooks
- Express.js API
- TypeScript with generics

### Documentation
- Complete README with usage examples
- API reference
- Best practices guide
- Publishing guide for npm

## [1.0.0] - Initial Release (Legacy)

### Added
- Basic REST API client
- Simple query methods
- Authentication with API keys

---

## Upgrade Guide

### From 1.x to 2.x

The 2.0.0 release is a complete rewrite with breaking changes.

#### Breaking Changes

1. **Import changed**
   ```typescript
   // Old (1.x)
   import { WOWSQL } from 'WOWSQL-sdk';
   
   // New (2.x)
   import WOWSQLClient from '@wowsql/sdk';
   ```

2. **Initialization changed**
   ```typescript
   // Old (1.x)
   const client = new WOWSQL('projectUrl', 'apiKey');
   
   // New (2.x)
   const client = new WOWSQLClient({
     projectUrl: 'projectUrl',
     apiKey: 'apiKey'
   });
   ```

3. **Query API changed**
   ```typescript
   // Old (1.x)
   const users = await client.query('users', { limit: 10 });
   
   // New (2.x)
   const users = await client.table('users').limit(10).get();
   ```

#### New Features in 2.0

- Full TypeScript support with generics
- Fluent query builder
- Advanced filtering
- Better error handling
- Type-safe responses

#### Migration Steps

1. Update package name:
   ```bash
   npm uninstall WOWSQL-sdk
   npm install @wowsql/sdk
   ```

2. Update imports in your code

3. Update client initialization

4. Update query methods to use new fluent API

5. Add TypeScript interfaces for your data models

6. Test thoroughly before deploying

---

## Future Roadmap

### Planned Features

- [ ] WebSocket support for real-time data
- [ ] Transaction support
- [ ] Batch operations
- [ ] Query caching
- [ ] Retry logic with exponential backoff
- [ ] Request/response interceptors
- [ ] Query performance monitoring
- [ ] GraphQL-like nested queries
- [ ] File upload support
- [ ] Aggregation functions (COUNT, SUM, AVG, etc.)

### Under Consideration

- [ ] React hooks package (`@wowsql/react`)
- [ ] Vue composables (`@wowsql/vue`)
- [ ] Svelte stores (`@wowsql/svelte`)
- [ ] CLI tool for migrations
- [ ] Code generation from schema
- [ ] Query builder UI

---

For more information, visit [https://wowsql.com](https://wowsql.com)


