import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const {
      pairing_code,
      device_id,
      fcm_token,
      app_version,
      os_version,
      screen_resolution,
    } = await req.json()

    // Validate required fields
    if (!pairing_code || !device_id) {
      return new Response(
        JSON.stringify({ error: 'pairing_code and device_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { db: { schema: 'signage' } },
    )

    // Find screen with matching pairing code and pending status
    const { data: screen, error: findError } = await supabase
      .from('screens')
      .select('id, name, layout_template, orientation, created_at')
      .eq('pairing_code', pairing_code)
      .eq('status', 'pending')
      .maybeSingle()

    if (findError) {
      console.error('Error finding screen:', findError)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!screen) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired pairing code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check if pairing code has expired (10 minute window)
    const createdAt = new Date(screen.created_at).getTime()
    const now = Date.now()
    const tenMinutesMs = 10 * 60 * 1000

    if (now - createdAt > tenMinutesMs) {
      return new Response(
        JSON.stringify({ error: 'Pairing code has expired' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Update screen with device info and activate
    const { error: updateError } = await supabase
      .from('screens')
      .update({
        device_id,
        fcm_token: fcm_token ?? null,
        app_version: app_version ?? null,
        os_version: os_version ?? null,
        screen_resolution: screen_resolution ?? null,
        status: 'active',
        pairing_code: null,
      })
      .eq('id', screen.id)

    if (updateError) {
      console.error('Error updating screen:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to register device' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        screen_id: screen.id,
        name: screen.name,
        layout_template: screen.layout_template,
        orientation: screen.orientation,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
