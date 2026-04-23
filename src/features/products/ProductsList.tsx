import { useState, useEffect } from 'react';
import { Plus, Search, Package, Pencil, Trash2, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import type { Product } from '../../types';
import { productService } from '../../services';
import { PRODUCT_TEMPLATES } from '../../services/productService';
import type { ProductTemplate } from '../../services/productService';
import {
  Button,
  Card,
  EmptyState,
  ConfirmDialog,
  Input,
  Textarea,
  Modal,
  ModalFooter,
} from '../../components/ui';

export function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [templateData, setTemplateData] = useState<ProductTemplate | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setSubmitting(true);
    try {
      await productService.delete(deletingProduct.id);
      await loadData();
      setDeletingProduct(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-foreground'>Products & Services</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)}>
            <Package className='w-4 h-4' />
            Quick Add
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className='w-4 h-4' />
            New Item
          </Button>
        </div>
      </div>

      {/* Search */}
      {products.length > 0 && (
        <div className='relative max-w-md'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search items...'
            className='pl-9'
          />
        </div>
      )}

      {/* List */}
      {products.length === 0 ? (
        <EmptyState
          icon={<Package className='w-8 h-8' />}
          variant='guided'
          title='No items yet'
          description='Create your first product or service to easily add them to invoices.'
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className='w-4 h-4' />
              Create Item
            </Button>
          }
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Search className='w-8 h-8' />}
          variant='minimal'
          title='No matching items'
          description='Try searching for something else.'
        />
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {filteredProducts.map((product) => (
            <Card key={product.id} className='p-4 flex flex-col justify-between'>
              <div>
                <div className='flex justify-between items-start mb-2'>
                  <h3 className='font-semibold text-foreground truncate'>{product.name}</h3>
                  <span className='font-mono text-sm font-medium'>${product.price.toFixed(2)}</span>
                </div>
                <p className='text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]'>
                  {product.description || 'No description'}
                </p>
                {product.sku && (
                  <p className='text-xs text-muted-foreground mt-2 font-mono'>SKU: {product.sku}</p>
                )}
              </div>

              <div className='flex justify-end gap-2 mt-4 pt-4 border-t border-border'>
                <Button variant='ghost' size='sm' onClick={() => setViewingProduct(product)}>
                  <Eye className='w-4 h-4' />
                </Button>
                <Button variant='ghost' size='sm' onClick={() => setEditingProduct(product)}>
                  <Pencil className='w-4 h-4' />
                </Button>
                <Button variant='ghost' size='sm' onClick={() => setDeletingProduct(product)}>
                  <Trash2 className='w-4 h-4 text-destructive' />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreate || editingProduct) && (
        <CreateProductModal
          isOpen={showCreate || !!editingProduct}
          onClose={() => {
            setShowCreate(false);
            setEditingProduct(null);
            setTemplateData(null);
          }}
          onSaved={loadData}
          initialData={editingProduct}
          templateData={templateData}
        />
      )}

      {/* View Product Modal */}
      {viewingProduct && (
        <Modal isOpen={true} onClose={() => setViewingProduct(null)} title='Product Details'>
          <div className='space-y-4'>
            <div className='flex justify-between items-start'>
              <h3 className='text-xl font-bold text-foreground'>{viewingProduct.name}</h3>
              <span className='font-mono text-lg font-medium'>
                ${viewingProduct.price.toFixed(2)}
              </span>
            </div>

            {viewingProduct.sku && (
              <div className='text-sm text-muted-foreground font-mono'>
                SKU: {viewingProduct.sku}
              </div>
            )}

            <div className='prose prose-sm dark:prose-invert max-w-none bg-secondary/50 p-4 rounded-lg'>
              <p className='whitespace-pre-wrap'>
                {viewingProduct.description || 'No description provided.'}
              </p>
            </div>

            <ModalFooter>
              <Button onClick={() => setViewingProduct(null)}>Close</Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title='Delete Item'
        message={`Are you sure you want to delete "${deletingProduct?.name}"?`}
        confirmLabel='Delete'
        variant='danger'
        loading={submitting}
      />

      {showTemplates && (
        <TemplatesModal
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelect={(template) => {
            setShowTemplates(false);
            setTemplateData(template);
            setShowCreate(true);
          }}
          existingNames={products.map(p => p.name.toLowerCase())}
        />
      )}
    </div>
  );
}

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData: Product | null;
  templateData?: ProductTemplate | null;
}

function CreateProductModal({ isOpen, onClose, onSaved, initialData, templateData }: CreateProductModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [sku, setSku] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setPrice(initialData.price);
      setSku(initialData.sku || '');
    } else if (templateData) {
      setName(templateData.name);
      setDescription(templateData.description);
      setPrice(templateData.price);
      setSku('');
    } else {
      setName('');
      setDescription('');
      setPrice(0);
      setSku('');
    }
  }, [initialData, templateData, isOpen]);

  const handleSubmit = async () => {
    if (!name) return;
    setSaving(true);
    try {
      if (initialData) {
        await productService.update(initialData.id, {
          name,
          description,
          price,
          sku,
        });
      } else {
        await productService.create({
          name,
          description,
          price,
          sku,
        });
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Item' : 'New Item'}>
      <div className='space-y-4'>
        <Input
          label='Name *'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. Web Hosting'
        />
        <Textarea
          label='Description'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Item details...'
          rows={3}
        />
        <div className='grid grid-cols-2 gap-4'>
          <Input
            label='Price *'
            type='number'
            value={price || ''}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            min={0}
            step={0.01}
          />
          <Input label='SKU (Optional)' value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>

        <ModalFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!name}>
            {initialData ? 'Save Changes' : 'Create Item'}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: ProductTemplate) => void;
  existingNames: string[];
}

function TemplatesModal({ isOpen, onClose, onSelect, existingNames }: TemplatesModalProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const fields = [...new Set(PRODUCT_TEMPLATES.map(t => t.field))];

  const toggleField = (field: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  // Expand all by default on mount
  useEffect(() => {
    setExpandedFields(new Set(fields));
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Add from Templates">
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {fields.map(field => (
          <div key={field} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleField(field)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium text-sm text-foreground">{field}</span>
              {expandedFields.has(field) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {expandedFields.has(field) && (
              <div className="border-t border-border">
                {PRODUCT_TEMPLATES.filter(t => t.field === field).map(template => {
                  const exists = existingNames.includes(template.name.toLowerCase());
                  return (
                    <button
                      key={template.name}
                      onClick={() => !exists && onSelect(template)}
                      disabled={exists}
                      className={`w-full text-left p-3 border-b border-border last:border-b-0 transition-colors ${
                        exists
                          ? 'opacity-50 cursor-not-allowed bg-muted/30'
                          : 'hover:bg-primary/5 cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-3">
                          <div className="text-sm font-medium text-foreground">
                            {template.name}
                            {exists && <span className="ml-2 text-xs text-muted-foreground">(already exists)</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                        </div>
                        <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                          ${template.price.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}
