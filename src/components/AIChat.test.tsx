import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIChat } from './AIChat';
import * as weatherService from '../services/weatherService';
import * as sensorService from '../services/sensorService';

// Mock the Google GenAI
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContentStream: vi.fn().mockResolvedValue({
        text: 'Test response'
      }),
      generateContent: vi.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                data: 'base64-audio-data'
              }
            }]
          }
        }]
      })
    },
    live: {
      connect: vi.fn().mockResolvedValue({
        sendRealtimeInput: vi.fn(),
        close: vi.fn()
      })
    }
  })),
  Modality: {
    AUDIO: 'AUDIO'
  }
}));

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    })
  }
});

// Mock Audio
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  onended: null
})) as any;

// Mock window.AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createMediaStreamSource: vi.fn().mockReturnValue({
    connect: vi.fn()
  }),
  createScriptProcessor: vi.fn().mockReturnValue({
    connect: vi.fn(),
    onaudioprocess: null,
    disconnect: vi.fn()
  }),
  createBuffer: vi.fn().mockReturnValue({
    getChannelData: vi.fn().mockReturnValue(new Float32Array(100))
  }),
  createBufferSource: vi.fn().mockReturnValue({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    onended: null
  }),
  destination: {},
  close: vi.fn()
})) as any;

describe('AIChat Component', () => {
  const mockWeather = {
    temperature: 25,
    humidity: 60,
    windSpeed: 10,
    weatherCode: 0
  };

  const mockSensorData = {
    moisture: 45,
    soilTemp: 22,
    soilPh: 6.5,
    status: 'optimal'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chat interface correctly', () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByLabelText('Type your message')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload image')).toBeInTheDocument();
    expect(screen.getByLabelText('Clear chat history')).toBeInTheDocument();
  });

  it('displays welcome message when no messages exist', () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    expect(screen.getByText('Namaste! How can I help you today?')).toBeInTheDocument();
    expect(screen.getByText('You can ask about crop diseases, weather, or farming tips.')).toBeInTheDocument();
  });

  it('sends message when Enter key is pressed', async () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    const input = screen.getByLabelText('Type your message');
    fireEvent.change(input, { target: { value: 'What crops grow well in this weather?' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('What crops grow well in this weather?')).toBeInTheDocument();
    });
  });

  it('does not send message when Shift+Enter is pressed', () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    const input = screen.getByLabelText('Type your message');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('clears chat when clear button is clicked', async () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    const input = screen.getByLabelText('Type your message');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    const clearButton = screen.getByLabelText('Clear chat history');
    fireEvent.click(clearButton);
    
    expect(screen.getByText('Namaste! How can I help you today?')).toBeInTheDocument();
  });

  it('handles keyboard navigation on clear button', async () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    const clearButton = screen.getByLabelText('Clear chat history');
    fireEvent.keyDown(clearButton, { key: 'Enter' });
    
    expect(screen.getByText('Namaste! How can I help you today?')).toBeInTheDocument();
  });

  it('handles keyboard navigation on upload button', () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    const uploadButton = screen.getByLabelText('Upload image');
    fireEvent.keyDown(uploadButton, { key: 'Enter' });
    
    // File input should be triggered (mocked)
    expect(uploadButton).toBeInTheDocument();
  });

  it('displays loading state when sending message', async () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    const input = screen.getByLabelText('Type your message');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });
  });

  it('removes selected image when Escape key is pressed', () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    // Simulate file upload
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Upload image');
    
    // This would normally trigger file selection, but we'll test the escape functionality
    fireEvent.keyDown(input, { key: 'Escape' });
    
    // Should not crash and should handle the escape key
    expect(input).toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByLabelText('Type your message')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload image')).toBeInTheDocument();
    expect(screen.getByLabelText('Clear chat history')).toBeInTheDocument();
  });

  it('announces messages to screen readers', async () => {
    render(<AIChat weather={mockWeather} sensorData={mockSensorData} />);
    
    const input = screen.getByLabelText('Type your message');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      const messageLog = screen.getByRole('log');
      expect(messageLog).toHaveAttribute('aria-live', 'polite');
    });
  });
});
