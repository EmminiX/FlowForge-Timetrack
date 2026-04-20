// Modal form for creating/editing down payments

import { useState, useEffect } from 'react';
import type { DownPayment, CreateDownPaymentInput, Project } from '../../types';
import { Button, Input, Textarea, Modal, ModalFooter, Select } from '../../components/ui';
import { projectService } from '../../services';

export interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDownPaymentInput) => Promise<void>;
  clientId: string;
  initialData?: DownPayment;
  loading?: boolean;
}

export function PaymentForm({
  isOpen,
  onClose,
  onSubmit,
  clientId,
  initialData,
  loading = false,
}: PaymentFormProps) {
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load client's projects for dropdown
  useEffect(() => {
    if (isOpen && clientId) {
      projectService.getByClientId(clientId).then(setProjects).catch(() => setProjects([]));
    }
  }, [isOpen, clientId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(initialData?.amount || 0);
      setPaymentDate(initialData?.paymentDate || new Date().toISOString().split('T')[0]);
      setProjectId(initialData?.projectId || '');
      setNotes(initialData?.notes || '');
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!amount || amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!paymentDate) {
      newErrors.paymentDate = 'Date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit({
        clientId,
        projectId: projectId || null,
        amount,
        paymentDate,
        notes,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save payment');
    }
  };

  const isEditing = !!initialData;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Payment' : 'Record Payment'}
      size='sm'
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        {submitError && (
          <div className='p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm'>
            {submitError}
          </div>
        )}

        <Input
          label='Amount *'
          type='number'
          min={0}
          step={0.01}
          value={amount || ''}
          onChange={(e) => {
            setAmount(e.target.value === '' ? 0 : parseFloat(e.target.value));
            if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
          }}
          error={errors.amount}
          placeholder='0.00'
          autoFocus
        />

        <Input
          label='Date *'
          type='date'
          value={paymentDate}
          onChange={(e) => {
            setPaymentDate(e.target.value);
            if (errors.paymentDate) setErrors((prev) => ({ ...prev, paymentDate: '' }));
          }}
          error={errors.paymentDate}
        />

        {projects.length > 0 && (
          <Select
            label='Project (optional)'
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={[
              { value: '', label: 'General (no project)' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        )}

        <Textarea
          label='Notes'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='Payment reference, method, etc.'
          rows={2}
        />

        <ModalFooter>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type='submit' loading={loading}>
            {isEditing ? 'Save Changes' : 'Record Payment'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
