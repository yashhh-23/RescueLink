import { Router, Request, Response } from 'express';

export const telemetryRouter = Router();

// GET /api/sensors - Environmental Telemetry Sensors
telemetryRouter.get('/sensors', (req: Request, res: Response): void => {
  const sensors = [
    {
      id: 'sensor-1',
      label: 'River Gauge #4 (High Water)',
      kind: 'water_level',
      type: 'water_level',
      value: 8.4,
      unit: 'm',
      thresholdPercent: 93,
      percentOfThreshold: 93,
      status: 'watch',
      location: { lat: 37.775, lng: -122.418 },
      updatedAt: Date.now() - 120000,
    },
    {
      id: 'sensor-2',
      label: 'Seismic Station Bravo',
      kind: 'seismic',
      type: 'seismic',
      value: 4.2,
      unit: 'M',
      thresholdPercent: 84,
      percentOfThreshold: 84,
      status: 'normal',
      location: { lat: 37.78, lng: -122.422 },
      updatedAt: Date.now() - 300000,
    },
    {
      id: 'sensor-3',
      label: 'Fire Perimeter Thermal Array',
      kind: 'fire_perimeter',
      type: 'fire_perimeter',
      value: 340,
      unit: '°C',
      thresholdPercent: 113,
      percentOfThreshold: 113,
      status: 'critical',
      location: { lat: 37.768, lng: -122.412 },
      updatedAt: Date.now() - 45000,
    },
  ];

  res.status(200).json(sensors);
});

// GET /api/hazard-zones - Active Disaster Hazard Zones
telemetryRouter.get('/hazard-zones', (req: Request, res: Response): void => {
  const hazardZones = [
    {
      id: 'zone-flood-north',
      label: 'North River Basin Inundation Zone',
      name: 'North River Basin Inundation Zone',
      kind: 'flood',
      hazardType: 'flood',
      severity: 'warning',
      center: { lat: 37.7749, lng: -122.4194 },
      radiusMeters: 1500,
      description: 'Active flash flooding and rising water levels.',
    },
    {
      id: 'zone-landslide-east',
      label: 'East Ridge Soil Debris Risk Zone',
      name: 'East Ridge Soil Debris Risk Zone',
      kind: 'landslide',
      hazardType: 'landslide',
      severity: 'critical',
      center: { lat: 37.782, lng: -122.405 },
      radiusMeters: 800,
      description: 'Slope instability and debris flow warning.',
    },
  ];

  res.status(200).json(hazardZones);
});
