// Product CRUD service

import { getDb } from '../lib/db';
import type { Product, CreateProductInput, UpdateProductInput } from '../types';

export interface ProductTemplate {
  name: string;
  description: string;
  price: number;
  field: string;
}

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // Software Development
  { field: 'Software Development', name: 'Website Development', description: 'Custom website design and development including responsive layout, CMS integration, and deployment.', price: 2500 },
  { field: 'Software Development', name: 'Mobile App Development', description: 'Native or cross-platform mobile application development with UI/UX design and app store deployment.', price: 5000 },
  { field: 'Software Development', name: 'API Integration', description: 'Third-party API integration, custom middleware development, and data synchronization setup.', price: 1500 },
  // Design & Creative
  { field: 'Design & Creative', name: 'Logo & Brand Identity', description: 'Professional logo design with brand guidelines, color palette, and typography specifications.', price: 800 },
  { field: 'Design & Creative', name: 'UI/UX Design', description: 'User interface and experience design including wireframes, prototypes, and design system.', price: 2000 },
  { field: 'Design & Creative', name: 'Social Media Graphics', description: 'Custom social media post templates, banners, and visual content package.', price: 500 },
  // Marketing
  { field: 'Marketing', name: 'SEO Optimization', description: 'Technical and content SEO audit, keyword research, on-page optimization, and performance tracking.', price: 1200 },
  { field: 'Marketing', name: 'Content Strategy', description: 'Content calendar creation, topic research, editorial guidelines, and distribution strategy.', price: 1500 },
  { field: 'Marketing', name: 'Email Campaign', description: 'Email marketing campaign design, copywriting, automation setup, and analytics tracking.', price: 800 },
  // Consulting
  { field: 'Consulting', name: 'Business Strategy Session', description: 'One-on-one strategic consulting session covering business analysis, growth opportunities, and action planning.', price: 300 },
  { field: 'Consulting', name: 'Technical Audit', description: 'Comprehensive review of technical infrastructure, codebase quality, security posture, and recommendations.', price: 2000 },
  { field: 'Consulting', name: 'Training Workshop', description: 'Custom training workshop on specified topic, including materials, exercises, and follow-up resources.', price: 1000 },
  // Education
  { field: 'Education', name: 'Guest Lecture', description: 'Expert guest lecture on specified topic, including presentation materials and Q&A session.', price: 500 },
  { field: 'Education', name: 'Online Course Module', description: 'Self-paced online learning module with video content, exercises, quizzes, and certificates.', price: 3000 },
  { field: 'Education', name: '1-on-1 Mentoring', description: 'Personalized mentoring session covering career guidance, skill development, and project feedback.', price: 150 },
];

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
