import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders all navigation tabs', () => {
    const setActiveTab = vi.fn();
    render(<BottomNav activeTab="home" setActiveTab={setActiveTab} />);
    
    expect(screen.getByLabelText('Home')).toBeDefined();
    expect(screen.getByLabelText('Weather')).toBeDefined();
    expect(screen.getByLabelText('Scan Crop')).toBeDefined();
    expect(screen.getByLabelText('Voice')).toBeDefined();
    expect(screen.getByLabelText('History')).toBeDefined();
  });

  it('calls setActiveTab when a tab is clicked', () => {
    const setActiveTab = vi.fn();
    render(<BottomNav activeTab="home" setActiveTab={setActiveTab} />);
    
    fireEvent.click(screen.getByLabelText('Weather'));
    expect(setActiveTab).toHaveBeenCalledWith('weather');
  });

  it('highlights the active tab', () => {
    const setActiveTab = vi.fn();
    render(<BottomNav activeTab="weather" setActiveTab={setActiveTab} />);
    
    const weatherButton = screen.getByLabelText('Weather');
    expect(weatherButton.className).toContain('text-emerald-600');
  });
});
