import { useState, useEffect } from 'react';
import { getWeatherData, WeatherData } from '../services/weatherService';

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const data = await getWeatherData(lat, lon);
      setWeather(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch weather data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(latitude, longitude);
        },
        () => {
          setError("Location access denied. Using default location.");
          const defaultLat = 37.7749;
          const defaultLon = -122.4194;
          fetchWeather(defaultLat, defaultLon);
        }
      );
    }
  }, []);

  return { weather, error, loading, fetchWeather };
}
