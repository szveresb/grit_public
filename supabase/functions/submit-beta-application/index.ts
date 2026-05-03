import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  let body: { email?: string; name?: string; locale?: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const name = (body.name ?? '').trim().slice(0, 120) || null
  const locale = body.locale === 'en' ? 'en' : 'hu'

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Insert waitlist row (idempotent on email)
  const { data: inserted, error: insertError } = await supabase
    .from('waitlist_emails')
    .insert({ email, name, locale, status: 'pending' })
    .select('id, created_at')
    .maybeSingle()

  let isNew = !!inserted
  if (insertError && insertError.code !== '23505') {
    console.error('waitlist insert failed', insertError)
    return new Response(JSON.stringify({ error: 'insert_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Fire-and-don't-fail emails. Reuse same row id when conflict.
  let rowId: string | null = inserted?.id ?? null
  let createdAt: string | null = inserted?.created_at ?? null
  if (!rowId) {
    const { data: existing } = await supabase
      .from('waitlist_emails').select('id, created_at').eq('email', email).maybeSingle()
    rowId = existing?.id ?? null
    createdAt = existing?.created_at ?? null
  }

  const sendKey = rowId ?? email

  const send = async (templateName: string, recipientEmail: string | undefined, templateData: Record<string, unknown>) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName,
        recipientEmail,
        idempotencyKey: `${templateName}-${sendKey}`,
        templateData,
      }),
    })
    if (!res.ok) console.error('send-transactional-email failed', templateName, res.status, await res.text())
  }

  if (isNew) {
    await Promise.all([
      send('beta-application-confirmation', email, { name, locale }),
      send('beta-application-admin-notice', undefined, {
        applicantEmail: email, applicantName: name, locale, createdAt: createdAt ?? new Date().toISOString(),
      }),
    ])
  }

  return new Response(JSON.stringify({ success: true, alreadyOnList: !isNew }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
