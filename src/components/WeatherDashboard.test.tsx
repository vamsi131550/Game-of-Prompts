import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeatherDashboard } from './WeatherDashboard';

// Mock ResponsiveContainer as it doesn't work well in JSDOM
vi.mock('recharts', async () => {
  const OriginalModule = await vi.importActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: '100%', height: '100%' }}>{children}</div>
    ),
  };
});

describe('WeatherDashboard', () => {
  it('renders weather insights header', () => {
    render(<WeatherDashboard />);
    expect(screen.getByText('Weather Insights')).toBeDefined();
  });

  it('renders current weather highlights', () => {
    render(<WeatherDashboard />);
    expect(screen.getByLabelText('Average Temperature')).toBeDefined();
    expect(screen.getByLabelText('Rain Probability')).toBeDefined();
    expect(screen.getByText('24.5°C')).toBeDefined();
    expect(screen.getByText('15%')).toBeDefined();
  });

  it('renders 7-day forecast', () => {
    render(<WeatherDashboard />);
    expect(screen.getByText('7-Day Forecast')).toBeDefined();
    expect(screen.getByText('Mon')).toBeDefined();
    expect(screen.getByText('Sun')).toBeDefined();
  });
});
