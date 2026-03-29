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
      screen_id,
      wifi_signal_dbm,
      free_storage_mb,
      total_storage_mb,
      current_playlist,
      current_media_item,
      cpu_temp_celsius,
      uptime_seconds,
      app_version,
    } = await req.json()

    // Validate required field
    if (!screen_id) {
      return new Response(
        JSON.stringify({ error: 'screen_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { db: { schema: 'signage' } },
    )

    // 1. Insert heartbeat record
    const { error: insertError } = await supabase
      .from('device_heartbeats')
      .insert({
        screen_id,
        wifi_signal_dbm: wifi_signal_dbm ?? null,
        free_storage_mb: free_storage_mb ?? null,
        total_storage_mb: total_storage_mb ?? null,
        current_playlist: current_playlist ?? null,
        current_media_item: current_media_item ?? null,
        cpu_temp_celsius: cpu_temp_celsius ?? null,
        uptime_seconds: uptime_seconds ?? null,
        app_version: app_version ?? null,
      })

    if (insertError) {
      console.error('Error inserting heartbeat:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to record heartbeat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Update screen status
    const updateFields: Record<string, unknown> = {
      last_heartbeat_at: new Date().toISOString(),
      is_online: true,
    }
    if (app_version) {
      updateFields.app_version = app_version
    }

    const { error: updateError } = await supabase
      .from('screens')
      .update(updateFields)
      .eq('id', screen_id)

    if (updateError) {
      console.error('Error updating screen:', updateError)
    }

    // 3. Get pending commands for this screen
    const { data: commands, error: commandsError } = await supabase
      .from('device_commands')
      .select('*')
      .eq('screen_id', screen_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (commandsError) {
      console.error('Error fetching commands:', commandsError)
    }

    // Mark claimed commands as 'executing' to prevent duplicate delivery
    if (commands && commands.length > 0) {
      const commandIds = commands.map((c: { id: string }) => c.id)
      await supabase
        .from('device_commands')
        .update({ status: 'executing' })
        .in('id', commandIds)
    }

    return new Response(
      JSON.stringify({ commands: commands ?? [] }),
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
