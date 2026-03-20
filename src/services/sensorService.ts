export interface SensorData {
  moisture: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soilTemp: number;
  soilPh: number;
  status: string;
}

export const getLatestSensorData = (): SensorData => {
  // Mocking latest data from the dashboard
  return {
    moisture: 42,
    nitrogen: 12,
    phosphorus: 8,
    potassium: 15,
    soilTemp: 22.4,
    soilPh: 6.8,
    status: "Optimal"
  };
};
