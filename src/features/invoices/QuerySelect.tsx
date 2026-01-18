import { ChangeEvent } from 'react';
import { Product } from '../../types';

interface QuerySelectProps {
    products: Product[];
    onSelect: (product: Product) => void;
}

export function QuerySelect({ products, onSelect }: QuerySelectProps) {
    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const productId = e.target.value;
        if (!productId) return;

        const product = products.find(p => p.id === productId);
        if (product) {
            onSelect(product);
        }
        // Reset selection
        e.target.value = "";
    };

    return (
        <select
            className="h-8 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            onChange={handleChange}
            defaultValue=""
        >
            <option value="" disabled>Add stored item...</option>
            {products.map(p => (
                <option key={p.id} value={p.id}>
                    {p.name} (${p.price.toFixed(2)})
                </option>
            ))}
        </select>
    );
}
