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
    const { command_id, status, result } = await req.json()

    // Validate required fields
    if (!command_id || !status) {
      return new Response(
        JSON.stringify({ error: 'command_id and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!['completed', 'failed'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'status must be "completed" or "failed"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { db: { schema: 'signage' } },
    )

    // Update the command with result
    const { error: updateError } = await supabase
      .from('device_commands')
      .update({
        status,
        result: result ?? null,
        executed_at: new Date().toISOString(),
      })
      .eq('id', command_id)

    if (updateError) {
      console.error('Error updating command:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update command' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ ok: true }),
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
