import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const url = new URL(req.url)
    const screenId = url.searchParams.get('screen_id')

    if (!screenId) {
      return new Response(
        JSON.stringify({ error: 'screen_id query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { db: { schema: 'signage' } },
    )

    // 1. Get the screen
    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .select('*')
      .eq('id', screenId)
      .maybeSingle()

    if (screenError) {
      console.error('Error fetching screen:', screenError)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!screen) {
      return new Response(
        JSON.stringify({ error: 'Screen not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Determine active playlist based on schedules (all times in UTC)
    const now = new Date()
    const currentDay = now.getUTCDay() === 0 ? 7 : now.getUTCDay() // 1=Mon..7=Sun
    const h = String(now.getUTCHours()).padStart(2, '0')
    const m = String(now.getUTCMinutes()).padStart(2, '0')
    const s = String(now.getUTCSeconds()).padStart(2, '0')
    const currentTime = `${h}:${m}:${s}` // HH:MM:SS in UTC
    const currentDate = now.toISOString().slice(0, 10) // YYYY-MM-DD

    const { data: schedules, error: schedulesError } = await supabase
      .from('schedules')
      .select('*, playlists(*)')
      .eq('screen_id', screenId)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Filter schedules that match current time
    let activeSchedule = null
    let fallbackSchedule = null

    for (const schedule of schedules ?? []) {
      // Priority 0 schedules are fallbacks
      if (schedule.priority === 0) {
        if (!fallbackSchedule) fallbackSchedule = schedule
        continue
      }

      if (schedule.schedule_type === 'recurring') {
        // Check if current day is in days_of_week
        const daysMatch =
          !schedule.days_of_week ||
          schedule.days_of_week.length === 0 ||
          schedule.days_of_week.includes(currentDay)

        // Check if current time is within start_time and end_time
        const timeMatch =
          (!schedule.start_time || currentTime >= schedule.start_time) &&
          (!schedule.end_time || currentTime <= schedule.end_time)

        if (daysMatch && timeMatch) {
          activeSchedule = schedule
          break // Already sorted by priority DESC, first match wins
        }
      } else if (schedule.schedule_type === 'one_time') {
        // Check date range
        const dateMatch =
          (!schedule.start_date || currentDate >= schedule.start_date) &&
          (!schedule.end_date || currentDate <= schedule.end_date)

        // Check time within the date range
        const timeMatch =
          (!schedule.start_time || currentTime >= schedule.start_time) &&
          (!schedule.end_time || currentTime <= schedule.end_time)

        if (dateMatch && timeMatch) {
          activeSchedule = schedule
          break
        }
      }
    }

    // Use fallback if no active schedule found
    const resolvedSchedule = activeSchedule ?? fallbackSchedule

    // 3. Resolve playlist ID with fallback cascade:
    //    Schedule → Layout Zones (main zone) → Screen default_playlist_id
    let resolvedPlaylistId: string | null = resolvedSchedule?.playlist_id ?? null
    let resolvedPlaylistName: string | null = resolvedSchedule?.playlists?.name ?? null

    // Fallback: check layout zones for a playlist assignment
    if (!resolvedPlaylistId) {
      const { data: zones } = await supabase
        .from('layout_zones')
        .select('playlist_id')
        .eq('screen_id', screenId)
        .not('playlist_id', 'is', null)
        .order('z_index', { ascending: true })
        .limit(1)

      if (zones && zones.length > 0 && zones[0].playlist_id) {
        resolvedPlaylistId = zones[0].playlist_id
        // Fetch playlist name
        const { data: pl } = await supabase
          .from('playlists')
          .select('name')
          .eq('id', resolvedPlaylistId)
          .maybeSingle()
        resolvedPlaylistName = pl?.name ?? null
      }
    }

    // Fallback: check screen's default_playlist_id
    if (!resolvedPlaylistId && screen.default_playlist_id) {
      resolvedPlaylistId = screen.default_playlist_id
      const { data: pl } = await supabase
        .from('playlists')
        .select('name')
        .eq('id', resolvedPlaylistId)
        .maybeSingle()
      resolvedPlaylistName = pl?.name ?? null
    }

    // 4. Get playlist items with media details
    let playlistData = null
    if (resolvedPlaylistId) {
      const { data: playlistItems, error: itemsError } = await supabase
        .from('playlist_items')
        .select('*, media_items(*)')
        .eq('playlist_id', resolvedPlaylistId)
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true })

      if (itemsError) {
        console.error('Error fetching playlist items:', itemsError)
      }

      // Build signed URLs for media files
      const supabaseStorage = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )

      const items = []
      for (const item of playlistItems ?? []) {
        const media = item.media_items
        if (!media) continue

        const { data: signedUrlData } = await supabaseStorage.storage
          .from('signage-media')
          .createSignedUrl(media.file_path, 3600)

        items.push({
          media_id: media.id,
          file_url: signedUrlData?.signedUrl ?? null,
          file_type: media.file_type,
          display_duration: item.display_duration_seconds,
          sort_order: item.sort_order,
        })
      }

      playlistData = {
        id: resolvedPlaylistId,
        name: resolvedPlaylistName,
        items,
      }
    }

    // 5. Get active announcements for this screen
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now.toISOString())
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)

    if (announcementsError) {
      console.error('Error fetching announcements:', announcementsError)
    }

    // Filter announcements: target_screens contains screen_id OR is NULL/empty
    const filteredAnnouncements = (announcements ?? []).filter((a) => {
      if (!a.target_screens || a.target_screens.length === 0) return true
      return a.target_screens.includes(screenId)
    })

    // 6. Get layout zones for this screen (for response — already queried above for fallback)
    const { data: layoutZones, error: zonesError } = await supabase
      .from('layout_zones')
      .select('*')
      .eq('screen_id', screenId)
      .order('z_index', { ascending: true })

    if (zonesError) {
      console.error('Error fetching layout zones:', zonesError)
    }

    // 7. Get latest content version number for this screen
    const { data: latestVersion } = await supabase
      .from('content_versions')
      .select('version_number')
      .eq('screen_id', screenId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const contentVersion = latestVersion?.version_number ?? 0

    // 8. Generate manifest hash
    const manifestContent = JSON.stringify({
      playlist: playlistData,
      announcements: filteredAnnouncements,
      layout_zones: layoutZones ?? [],
    })

    const encoder = new TextEncoder()
    const data = encoder.encode(manifestContent)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const manifestHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    // Update screen's last_sync_at and content_manifest_hash
    await supabase
      .from('screens')
      .update({
        last_sync_at: now.toISOString(),
        content_manifest_hash: manifestHash,
      })
      .eq('id', screenId)

    // 9. Return manifest
    return new Response(
      JSON.stringify({
        playlist: playlistData,
        announcements: filteredAnnouncements,
        layout_zones: layoutZones ?? [],
        manifest_hash: manifestHash,
        content_version: contentVersion,
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
