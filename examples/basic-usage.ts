/**
 * Basic Usage Example
 * 
 * This example demonstrates basic CRUD operations with WOWSQL SDK
 */

import WOWSQLClient from '@wowsql/sdk';

// Initialize client
const client = new WOWSQLClient({
  projectUrl: 'myproject',  // Replace with your project subdomain
  apiKey: 'your-api-key-here'  // Replace with your API key
});

// Define TypeScript interface for type safety
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  created_at: string;
}

async function main() {
  try {
    console.log('=== WOWSQL SDK Basic Usage ===\n');

    // 1. CREATE - Insert a new user
    console.log('1. Creating a new user...');
    const createResult = await client.table('users').create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    });
    console.log('Created user with ID:', createResult.id);
    console.log('');

    // 2. READ - Get all users
    console.log('2. Fetching all users...');
    const allUsers = await client.table<User>('users').get();
    console.log(`Found ${allUsers.total} users`);
    console.log('First 3 users:', allUsers.data.slice(0, 3));
    console.log('');

    // 3. READ - Get user by ID
    console.log('3. Fetching user by ID...');
    const user = await client.table<User>('users').getById(1);
    console.log('User:', user);
    console.log('');

    // 4. READ - Query with filters
    console.log('4. Querying users with filters...');
    const adults = await client.table<User>('users')
      .filter({ column: 'age', operator: 'gte', value: 18 })
      .order('created_at', 'desc')
      .limit(5)
      .get();
    console.log(`Found ${adults.count} adult users (showing ${adults.data.length})`);
    console.log('');

    // 5. UPDATE - Update user
    console.log('5. Updating user...');
    const updateResult = await client.table('users').update(1, {
      age: 26,
      name: 'John Smith'
    });
    console.log('Updated rows:', updateResult.affected_rows);
    console.log('');

    // 6. DELETE - Delete user
    console.log('6. Deleting user...');
    const deleteResult = await client.table('users').delete(999);
    console.log('Deleted rows:', deleteResult.affected_rows);
    console.log('');

    // 7. Advanced Query
    console.log('7. Advanced query with multiple filters...');
    const advancedQuery = await client.table<User>('users')
      .select(['id', 'name', 'email'])
      .filter({ column: 'age', operator: 'gte', value: 18 })
      .filter({ column: 'age', operator: 'lte', value: 30 })
      .order('age', 'asc')
      .limit(10)
      .get();
    console.log(`Found ${advancedQuery.count} users aged 18-30`);
    console.log('');

    // 8. Get first matching record
    console.log('8. Getting first user with specific email...');
    const firstUser = await client.table<User>('users')
      .filter({ column: 'email', operator: 'like', value: '%@example.com' })
      .first();
    console.log('First user:', firstUser);
    console.log('');

    // 9. List all tables
    console.log('9. Listing all tables...');
    const tables = await client.listTables();
    console.log('Available tables:', tables);
    console.log('');

    // 10. Get table schema
    console.log('10. Getting table schema...');
    const schema = await client.getTableSchema('users');
    console.log('Table:', schema.table);
    console.log('Primary Key:', schema.primary_key);
    console.log('Columns:', schema.columns.map(c => `${c.name} (${c.type})`));
    console.log('');

    console.log('=== All operations completed successfully! ===');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
main();


