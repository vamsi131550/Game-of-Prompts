import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

// Mock Firebase
vi.mock('./firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn()
  },
  db: {},
  googleProvider: {}
}));

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn()
}));

// Mock weather service
vi.mock('./services/weatherService', () => ({
  useWeather: () => ({
    weather: { temperature: 25, humidity: 60, windSpeed: 10, weatherCode: 0 },
    error: null,
    loading: false
  })
}));

// Mock sensor service
vi.mock('./services/sensorService', () => ({
  getLatestSensorData: () => ({
    moisture: 45,
    soilTemp: 22,
    soilPh: 6.5,
    status: 'optimal'
  })
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn()
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders main navigation', () => {
    render(<App />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Weather')).toBeInTheDocument();
    expect(screen.getByLabelText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByLabelText('Sensors')).toBeInTheDocument();
    expect(screen.getByLabelText('Scan')).toBeInTheDocument();
  });

  it('displays home dashboard by default', () => {
    render(<App />);
    
    expect(screen.getByText('Crop Health AI')).toBeInTheDocument();
  });

  it('switches tabs when navigation is clicked', async () => {
    render(<App />);
    
    const weatherTab = screen.getByLabelText('Weather');
    fireEvent.click(weatherTab);
    
    await waitFor(() => {
      expect(screen.getByText('Weather Dashboard')).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation in main navigation', async () => {
    render(<App />);
    
    const weatherTab = screen.getByLabelText('Weather');
    fireEvent.keyDown(weatherTab, { key: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('Weather Dashboard')).toBeInTheDocument();
    });
  });

  it('has proper main landmark for accessibility', () => {
    render(<App />);
    
    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  it('displays error boundary when error occurs', () => {
    // Mock a component that throws an error
    const ThrowErrorComponent = () => {
      throw new Error('Test error');
    };

    render(<ThrowErrorComponent />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('handles image upload accessibility', () => {
    render(<App />);
    
    const scanTab = screen.getByLabelText('AI Assistant');
    fireEvent.click(scanTab);
    
    // Should have upload functionality with proper labels
    expect(screen.getByLabelText('Upload image')).toBeInTheDocument();
  });

  it('announces page changes to screen readers', async () => {
    render(<App />);
    
    const homeTab = screen.getByLabelText('Home');
    expect(homeTab).toHaveAttribute('aria-current', 'page');
    
    const weatherTab = screen.getByLabelText('Weather');
    fireEvent.click(weatherTab);
    
    await waitFor(() => {
      expect(weatherTab).toHaveAttribute('aria-current', 'page');
      expect(homeTab).not.toHaveAttribute('aria-current', 'page');
    });
  });

  it('supports keyboard navigation throughout the app', () => {
    render(<App />);
    
    const tabs = ['Home', 'Weather', 'AI Assistant', 'Sensors', 'Scan'];
    
    tabs.forEach(tabLabel => {
      const tab = screen.getByLabelText(tabLabel);
      expect(tab).toHaveAttribute('tabIndex', '0');
      expect(tab).toHaveAttribute('aria-label', tabLabel);
    });
  });
});
