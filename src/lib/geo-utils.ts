import { BALTIMORE_CENTER, LAT_TO_METERS, LNG_TO_METERS, DEFAULT_BUILDING_HEIGHT, METERS_PER_LEVEL } from './constants'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface LocalPoint {
  x: number
  z: number
}

export interface BuildingData {
  id: string
  outline: LocalPoint[]
  holes: LocalPoint[][]
  height: number
  type: string
}

export interface WaterData {
  id: string
  outline: LocalPoint[]
  holes: LocalPoint[][]
}

export interface RoadData {
  id: string
  points: LocalPoint[]
  width: number
  type: string
}

export interface ParkData {
  id: string
  outline: LocalPoint[]
}

export interface BaltimoreGeoData {
  buildings: BuildingData[]
  water: WaterData[]
  roads: RoadData[]
  parks: ParkData[]
  center: GeoPoint
}

// Convert lat/lng to local coordinate space (meters from center)
export function geoToLocal(point: GeoPoint, center: GeoPoint = BALTIMORE_CENTER): LocalPoint {
  return {
    x: (point.lng - center.lng) * LNG_TO_METERS,
    z: -(point.lat - center.lat) * LAT_TO_METERS, // Negate Z because Three.js Z is south
  }
}

// Get building height from OSM tags
export function getBuildingHeight(tags: Record<string, string>): number {
  if (tags.height) {
    const h = parseFloat(tags.height)
    if (!isNaN(h)) return h
  }
  if (tags['building:levels']) {
    const levels = parseInt(tags['building:levels'])
    if (!isNaN(levels)) return levels * METERS_PER_LEVEL
  }
  // Estimate by building type
  const typeHeights: Record<string, number> = {
    'skyscraper': 120,
    'commercial': 30,
    'office': 40,
    'industrial': 12,
    'residential': 10,
    'house': 8,
    'apartments': 20,
    'retail': 8,
    'church': 20,
    'cathedral': 40,
    'hospital': 25,
    'school': 12,
    'university': 15,
    'hotel': 30,
    'warehouse': 10,
    'garage': 6,
    'yes': DEFAULT_BUILDING_HEIGHT,
  }
  const bType = tags.building || 'yes'
  return typeHeights[bType] || DEFAULT_BUILDING_HEIGHT
}

// Get road width from OSM tags
export function getRoadWidth(tags: Record<string, string>): number {
  if (tags.width) {
    const w = parseFloat(tags.width)
    if (!isNaN(w)) return w
  }
  const typeWidths: Record<string, number> = {
    'motorway': 14,
    'trunk': 12,
    'primary': 10,
    'secondary': 8,
    'tertiary': 7,
    'residential': 6,
    'service': 4,
    'footway': 2,
    'cycleway': 2,
    'path': 1.5,
  }
  return typeWidths[tags.highway] || 6
}

// Parse Overpass API JSON response into our data structures
export function parseOverpassData(data: OverpassResponse): BaltimoreGeoData {
  const nodeMap = new Map<number, GeoPoint>()
  const buildings: BuildingData[] = []
  const water: WaterData[] = []
  const roads: RoadData[] = []
  const parks: ParkData[] = []

  // Index all nodes
  for (const el of data.elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodeMap.set(el.id, { lat: el.lat, lng: el.lon })
    }
  }

  // Process ways
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.nodes || !el.tags) continue

    const coords = el.nodes
      .map((nid: number) => nodeMap.get(nid))
      .filter((p): p is GeoPoint => p !== undefined)

    if (coords.length < 3) continue

    const localCoords = coords.map((c) => geoToLocal(c))

    if (el.tags.building) {
      buildings.push({
        id: `b-${el.id}`,
        outline: localCoords,
        holes: [],
        height: getBuildingHeight(el.tags),
        type: el.tags.building,
      })
    } else if (
      el.tags.natural === 'water' ||
      el.tags.water ||
      el.tags.waterway === 'riverbank' ||
      el.tags.natural === 'coastline'
    ) {
      water.push({
        id: `w-${el.id}`,
        outline: localCoords,
        holes: [],
      })
    } else if (el.tags.highway) {
      roads.push({
        id: `r-${el.id}`,
        points: localCoords,
        width: getRoadWidth(el.tags),
        type: el.tags.highway,
      })
    } else if (
      el.tags.leisure === 'park' ||
      el.tags.leisure === 'garden' ||
      el.tags.landuse === 'grass'
    ) {
      parks.push({
        id: `p-${el.id}`,
        outline: localCoords,
      })
    }
  }

  // Process relations (multipolygons for complex buildings/water)
  for (const el of data.elements) {
    if (el.type !== 'relation' || !el.tags || !el.members) continue

    if (el.tags.building || el.tags.type === 'multipolygon') {
      const outerWays: LocalPoint[][] = []
      const innerWays: LocalPoint[][] = []

      for (const member of el.members) {
        if (member.type !== 'way') continue
        const way = data.elements.find(
          (e) => e.type === 'way' && e.id === member.ref
        )
        if (!way || !way.nodes) continue

        const coords = way.nodes
          .map((nid: number) => nodeMap.get(nid))
          .filter((p): p is GeoPoint => p !== undefined)
          .map((c) => geoToLocal(c))

        if (coords.length < 3) continue

        if (member.role === 'outer') {
          outerWays.push(coords)
        } else if (member.role === 'inner') {
          innerWays.push(coords)
        }
      }

      for (const outline of outerWays) {
        if (el.tags.building) {
          buildings.push({
            id: `b-rel-${el.id}`,
            outline,
            holes: innerWays,
            height: getBuildingHeight(el.tags),
            type: el.tags.building,
          })
        } else if (
          el.tags.natural === 'water' ||
          el.tags.water
        ) {
          water.push({
            id: `w-rel-${el.id}`,
            outline,
            holes: innerWays,
          })
        }
      }
    }
  }

  return {
    buildings,
    water,
    roads,
    parks,
    center: BALTIMORE_CENTER,
  }
}

// Types for Overpass API response
export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  tags?: Record<string, string>
  members?: Array<{
    type: string
    ref: number
    role: string
  }>
}

export interface OverpassResponse {
  elements: OverpassElement[]
}
