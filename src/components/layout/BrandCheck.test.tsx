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

describe('Brand Verification', () => {
  it('Sidebar displays FlowForge-Track', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByText('FlowForge-Track')).toBeInTheDocument();
  });

  it('Header displays FlowForge-Track', () => {
    render(<Header />);
    expect(screen.getByText('FlowForge-Track')).toBeInTheDocument();
  });
});
