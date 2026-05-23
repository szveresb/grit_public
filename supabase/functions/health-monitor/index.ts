import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const TARGETS = [
  'https://grit.hu',
  'https://www.grit.hu',
  'https://grit-hu.lovable.app',
]

const FETCH_TIMEOUT_MS = 10_000

interface TargetResult {
  target: string
  status: 'ok' | 'down'
  httpStatus: number | null
  latencyMs: number
  error: string | null
}

async function checkTarget(url: string): Promise<TargetResult> {
  const start = Date.now()
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    // Use GET (some CDNs reject HEAD); follow redirects.
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'grit-hu-health-monitor/1.0' },
    })
    const latencyMs = Date.now() - start
    const ok = res.status >= 200 && res.status < 400
    // drain body to free socket
    try { await res.body?.cancel() } catch { /* ignore */ }
    return {
      target: url,
      status: ok ? 'ok' : 'down',
      httpStatus: res.status,
      latencyMs,
      error: ok ? null : `HTTP ${res.status}`,
    }
  } catch (e) {
    return {
      target: url,
      status: 'down',
      httpStatus: null,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    }
  } finally {
    clearTimeout(t)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Run all checks in parallel
  const results = await Promise.all(TARGETS.map(checkTarget))

  // DB ping
  const dbStart = Date.now()
  const { error: dbErr } = await supabase
    .from('monitor_state').select('id').limit(1)
  results.push({
    target: 'database',
    status: dbErr ? 'down' : 'ok',
    httpStatus: null,
    latencyMs: Date.now() - dbStart,
    error: dbErr?.message ?? null,
  })

  // Log every check to history
  await supabase.from('monitor_checks').insert(
    results.map((r) => ({
      target: r.target,
      status: r.status,
      latency_ms: r.latencyMs,
      http_status: r.httpStatus,
      error_message: r.error,
    }))
  )

  const failed = results.filter((r) => r.status === 'down')
  const overallStatus: 'ok' | 'down' = failed.length > 0 ? 'down' : 'ok'

  // Read current state
  const { data: stateRow } = await supabase
    .from('monitor_state').select('*').eq('id', 1).single()

  const prevStatus = stateRow?.last_status ?? 'ok'
  const prevStatusAt = stateRow?.last_status_at ?? new Date().toISOString()
  const prevConsecutive = stateRow?.consecutive_failures ?? 0

  const nowIso = new Date().toISOString()
  const newConsecutive = overallStatus === 'down' ? prevConsecutive + 1 : 0
  const transitioned = prevStatus !== overallStatus

  // Update state
  await supabase.from('monitor_state').update({
    last_status: overallStatus,
    last_status_at: transitioned ? nowIso : prevStatusAt,
    last_failure_reason: overallStatus === 'down'
      ? failed.map((f) => `${f.target}: ${f.error}`).join('; ')
      : null,
    consecutive_failures: newConsecutive,
    updated_at: nowIso,
  }).eq('id', 1)

  // Alert on transition only
  if (transitioned) {
    if (overallStatus === 'down') {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'uptime-alert',
          idempotencyKey: `uptime-down-${nowIso}`,
          templateData: {
            failedTargets: failed.map((f) => ({
              target: f.target,
              error: f.error ?? 'unknown',
              httpStatus: f.httpStatus,
            })),
            consecutiveFailures: newConsecutive,
            detectedAt: nowIso,
          },
        },
      })
    } else {
      const downtimeMs = Date.now() - new Date(prevStatusAt).getTime()
      const downtimeMinutes = Math.max(1, Math.round(downtimeMs / 60_000))
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'uptime-recovered',
          idempotencyKey: `uptime-up-${nowIso}`,
          templateData: {
            downtimeMinutes,
            downSince: prevStatusAt,
            recoveredAt: nowIso,
          },
        },
      })
    }
  }

  return new Response(
    JSON.stringify({
      overallStatus,
      transitioned,
      consecutiveFailures: newConsecutive,
      results,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
