// Product CRUD service

import { getDb } from '../lib/db';
import type { Product, CreateProductInput, UpdateProductInput } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export const productService = {
  // Get all products
  async getAll(): Promise<Product[]> {
    const db = await getDb();
    return db.select<Product[]>(`
      SELECT 
        id,
        name,
        description,
        price,
        sku,
        created_at as createdAt,
        updated_at as updatedAt
      FROM products
      ORDER BY name ASC
    `);
  },

  // Get product by ID
  async getById(id: string): Promise<Product | null> {
    const db = await getDb();
    const result = await db.select<Product[]>(
      `
      SELECT 
        id,
        name,
        description,
        price,
        sku,
        created_at as createdAt,
        updated_at as updatedAt
      FROM products
      WHERE id = $1
    `,
      [id],
    );

    return result[0] || null;
  },

  // Create product
  async create(input: CreateProductInput): Promise<Product> {
    const db = await getDb();
    const id = generateId();
    const timestamp = now();

    await db.execute(
      `
      INSERT INTO products (id, name, description, price, sku, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [id, input.name, input.description || '', input.price, input.sku || '', timestamp, timestamp],
    );

    return {
      id,
      name: input.name,
      description: input.description || '',
      price: input.price,
      sku: input.sku || '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  // Update product
  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const db = await getDb();
    const existing = await this.getById(id);

    if (!existing) return null;

    const updated = {
      ...existing,
      ...input,
      updatedAt: now(),
    };

    await db.execute(
      `
      UPDATE products SET
        name = $1,
        description = $2,
        price = $3,
        sku = $4,
        updated_at = $5
      WHERE id = $6
    `,
      [updated.name, updated.description, updated.price, updated.sku, updated.updatedAt, id],
    );

    return updated;
  },

  // Delete product
  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    await db.execute('DELETE FROM products WHERE id = $1', [id]);
    return true;
  },
};
