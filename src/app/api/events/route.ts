import { NextResponse } from 'next/server'

const REVALIDATE_SECONDS = 900
const EVENTS_URL = 'https://codecollective.us/baltimore/upcoming_events.json'

type CacheEntry = {
  data: unknown
  expiresAt: number
}

let eventsCache: CacheEntry | null = null

export async function GET() {
  const now = Date.now()
  if (eventsCache && now < eventsCache.expiresAt) {
    return NextResponse.json(eventsCache.data, {
      headers: {
        'Cache-Control': `public, max-age=${REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
        'X-Events-Cache': 'HIT',
      },
    })
  }

  try {
    const response = await fetch(EVENTS_URL, { cache: 'no-store' })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Events upstream error: ${response.status}` },
        {
          status: 502,
          headers: {
            'Cache-Control': `public, max-age=60, stale-while-revalidate=300`,
            'X-Events-Cache': 'MISS_UPSTREAM_ERROR',
          },
        }
      )
    }

    const data = await response.json()
    eventsCache = {
      data,
      expiresAt: now + REVALIDATE_SECONDS * 1000,
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, max-age=${REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
        'X-Events-Cache': 'MISS_REFRESH',
      },
    })
  } catch {
    if (eventsCache) {
      return NextResponse.json(eventsCache.data, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
          'X-Events-Cache': 'STALE_FALLBACK',
        },
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch events' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Events-Cache': 'MISS_FAILURE',
        },
      }
    )
  }
}
