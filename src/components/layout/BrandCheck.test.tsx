import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { describe, it, expect, vi } from 'vitest';

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
  it('Sidebar displays FlowForge-Track', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>,
    );
    expect(screen.getByText('FlowForge-Track')).toBeInTheDocument();
  });

  it('Header displays FlowForge-Track', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>,
    );
    expect(screen.getByText('FlowForge-Track')).toBeInTheDocument();
  });
});
