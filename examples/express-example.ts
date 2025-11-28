/**
 * Express.js API Example
 * 
 * This example shows how to use WOWSQL SDK with Express.js
 */

import express, { Request, Response } from 'express';
import WOWSQLClient, { WOWSQLError } from '@wowsql/sdk';

// Initialize Express app
const app = express();
app.use(express.json());

// Initialize WOWSQL client
const db = new WOWSQLClient({
  projectUrl: process.env.WOWSQL_PROJECT || 'myproject',
  apiKey: process.env.WOWSQL_API_KEY || 'your-api-key'
});

// TypeScript interfaces
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  created_at: string;
}

interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  published_at: string | null;
}

// ==================== USER ROUTES ====================

// GET /api/users - List all users with pagination
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    let query = db.table<User>('users')
      .order('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    if (search) {
      query = query.filter({ 
        column: 'name', 
        operator: 'like', 
        value: `%${search}%` 
      });
    }

    const result = await query.get();

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    handleError(error, res);
  }
});

// GET /api/users/:id - Get single user
app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await db.table<User>('users').getById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    handleError(error, res);
  }
});

// POST /api/users - Create new user
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    // Validation
    const { name, email, age } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Create user
    const result = await db.table('users').create({
      name,
      email,
      age: age || null
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    handleError(error, res);
  }
});

// PATCH /api/users/:id - Update user
app.patch('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.table('users').update(req.params.id, req.body);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    handleError(error, res);
  }
});

// DELETE /api/users/:id - Delete user
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.table('users').delete(req.params.id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    handleError(error, res);
  }
});

// ==================== POST ROUTES ====================

// GET /api/posts - List all posts
app.get('/api/posts', async (req: Request, res: Response) => {
  try {
    const published = req.query.published === 'true';
    
    let query = db.table<Post>('posts')
      .order('published_at', 'desc')
      .limit(50);

    if (published) {
      query = query.filter({ 
        column: 'published_at', 
        operator: 'is', 
        value: null 
      });
    }

    const result = await query.get();
    res.json({ success: true, data: result.data });
  } catch (error) {
    handleError(error, res);
  }
});

// GET /api/posts/:id - Get single post
app.get('/api/posts/:id', async (req: Request, res: Response) => {
  try {
    const post = await db.table<Post>('posts').getById(req.params.id);
    res.json({ success: true, data: post });
  } catch (error) {
    handleError(error, res);
  }
});

// POST /api/posts - Create new post
app.post('/api/posts', async (req: Request, res: Response) => {
  try {
    const { user_id, title, content, published } = req.body;

    if (!user_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'user_id, title, and content are required'
      });
    }

    const result = await db.table('posts').create({
      user_id,
      title,
      content,
      published_at: published ? new Date().toISOString() : null
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    handleError(error, res);
  }
});

// PATCH /api/posts/:id/publish - Publish a post
app.patch('/api/posts/:id/publish', async (req: Request, res: Response) => {
  try {
    const result = await db.table('posts').update(req.params.id, {
      published_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    handleError(error, res);
  }
});

// ==================== UTILITY ROUTES ====================

// GET /api/health - Health check
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const health = await db.health();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(503).json({ 
      success: false, 
      error: 'Service unavailable' 
    });
  }
});

// GET /api/tables - List all tables
app.get('/api/tables', async (req: Request, res: Response) => {
  try {
    const tables = await db.listTables();
    res.json({ success: true, data: tables });
  } catch (error) {
    handleError(error, res);
  }
});

// GET /api/tables/:name/schema - Get table schema
app.get('/api/tables/:name/schema', async (req: Request, res: Response) => {
  try {
    const schema = await db.getTableSchema(req.params.name);
    res.json({ success: true, data: schema });
  } catch (error) {
    handleError(error, res);
  }
});

// ==================== ERROR HANDLER ====================

function handleError(error: unknown, res: Response) {
  console.error('API Error:', error);

  if (error instanceof WOWSQLError) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      details: error.response
    });
  } else if (error instanceof Error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// ==================== MIDDLEWARE ====================

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.query, req.body);
  next();
});

// CORS (if needed)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET    /api/users`);
  console.log(`   GET    /api/users/:id`);
  console.log(`   POST   /api/users`);
  console.log(`   PATCH  /api/users/:id`);
  console.log(`   DELETE /api/users/:id`);
  console.log(`   GET    /api/posts`);
  console.log(`   GET    /api/posts/:id`);
  console.log(`   POST   /api/posts`);
  console.log(`   PATCH  /api/posts/:id/publish`);
  console.log(`   GET    /api/health`);
  console.log(`   GET    /api/tables`);
  console.log(`   GET    /api/tables/:name/schema`);
});

/**
 * Environment Variables (.env)
 * 
 * WOWSQL_PROJECT=myproject
 * WOWSQL_API_KEY=your-api-key-here
 * PORT=3000
 */

/**
 * Run the server:
 * 
 * npm install express
 * npm install --save-dev @types/express
 * npm install @wowsql/sdk
 * 
 * ts-node express-example.ts
 */


