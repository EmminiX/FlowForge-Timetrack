import { useState, useEffect } from 'react';
import type { Project, CreateProjectInput, Client, ProjectStatus } from '../../types';
import { PROJECT_STATUS_OPTIONS, DEFAULT_PROJECT_COLORS } from '../../types';
import { clientService } from '../../services';
import {
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  ModalFooter,
  ColorPicker,
} from '../../components/ui';

export interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectInput) => Promise<void>;
  initialData?: Project;
  loading?: boolean;
}

export function ProjectForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: ProjectFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: '',
    clientId: null,
    status: 'active',
    color: DEFAULT_PROJECT_COLORS[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load clients for dropdown
  useEffect(() => {
    clientService.getAll().then(setClients).catch(console.error);
  }, []);

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Suppressing set-state-in-effect warning as this is a deliberate reset pattern
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setFormData({
        name: initialData?.name || '',
        description: initialData?.description || '',
        clientId: initialData?.clientId || null,
        status: initialData?.status || 'active',
        color: initialData?.color || DEFAULT_PROJECT_COLORS[0],
      });
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, initialData]);

  const handleChange = (field: keyof CreateProjectInput, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      console.error('Failed to save project:', err);
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to save project. Please try again.',
      );
    }
  };

  const isEditing = !!initialData;

  const clientOptions = [
    { value: '', label: 'No client' },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];

  const statusOptions = PROJECT_STATUS_OPTIONS.map((s) => ({
    value: s.value,
    label: s.label,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Project' : 'New Project'}
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
          placeholder='Project name'
          autoFocus
        />

        <Textarea
          label='Description'
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder='Brief description of the project'
          rows={2}
        />

        <div className='grid grid-cols-2 gap-4'>
          <Select
            label='Client'
            value={formData.clientId || ''}
            onChange={(e) => handleChange('clientId', e.target.value || null)}
            options={clientOptions}
          />

          <Select
            label='Status'
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as ProjectStatus)}
            options={statusOptions}
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-foreground mb-2'>Color</label>
          <ColorPicker
            value={formData.color}
            onChange={(color) => handleChange('color', color)}
            colors={DEFAULT_PROJECT_COLORS}
          />
        </div>

        <ModalFooter>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type='submit' loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Project'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
