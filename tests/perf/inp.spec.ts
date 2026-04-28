import { test, type Browser, type Page } from '@playwright/test'
import fs from 'node:fs/promises'

type ScenarioName = 'events_on' | 'events_off'

interface ScenarioResult {
  run: number
  warmup: boolean
  scenario: ScenarioName
  status: 'ok' | 'partial' | 'failed'
  eventTimingMaxMs: number
  longTaskCount: number
  longTaskTotalMs: number
  markerCount: number
  samples: number[]
  error?: string
  completedSteps: string[]
}

interface PerfMetrics {
  maxEvent: number
  eventDurations: number[]
  longTaskCount: number
  longTaskTotal: number
}

interface MetricStats {
  count: number
  p50: number
  p95: number
  p99: number
  mean: number
  stdev: number
  ci95Low: number
  ci95High: number
}

function toFixed2(value: number): number {
  return Number(value.toFixed(2))
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function filterOutliersIqr(values: number[]): number[] {
  if (values.length < 4) return values
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = percentile(sorted, 25)
  const q3 = percentile(sorted, 75)
  const iqr = q3 - q1
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return sorted.filter((v) => v >= lower && v <= upper)
}

function metricStats(values: number[]): MetricStats {
  const m = mean(values)
  const sd = stdev(values)
  const n = values.length
  const ci = n > 0 ? 1.96 * (sd / Math.sqrt(n)) : 0
  return {
    count: n,
    p50: toFixed2(percentile(values, 50)),
    p95: toFixed2(percentile(values, 95)),
    p99: toFixed2(percentile(values, 99)),
    mean: toFixed2(m),
    stdev: toFixed2(sd),
    ci95Low: toFixed2(m - ci),
    ci95High: toFixed2(m + ci),
  }
}

async function runStep<T>(
  run: number,
  scenario: ScenarioName,
  stepName: string,
  timeoutMs: number,
  completedSteps: string[],
  work: () => Promise<T>
): Promise<T> {
  const started = Date.now()
  console.log(`[perf][run:${run}][${scenario}] START ${stepName}`)

  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error(`Step timeout after ${timeoutMs}ms: ${stepName}`))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([work(), timeout])
    const elapsed = Date.now() - started
    completedSteps.push(stepName)
    console.log(`[perf][run:${run}][${scenario}] DONE ${stepName} (${elapsed}ms)`)
    return result as T
  } catch (error) {
    const elapsed = Date.now() - started
    console.log(`[perf][run:${run}][${scenario}] FAIL ${stepName} (${elapsed}ms)`)
    throw error
  }
}

async function readMetrics(page: Page): Promise<PerfMetrics> {
  return page.evaluate(() => {
    const perfWindow = window as unknown as {
      __perf?: { eventDurations: number[]; longTasks: number[] }
    }
    const eventDurations = perfWindow.__perf?.eventDurations ?? []
    const longTasks = perfWindow.__perf?.longTasks ?? []
    const maxEvent = eventDurations.length ? Math.max(...eventDurations) : 0
    const longTaskTotal = longTasks.reduce((sum, value) => sum + value, 0)

    return {
      maxEvent,
      eventDurations,
      longTaskCount: longTasks.length,
      longTaskTotal,
    }
  })
}

