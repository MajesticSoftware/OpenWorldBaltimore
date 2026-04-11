// Baltimore Inner Harbor center coordinates
export const BALTIMORE_CENTER = {
  lat: 39.2856,
  lng: -76.6122,
}

// Bounding box for downtown Baltimore / Inner Harbor area (~2km²)
export const BALTIMORE_BBOX = {
  south: 39.2750,
  west: -76.6250,
  north: 39.2980,
  east: -76.5950,
}

// Conversion: 1 degree latitude ≈ 111,320 meters
// At Baltimore's latitude, 1 degree longitude ≈ 85,390 meters
export const LAT_TO_METERS = 111320
export const LNG_TO_METERS = 85390

// Default building height in meters when no data available
export const DEFAULT_BUILDING_HEIGHT = 10

// Meters per building level
export const METERS_PER_LEVEL = 3.5

// Scale factor: 1 Three.js unit = 1 meter
export const SCALE = 1

// Known Baltimore landmarks with approximate heights (meters)
export const LANDMARKS: Record<string, number> = {
  'Transamerica Tower': 161,
  'World Trade Center': 123,
  '100 East Pratt Street': 118,
  'Legg Mason Tower': 99,
  'Bank of America Building': 155,
  '250 West Pratt Street': 161,
  'Commerce Place': 137,
}

// Vehicle modes
export type VehicleMode = 'spaceship' | 'car' | 'plane' | 'on-foot'

// Spaceship control settings
export const SPACESHIP_SETTINGS = {
  movementSpeed: 200,
  rollSpeed: Math.PI / 6,
  maxSpeed: 500,
  acceleration: 50,
}
