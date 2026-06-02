import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectBreakdown } from './ProjectBreakdown';

describe('ProjectBreakdown budget alerts', () => {
  it('shows budget status when project breakdown includes scope data', () => {
    render(
      <ProjectBreakdown
        projects={[
          {
            projectId: 'project-1',
            projectName: 'Brand Refresh',
            projectColor: '#007AFF',
            totalSeconds: 30600,
            percentOfTotal: 100,
            budgetType: 'hourly',
            budgetStatus: 'near',
            budgetUsedPercent: 85,
            budgetRemainingHours: 1.5,
            budgetRemainingAmount: null,
          },
        ]}
      />,
    );

    expect(screen.getByText('Near limit')).toBeInTheDocument();
    expect(screen.getByText('85% used')).toBeInTheDocument();
  });
});
