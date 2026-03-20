import { describe, it, expect } from 'vitest';
import { getWeatherAdvice } from '../services/weatherService';

describe('Weather Service', () => {
  it('should provide correct advice for high temperature', () => {
    const advice = getWeatherAdvice(35, 0);
    expect(advice).toContain('High temperature');
  });

  it('should provide correct advice for low temperature', () => {
    const advice = getWeatherAdvice(5, 0);
    expect(advice).toContain('Low temperature');
  });

  it('should provide correct advice for rain', () => {
    const advice = getWeatherAdvice(20, 61);
    expect(advice).toContain('Rain');
  });
});
