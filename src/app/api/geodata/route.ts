import { NextResponse } from 'next/server'
import { BALTIMORE_BBOX } from '@/lib/constants'
import { parseOverpassData, type OverpassResponse } from '@/lib/geo-utils'
import fs from 'fs'
import path from 'path'

const CACHE_PATH = path.join(process.cwd(), 'public', 'baltimore-geodata.json')

// Overpass QL query for Baltimore downtown area
function buildOverpassQuery(): string {
  const { south, west, north, east } = BALTIMORE_BBOX
  const bbox = `${south},${west},${north},${east}`

  return `
[out:json][bbox:${bbox}][timeout:120];
(
  way["building"];
  relation["building"]["type"="multipolygon"];
  way["natural"="water"];
  way["water"];
  way["waterway"="riverbank"];
  relation["natural"="water"]["type"="multipolygon"];
  relation["water"]["type"="multipolygon"];
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service)$"];
  way["leisure"~"^(park|garden)$"];
  way["landuse"="grass"];
);
out body;
>;
out skel qt;
`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const refresh = searchParams.get('refresh') === 'true'

  // Check for cached data
  if (!refresh && fs.existsSync(CACHE_PATH)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
      return NextResponse.json(cached)
    } catch {
      // Cache corrupted, continue to fetch
    }
  }

  try {
    const query = buildOverpassQuery()
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`)
    }

    const rawData: OverpassResponse = await response.json()
    const parsed = parseOverpassData(rawData)

    // Cache the processed data
    try {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(parsed))
    } catch (e) {
      console.warn('Could not write cache file:', e)
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Geodata fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch geodata from Overpass API' },
      { status: 500 }
    )
  }
}