async function runScenario(
  browser: Browser,
  baseURL: string,
  run: number,
  warmup: boolean,
  scenario: { name: ScenarioName; path: string }
): Promise<ScenarioResult> {
  const completedSteps: string[] = []
  let status: ScenarioResult['status'] = 'ok'
  let errorMessage: string | undefined
  let markerCountValue = 0

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    await runStep(run, scenario.name, 'init-script', 5_000, completedSteps, async () => {
      await page.addInitScript(() => {
        ;(window as unknown as {
          __perf: {
            eventDurations: number[]
            longTasks: number[]
          }
        }).__perf = { eventDurations: [], longTasks: [] }
      })
    })

    await runStep(run, scenario.name, 'navigate', 120_000, completedSteps, async () => {
      await page.goto(`${baseURL}${scenario.path}`, { waitUntil: 'domcontentloaded' })
    })

    await runStep(run, scenario.name, 'wait-for-scene', 120_000, completedSteps, async () => {
      const loadState = await Promise.race([
        page.waitForSelector('.cesium-widget canvas', { timeout: 120_000 }).then(() => 'canvas' as const),
        page.getByText('Failed to launch').waitFor({ timeout: 120_000 }).then(() => 'error' as const),
      ])
      if (loadState === 'error') {
        throw new Error('Cesium scene failed to launch in automated run.')
      }
    })

    await runStep(run, scenario.name, 'attach-observers', 15_000, completedSteps, async () => {
      await page.evaluate(() => {
        const perfWindow = window as unknown as {
          __perf: { eventDurations: number[]; longTasks: number[] }
          PerformanceObserver: typeof PerformanceObserver
        }

        const eventObserver = new perfWindow.PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            const entry = e as PerformanceEventTiming
            if (entry.interactionId && entry.duration > 0) {
              perfWindow.__perf.eventDurations.push(entry.duration)
            }
          }
        })

        try {
          eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 })
        } catch {
          // Event Timing API may be unavailable.
        }

        const longTaskObserver = new perfWindow.PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            perfWindow.__perf.longTasks.push(e.duration)
          }
        })

        try {
          longTaskObserver.observe({ type: 'longtask', buffered: true })
        } catch {
          // Long Task API may be unavailable.
        }
      })
    })

    await runStep(run, scenario.name, 'settle-scene', 12_000, completedSteps, async () => {
      await page.waitForTimeout(1800)
    })

    const box = await runStep(run, scenario.name, 'get-canvas-bounds', 30_000, completedSteps, async () => {
      const canvas = page.locator('.cesium-widget canvas').first()
      await canvas.waitFor({ state: 'visible', timeout: 30_000 })
      const value = await canvas.boundingBox()
      if (!value) throw new Error('Canvas bounding box unavailable')
      return value
    })

    const cx = box.x + box.width * 0.55
    const cy = box.y + box.height * 0.52

    await runStep(run, scenario.name, 'interaction-sequence', 35_000, completedSteps, async () => {
      await page.mouse.move(cx, cy)
      await page.waitForTimeout(120)

      await page.mouse.down()
      await page.mouse.move(cx + 120, cy + 24, { steps: 6 })
      await page.mouse.move(cx - 72, cy - 14, { steps: 4 })
      await page.mouse.up()

      await page.mouse.wheel(0, 380)
      await page.mouse.wheel(0, -280)
      await page.waitForTimeout(450)
    })

    await runStep(run, scenario.name, 'read-marker-count', 10_000, completedSteps, async () => {
      const markerCount = await page.getByText('EVENTS').locator('..').locator('span').last().textContent()
      markerCountValue = Number(markerCount || '0')
    })
  } catch (error) {
    status = completedSteps.length > 0 ? 'partial' : 'failed'
    errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`[perf][run:${run}][${scenario.name}] Scenario ended early: ${errorMessage}`)
  }

  let metrics: PerfMetrics = {
    maxEvent: 0,
    eventDurations: [],
    longTaskCount: 0,
    longTaskTotal: 0,
  }

  try {
    metrics = await runStep(run, scenario.name, 'capture-metrics', 10_000, completedSteps, async () => readMetrics(page))
  } catch (error) {
    const metricError = error instanceof Error ? error.message : String(error)
    errorMessage = errorMessage ? `${errorMessage}; metrics: ${metricError}` : `metrics: ${metricError}`
    if (status === 'ok') status = 'partial'
  }

  await context.close()

  return {
    run,
    warmup,
    scenario: scenario.name,
    status,
    eventTimingMaxMs: toFixed2(metrics.maxEvent),
    longTaskCount: metrics.longTaskCount,
    longTaskTotalMs: toFixed2(metrics.longTaskTotal),
    markerCount: markerCountValue,
    samples: metrics.eventDurations.map((v) => toFixed2(v)),
    error: errorMessage,
    completedSteps,
  }
}

