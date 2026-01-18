// Product data model

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    sku?: string;
    createdAt: string; // ISO date
    updatedAt: string; // ISO date
}

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductInput = Partial<CreateProductInput>;
