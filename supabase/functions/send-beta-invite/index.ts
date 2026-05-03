import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userData.user.id)
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === 'admin')
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { waitlistId?: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const waitlistId = body.waitlistId
  if (!waitlistId) {
    return new Response(JSON.stringify({ error: 'waitlistId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: row, error: rowErr } = await admin
    .from('waitlist_emails')
    .select('id, email, name, locale, status, invite_code_id')
    .eq('id', waitlistId)
    .maybeSingle()
  if (rowErr || !row) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Reuse existing code if present, else generate one
  let code: string | null = null
  let codeId: string | null = row.invite_code_id ?? null
  if (codeId) {
    const { data: existing } = await admin.from('invite_codes').select('code').eq('id', codeId).maybeSingle()
    code = existing?.code ?? null
  }
  if (!code) {
    code = 'BETA-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: created, error: codeErr } = await admin
      .from('invite_codes')
      .insert({ code, created_by: userData.user.id })
      .select('id')
      .single()
    if (codeErr || !created) {
      console.error('invite code insert failed', codeErr)
      return new Response(JSON.stringify({ error: 'code_create_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    codeId = created.id
  }

  // Send the email
  const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      templateName: 'beta-invite-code',
      recipientEmail: row.email,
      idempotencyKey: `beta-invite-${row.id}-${codeId}`,
      templateData: { name: row.name ?? undefined, code, locale: row.locale === 'en' ? 'en' : 'hu' },
    }),
  })
  if (!sendRes.ok) {
    const text = await sendRes.text()
    console.error('send failed', sendRes.status, text)
    return new Response(JSON.stringify({ error: 'send_failed', detail: text }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  await admin.from('waitlist_emails').update({
    status: 'invited',
    invited_at: new Date().toISOString(),
    invite_code_id: codeId,
  }).eq('id', waitlistId)

  return new Response(JSON.stringify({ success: true, code }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