test('measure interaction latency with and without event markers', async ({ browser, baseURL }) => {
  const warmupRuns = Number(process.env.PERF_WARMUP_RUNS ?? '1')
  const measuredRuns = Number(process.env.PERF_MEASURED_RUNS ?? process.env.PERF_RUNS ?? '5')
  const totalRuns = warmupRuns + measuredRuns
  const failP95Ms = Number(process.env.PERF_FAIL_P95_MS ?? '300')
  const useOutlierFilter = (process.env.PERF_FILTER_OUTLIERS ?? '1') !== '0'

  const baseScenarios: Array<{ name: ScenarioName; path: string }> = [
    { name: 'events_on', path: '/play' },
    { name: 'events_off', path: '/play?events=off' },
  ]

  const results: ScenarioResult[] = []

  for (let run = 1; run <= totalRuns; run++) {
    const scenarios = run % 2 === 0 ? [...baseScenarios].reverse() : baseScenarios
    for (const scenario of scenarios) {
      results.push(await runScenario(browser, baseURL!, run, run <= warmupRuns, scenario))
    }
  }

  const measured = results.filter((r) => !r.warmup)

  const scenarioValues = (scenario: ScenarioName, key: 'eventTimingMaxMs' | 'longTaskTotalMs') => {
    const vals = measured
      .filter((r) => r.scenario === scenario && r.status === 'ok')
      .map((r) => r[key])
    return useOutlierFilter ? filterOutliersIqr(vals) : vals
  }

  const onEvents = scenarioValues('events_on', 'eventTimingMaxMs')
  const offEvents = scenarioValues('events_off', 'eventTimingMaxMs')
  const onLong = scenarioValues('events_on', 'longTaskTotalMs')
  const offLong = scenarioValues('events_off', 'longTaskTotalMs')

  const aggregates = {
    events_on: {
      runs: measured.filter((r) => r.scenario === 'events_on').length,
      okRuns: measured.filter((r) => r.scenario === 'events_on' && r.status === 'ok').length,
      eventTimingMaxMs: metricStats(onEvents),
      longTaskTotalMs: metricStats(onLong),
    },
    events_off: {
      runs: measured.filter((r) => r.scenario === 'events_off').length,
      okRuns: measured.filter((r) => r.scenario === 'events_off' && r.status === 'ok').length,
      eventTimingMaxMs: metricStats(offEvents),
      longTaskTotalMs: metricStats(offLong),
    },
  }

  const deltaP95 = toFixed2(aggregates.events_on.eventTimingMaxMs.p95 - aggregates.events_off.eventTimingMaxMs.p95)
  const deltaP50 = toFixed2(aggregates.events_on.eventTimingMaxMs.p50 - aggregates.events_off.eventTimingMaxMs.p50)

  const summary = {
    timestamp: new Date().toISOString(),
    baseURL,
    config: {
      warmupRuns,
      measuredRuns,
      totalRuns,
      failP95Ms,
      outlierFilter: useOutlierFilter,
    },
    results,
    measuredResults: measured,
    aggregates: {
      ...aggregates,
      deltaEventTimingP95Ms: deltaP95,
      deltaEventTimingP50Ms: deltaP50,
    },
    complete: measured.every((r) => r.status === 'ok'),
    pass: aggregates.events_on.eventTimingMaxMs.p95 <= failP95Ms,
  }

  await fs.mkdir('perf-results', { recursive: true })
  await fs.writeFile('perf-results/inp-comparison.json', JSON.stringify(summary, null, 2))

  console.log('\n=== Perf Summary ===')
  console.log(JSON.stringify(summary, null, 2))

  if (!summary.pass) {
    throw new Error(`Performance gate failed: events_on p95 ${aggregates.events_on.eventTimingMaxMs.p95}ms > threshold ${failP95Ms}ms`)
  }
})
