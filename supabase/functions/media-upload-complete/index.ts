/**
 * media-upload-complete
 *
 * Called by the client after a TUS/direct upload finishes.
 * Updates the media_items row with the final sha256_hash and
 * bumps content_versions for any screens whose active playlist
 * already contains this media item.
 *
 * Body: { media_item_id: string, sha256_hash?: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } =
      await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { media_item_id, sha256_hash } = body as {
      media_item_id: string;
      sha256_hash?: string;
    };

    if (!media_item_id || typeof media_item_id !== "string") {
      return new Response(JSON.stringify({ error: "media_item_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Optionally update sha256_hash if provided
    if (sha256_hash) {
      const { error: updateError } = await adminClient
        .schema("signage")
        .from("media_items")
        .update({ sha256_hash })
        .eq("id", media_item_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Find playlists that contain this media item
    const { data: playlistItems, error: piError } = await adminClient
      .schema("signage")
      .from("playlist_items")
      .select("playlist_id")
      .eq("media_item_id", media_item_id);

    if (piError) throw piError;

    const playlistIds = (playlistItems ?? []).map(
      (r: { playlist_id: string }) => r.playlist_id
    );

    if (playlistIds.length === 0) {
      return new Response(JSON.stringify({ success: true, screens_bumped: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find screens with active schedules using those playlists
    const { data: schedules, error: schedError } = await adminClient
      .schema("signage")
      .from("schedules")
      .select("screen_id")
      .in("playlist_id", playlistIds)
      .eq("is_active", true);

    if (schedError) throw schedError;

    const screenIds = [
      ...new Set(
        (schedules ?? []).map((s: { screen_id: string }) => s.screen_id)
      ),
    ];

    if (screenIds.length === 0) {
      return new Response(JSON.stringify({ success: true, screens_bumped: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bump content version for each affected screen
    const bumps = await Promise.all(
      screenIds.map(async (screenId: string) => {
        // Get current max version
        const { data: maxRow } = await adminClient
          .schema("signage")
          .from("content_versions")
          .select("version_number")
          .eq("screen_id", screenId)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersion = maxRow ? (maxRow.version_number as number) + 1 : 1;

        return adminClient
          .schema("signage")
          .from("content_versions")
          .insert({
            screen_id: screenId,
            version_number: nextVersion,
            change_type: "UPDATE",
            change_details: {
              source: "media-upload-complete",
              media_item_id,
            },
          });
      })
    );

    const errors = bumps
      .filter((r) => r.error)
      .map((r) => r.error?.message);

    if (errors.length > 0) {
      console.error("Some version bumps failed:", errors);
    }

    return new Response(
      JSON.stringify({ success: true, screens_bumped: screenIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
