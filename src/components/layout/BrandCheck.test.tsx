import { act, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/Toast';
import { useToastStore } from '../../stores/toastStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { enableSoundFeedback: false },
    updateSetting: vi.fn(),
  }),
}));

vi.mock('../../services', () => ({
  clientService: { getAll: vi.fn().mockResolvedValue([]) },
  projectService: { getAll: vi.fn().mockResolvedValue([]) },
  invoiceService: { getAll: vi.fn().mockResolvedValue([]) },
}));

describe('Brand Verification', () => {
  beforeEach(() => {
    useToastStore.getState().clearAll();
  });

  it('Sidebar displays TimeSage', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>,
    );
    expect(screen.getByText('TimeSage')).toBeInTheDocument();
  });

  it('Header displays TimeSage', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>,
    );
    expect(screen.getByText('TimeSage')).toBeInTheDocument();
  });

  it('search opens as an accessible dialog with listbox results', async () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /open search/i }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('dialog', { name: /global search/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: /search results/i })).toBeInTheDocument();
  });

  it('toasts expose status semantics for assistive technology', () => {
    useToastStore.getState().addToast({ message: 'Timer stopped' });

    render(<ToastContainer />);

    expect(screen.getByRole('status')).toHaveTextContent('Timer stopped');
    expect(screen.getByLabelText(/dismiss notification/i)).toBeInTheDocument();
  });
});
