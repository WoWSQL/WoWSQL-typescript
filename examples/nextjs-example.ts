/**
 * Next.js API Route Example
 * 
 * This example shows how to use WOWSQL SDK in Next.js App Router
 * 
 * File: app/api/users/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import WOWSQLClient from '@wowsql/sdk';

// Initialize client (use environment variables)
const client = new WOWSQLClient({
  projectUrl: process.env.WOWSQL_PROJECT!,
  apiKey: process.env.WOWSQL_API_KEY!
});

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  created_at: string;
}

// GET /api/users - List users with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    let query = client.table<User>('users')
      .select(['id', 'name', 'email', 'age', 'created_at'])
      .order('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    // Add search filter if provided
    if (search) {
      query = query.filter({ 
        column: 'name', 
        operator: 'like', 
        value: `%${search}%` 
      });
    }

    const users = await query.get();

    return NextResponse.json({
      success: true,
      data: users.data,
      pagination: {
        page,
        limit,
        total: users.total,
        totalPages: Math.ceil(users.total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch users' 
      },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.name || !body.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name and email are required' 
        },
        { status: 400 }
      );
    }

    // Create user
    const result = await client.table('users').create({
      name: body.name,
      email: body.email,
      age: body.age || null
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        message: result.message
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create user' 
      },
      { status: 500 }
    );
  }
}

/**
 * File: app/api/users/[id]/route.ts
 */

interface RouteParams {
  params: { id: string };
}

// GET /api/users/[id] - Get single user
export async function GET_SINGLE(
  request: NextRequest, 
  { params }: RouteParams
) {
  try {
    const user = await client.table<User>('users').getById(params.id);
    
    return NextResponse.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'User not found' 
      },
      { status: 404 }
    );
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const body = await request.json();
    
    const result = await client.table('users').update(params.id, body);

    return NextResponse.json({
      success: true,
      data: {
        affected_rows: result.affected_rows,
        message: result.message
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update user' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const result = await client.table('users').delete(params.id);

    return NextResponse.json({
      success: true,
      data: {
        affected_rows: result.affected_rows,
        message: result.message
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete user' 
      },
      { status: 500 }
    );
  }
}

/**
 * Client Component Example
 * 
 * File: app/users/page.tsx
 */

'use client';

import { useState, useEffect } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (data.success) {
          setUsers(data.data);
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Environment Variables (.env.local)
 * 
 * WOWSQL_PROJECT=myproject
 * WOWSQL_API_KEY=your-api-key-here
 */


