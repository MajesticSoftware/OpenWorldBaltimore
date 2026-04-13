import { NextResponse } from 'next/server'
import { BALTIMORE_BBOX } from '@/lib/constants'
import { parseOverpassData, type OverpassResponse } from '@/lib/geo-utils'

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

  // In production (Vercel) the pre-baked /public/baltimore-geodata.json is served
  // directly as a static asset — clients should fetch /baltimore-geodata.json instead.
  // This route is only used when ?refresh=true to pull fresh data from Overpass.
  // fs.writeFileSync is intentionally omitted: Vercel's filesystem is read-only at runtime.
  if (!refresh) {
    return NextResponse.json(
      { error: 'Use the static asset /baltimore-geodata.json for reads. Pass ?refresh=true to re-fetch from Overpass (dev only).' },
      { status: 400 }
    )
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
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Geodata fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch geodata from Overpass API' },
      { status: 500 }
    )
  }
}
