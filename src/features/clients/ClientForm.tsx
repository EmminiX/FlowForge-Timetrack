import { useState, useEffect } from 'react';
import type { Client, CreateClientInput, Currency } from '../../types';
import { CURRENCY_OPTIONS } from '../../types';
import { Button, Input, Textarea, Modal, ModalFooter, Select } from '../../components/ui';

export interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientInput) => Promise<void>;
  initialData?: Client;
  loading?: boolean;
}

export function ClientForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: ClientFormProps) {
  const [formData, setFormData] = useState<CreateClientInput>({
    name: '',
    email: '',
    address: '',
    phone: '',
    vatNumber: '',
    hourlyRate: 0,
    currency: 'EUR',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Suppressing set-state-in-effect warning as this is a deliberate reset pattern
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: initialData?.name || '',
        email: initialData?.email || '',
        address: initialData?.address || '',
        phone: initialData?.phone || '',
        vatNumber: initialData?.vatNumber || '',
        hourlyRate: initialData?.hourlyRate || 0,
        currency: initialData?.currency || 'EUR',
        notes: initialData?.notes || '',
      });
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, initialData]);

  const handleChange = (field: keyof CreateClientInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.hourlyRate < 0) {
      newErrors.hourlyRate = 'Rate cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
      // Don't call onClose here - parent handles closing on success
    } catch (err) {
      console.error('Failed to save client:', err);
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to save client. Please try again.',
      );
    }
  };

  const isEditing = !!initialData;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Client' : 'New Client'}
      size='lg'
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        {submitError && (
          <div className='p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm'>
            {submitError}
          </div>
        )}

        <Input
          label='Name *'
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          placeholder='Client or company name'
          autoFocus
        />

        <div className='grid grid-cols-2 gap-4'>
          <Input
            label='Email'
            type='email'
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            placeholder='client@example.com'
          />

          <Input
            label='Phone'
            type='tel'
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder='+1 (555) 000-0000'
          />
        </div>

        <Textarea
          label='Address'
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder='Full billing address'
          rows={3}
        />

        <Input
          label='VAT Number'
          value={formData.vatNumber}
          onChange={(e) => handleChange('vatNumber', e.target.value)}
          placeholder='e.g., GB123456789'
          helperText='Used for invoicing purposes'
        />

        <div className='grid grid-cols-2 gap-4'>
          <Input
            label='Hourly Rate'
            type='number'
            min={0}
            max={1000000}
            step={0.01}
            value={formData.hourlyRate === 0 ? '' : formData.hourlyRate}
            onChange={(e) =>
              handleChange('hourlyRate', e.target.value === '' ? 0 : parseFloat(e.target.value))
            }
            onBlur={(e) => {
              // Normalize empty or invalid to 0 on blur
              if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                handleChange('hourlyRate', 0);
              }
            }}
            placeholder='0'
            error={errors.hourlyRate}
          />

          <Select
            label='Currency'
            value={formData.currency}
            onChange={(e) => handleChange('currency', e.target.value as Currency)}
            options={CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
          />
        </div>

        <Textarea
          label='Notes'
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder='Internal notes about this client'
          rows={2}
        />

        <ModalFooter>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type='submit' loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Client'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
